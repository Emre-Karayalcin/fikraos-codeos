import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import {
  legalDeclarations,
  declarationAcceptances,
  organizations,
  organizationMembers,
  users,
} from "../shared/schema";
import { eq, and, isNull, or, desc } from "drizzle-orm";
import { isAuthenticated } from "./auth";

// ── Auth helpers ───────────────────────────────────────────────────────────────

function isSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const envEmails = process.env.SUPER_ADMIN_EMAILS || "";
  const allowedEmails = envEmails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const userEmail = (req.user as any)?.email;
  if (!userEmail || !allowedEmails.includes(userEmail.toLowerCase())) {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
}

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

// ── Active-declaration resolution helper ──────────────────────────────────────

async function getActiveDeclaration(orgId: string, type: string) {
  // 1. Try workspace-specific first
  const [workspace] = await db
    .select()
    .from(legalDeclarations)
    .where(and(
      eq(legalDeclarations.orgId, orgId),
      eq(legalDeclarations.type, type as any),
      eq(legalDeclarations.status, "ACTIVE"),
    ))
    .limit(1);
  if (workspace) return workspace;

  // 2. Fallback to global
  const [global] = await db
    .select()
    .from(legalDeclarations)
    .where(and(
      isNull(legalDeclarations.orgId),
      eq(legalDeclarations.type, type as any),
      eq(legalDeclarations.status, "ACTIVE"),
    ))
    .limit(1);
  return global ?? null;
}

// ── Routes ────────────────────────────────────────────────────────────────────

