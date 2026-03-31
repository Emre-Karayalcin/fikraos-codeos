import type { Express, Request, Response } from "express";
import { db } from "./db";
import { pitchDeckGenerations, pitchDeckVersions, pitchDeckReviews, users, organizationMembers } from "../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { isAuthenticated } from "./auth";

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function requireOrgAdmin(req: Request, res: Response, orgId: string): Promise<boolean> {
  const userId = (req.user as any)?.id;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return false; }

  const [membership] = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)));

  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

async function getDeckAndCheckOwner(req: Request, res: Response): Promise<any | null> {
  const userId = (req.user as any)?.id;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }

  const { deckId } = req.params;
  const [deck] = await db.select().from(pitchDeckGenerations).where(eq(pitchDeckGenerations.id, deckId));
  if (!deck) { res.status(404).json({ error: "Pitch deck not found" }); return null; }

  if (deck.createdById !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return deck;
}

// ── Format label ─────────────────────────────────────────────────────────────

function makeVersionLabel(prefix: string = "Saved"): string {
  const now = new Date();
  return `${prefix} · ${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

// ── Route registration ────────────────────────────────────────────────────────

export function registerPitchLifecycleRoutes(app: Express) {
  console.log("[pitch-lifecycle] routes registered (v4 — removed users.role references)");

  // ── GET /api/pitch-decks/:deckId — deck detail with versions + latest review
  app.get("/api/pitch-decks/:deckId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      const { deckId } = req.params;

      const [deck] = await db.select().from(pitchDeckGenerations).where(eq(pitchDeckGenerations.id, deckId));
      if (!deck) return res.status(404).json({ error: "Not found" });

      if (deck.createdById !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const versions = await db
        .select()
        .from(pitchDeckVersions)
        .where(eq(pitchDeckVersions.pitchDeckId, deckId))
        .orderBy(desc(pitchDeckVersions.createdAt));

      const reviews = await db
        .select()
        .from(pitchDeckReviews)
        .where(eq(pitchDeckReviews.pitchDeckId, deckId))
        .orderBy(desc(pitchDeckReviews.reviewedAt));

      return res.json({ ...deck, versions, reviews });
    } catch (e) {
      console.error("[pitch-lifecycle] GET /:deckId error:", e);
      return res.status(500).json({ error: "Failed to fetch pitch deck" });
    }
  });

  // ── PATCH /api/pitch-decks/:deckId/draft — save draft notes + auto-save snapshot
  app.patch("/api/pitch-decks/:deckId/draft", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deck = await getDeckAndCheckOwner(req, res);
      if (!deck) return;

      if (deck.isLocked) return res.status(403).json({ error: "Pitch deck is locked and cannot be edited" });

      const { draftNotes, autoSave } = req.body;

      await db
        .update(pitchDeckGenerations)
        .set({ draftNotes: draftNotes ?? deck.draftNotes, lastAutoSavedAt: new Date(), updatedAt: new Date() })
        .where(eq(pitchDeckGenerations.id, deck.id));

      if (autoSave) {
        await db.insert(pitchDeckVersions).values({
          pitchDeckId: deck.id,
          label: makeVersionLabel("Auto-save"),
          snapshotUrl: deck.downloadUrl,
          notes: draftNotes ?? deck.draftNotes,
          createdById: (req.user as any).id,
        });
      }

      return res.json({ ok: true });
    } catch (e) {
      console.error("[pitch-lifecycle] PATCH /:deckId/draft error:", e);
      return res.status(500).json({ error: "Failed to save draft" });
    }
  });

  // ── POST /api/pitch-decks/:deckId/save-version — manual version snapshot
  app.post("/api/pitch-decks/:deckId/save-version", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deck = await getDeckAndCheckOwner(req, res);
      if (!deck) return;

      if (deck.isLocked) return res.status(403).json({ error: "Pitch deck is locked" });

      const { label, notes } = req.body;
      const [version] = await db
        .insert(pitchDeckVersions)
        .values({
          pitchDeckId: deck.id,
          label: label || makeVersionLabel("Manual save"),
          snapshotUrl: deck.downloadUrl,
          notes: notes ?? null,
          createdById: (req.user as any).id,
        })
        .returning();

      return res.status(201).json(version);
    } catch (e) {
      console.error("[pitch-lifecycle] POST /:deckId/save-version error:", e);
      return res.status(500).json({ error: "Failed to save version" });
    }
  });

  // ── GET /api/pitch-decks/:deckId/versions — list version history
  app.get("/api/pitch-decks/:deckId/versions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deck = await getDeckAndCheckOwner(req, res);
      if (!deck) return;

      const versions = await db
        .select()
        .from(pitchDeckVersions)
        .where(eq(pitchDeckVersions.pitchDeckId, deck.id))
        .orderBy(desc(pitchDeckVersions.createdAt));

      return res.json(versions);
    } catch (e) {
      console.error("[pitch-lifecycle] GET /:deckId/versions error:", e);
      return res.status(500).json({ error: "Failed to fetch versions" });
    }
  });

  // ── POST /api/pitch-decks/:deckId/submit — participant submits for final review
  app.post("/api/pitch-decks/:deckId/submit", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deck = await getDeckAndCheckOwner(req, res);
      if (!deck) return;

      if (deck.isLocked) return res.status(403).json({ error: "Pitch deck is locked" });
      if (deck.lifecycleStatus === "SUBMITTED") return res.status(409).json({ error: "Already submitted" });
      if (deck.status !== "COMPLETED") return res.status(400).json({ error: "Deck must be fully generated before submitting" });

      const now = new Date();
      await db
        .update(pitchDeckGenerations)
        .set({
          lifecycleStatus: "SUBMITTED",
          submittedAt: now,
          submittedById: (req.user as any).id,
          isLocked: true,
          lockedAt: now,
          lockedReason: "Final submission",
          lockedById: (req.user as any).id,
          updatedAt: now,
        })
        .where(eq(pitchDeckGenerations.id, deck.id));

      await db.insert(pitchDeckVersions).values({
        pitchDeckId: deck.id,
        label: makeVersionLabel("Submitted"),
        snapshotUrl: deck.downloadUrl,
        notes: "Final submission snapshot",
        createdById: (req.user as any).id,
      });

      return res.json({ ok: true });
    } catch (e) {
      console.error("[pitch-lifecycle] POST /:deckId/submit error:", e);
      return res.status(500).json({ error: "Failed to submit pitch deck" });
    }
  });

  // ── POST /api/pitch-decks/:deckId/request-review — mark as pending mentor review
  app.post("/api/pitch-decks/:deckId/request-review", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deck = await getDeckAndCheckOwner(req, res);
      if (!deck) return;

      if (deck.isLocked) return res.status(403).json({ error: "Pitch deck is locked" });
      if (deck.status !== "COMPLETED") return res.status(400).json({ error: "Deck must be fully generated first" });
      if (deck.lifecycleStatus === "SUBMITTED") return res.status(409).json({ error: "Already in final submitted state" });

      await db
        .update(pitchDeckGenerations)
        .set({ lifecycleStatus: "PENDING_REVIEW", updatedAt: new Date() })
        .where(eq(pitchDeckGenerations.id, deck.id));

      return res.json({ ok: true });
    } catch (e) {
      console.error("[pitch-lifecycle] POST /:deckId/request-review error:", e);
      return res.status(500).json({ error: "Failed to request review" });
    }
  });

  // ── POST /api/pitch-decks/:deckId/review — PMO/Admin submits a review
  app.post("/api/pitch-decks/:deckId/review", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      const { deckId } = req.params;

      const [deck] = await db.select().from(pitchDeckGenerations).where(eq(pitchDeckGenerations.id, deckId));
      if (!deck) return res.status(404).json({ error: "Not found" });
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { reviewStatus, feedback } = req.body;
      if (!["APPROVED", "REJECTED", "NEEDS_REVISION"].includes(reviewStatus)) {
        return res.status(400).json({ error: "Invalid reviewStatus" });
      }

      const [review] = await db
        .insert(pitchDeckReviews)
        .values({
          pitchDeckId: deckId,
          reviewerId: userId,
          reviewStatus,
          feedback: feedback ?? null,
          reviewedAt: new Date(),
        })
        .returning();

      const newLifecycle =
        reviewStatus === "APPROVED" ? "REVIEWED" :
        reviewStatus === "REJECTED" ? "REJECTED" : "DRAFT";

      const unlockFields =
        reviewStatus === "NEEDS_REVISION"
          ? { isLocked: false, lockedAt: null, lockedReason: null, lockedById: null }
          : {};

      await db
        .update(pitchDeckGenerations)
        .set({ lifecycleStatus: newLifecycle, updatedAt: new Date(), ...unlockFields })
        .where(eq(pitchDeckGenerations.id, deckId));

      return res.status(201).json(review);
    } catch (e) {
      console.error("[pitch-lifecycle] POST /:deckId/review error:", e);
      return res.status(500).json({ error: "Failed to submit review" });
    }
  });

  // ── PATCH /api/pitch-decks/:deckId/lock — admin lock/unlock
  app.patch("/api/pitch-decks/:deckId/lock", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      const { deckId } = req.params;

      const [deck] = await db.select().from(pitchDeckGenerations).where(eq(pitchDeckGenerations.id, deckId));
      if (!deck) return res.status(404).json({ error: "Not found" });
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { locked, reason } = req.body;
      const now = new Date();

      await db
        .update(pitchDeckGenerations)
        .set(
          locked
            ? { isLocked: true, lockedAt: now, lockedReason: reason ?? null, lockedById: userId, updatedAt: now }
            : { isLocked: false, lockedAt: null, lockedReason: null, lockedById: null, updatedAt: now }
        )
        .where(eq(pitchDeckGenerations.id, deckId));

      return res.json({ ok: true });
    } catch (e) {
      console.error("[pitch-lifecycle] PATCH /:deckId/lock error:", e);
      return res.status(500).json({ error: "Failed to update lock" });
    }
  });

  // ── GET /api/workspaces/:orgId/admin/pitch-decks/:deckId/versions — admin version history
  app.get("/api/workspaces/:orgId/admin/pitch-decks/:deckId/versions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { orgId, deckId } = req.params;
      console.log(`[pitch-lifecycle] admin versions orgId=${orgId} deckId=${deckId}`);
      if (!(await requireOrgAdmin(req, res, orgId))) return;

      const versions = await db
        .select({
          id: pitchDeckVersions.id,
          label: pitchDeckVersions.label,
          snapshotUrl: pitchDeckVersions.snapshotUrl,
          notes: pitchDeckVersions.notes,
          createdAt: pitchDeckVersions.createdAt,
          createdByFirstName: users.firstName,
          createdByLastName: users.lastName,
          createdByUsername: users.username,
        })
        .from(pitchDeckVersions)
        .leftJoin(users, eq(pitchDeckVersions.createdById, users.id))
        .where(eq(pitchDeckVersions.pitchDeckId, deckId))
        .orderBy(desc(pitchDeckVersions.createdAt));

      return res.json(versions);
    } catch (e) {
      console.error("[pitch-lifecycle] GET admin/:deckId/versions error:", e);
      return res.status(500).json({ error: "Failed to fetch version history" });
    }
  });

  // ── GET /api/workspaces/:orgId/admin/pitch-decks/lifecycle — enriched admin list
  app.get("/api/workspaces/:orgId/admin/pitch-decks/lifecycle", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { orgId } = req.params;
      console.log(`[pitch-lifecycle] lifecycle list orgId=${orgId}`);
      if (!(await requireOrgAdmin(req, res, orgId))) return;

      const result = await db.execute(sql`
        SELECT
          pdg.*,
          p.title AS "projectTitle",
          u.first_name AS "creatorFirstName",
          u.last_name AS "creatorLastName",
          u.email AS "creatorEmail",
          (
            SELECT row_to_json(r.*)
            FROM pitch_deck_reviews r
            WHERE r.pitch_deck_id = pdg.id
            ORDER BY r.reviewed_at DESC
            LIMIT 1
          ) AS "latestReview",
          (
            SELECT COUNT(*)::int
            FROM pitch_deck_versions v
            WHERE v.pitch_deck_id = pdg.id
          ) AS "versionCount"
        FROM pitch_deck_generations pdg
        JOIN projects p ON p.id = pdg.project_id
        JOIN organization_members om ON om.org_id = ${orgId} AND om.user_id = p.created_by_id
        JOIN users u ON u.id = pdg.created_by_id
        ORDER BY pdg.created_at DESC
      `);

      return res.json(result.rows);
    } catch (e) {
      console.error("[pitch-lifecycle] GET lifecycle list error:", e);
      return res.status(500).json({ error: "Failed to fetch lifecycle list" });
    }
  });
}
