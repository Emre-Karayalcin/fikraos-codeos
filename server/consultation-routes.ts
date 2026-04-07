import type { Express, Request, Response } from "express";
import { db } from "./db";
import {
  consultationCredits,
  consultationSessions,
  consultationBookings,
  organizations,
  organizationMembers,
  users,
  challenges,
} from "../shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { isAuthenticated } from "./auth";
import { z } from "zod";

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
      config: { minCredits, maxEligible },
    });
  });
}
