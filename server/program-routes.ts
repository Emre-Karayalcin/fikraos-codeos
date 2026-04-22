import type { Express, Request, Response } from "express";
import { isAuthenticated } from "./auth";
import { db } from "./db";
import { eq, asc, and, desc } from "drizzle-orm";
import {
  programModules,
  moduleResources,
  moduleMentors,
  moduleConsultations,
  moduleResourceSubmissions,
  mentorProfiles,
  users,
  organizationMembers,
  organizations,
} from "../shared/schema";

// ── Auth helper ───────────────────────────────────────────────────────────────
async function requireOrgAdmin(
  req: Request,
  res: Response,
  orgId: string
): Promise<boolean> {
  const userId = (req.user as any)?.id;
  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return false;
  }
  const user = req.user as any;
  if (user.role === "super_admin") return true;

  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        eq(organizationMembers.userId, userId)
      )
    );

  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    res.status(403).json({ message: "Admin access required" });
    return false;
  }
  return true;
}

export function registerProgramRoutes(app: Express) {
  // ── Modules ──────────────────────────────────────────────────────────────

  // GET /api/organizations/:orgId/program/modules
  app.get(
    "/api/organizations/:orgId/program/modules",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId } = req.params;
        const modules = await db
          .select()
          .from(programModules)
          .where(eq(programModules.orgId, orgId))
          .orderBy(asc(programModules.stageIndex), asc(programModules.order));
        res.json(modules);
      } catch (error) {
        console.error("Error fetching program modules:", error);
        res.status(500).json({ message: "Failed to fetch modules" });
      }
    }
  );

  // POST /api/organizations/:orgId/program/modules
  app.post(
    "/api/organizations/:orgId/program/modules",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId } = req.params;
        if (!(await requireOrgAdmin(req, res, orgId))) return;

        const {
          title, titleAr, description, descriptionAr,
          stageIndex, order, status, startDate, endDate,
          location, locationType, meetingLink, unlockRules,
        } = req.body;

        const [module] = await db
          .insert(programModules)
          .values({
            orgId,
            title,
            titleAr: titleAr || null,
            description: description || null,
            descriptionAr: descriptionAr || null,
            stageIndex: stageIndex ?? 1,
            order: order ?? 0,
            status: status ?? "draft",
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            location: location || null,
            locationType: locationType ?? "online",
            meetingLink: meetingLink || null,
            unlockRules: unlockRules || null,
          })
          .returning();

        res.status(201).json(module);
      } catch (error) {
        console.error("Error creating program module:", error);
        res.status(500).json({ message: "Failed to create module" });
      }
    }
  );

  // PUT /api/organizations/:orgId/program/modules/:moduleId
  app.put(
    "/api/organizations/:orgId/program/modules/:moduleId",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId, moduleId } = req.params;
        if (!(await requireOrgAdmin(req, res, orgId))) return;

        const {
          title, titleAr, description, descriptionAr,
          stageIndex, order, status, startDate, endDate,
          location, locationType, meetingLink, unlockRules,
        } = req.body;

        const [updated] = await db
          .update(programModules)
          .set({
            title,
            titleAr: titleAr ?? null,
            description: description ?? null,
            descriptionAr: descriptionAr ?? null,
            stageIndex,
            order,
            status,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            location: location ?? null,
            locationType,
            meetingLink: meetingLink ?? null,
            unlockRules: unlockRules ?? null,
            updatedAt: new Date(),
          })
          .where(
            and(eq(programModules.id, moduleId), eq(programModules.orgId, orgId))
          )
          .returning();

        if (!updated) return res.status(404).json({ message: "Module not found" });
        res.json(updated);
      } catch (error) {
        console.error("Error updating program module:", error);
        res.status(500).json({ message: "Failed to update module" });
      }
    }
  );

  // DELETE /api/organizations/:orgId/program/modules/:moduleId
  app.delete(
    "/api/organizations/:orgId/program/modules/:moduleId",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId, moduleId } = req.params;
        if (!(await requireOrgAdmin(req, res, orgId))) return;

        await db
          .delete(programModules)
          .where(
            and(eq(programModules.id, moduleId), eq(programModules.orgId, orgId))
          );

        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting program module:", error);
        res.status(500).json({ message: "Failed to delete module" });
      }
    }
  );

  // PUT /api/organizations/:orgId/program/modules/reorder  (bulk order update)
  app.put(
    "/api/organizations/:orgId/program/modules/reorder",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId } = req.params;
        if (!(await requireOrgAdmin(req, res, orgId))) return;

        // body: [{ id, order, stageIndex }]
        const items: { id: string; order: number; stageIndex: number }[] = req.body;
        await Promise.all(
          items.map(({ id, order, stageIndex }) =>
            db
              .update(programModules)
              .set({ order, stageIndex, updatedAt: new Date() })
              .where(and(eq(programModules.id, id), eq(programModules.orgId, orgId)))
          )
        );

        res.json({ success: true });
      } catch (error) {
        console.error("Error reordering modules:", error);
        res.status(500).json({ message: "Failed to reorder modules" });
      }
    }
  );

  // ── Resources (Materials) ────────────────────────────────────────────────

  // GET /api/organizations/:orgId/program/modules/:moduleId/resources
  app.get(
    "/api/organizations/:orgId/program/modules/:moduleId/resources",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { moduleId } = req.params;
        const resources = await db
          .select()
          .from(moduleResources)
          .where(eq(moduleResources.moduleId, moduleId))
          .orderBy(asc(moduleResources.order));
        res.json(resources);
      } catch (error) {
        console.error("Error fetching module resources:", error);
        res.status(500).json({ message: "Failed to fetch resources" });
      }
    }
  );

  // POST /api/organizations/:orgId/program/modules/:moduleId/resources
  app.post(
    "/api/organizations/:orgId/program/modules/:moduleId/resources",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId, moduleId } = req.params;
        if (!(await requireOrgAdmin(req, res, orgId))) return;

        const { title, type, url, description, order, hasAssignment, assignmentDescription } = req.body;
        const [resource] = await db
          .insert(moduleResources)
          .values({
            moduleId,
            title,
            type: type ?? "link",
            url,
            description: description || null,
            order: order ?? 0,
            hasAssignment: hasAssignment ?? false,
            assignmentDescription: assignmentDescription || null,
          })
          .returning();

        res.status(201).json(resource);
      } catch (error) {
        console.error("Error creating module resource:", error);
        res.status(500).json({ message: "Failed to create resource" });
      }
    }
  );

  // PUT /api/organizations/:orgId/program/modules/:moduleId/resources/:resourceId
  app.put(
    "/api/organizations/:orgId/program/modules/:moduleId/resources/:resourceId",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId, resourceId } = req.params;
        if (!(await requireOrgAdmin(req, res, orgId))) return;

        const { title, type, url, description, order, hasAssignment, assignmentDescription } = req.body;
        const [updated] = await db
          .update(moduleResources)
          .set({ title, type, url, description: description ?? null, order, hasAssignment: hasAssignment ?? false, assignmentDescription: assignmentDescription ?? null })
          .where(eq(moduleResources.id, resourceId))
          .returning();

        if (!updated) return res.status(404).json({ message: "Resource not found" });
        res.json(updated);
      } catch (error) {
        console.error("Error updating module resource:", error);
        res.status(500).json({ message: "Failed to update resource" });
      }
    }
  );

  // DELETE /api/organizations/:orgId/program/modules/:moduleId/resources/:resourceId
  app.delete(
    "/api/organizations/:orgId/program/modules/:moduleId/resources/:resourceId",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId, resourceId } = req.params;
        if (!(await requireOrgAdmin(req, res, orgId))) return;

        await db.delete(moduleResources).where(eq(moduleResources.id, resourceId));
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting module resource:", error);
        res.status(500).json({ message: "Failed to delete resource" });
      }
    }
  );

  // ── Participant & Submission Endpoints ───────────────────────────────────

  // GET /api/organizations/:orgId/program/modules/published — published modules for participants
  app.get(
    "/api/organizations/:orgId/program/modules/published",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId } = req.params;
        const rows = await db
          .select()
          .from(programModules)
          .where(and(eq(programModules.orgId, orgId), eq(programModules.status, "published")))
          .orderBy(asc(programModules.stageIndex), asc(programModules.order));
        res.json(rows);
      } catch (error) {
        console.error("Error fetching published modules:", error);
        res.status(500).json({ message: "Failed to fetch modules" });
      }
    }
  );

  // GET /api/organizations/:orgId/program/modules/:moduleId/resources/participant
  app.get(
    "/api/organizations/:orgId/program/modules/:moduleId/resources/participant",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { moduleId } = req.params;
        const rows = await db
          .select()
          .from(moduleResources)
          .where(eq(moduleResources.moduleId, moduleId))
          .orderBy(asc(moduleResources.order));
        res.json(rows);
      } catch (error) {
        console.error("Error fetching module resources:", error);
        res.status(500).json({ message: "Failed to fetch resources" });
      }
    }
  );

  // POST /api/organizations/:orgId/program/resources/:resourceId/submit — upsert participant submission
  app.post(
    "/api/organizations/:orgId/program/resources/:resourceId/submit",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId, resourceId } = req.params;
        const userId = (req as any).user.id;
        const { submissionUrl, fileName } = req.body;
        if (!submissionUrl) return res.status(400).json({ message: "submissionUrl required" });

        // Upsert: delete existing then insert (simple approach)
        await db.delete(moduleResourceSubmissions)
          .where(and(eq(moduleResourceSubmissions.resourceId, resourceId), eq(moduleResourceSubmissions.userId, userId)));

        const [submission] = await db.insert(moduleResourceSubmissions)
          .values({ resourceId, userId, orgId, submissionUrl, fileName: fileName || null })
          .returning();

        res.status(201).json(submission);
      } catch (error) {
        console.error("Error submitting assignment:", error);
        res.status(500).json({ message: "Failed to submit assignment" });
      }
    }
  );

  // GET /api/organizations/:orgId/program/resources/:resourceId/my-submission
  app.get(
    "/api/organizations/:orgId/program/resources/:resourceId/my-submission",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { resourceId } = req.params;
        const userId = (req as any).user.id;
        const [submission] = await db
          .select()
          .from(moduleResourceSubmissions)
          .where(and(eq(moduleResourceSubmissions.resourceId, resourceId), eq(moduleResourceSubmissions.userId, userId)))
          .limit(1);
        res.json(submission ?? null);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch submission" });
      }
    }
  );

  // GET /api/organizations/:orgId/program/resources/:resourceId/submissions — PMO views all
  app.get(
    "/api/organizations/:orgId/program/resources/:resourceId/submissions",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId, resourceId } = req.params;
        if (!(await requireOrgAdmin(req, res, orgId))) return;

        const rows = await db
          .select({
            id: moduleResourceSubmissions.id,
            submissionUrl: moduleResourceSubmissions.submissionUrl,
            fileName: moduleResourceSubmissions.fileName,
            submittedAt: moduleResourceSubmissions.submittedAt,
            userFirstName: users.firstName,
            userLastName: users.lastName,
            userEmail: users.email,
            username: users.username,
          })
          .from(moduleResourceSubmissions)
          .innerJoin(users, eq(moduleResourceSubmissions.userId, users.id))
          .where(eq(moduleResourceSubmissions.resourceId, resourceId))
          .orderBy(desc(moduleResourceSubmissions.submittedAt));

        res.json(rows.map(r => ({
          ...r,
          submitterName: [r.userFirstName, r.userLastName].filter(Boolean).join(' ') || r.username || r.userEmail,
        })));
      } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).json({ message: "Failed to fetch submissions" });
      }
    }
  );

  // ── Module Mentors ───────────────────────────────────────────────────────

  // GET /api/organizations/:orgId/program/modules/:moduleId/mentors
  app.get(
    "/api/organizations/:orgId/program/modules/:moduleId/mentors",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { moduleId } = req.params;
        const rows = await db
          .select({
            id: moduleMentors.id,
            moduleId: moduleMentors.moduleId,
            mentorProfileId: moduleMentors.mentorProfileId,
            role: moduleMentors.role,
            createdAt: moduleMentors.createdAt,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            title: mentorProfiles.title,
          })
          .from(moduleMentors)
          .innerJoin(mentorProfiles, eq(moduleMentors.mentorProfileId, mentorProfiles.id))
          .innerJoin(users, eq(mentorProfiles.userId, users.id))
          .where(eq(moduleMentors.moduleId, moduleId));
        res.json(rows);
      } catch (error) {
        console.error("Error fetching module mentors:", error);
        res.status(500).json({ message: "Failed to fetch module mentors" });
      }
    }
  );

  // POST /api/organizations/:orgId/program/modules/:moduleId/mentors
  app.post(
    "/api/organizations/:orgId/program/modules/:moduleId/mentors",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId, moduleId } = req.params;
        if (!(await requireOrgAdmin(req, res, orgId))) return;

        const { mentorProfileId, role } = req.body;
        const [row] = await db
          .insert(moduleMentors)
          .values({ moduleId, mentorProfileId, role: role ?? "support" })
          .returning();

        res.status(201).json(row);
      } catch (error: any) {
        if (error?.code === "23505") {
          return res.status(409).json({ message: "Mentor already assigned to this module" });
        }
        console.error("Error assigning mentor to module:", error);
        res.status(500).json({ message: "Failed to assign mentor" });
      }
    }
  );

  // PATCH /api/organizations/:orgId/program/modules/:moduleId/mentors/:assignmentId
  app.patch(
    "/api/organizations/:orgId/program/modules/:moduleId/mentors/:assignmentId",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId, assignmentId } = req.params;
        if (!(await requireOrgAdmin(req, res, orgId))) return;

        const { role } = req.body;
        const [updated] = await db
          .update(moduleMentors)
          .set({ role })
          .where(eq(moduleMentors.id, assignmentId))
          .returning();

        if (!updated) return res.status(404).json({ message: "Assignment not found" });
        res.json(updated);
      } catch (error) {
        console.error("Error updating mentor role:", error);
        res.status(500).json({ message: "Failed to update mentor role" });
      }
    }
  );

  // DELETE /api/organizations/:orgId/program/modules/:moduleId/mentors/:assignmentId
  app.delete(
    "/api/organizations/:orgId/program/modules/:moduleId/mentors/:assignmentId",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId, assignmentId } = req.params;
        if (!(await requireOrgAdmin(req, res, orgId))) return;

        await db.delete(moduleMentors).where(eq(moduleMentors.id, assignmentId));
        res.json({ success: true });
      } catch (error) {
        console.error("Error removing module mentor:", error);
        res.status(500).json({ message: "Failed to remove mentor" });
      }
    }
  );

  // ── Consultations ────────────────────────────────────────────────────────

  // GET /api/organizations/:orgId/program/modules/:moduleId/consultations
  app.get(
    "/api/organizations/:orgId/program/modules/:moduleId/consultations",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { moduleId } = req.params;
        const rows = await db
          .select({
            id: moduleConsultations.id,
            moduleId: moduleConsultations.moduleId,
            title: moduleConsultations.title,
            scheduledAt: moduleConsultations.scheduledAt,
            durationMinutes: moduleConsultations.durationMinutes,
            mentorProfileId: moduleConsultations.mentorProfileId,
            maxAttendees: moduleConsultations.maxAttendees,
            location: moduleConsultations.location,
            meetingLink: moduleConsultations.meetingLink,
            notes: moduleConsultations.notes,
            status: moduleConsultations.status,
            createdAt: moduleConsultations.createdAt,
            mentorFirstName: users.firstName,
            mentorLastName: users.lastName,
          })
          .from(moduleConsultations)
          .leftJoin(mentorProfiles, eq(moduleConsultations.mentorProfileId, mentorProfiles.id))
          .leftJoin(users, eq(mentorProfiles.userId, users.id))
          .where(eq(moduleConsultations.moduleId, moduleId))
          .orderBy(asc(moduleConsultations.scheduledAt));
        res.json(rows);
      } catch (error) {
        console.error("Error fetching consultations:", error);
        res.status(500).json({ message: "Failed to fetch consultations" });
      }
    }
  );

  // POST /api/organizations/:orgId/program/modules/:moduleId/consultations
  app.post(
    "/api/organizations/:orgId/program/modules/:moduleId/consultations",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId, moduleId } = req.params;
        if (!(await requireOrgAdmin(req, res, orgId))) return;

        const {
          title, scheduledAt, durationMinutes, mentorProfileId,
          maxAttendees, location, meetingLink, notes, status,
        } = req.body;

        const [row] = await db
          .insert(moduleConsultations)
          .values({
            moduleId,
            title,
            scheduledAt: new Date(scheduledAt),
            durationMinutes: durationMinutes ?? 60,
            mentorProfileId: mentorProfileId || null,
            maxAttendees: maxAttendees ?? null,
            location: location || null,
            meetingLink: meetingLink || null,
            notes: notes || null,
            status: status ?? "scheduled",
          })
          .returning();

        res.status(201).json(row);
      } catch (error) {
        console.error("Error creating consultation:", error);
        res.status(500).json({ message: "Failed to create consultation" });
      }
    }
  );

  // PUT /api/organizations/:orgId/program/modules/:moduleId/consultations/:consultationId
  app.put(
    "/api/organizations/:orgId/program/modules/:moduleId/consultations/:consultationId",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId, consultationId } = req.params;
        if (!(await requireOrgAdmin(req, res, orgId))) return;

        const {
          title, scheduledAt, durationMinutes, mentorProfileId,
          maxAttendees, location, meetingLink, notes, status,
        } = req.body;

        const [updated] = await db
          .update(moduleConsultations)
          .set({
            title,
            scheduledAt: new Date(scheduledAt),
            durationMinutes,
            mentorProfileId: mentorProfileId || null,
            maxAttendees: maxAttendees ?? null,
            location: location ?? null,
            meetingLink: meetingLink ?? null,
            notes: notes ?? null,
            status,
          })
          .where(eq(moduleConsultations.id, consultationId))
          .returning();

        if (!updated) return res.status(404).json({ message: "Consultation not found" });
        res.json(updated);
      } catch (error) {
        console.error("Error updating consultation:", error);
        res.status(500).json({ message: "Failed to update consultation" });
      }
    }
  );

  // DELETE /api/organizations/:orgId/program/modules/:moduleId/consultations/:consultationId
  app.delete(
    "/api/organizations/:orgId/program/modules/:moduleId/consultations/:consultationId",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId, consultationId } = req.params;
        if (!(await requireOrgAdmin(req, res, orgId))) return;

        await db
          .delete(moduleConsultations)
          .where(eq(moduleConsultations.id, consultationId));

        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting consultation:", error);
        res.status(500).json({ message: "Failed to delete consultation" });
      }
    }
  );

  // ── Org mentor list (for selectors) ─────────────────────────────────────

  // GET /api/organizations/:orgId/program/mentors  — all mentor profiles in this org
  app.get(
    "/api/organizations/:orgId/program/mentors",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { orgId } = req.params;
        const rows = await db
          .select({
            id: mentorProfiles.id,
            userId: mentorProfiles.userId,
            title: mentorProfiles.title,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(mentorProfiles)
          .innerJoin(users, eq(mentorProfiles.userId, users.id))
          .where(eq(mentorProfiles.orgId, orgId));
        res.json(rows);
      } catch (error) {
        console.error("Error fetching org mentors:", error);
        res.status(500).json({ message: "Failed to fetch mentors" });
      }
    }
  );
}
