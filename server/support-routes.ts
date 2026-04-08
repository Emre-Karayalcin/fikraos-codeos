import type { Express } from "express";
import { db } from "./db";
import { supportTickets, supportMessages, users, organizationMembers, organizations } from "../shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { Resend } from "resend";
import { randomBytes } from "crypto";
import { isAuthenticated } from "./auth";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@fikrahub.com";

function generateTicketId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  const bytes = randomBytes(10);
  for (let i = 0; i < 10; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export function registerSupportRoutes(app: Express) {
  // Member: create a new support ticket
  app.post("/api/support/tickets", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const { category, priority, subject, message } = req.body;

    if (!category || !subject || !message) {
      return res.status(400).json({ error: "category, subject, and message are required" });
    }

    const [membership] = await db
      .select({ orgId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, user.id))
      .limit(1);

    if (!membership) {
      return res.status(403).json({ error: "Not a member of any organization" });
    }

    const ticketId = generateTicketId();

    const [ticket] = await db
      .insert(supportTickets)
      .values({
        id: ticketId,
        orgId: membership.orgId,
        userId: user.id,
        category,
        priority: priority || "LOW",
        subject,
        status: "OPEN",
      })
      .returning();

    await db.insert(supportMessages).values({
      ticketId: ticket.id,
      senderId: user.id,
      senderRole: "MEMBER",
      content: message,
    });

    // Email PMO (fire-and-forget)
    if (resendClient) {
      (async () => {
        try {
          const admins = await db
            .select({ userId: organizationMembers.userId })
            .from(organizationMembers)
            .where(
              and(
                eq(organizationMembers.organizationId, membership.orgId),
                inArray(organizationMembers.role, ["ADMIN", "OWNER"])
              )
            );

          const adminUsers = await db
            .select({ email: users.email, firstName: users.firstName })
            .from(users)
            .where(inArray(users.id, admins.map((a) => a.userId)));

          const memberName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
          const hostUrl = process.env.HOST_URL || "https://os.fikrahub.com";
          const [org] = await db
            .select({ slug: organizations.slug })
            .from(organizations)
            .where(eq(organizations.id, membership.orgId));

          for (const admin of adminUsers) {
            if (!admin.email) continue;
            await resendClient.emails.send({
              from: EMAIL_FROM,
              to: admin.email,
              subject: `New support ticket #${ticket.id} — ${subject}`,
              html: `
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:28px 32px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
                  <h2 style="margin:0 0 16px;color:#111827">New Support Ticket</h2>
                  <p style="color:#374151">Hi ${admin.firstName || "there"},</p>
                  <p style="color:#374151">A new support ticket has been submitted by <strong>${memberName}</strong>.</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
                    <tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600">Ticket ID</td><td style="padding:10px 14px;font-weight:700">#${ticket.id}</td></tr>
                    <tr style="background:#f9fafb"><td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600">Category</td><td style="padding:10px 14px">${category}</td></tr>
                    <tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600">Priority</td><td style="padding:10px 14px">${priority || "LOW"}</td></tr>
                    <tr style="background:#f9fafb"><td style="padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600">Subject</td><td style="padding:10px 14px">${subject}</td></tr>
                  </table>
                  <blockquote style="border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;background:#fffbeb;border-radius:0 8px 8px 0;color:#374151;font-style:italic">"${message}"</blockquote>
                  <a href="${hostUrl}/w/${org?.slug || "#"}/admin/support?ticket=${ticket.id}" style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">View Ticket</a>
                </div>
              `,
            });
          }
        } catch (err) {
          console.error("Support ticket notification email failed:", err);
        }
      })();
    }

    res.json(ticket);
  });

  // Member: list own tickets
  app.get("/api/support/tickets/mine", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const tickets = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, user.id))
      .orderBy(desc(supportTickets.updatedAt));
    res.json(tickets);
  });

  // Member / PMO: get ticket detail + messages
  app.get("/api/support/tickets/:id/messages", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const { id } = req.params;

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const [membership] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, user.id),
          eq(organizationMembers.organizationId, ticket.orgId)
        )
      );

    const isAdmin = membership?.role === "ADMIN" || membership?.role === "OWNER";
    const isOwner = ticket.userId === user.id;

    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Access denied" });

    const messages = await db
      .select({
        id: supportMessages.id,
        ticketId: supportMessages.ticketId,
        senderId: supportMessages.senderId,
        senderRole: supportMessages.senderRole,
        content: supportMessages.content,
        createdAt: supportMessages.createdAt,
        senderFirstName: users.firstName,
        senderLastName: users.lastName,
      })
      .from(supportMessages)
      .leftJoin(users, eq(supportMessages.senderId, users.id))
      .where(eq(supportMessages.ticketId, id))
      .orderBy(supportMessages.createdAt);

    res.json({ ticket, messages });
  });

  // Member / PMO: post a message
  app.post("/api/support/tickets/:id/messages", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const { id } = req.params;
    const { content } = req.body;

    if (!content?.trim()) return res.status(400).json({ error: "Message content required" });

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const [membership] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, user.id),
          eq(organizationMembers.organizationId, ticket.orgId)
        )
      );

    const isAdmin = membership?.role === "ADMIN" || membership?.role === "OWNER";
    const isOwner = ticket.userId === user.id;
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Access denied" });

    const senderRole = isAdmin ? "PMO" : "MEMBER";

    const [message] = await db
      .insert(supportMessages)
      .values({
        ticketId: id,
        senderId: user.id,
        senderRole,
        content: content.trim(),
      })
      .returning();

    await db
      .update(supportTickets)
      .set({ status: senderRole === "PMO" ? "ANSWERED" : "OPEN", updatedAt: new Date() })
      .where(eq(supportTickets.id, id));

    // Email notification (fire-and-forget)
    if (resendClient) {
      (async () => {
        try {
          const hostUrl = process.env.HOST_URL || "https://os.fikrahub.com";
          const senderName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
          const [org] = await db
            .select({ slug: organizations.slug })
            .from(organizations)
            .where(eq(organizations.id, ticket.orgId));

          if (isAdmin) {
            const [memberUser] = await db.select().from(users).where(eq(users.id, ticket.userId));
            if (memberUser?.email) {
              await resendClient.emails.send({
                from: EMAIL_FROM,
                to: memberUser.email,
                subject: `Support ticket #${ticket.id} — new reply from support team`,
                html: `
                  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:28px 32px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
                    <h2 style="margin:0 0 16px;color:#111827">New reply on your support ticket</h2>
                    <p style="color:#374151">Hi ${memberUser.firstName || "there"},</p>
                    <p style="color:#374151">The support team has replied to your ticket <strong>#${ticket.id}</strong>: ${ticket.subject}</p>
                    <blockquote style="border-left:4px solid #4f46e5;padding:12px 16px;margin:16px 0;background:#f5f3ff;border-radius:0 8px 8px 0;color:#374151;font-style:italic">"${content.trim()}"</blockquote>
                    <a href="${hostUrl}/w/${org?.slug || "#"}/support" style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">View Conversation</a>
                  </div>
                `,
              });
            }
          } else {
            const admins = await db
              .select({ userId: organizationMembers.userId })
              .from(organizationMembers)
              .where(
                and(
                  eq(organizationMembers.organizationId, ticket.orgId),
                  inArray(organizationMembers.role, ["ADMIN", "OWNER"])
                )
              );

            const adminUsers = await db
              .select({ email: users.email, firstName: users.firstName })
              .from(users)
              .where(inArray(users.id, admins.map((a) => a.userId)));

            for (const admin of adminUsers) {
              if (!admin.email) continue;
              await resendClient.emails.send({
                from: EMAIL_FROM,
                to: admin.email,
                subject: `Support ticket #${ticket.id} — member replied`,
                html: `
                  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:28px 32px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
                    <p style="color:#374151">Hi ${admin.firstName || "there"},</p>
                    <p style="color:#374151"><strong>${senderName}</strong> has replied to ticket <strong>#${ticket.id}</strong>: ${ticket.subject}</p>
                    <blockquote style="border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;background:#fffbeb;border-radius:0 8px 8px 0;color:#374151;font-style:italic">"${content.trim()}"</blockquote>
                    <a href="${hostUrl}/w/${org?.slug || "#"}/admin/support?ticket=${ticket.id}" style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">View Ticket</a>
                  </div>
                `,
              });
            }
          }
        } catch (err) {
          console.error("Support reply email failed:", err);
        }
      })();
    }

    res.json({ ...message, senderFirstName: user.firstName, senderLastName: user.lastName });
  });

  // PMO: list all tickets for org
  app.get("/api/workspaces/:orgId/admin/support/tickets", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const { orgId } = req.params;

    const [membership] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, user.id),
          eq(organizationMembers.organizationId, orgId)
        )
      );

    if (!["ADMIN", "OWNER"].includes(membership?.role ?? "")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const tickets = await db
      .select({
        id: supportTickets.id,
        orgId: supportTickets.orgId,
        userId: supportTickets.userId,
        category: supportTickets.category,
        priority: supportTickets.priority,
        subject: supportTickets.subject,
        status: supportTickets.status,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        memberFirstName: users.firstName,
        memberLastName: users.lastName,
        memberEmail: users.email,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .where(eq(supportTickets.orgId, orgId))
      .orderBy(desc(supportTickets.updatedAt));

    res.json(tickets);
  });

  // PMO: update ticket status
  app.patch("/api/workspaces/:orgId/admin/support/tickets/:id/status", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const { orgId, id } = req.params;
    const { status } = req.body;

    const [membership] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, user.id),
          eq(organizationMembers.organizationId, orgId)
        )
      );

    if (!["ADMIN", "OWNER"].includes(membership?.role ?? "")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const [updated] = await db
      .update(supportTickets)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(supportTickets.id, id), eq(supportTickets.orgId, orgId)))
      .returning();

    res.json(updated);
  });
}