export function registerDeclarationRoutes(app: Express) {

  // ══ SUPER ADMIN endpoints ══════════════════════════════════════════════════

  // List all declarations
  app.get("/api/super-admin/declarations", isAuthenticated, isSuperAdmin, async (_req, res) => {
    const rows = await db
      .select({
        declaration: legalDeclarations,
        orgName: organizations.name,
      })
      .from(legalDeclarations)
      .leftJoin(organizations, eq(organizations.id, legalDeclarations.orgId))
      .orderBy(desc(legalDeclarations.createdAt));

    res.json(rows.map((r) => ({ ...r.declaration, orgName: r.orgName ?? "Global" })));
  });

  // Create declaration
  app.post("/api/super-admin/declarations", isAuthenticated, isSuperAdmin, async (req, res) => {
    const userId = (req.user as any)?.id;
    const { type, title, content, version, effectiveDate, expiryDate, orgId } = req.body;
    if (!type || !title || !content || !version) {
      return res.status(400).json({ error: "type, title, content, version required" });
    }
    const [row] = await db
      .insert(legalDeclarations)
      .values({
        orgId: orgId || null,
        type,
        title,
        content,
        version,
        status: "DRAFT",
        effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        createdBy: userId,
        updatedBy: userId,
      } as any)
      .returning();
    res.status(201).json(row);
  });

  // Edit declaration
  app.patch("/api/super-admin/declarations/:id", isAuthenticated, isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const userId = (req.user as any)?.id;
    const { title, content, version, effectiveDate, expiryDate } = req.body;
    const [row] = await db
      .update(legalDeclarations)
      .set({
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(version !== undefined && { version }),
        ...(effectiveDate !== undefined && { effectiveDate: effectiveDate ? new Date(effectiveDate) : null }),
        ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
        updatedBy: userId,
        updatedAt: new Date(),
      } as any)
      .where(eq(legalDeclarations.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });

  // Activate declaration (auto-deactivate sibling ACTIVE of same type+scope)
  app.post("/api/super-admin/declarations/:id/activate", isAuthenticated, isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const [target] = await db.select().from(legalDeclarations).where(eq(legalDeclarations.id, id)).limit(1);
    if (!target) return res.status(404).json({ error: "Not found" });

    // Deactivate existing ACTIVE of same type+scope
    await db
      .update(legalDeclarations)
      .set({ status: "INACTIVE", updatedAt: new Date() } as any)
      .where(and(
        eq(legalDeclarations.type, target.type),
        eq(legalDeclarations.status, "ACTIVE"),
        target.orgId ? eq(legalDeclarations.orgId, target.orgId) : isNull(legalDeclarations.orgId),
      ));

    const [row] = await db
      .update(legalDeclarations)
      .set({ status: "ACTIVE", updatedAt: new Date() } as any)
      .where(eq(legalDeclarations.id, id))
      .returning();
    res.json(row);
  });

  // Deactivate declaration
  app.post("/api/super-admin/declarations/:id/deactivate", isAuthenticated, isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const [row] = await db
      .update(legalDeclarations)
      .set({ status: "INACTIVE", updatedAt: new Date() } as any)
      .where(eq(legalDeclarations.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });

  // Acceptance log for a declaration
  app.get("/api/super-admin/declarations/:id/acceptances", isAuthenticated, isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const rows = await db
      .select({
        acceptance: declarationAcceptances,
        userEmail: users.email,
        userName: users.firstName,
        userLast: users.lastName,
        orgName: organizations.name,
      })
      .from(declarationAcceptances)
      .leftJoin(users, eq(users.id, declarationAcceptances.userId))
      .leftJoin(organizations, eq(organizations.id, declarationAcceptances.orgId))
      .where(eq(declarationAcceptances.declarationId, id))
      .orderBy(desc(declarationAcceptances.acceptedAt));

    res.json(rows.map((r) => ({
      ...r.acceptance,
      userEmail: r.userEmail,
      userName: `${r.userName ?? ""} ${r.userLast ?? ""}`.trim(),
      orgName: r.orgName,
    })));
  });

  // ══ PMO endpoints (per workspace) ═════════════════════════════════════════

  // List global + workspace declarations
  app.get("/api/workspaces/:orgId/admin/declarations", isAuthenticated, async (req, res) => {
    const { orgId } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;

    const rows = await db
      .select()
      .from(legalDeclarations)
      .where(or(
        isNull(legalDeclarations.orgId),
        eq(legalDeclarations.orgId, orgId),
      ))
      .orderBy(desc(legalDeclarations.createdAt));

    res.json(rows.map((r) => ({ ...r, isGlobal: !r.orgId })));
  });

  // Create workspace-specific declaration
  app.post("/api/workspaces/:orgId/admin/declarations", isAuthenticated, async (req, res) => {
    const { orgId } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;
    const userId = (req.user as any)?.id;
    const { type, title, content, version, effectiveDate, expiryDate } = req.body;
    if (!type || !title || !content || !version) {
      return res.status(400).json({ error: "type, title, content, version required" });
    }
    const [row] = await db
      .insert(legalDeclarations)
      .values({
        orgId,
        type,
        title,
        content,
        version,
        status: "DRAFT",
        effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        createdBy: userId,
        updatedBy: userId,
      } as any)
      .returning();
    res.status(201).json(row);
  });

  // Edit workspace-specific declaration
  app.patch("/api/workspaces/:orgId/admin/declarations/:id", isAuthenticated, async (req, res) => {
    const { orgId, id } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;
    const userId = (req.user as any)?.id;

    // Only allow editing workspace-specific declarations
    const [target] = await db.select().from(legalDeclarations)
      .where(and(eq(legalDeclarations.id, id), eq(legalDeclarations.orgId, orgId))).limit(1);
    if (!target) return res.status(404).json({ error: "Not found or not editable" });

    const { title, content, version, effectiveDate, expiryDate } = req.body;
    const [row] = await db
      .update(legalDeclarations)
      .set({
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(version !== undefined && { version }),
        ...(effectiveDate !== undefined && { effectiveDate: effectiveDate ? new Date(effectiveDate) : null }),
        ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
        updatedBy: userId,
        updatedAt: new Date(),
      } as any)
      .where(eq(legalDeclarations.id, id))
      .returning();
    res.json(row);
  });

  // Activate workspace-specific declaration
  app.post("/api/workspaces/:orgId/admin/declarations/:id/activate", isAuthenticated, async (req, res) => {
    const { orgId, id } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;

    const [target] = await db.select().from(legalDeclarations)
      .where(and(eq(legalDeclarations.id, id), eq(legalDeclarations.orgId, orgId))).limit(1);
    if (!target) return res.status(404).json({ error: "Not found or not editable" });

    // Deactivate existing ACTIVE of same type for this workspace
    await db
      .update(legalDeclarations)
      .set({ status: "INACTIVE", updatedAt: new Date() } as any)
      .where(and(
        eq(legalDeclarations.orgId, orgId),
        eq(legalDeclarations.type, target.type),
        eq(legalDeclarations.status, "ACTIVE"),
      ));

    const [row] = await db
      .update(legalDeclarations)
      .set({ status: "ACTIVE", updatedAt: new Date() } as any)
      .where(eq(legalDeclarations.id, id))
      .returning();
    res.json(row);
  });

  // Deactivate workspace-specific declaration
  app.post("/api/workspaces/:orgId/admin/declarations/:id/deactivate", isAuthenticated, async (req, res) => {
    const { orgId, id } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;

    const [target] = await db.select().from(legalDeclarations)
      .where(and(eq(legalDeclarations.id, id), eq(legalDeclarations.orgId, orgId))).limit(1);
    if (!target) return res.status(404).json({ error: "Not found or not editable" });

    const [row] = await db
      .update(legalDeclarations)
      .set({ status: "INACTIVE", updatedAt: new Date() } as any)
      .where(eq(legalDeclarations.id, id))
      .returning();
    res.json(row);
  });

  // Acceptance log for PMO
  app.get("/api/workspaces/:orgId/admin/declarations/:id/acceptances", isAuthenticated, async (req, res) => {
    const { orgId, id } = req.params;
    if (!await requireOrgAdmin(req, res, orgId)) return;

    const rows = await db
      .select({
        acceptance: declarationAcceptances,
        userEmail: users.email,
        userFirst: users.firstName,
        userLast: users.lastName,
      })
      .from(declarationAcceptances)
      .leftJoin(users, eq(users.id, declarationAcceptances.userId))
      .where(and(
        eq(declarationAcceptances.declarationId, id),
        eq(declarationAcceptances.orgId, orgId),
      ))
      .orderBy(desc(declarationAcceptances.acceptedAt));

    res.json(rows.map((r) => ({
      ...r.acceptance,
      userEmail: r.userEmail,
      userName: `${r.userFirst ?? ""} ${r.userLast ?? ""}`.trim(),
    })));
  });

  // ══ User-facing endpoints ══════════════════════════════════════════════════

  // Get active declaration for a type (workspace override → global fallback)
  app.get("/api/workspaces/:orgId/declarations/active", isAuthenticated, async (req, res) => {
    const { orgId } = req.params;
    const type = req.query.type as string;
    if (!type) return res.status(400).json({ error: "type query param required" });

    const declaration = await getActiveDeclaration(orgId, type);
    if (!declaration) return res.status(404).json({ error: "No active declaration" });
    res.json(declaration);
  });

  // Record user acceptance
  app.post("/api/workspaces/:orgId/declarations/:id/accept", isAuthenticated, async (req, res) => {
    const { orgId, id } = req.params;
    const userId = (req.user as any)?.id;
    const { projectId } = req.body;

    const [declaration] = await db.select().from(legalDeclarations)
      .where(eq(legalDeclarations.id, id)).limit(1);
    if (!declaration) return res.status(404).json({ error: "Declaration not found" });

    const [row] = await db
      .insert(declarationAcceptances)
      .values({
        declarationId: id,
        userId,
        orgId,
        metadata: {
          projectId: projectId ?? undefined,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        },
      } as any)
      .returning();
    res.status(201).json(row);
  });

  // Get all unaccepted active declarations for current user
  // Optionally filter by ?type=
  app.get("/api/workspaces/:orgId/declarations/my-pending", isAuthenticated, async (req, res) => {
    const { orgId } = req.params;
    const userId = (req.user as any)?.id;
    const typeFilter = req.query.type as string | undefined;

    // Get active declarations for this org (workspace + global)
    const active = await db
      .select()
      .from(legalDeclarations)
      .where(and(
        or(isNull(legalDeclarations.orgId), eq(legalDeclarations.orgId, orgId)),
        eq(legalDeclarations.status, "ACTIVE"),
        ...(typeFilter ? [eq(legalDeclarations.type, typeFilter as any)] : []),
      ));

    if (active.length === 0) return res.json([]);

    // For each type, pick the workspace-specific one if available, else global
    const byType: Record<string, (typeof active)[0]> = {};
    for (const d of active) {
      const key = d.type;
      if (!byType[key] || d.orgId) {
        // workspace-specific overrides global
        byType[key] = d;
      }
    }
    const candidates = Object.values(byType);

    // Check which ones the user has already accepted
    const accepted = await db
      .select({ declarationId: declarationAcceptances.declarationId })
      .from(declarationAcceptances)
      .where(and(
        eq(declarationAcceptances.userId, userId),
        eq(declarationAcceptances.orgId, orgId),
      ));
    const acceptedIds = new Set(accepted.map((a) => a.declarationId));

    const pending = candidates.filter((d) => !acceptedIds.has(d.id));
    res.json(pending);
  });

  // Check if user has accepted a specific declaration for a specific idea (COI use case)
  app.get("/api/workspaces/:orgId/declarations/has-accepted", isAuthenticated, async (req, res) => {
    const { orgId } = req.params;
    const userId = (req.user as any)?.id;
    const { declarationId, projectId } = req.query as Record<string, string>;

    if (!declarationId) return res.status(400).json({ error: "declarationId required" });

    const whereConditions = [
      eq(declarationAcceptances.userId, userId),
      eq(declarationAcceptances.orgId, orgId),
      eq(declarationAcceptances.declarationId, declarationId),
    ];

    const rows = await db
      .select()
      .from(declarationAcceptances)
      .where(and(...whereConditions));

    // If projectId is supplied, require a match in metadata
    let accepted = rows.length > 0;
    if (projectId && accepted) {
      accepted = rows.some((r) => (r.metadata as any)?.projectId === projectId);
    }

    res.json({ accepted });
  });
}
