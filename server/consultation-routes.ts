import type { Express, Request, Response } from "express";
import { db } from "./db";
import { checkAndSendSessionReminders } from "./sessionReminderService";
import {
  consultationCredits,
  consultationSessions,
  consultationBookings,
  organizations,
  organizationMembers,
  memberApplications,
  users,
  challenges,
  platformEvents,
} from "../shared/schema";
import { eq, and, desc, sql, inArray, ne } from "drizzle-orm";
import { isAuthenticated } from "./auth";
import { z } from "zod";
import { emailService } from "./services/emailService";

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function requireOrgAdmin(req: Request, res: Response, orgId: string): Promise<boolean> {
  const userId = (req.user as any)?.id;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return false; }
  const [m] = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)));
  if (!m || !["OWNER", "ADMIN"].includes(m.role)) {
    res.status(403).json({ error: "Forbidden" }); return false;
  }
  return true;
}

// ── Validation ────────────────────────────────────────────────────────────────

const awardCreditSchema = z.object({
  userId:      z.string().min(1),
  credits:     z.number().int().min(1).max(1000),
  challengeId: z.string().optional(),
  reason:      z.string().max(500).optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

export function registerConsultationRoutes(app: Express) {

  // ── Award credits (PMO) ────────────────────────────────────────────────────
  app.post("/api/workspaces/:orgId/admin/consultation/credits", isAuthenticated, async (req, res) => {
    const { orgId } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;

    const parsed = awardCreditSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const { userId, credits, challengeId, reason } = parsed.data;
    const awardedById = (req.user as any).id;

    // Validate recipient is a member of the org
    const [membership] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)));
    if (!membership) {
      res.status(404).json({ error: "Participant not found in workspace" });
      return;
    }

    const [credit] = await db
      .insert(consultationCredits)
      .values({ orgId, userId, credits, challengeId: challengeId ?? null, awardedById, reason: reason ?? null })
      .returning();

    res.status(201).json(credit);
  });

  // ── List credit ledger ─────────────────────────────────────────────────────
  app.get("/api/workspaces/:orgId/admin/consultation/credits", isAuthenticated, async (req, res) => {
    const { orgId } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;

    const rows = await db
      .select({
        id:                  consultationCredits.id,
        credits:             consultationCredits.credits,
        reason:              consultationCredits.reason,
        createdAt:           consultationCredits.createdAt,
        challengeId:         consultationCredits.challengeId,
        userId:              consultationCredits.userId,
        awardedById:         consultationCredits.awardedById,
      })
      .from(consultationCredits)
      .where(eq(consultationCredits.orgId, orgId))
      .orderBy(desc(consultationCredits.createdAt));

    if (rows.length === 0) { res.json([]); return; }

    // Enrich with user names
    const allUserIds = [...new Set([...rows.map(r => r.userId), ...rows.map(r => r.awardedById)])];
    const allUsers = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username })
      .from(users)
      .where(inArray(users.id, allUserIds));
    const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));

    // Enrich with challenge names
    const challengeIds = [...new Set(rows.map(r => r.challengeId).filter(Boolean))] as string[];
    const challengeMap: Record<string, string> = {};
    if (challengeIds.length > 0) {
      const chs = await db
        .select({ id: challenges.id, title: challenges.title })
        .from(challenges)
        .where(inArray(challenges.id, challengeIds));
      chs.forEach(c => { challengeMap[c.id] = c.title; });
    }

    const enriched = rows.map(r => {
      const u = userMap[r.userId];
      const a = userMap[r.awardedById];
      return {
        ...r,
        participantName: u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username : r.userId,
        awardedByName:   a ? `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || a.username : r.awardedById,
        challengeName:   r.challengeId ? challengeMap[r.challengeId] ?? null : null,
      };
    });

    res.json(enriched);
  });

  // ── Delete a credit entry ──────────────────────────────────────────────────
  app.delete("/api/workspaces/:orgId/admin/consultation/credits/:creditId", isAuthenticated, async (req, res) => {
    const { orgId, creditId } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;

    const [deleted] = await db
      .delete(consultationCredits)
      .where(and(eq(consultationCredits.id, creditId), eq(consultationCredits.orgId, orgId)))
      .returning();

    if (!deleted) { res.status(404).json({ error: "Credit not found" }); return; }
    res.json({ ok: true });
  });

  // ── Rankings — participants ranked by total credits ────────────────────────
  app.get("/api/workspaces/:orgId/admin/consultation/rankings", isAuthenticated, async (req, res) => {
    const { orgId } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;

    const { challengeId } = req.query;

    const rows = await db
      .select({
        userId:       consultationCredits.userId,
        totalCredits: sql<number>`cast(sum(${consultationCredits.credits}) as int)`,
      })
      .from(consultationCredits)
      .where(
        challengeId
          ? and(eq(consultationCredits.orgId, orgId), eq(consultationCredits.challengeId, challengeId as string))
          : eq(consultationCredits.orgId, orgId)
      )
      .groupBy(consultationCredits.userId)
      .orderBy(desc(sql`sum(${consultationCredits.credits})`));

    if (rows.length === 0) { res.json([]); return; }

    const userIds = rows.map(r => r.userId);
    const allUsers = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username })
      .from(users)
      .where(inArray(users.id, userIds));
    const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));

    // Fetch org config for eligibility thresholds
    const [org] = await db
      .select({
        consultationMinCredits:  organizations.consultationMinCredits,
        consultationMaxEligible: organizations.consultationMaxEligible,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId));

    const minCredits  = org?.consultationMinCredits  ?? 10;
    const maxEligible = org?.consultationMaxEligible ?? 3;

    const ranked = rows.map((r, idx) => {
      const u = userMap[r.userId];
      return {
        rank:         idx + 1,
        userId:       r.userId,
        name:         u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username : r.userId,
        username:     u?.username ?? r.userId,
        totalCredits: r.totalCredits,
        isEligible:   r.totalCredits >= minCredits && idx < maxEligible,
      };
    });

    res.json({ rankings: ranked, config: { minCredits, maxEligible } });
  });

  // ── List workspace members eligible to receive credits ────────────────────
  app.get("/api/workspaces/:orgId/admin/consultation/members", isAuthenticated, async (req, res) => {
    const { orgId } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;

    const rows = await db
      .select({
        id:        users.id,
        firstName: users.firstName,
        lastName:  users.lastName,
        username:  users.username,
        email:     users.email,
        role:      organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(
        and(
          eq(organizationMembers.orgId, orgId),
          inArray(organizationMembers.role, ["MEMBER", "MENTOR"])
        )
      )
      .orderBy(users.firstName);

    res.json(rows);
  });

  // ── Participant: check own eligibility ────────────────────────────────────
  app.get("/api/workspaces/:orgId/consultation/eligibility", isAuthenticated, async (req, res) => {
    const { orgId } = req.params;
    const userId = (req.user as any)?.id;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    // Must be a member of the org
    const [membership] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)));
    if (!membership) { res.status(403).json({ error: "Forbidden" }); return; }

    const [org] = await db
      .select({
        consultationEnabled:    organizations.consultationEnabled,
        consultationMinCredits: organizations.consultationMinCredits,
        consultationMaxEligible: organizations.consultationMaxEligible,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId));

    const consultationEnabled = org?.consultationEnabled ?? false;
    const minCredits  = org?.consultationMinCredits  ?? 10;
    const maxEligible = org?.consultationMaxEligible ?? 3;

    // Get all ranked participants
    const ranked = await db
      .select({
        userId:       consultationCredits.userId,
        totalCredits: sql<number>`cast(sum(${consultationCredits.credits}) as int)`,
      })
      .from(consultationCredits)
      .where(eq(consultationCredits.orgId, orgId))
      .groupBy(consultationCredits.userId)
      .orderBy(desc(sql`sum(${consultationCredits.credits})`));

    const myEntry = ranked.find(r => r.userId === userId);
    const myRank  = myEntry ? ranked.indexOf(myEntry) : -1;
    const totalCredits = myEntry?.totalCredits ?? 0;
    const isEligible = consultationEnabled
      && totalCredits >= minCredits
      && myRank >= 0
      && myRank < maxEligible;

    // Check for existing booking
    const [booking] = await db
      .select()
      .from(consultationBookings)
      .where(and(eq(consultationBookings.orgId, orgId), eq(consultationBookings.userId, userId)))
      .orderBy(desc(consultationBookings.bookedAt))
      .limit(1);

    const activeBooking = booking && booking.status !== "CANCELLED" ? booking : null;

    // Enrich booking with session details if booked
    let sessionDetails: { title: string; scheduledAt: Date | null; externalMeetingLink: string | null } | null = null;
    if (activeBooking) {
      const [sess] = await db.select({ title: consultationSessions.title, scheduledAt: consultationSessions.scheduledAt, externalMeetingLink: consultationSessions.externalMeetingLink })
        .from(consultationSessions).where(eq(consultationSessions.id, activeBooking.sessionId));
      if (sess) sessionDetails = sess;
    }

    let status: "NOT_ELIGIBLE" | "ELIGIBLE" | "BOOKED";
    if (activeBooking) {
      status = "BOOKED";
    } else if (isEligible) {
      status = "ELIGIBLE";
    } else {
      status = "NOT_ELIGIBLE";
    }

    res.json({
      consultationEnabled,
      status,
      totalCredits,
      minCredits,
      maxEligible,
      rank: myRank >= 0 ? myRank + 1 : null,
      booking: activeBooking ?? null,
      sessionDetails: sessionDetails ?? null,
      config: { minCredits, maxEligible },
    });
  });

  // ── SESSION CRUD (admin) ───────────────────────────────────────────────────

  const createSessionSchema = z.object({
    title:               z.string().min(1).max(200),
    scheduledAt:         z.string().datetime().optional().nullable(),
    capacity:            z.number().int().min(1).max(100).optional(),
    externalMeetingLink: z.string().url().optional().nullable(),
    consultantUserId:    z.string().optional().nullable(),
    challengeId:         z.string().optional().nullable(),
    notes:               z.string().max(1000).optional().nullable(),
  });

  // Create session
  app.post("/api/workspaces/:orgId/admin/consultation/sessions", isAuthenticated, async (req, res) => {
    const { orgId } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;

    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() }); return; }
    const data = parsed.data;

    const [session] = await db.insert(consultationSessions).values({
      orgId,
      title:               data.title,
      scheduledAt:         data.scheduledAt ? new Date(data.scheduledAt) : null,
      capacity:            data.capacity ?? 3,
      externalMeetingLink: data.externalMeetingLink ?? null,
      consultantUserId:    data.consultantUserId ?? null,
      challengeId:         data.challengeId ?? null,
      notes:               data.notes ?? null,
    }).returning();

    res.status(201).json(session);
  });

  // List sessions
  app.get("/api/workspaces/:orgId/admin/consultation/sessions", isAuthenticated, async (req, res) => {
    const { orgId } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;

    const sessions = await db
      .select()
      .from(consultationSessions)
      .where(eq(consultationSessions.orgId, orgId))
      .orderBy(desc(consultationSessions.createdAt));

    if (sessions.length === 0) { res.json([]); return; }

    // Enrich with booking counts
    const sessionIds = sessions.map(s => s.id);
    const bookingCounts = await db
      .select({
        sessionId: consultationBookings.sessionId,
        count:     sql<number>`cast(count(*) as int)`,
      })
      .from(consultationBookings)
      .where(and(inArray(consultationBookings.sessionId, sessionIds), ne(consultationBookings.status, 'CANCELLED')))
      .groupBy(consultationBookings.sessionId);

    const countMap: Record<string, number> = {};
    bookingCounts.forEach(b => { countMap[b.sessionId] = b.count; });

    res.json(sessions.map(s => ({ ...s, activeBookings: countMap[s.id] ?? 0 })));
  });

  // Update session
  app.patch("/api/workspaces/:orgId/admin/consultation/sessions/:sessionId", isAuthenticated, async (req, res) => {
    const { orgId, sessionId } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;

    const updateSchema = createSessionSchema.partial().extend({ status: z.enum(["ACTIVE", "CANCELLED", "COMPLETED"]).optional() });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() }); return; }

    const data = parsed.data;
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.scheduledAt !== undefined) updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.externalMeetingLink !== undefined) updateData.externalMeetingLink = data.externalMeetingLink;
    if (data.consultantUserId !== undefined) updateData.consultantUserId = data.consultantUserId;
    if (data.challengeId !== undefined) updateData.challengeId = data.challengeId;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;

    const [updated] = await db
      .update(consultationSessions)
      .set(updateData)
      .where(and(eq(consultationSessions.id, sessionId), eq(consultationSessions.orgId, orgId)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Session not found" }); return; }
    res.json(updated);
  });

  // Delete session
  app.delete("/api/workspaces/:orgId/admin/consultation/sessions/:sessionId", isAuthenticated, async (req, res) => {
    const { orgId, sessionId } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;

    const [deleted] = await db
      .delete(consultationSessions)
      .where(and(eq(consultationSessions.id, sessionId), eq(consultationSessions.orgId, orgId)))
      .returning();

    if (!deleted) { res.status(404).json({ error: "Session not found" }); return; }
    res.json({ ok: true });
  });

  // ── BOOKING MANAGEMENT (admin) ──────────────────────────────────────────────

  // List bookings for a session
  app.get("/api/workspaces/:orgId/admin/consultation/sessions/:sessionId/bookings", isAuthenticated, async (req, res) => {
    const { orgId, sessionId } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;

    const bookings = await db
      .select()
      .from(consultationBookings)
      .where(and(eq(consultationBookings.sessionId, sessionId), eq(consultationBookings.orgId, orgId)))
      .orderBy(desc(consultationBookings.bookedAt));

    if (bookings.length === 0) { res.json([]); return; }

    const userIds = bookings.map(b => b.userId);
    const allUsers = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username, email: users.email })
      .from(users)
      .where(inArray(users.id, userIds));
    const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));

    res.json(bookings.map(b => {
      const u = userMap[b.userId];
      return {
        ...b,
        participantName: u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username : b.userId,
        participantEmail: u?.email ?? null,
      };
    }));
  });

  // Confirm or cancel a booking (admin)
  app.patch("/api/workspaces/:orgId/admin/consultation/bookings/:bookingId", isAuthenticated, async (req, res) => {
    const { orgId, bookingId } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;

    const schema = z.object({ status: z.enum(["CONFIRMED", "CANCELLED"]) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { status } = parsed.data;

    const [booking] = await db
      .select()
      .from(consultationBookings)
      .where(and(eq(consultationBookings.id, bookingId), eq(consultationBookings.orgId, orgId)));
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const wasCancelled = booking.status === "CANCELLED";
    const isCancelling = status === "CANCELLED";

    const [updated] = await db
      .update(consultationBookings)
      .set({
        status,
        cancelledAt: isCancelling ? new Date() : null,
      } as any)
      .where(eq(consultationBookings.id, bookingId))
      .returning();

    // Adjust filledSlots
    if (!wasCancelled && isCancelling) {
      await db
        .update(consultationSessions)
        .set({ filledSlots: sql`${consultationSessions.filledSlots} - 1` })
        .where(eq(consultationSessions.id, booking.sessionId));
    }

    // Send email notification
    const [session] = await db.select().from(consultationSessions).where(eq(consultationSessions.id, booking.sessionId));
    const [participant] = await db.select({ firstName: users.firstName, lastName: users.lastName, username: users.username, email: users.email }).from(users).where(eq(users.id, booking.userId));
    if (participant?.email && session) {
      const participantName = `${participant.firstName ?? ""} ${participant.lastName ?? ""}`.trim() || participant.username;
      emailService.sendConsultationBookingNotification({
        recipientEmail:      participant.email,
        recipientName:       participantName,
        sessionTitle:        session.title,
        scheduledAt:         session.scheduledAt,
        externalMeetingLink: isCancelling ? null : (session.externalMeetingLink ?? null),
        status:              isCancelling ? "PENDING" : "CONFIRMED",
        uid:                 `consultation-${booking.id}@codeos`,
      }).catch(console.error);
    }

    // Audit log
    const adminId = (req.user as any)?.id;
    db.insert(platformEvents).values({
      orgId,
      actorId:   adminId,
      eventType: isCancelling ? "CONSULTATION_CANCELLED" : "CONSULTATION_CONFIRMED",
      metadata:  { bookingId, sessionId: booking.sessionId, participantId: booking.userId },
    } as any).catch(console.error);

    res.json(updated);
  });

  // ── PARTICIPANT: Available sessions ────────────────────────────────────────

  app.get("/api/workspaces/:orgId/consultation/sessions", isAuthenticated, async (req, res) => {
    const { orgId } = req.params;
    const userId = (req.user as any)?.id;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [membership] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)));
    if (!membership) { res.status(403).json({ error: "Forbidden" }); return; }

    // Only ACTIVE sessions with available slots
    const sessions = await db
      .select()
      .from(consultationSessions)
      .where(
        and(
          eq(consultationSessions.orgId, orgId),
          eq(consultationSessions.status, "ACTIVE"),
          sql`${consultationSessions.filledSlots} < ${consultationSessions.capacity}`,
        )
      )
      .orderBy(consultationSessions.scheduledAt);

    // Fire-and-forget: send pre-session reminders
    checkAndSendSessionReminders().catch((e) =>
      console.error("checkAndSendSessionReminders error:", e)
    );

    res.json(sessions);
  });

  // ── PARTICIPANT: Book a session ────────────────────────────────────────────

  app.post("/api/workspaces/:orgId/consultation/sessions/:sessionId/book", isAuthenticated, async (req, res) => {
    const { orgId, sessionId } = req.params;
    const userId = (req.user as any)?.id;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    // Must be member
    const [membership] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)));
    if (!membership) { res.status(403).json({ error: "Forbidden" }); return; }

    // Check eligibility
    const [org] = await db
      .select({ consultationEnabled: organizations.consultationEnabled, consultationMinCredits: organizations.consultationMinCredits, consultationMaxEligible: organizations.consultationMaxEligible })
      .from(organizations)
      .where(eq(organizations.id, orgId));
    if (!org?.consultationEnabled) { res.status(403).json({ error: "Consultation not enabled" }); return; }

    const ranked = await db
      .select({ userId: consultationCredits.userId, totalCredits: sql<number>`cast(sum(${consultationCredits.credits}) as int)` })
      .from(consultationCredits)
      .where(eq(consultationCredits.orgId, orgId))
      .groupBy(consultationCredits.userId)
      .orderBy(desc(sql`sum(${consultationCredits.credits})`));
    const myEntry = ranked.find(r => r.userId === userId);
    const myRank = myEntry ? ranked.indexOf(myEntry) : -1;
    const totalCredits = myEntry?.totalCredits ?? 0;
    const minCredits = org.consultationMinCredits ?? 10;
    const maxEligible = org.consultationMaxEligible ?? 3;
    const isEligible = totalCredits >= minCredits && myRank >= 0 && myRank < maxEligible;
    if (!isEligible) { res.status(403).json({ error: "Not eligible for consultation" }); return; }

    // Double-booking prevention
    const [existingBooking] = await db
      .select()
      .from(consultationBookings)
      .where(and(eq(consultationBookings.orgId, orgId), eq(consultationBookings.userId, userId), ne(consultationBookings.status, "CANCELLED")));
    if (existingBooking) { res.status(409).json({ error: "You already have an active booking" }); return; }

    // Check session availability
    const [session] = await db
      .select()
      .from(consultationSessions)
      .where(and(eq(consultationSessions.id, sessionId), eq(consultationSessions.orgId, orgId)));
    if (!session || session.status !== "ACTIVE") { res.status(404).json({ error: "Session not available" }); return; }
    if (session.filledSlots >= session.capacity) { res.status(409).json({ error: "Session is full" }); return; }

    // Create booking + increment filledSlots atomically-ish
    const [booking] = await db
      .insert(consultationBookings)
      .values({ sessionId, userId, orgId, status: "PENDING" })
      .returning();

    await db
      .update(consultationSessions)
      .set({ filledSlots: sql`${consultationSessions.filledSlots} + 1` })
      .where(eq(consultationSessions.id, sessionId));

    // Email notification
    const [participant] = await db
      .select({ firstName: users.firstName, lastName: users.lastName, username: users.username, email: users.email })
      .from(users)
      .where(eq(users.id, userId));
    if (participant?.email) {
      const participantName = `${participant.firstName ?? ""} ${participant.lastName ?? ""}`.trim() || participant.username;
      emailService.sendConsultationBookingNotification({
        recipientEmail:      participant.email,
        recipientName:       participantName,
        sessionTitle:        session.title,
        scheduledAt:         session.scheduledAt,
        externalMeetingLink: session.externalMeetingLink ?? null,
        status:              "PENDING",
        uid:                 `consultation-${booking.id}@codeos`,
      }).catch(console.error);
    }

    // Audit log
    db.insert(platformEvents).values({
      orgId,
      actorId: userId,
      eventType: "CONSULTATION_BOOKED",
      metadata:  { bookingId: booking.id, sessionId },
    } as any).catch(console.error);

    res.status(201).json(booking);
  });

  // ── CONSULTANT: My sessions + participant idea info ────────────────────────
  app.get("/api/workspaces/:orgId/consultant/my-sessions", isAuthenticated, async (req, res) => {
    const { orgId } = req.params;
    const consultantId = (req.user as any)?.id;
    if (!consultantId) { res.status(401).json({ error: "Unauthorized" }); return; }

    // Verify user is a member of this org (any role)
    const [member] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, consultantId)));
    if (!member) { res.status(403).json({ error: "Forbidden" }); return; }

    const sessions = await db
      .select()
      .from(consultationSessions)
      .where(and(
        eq(consultationSessions.orgId, orgId),
        eq(consultationSessions.consultantUserId, consultantId),
      ))
      .orderBy(desc(consultationSessions.scheduledAt));

    const result = await Promise.all(sessions.map(async (session) => {
      const bookings = await db
        .select({
          bookingId:           consultationBookings.id,
          bookingStatus:       consultationBookings.status,
          bookedAt:            consultationBookings.bookedAt,
          participantId:       users.id,
          participantName:     sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
          participantEmail:    users.email,
          ideaName:            memberApplications.ideaName,
          sector:              memberApplications.sector,
          problemStatement:    memberApplications.problemStatement,
          solutionDescription: memberApplications.solutionDescription,
          differentiator:      memberApplications.differentiator,
          targetUser:          memberApplications.targetUser,
          aiScore:             memberApplications.aiScore,
        })
        .from(consultationBookings)
        .innerJoin(users, eq(users.id, consultationBookings.userId))
        .leftJoin(memberApplications, and(
          eq(memberApplications.userId, consultationBookings.userId),
          eq(memberApplications.orgId, orgId),
        ))
        .where(eq(consultationBookings.sessionId, session.id));

      return { ...session, bookings };
    }));

    res.json(result);
  });
}
