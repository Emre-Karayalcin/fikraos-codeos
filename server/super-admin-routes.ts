import type { Express, Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import { isAuthenticated, comparePasswords, hashPassword } from "./auth";
import { authRateLimiter } from "./middleware/security";
import { storage } from "./storage";
import { db } from "./db";
import { sql, eq, and, desc, inArray } from "drizzle-orm";
import { organizations, organizationMembers, projects, challenges, assets, chats, messages, users, events, memberApplications, platformEvents } from "../shared/schema";
import { createEventSchema, updateEventSchema, validateRequest } from "../shared/validation-schemas";
import { Resend } from "resend";
import mustache from "mustache";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { screenApplicationAsync, refineApplicationAsync } from "./lib/applicationScreening";

const __saFilename = fileURLToPath(import.meta.url);
const __saDir = path.dirname(__saFilename);

function isSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const envEmails = process.env.SUPER_ADMIN_EMAILS || "";
  const allowedEmails = envEmails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

  const userEmail = (req as any).user?.email;
  if (!userEmail || !allowedEmails.includes(userEmail.toLowerCase())) {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
}

export function registerSuperAdminRoutes(app: Express) {
  // POST /api/super-admin/login — login without workspace membership
  app.post("/api/super-admin/login", authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if email is in SUPER_ADMIN_EMAILS before doing anything else
      const envEmails = process.env.SUPER_ADMIN_EMAILS || "";
      const allowedEmails = envEmails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
      if (!allowedEmails.includes(email.toLowerCase())) {
        return res.status(403).json({ message: "Not authorized as super admin" });
      }

      // Look up user by email (no workspace requirement)
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Regenerate session to prevent fixation attacks
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          return res.status(500).json({ message: "Login failed" });
        }
        (req as any).login(user, (err: any) => {
          if (err) {
            return res.status(500).json({ message: "Login failed" });
          }
          res.json({
            isSuperAdmin: true,
            user: {
              id: user.id,
              email: user.email,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
            },
          });
        });
      });
    } catch (error) {
      console.error("Super admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // GET /api/super-admin/check — frontend guard probe
  app.get("/api/super-admin/check", isAuthenticated, isSuperAdmin, (_req: Request, res: Response) => {
    res.json({ isSuperAdmin: true });
  });

  // GET /api/super-admin/workspaces — all workspaces with stats
  app.get("/api/super-admin/workspaces", isAuthenticated, isSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        SELECT
          o.id,
          o.name,
          o.slug,
          o.logo_url        AS "logoUrl",
          o.primary_color   AS "primaryColor",
          o.created_at      AS "createdAt",
          o.challenges_enabled      AS "challengesEnabled",
          o.experts_enabled         AS "expertsEnabled",
          o.radar_enabled           AS "radarEnabled",
          o.dashboard_enabled       AS "dashboardEnabled",
          o.ai_builder_enabled      AS "aiBuilderEnabled",
          o.form_submission_enabled AS "formSubmissionEnabled",
          o.dashboard_name_en       AS "dashboardNameEn",
          o.my_ideas_name_en        AS "myIdeasNameEn",
          o.challenges_name_en      AS "challengesNameEn",
          o.radar_name_en           AS "radarNameEn",
          o.experts_name_en         AS "expertsNameEn",
          COALESCE((SELECT COUNT(*)::int FROM organization_members om WHERE om.org_id = o.id), 0) AS "memberCount",
          COALESCE((SELECT COUNT(*)::int FROM projects         p  WHERE p.org_id  = o.id), 0) AS "projectCount",
          COALESCE((SELECT COUNT(*)::int FROM challenges       c  WHERE c.org_id  = o.id), 0) AS "challengeCount",
          COALESCE((SELECT COUNT(*)::int FROM assets           a  WHERE a.project_id IN (SELECT p.id FROM projects p WHERE p.org_id = o.id)), 0) AS "assetCount",
          COALESCE((SELECT COUNT(*)::int FROM organization_members om2 WHERE om2.org_id = o.id AND om2.role = 'MENTOR'), 0) AS "mentorCount",
          COALESCE((SELECT COUNT(*)::int FROM pitch_deck_generations pdg WHERE pdg.project_id IN (SELECT p2.id FROM projects p2 WHERE p2.org_id = o.id)), 0) AS "pitchDeckCount",
          COALESCE((SELECT COUNT(*)::int FROM projects ps1 WHERE ps1.org_id = o.id AND ps1.status = 'BACKLOG'), 0) AS "backlogCount",
          COALESCE((SELECT COUNT(*)::int FROM projects ps2 WHERE ps2.org_id = o.id AND ps2.status = 'UNDER_REVIEW'), 0) AS "underReviewCount",
          COALESCE((SELECT COUNT(*)::int FROM projects ps3 WHERE ps3.org_id = o.id AND ps3.status = 'SHORTLISTED'), 0) AS "shortlistedCount",
          COALESCE((SELECT COUNT(*)::int FROM projects ps4 WHERE ps4.org_id = o.id AND ps4.status = 'IN_INCUBATION'), 0) AS "inIncubationCount",
          COALESCE((SELECT COUNT(*)::int FROM projects ps5 WHERE ps5.org_id = o.id AND ps5.status = 'ARCHIVED'), 0) AS "archivedCount"
        FROM organizations o
        ORDER BY o.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching super-admin workspaces:", error);
      res.status(500).json({ error: "Failed to fetch workspaces" });
    }
  });

  // GET /api/super-admin/users — all users with their workspace memberships
  app.get("/api/super-admin/users", isAuthenticated, isSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        SELECT
          u.id,
          u.email,
          u.username,
          u.first_name AS "firstName",
          u.last_name  AS "lastName",
          u.created_at AS "createdAt",
          COALESCE(
            json_agg(DISTINCT jsonb_build_object(
              'name', o.name,
              'slug', o.slug,
              'role', om.role
            )) FILTER (WHERE o.id IS NOT NULL),
            '[]'::json
          ) AS workspaces
        FROM users u
        LEFT JOIN organization_members om ON om.user_id = u.id
        LEFT JOIN organizations        o  ON o.id = om.org_id
        GROUP BY u.id, u.email, u.username, u.first_name, u.last_name, u.created_at
        ORDER BY u.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching super-admin users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // GET /api/super-admin/ideas — all ideas (projects) across every workspace
  app.get("/api/super-admin/ideas", isAuthenticated, isSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        SELECT
          p.id,
          p.title,
          p.description,
          p.status,
          p.type,
          p.created_at  AS "createdAt",
          o.name        AS "workspaceName",
          o.slug        AS "workspaceSlug",
          u.first_name  AS "creatorFirstName",
          u.last_name   AS "creatorLastName",
          u.username    AS "creatorUsername",
          u.email       AS "creatorEmail"
        FROM   projects p
        JOIN   organizations o ON o.id = p.org_id
        JOIN   users        u ON u.id = p.created_by_id
        ORDER BY p.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching super-admin ideas:", error);
      res.status(500).json({ error: "Failed to fetch ideas" });
    }
  });

  // ── Workspace CRUD ────────────────────────────────────────────────────────

  // POST /api/super-admin/workspaces — create a new workspace
  app.post("/api/super-admin/workspaces", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { name, slug, primaryColor, challengesEnabled, expertsEnabled, radarEnabled, dashboardEnabled, aiBuilderEnabled, formSubmissionEnabled } = req.body;
      if (!name || !slug) return res.status(400).json({ message: "name and slug are required" });

      const ownerId = (req as any).user.id;
      const org = await storage.createOrganization({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        primaryColor: primaryColor || "#4588f5",
        challengesEnabled: challengesEnabled ?? true,
        expertsEnabled: expertsEnabled ?? true,
        radarEnabled: radarEnabled ?? true,
        dashboardEnabled: dashboardEnabled ?? true,
        aiBuilderEnabled: aiBuilderEnabled ?? true,
        formSubmissionEnabled: formSubmissionEnabled ?? true,
      }, ownerId);

      res.status(201).json(org);
    } catch (error: any) {
      console.error("Error creating workspace:", error);
      if (error?.code === "23505") return res.status(409).json({ message: "Slug already exists" });
      res.status(500).json({ message: "Failed to create workspace" });
    }
  });

  // PATCH /api/super-admin/workspaces/:id — update workspace
  app.patch("/api/super-admin/workspaces/:id", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, slug, primaryColor, challengesEnabled, expertsEnabled, radarEnabled, dashboardEnabled, aiBuilderEnabled, formSubmissionEnabled } = req.body;

      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (slug !== undefined) updateData.slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
      if (challengesEnabled !== undefined) updateData.challengesEnabled = challengesEnabled;
      if (expertsEnabled !== undefined) updateData.expertsEnabled = expertsEnabled;
      if (radarEnabled !== undefined) updateData.radarEnabled = radarEnabled;
      if (dashboardEnabled !== undefined) updateData.dashboardEnabled = dashboardEnabled;
      if (aiBuilderEnabled !== undefined) updateData.aiBuilderEnabled = aiBuilderEnabled;
      if (formSubmissionEnabled !== undefined) updateData.formSubmissionEnabled = formSubmissionEnabled;

      const updated = await storage.updateOrganization(id, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating workspace:", error);
      if (error?.code === "23505") return res.status(409).json({ message: "Slug already exists" });
      res.status(500).json({ message: "Failed to update workspace" });
    }
  });

  // DELETE /api/super-admin/workspaces/:id — delete workspace and cascade all related data
  app.delete("/api/super-admin/workspaces/:id", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get all projects in the org
      const orgProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.orgId, id));

      for (const proj of orgProjects) {
        // Delete messages → chats → assets for each project
        const projChats = await db.select({ id: chats.id }).from(chats).where(eq(chats.projectId, proj.id));
        for (const chat of projChats) {
          await db.delete(messages).where(eq(messages.chatId, chat.id));
        }
        await db.delete(chats).where(eq(chats.projectId, proj.id));
        await db.delete(assets).where(eq(assets.projectId, proj.id));
      }

      // Delete all projects
      await db.delete(projects).where(eq(projects.orgId, id));

      // Delete challenges
      await db.delete(challenges).where(eq(challenges.orgId, id));

      // Delete members
      await db.delete(organizationMembers).where(eq(organizationMembers.orgId, id));

      // Delete the organization itself
      await db.delete(organizations).where(eq(organizations.id, id));

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting workspace:", error);
      res.status(500).json({ message: "Failed to delete workspace" });
    }
  });

  // ── User CRUD ─────────────────────────────────────────────────────────────

  // POST /api/super-admin/users — create a new user
  app.post("/api/super-admin/users", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, username } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "email and password are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Check email uniqueness
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "A user with that email already exists" });
      }

      const hashed = await hashPassword(password);
      const newUser = await storage.createUser({
        email,
        password: hashed,
        firstName: firstName || null,
        lastName: lastName || null,
        username: username || null,
      });

      const { password: _pw, ...safeUser } = newUser as any;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // POST /api/super-admin/invite — invite a user to a specific workspace (email + role + orgId)
  app.post("/api/super-admin/invite", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { email, role, orgId } = req.body;
      if (!email || !orgId) {
        return res.status(400).json({ message: "email and orgId are required" });
      }

      const existingMember = await storage.getUserByEmailOrganization(email, orgId);
      if (existingMember) {
        return res.status(400).json({ message: "A user with this email is already a member of this workspace" });
      }

      const localPart = email.split('@')[0].replace(/[^\w\-\.]/g, '').slice(0, 20) || 'user';
      const rawPassword = randomBytes(16).toString('base64').slice(0, 16);
      const hashedPassword = await hashPassword(rawPassword);

      const newUser = await storage.createUser({
        email,
        username: localPart,
        firstName: 'New',
        lastName: 'User',
        password: hashedPassword,
        status: 'PENDING',
      });

      await storage.addOrganizationMember(orgId, newUser.id, role || 'MEMBER');

      const org = await storage.getOrganization(orgId).catch(() => null);
      const hostUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
      const orgSlug = org?.slug || orgId;
      const registerUrl = `${hostUrl}/w/${orgSlug}/register?email=${encodeURIComponent(email)}&userId=${encodeURIComponent(newUser.id)}&role=${encodeURIComponent(role || 'MEMBER')}`;

      const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
      if (resendClient) {
        const orgName = org?.name || 'your workspace';
        const userName = newUser.firstName || newUser.username || newUser.email;
        const templateCandidates = [
          path.join(__saDir, 'email-templates', 'invite-member.html'),
          path.join(process.cwd(), 'server', 'email-templates', 'invite-member.html'),
          path.join(process.cwd(), 'dist', 'email-templates', 'invite-member.html'),
        ];
        let html = '';
        const found = templateCandidates.find(p => { try { return fs.existsSync(p); } catch { return false; } });
        if (found) {
          try {
            html = mustache.render(fs.readFileSync(found, 'utf8'), { orgName, userName, role: role || 'MEMBER', acceptUrl: registerUrl, hostUrl, orgSlug });
          } catch {}
        }
        if (!html) {
          html = mustache.render(`<html><body><p>Hi {{userName}},</p><p>You've been invited to join <strong>{{orgName}}</strong>. <a href="{{acceptUrl}}">Complete registration</a></p></body></html>`, { userName, orgName, acceptUrl: registerUrl });
        }
        try {
          await resendClient.emails.send({
            from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com',
            to: email,
            subject: `You're invited to ${org?.name || 'FikraHub'}`,
            html,
          });
        } catch (err) {
          console.error('Failed to send invite email:', err);
        }
      }

      res.status(201).json({ message: "Invitation sent", user: { id: newUser.id, email: newUser.email } });
    } catch (error) {
      console.error("Error sending invite:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  // PATCH /api/super-admin/users/:id — update user profile
  app.patch("/api/super-admin/users/:id", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, username, email } = req.body;

      const updateData: Record<string, any> = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (username !== undefined) updateData.username = username;
      if (email !== undefined) updateData.email = email;

      const updated = await storage.updateUser(id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // DELETE /api/super-admin/users/:id — delete user and associated data
  app.delete("/api/super-admin/users/:id", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // Prevent super admin from deleting themselves
      if ((req as any).user?.id === id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // ── Workspace-User assignment ─────────────────────────────────────────────

  // POST /api/super-admin/workspaces/:id/members — add user to workspace
  app.post("/api/super-admin/workspaces/:id/members", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, role } = req.body;
      if (!userId || !role) return res.status(400).json({ message: "userId and role are required" });

      const validRoles = ["OWNER", "ADMIN", "MENTOR", "MEMBER"];
      if (!validRoles.includes(role)) return res.status(400).json({ message: "Invalid role" });

      const alreadyMember = await storage.hasOrganizationMember(id, userId);
      if (alreadyMember) {
        // Update role instead
        await storage.updateMemberRole(id, userId, role);
        return res.json({ updated: true });
      }

      await storage.addOrganizationMember(id, userId, role);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error adding member:", error);
      res.status(500).json({ message: "Failed to add member" });
    }
  });

  // PATCH /api/super-admin/workspaces/:id/members/:userId — update member role
  app.patch("/api/super-admin/workspaces/:id/members/:userId", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id, userId } = req.params;
      const { role } = req.body;

      const validRoles = ["OWNER", "ADMIN", "MENTOR", "MEMBER"];
      if (!role || !validRoles.includes(role)) return res.status(400).json({ message: "Invalid role" });

      await storage.updateMemberRole(id, userId, role);
      // Log platform event
      db.insert(platformEvents).values({
        orgId: id,
        actorId: (req as any).user?.id,
        eventType: 'ROLE_UPDATED',
        targetUserId: userId,
        metadata: { newRole: role, source: 'super_admin' },
      }).catch(console.error);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // DELETE /api/super-admin/workspaces/:id/members/:userId — remove user from workspace
  app.delete("/api/super-admin/workspaces/:id/members/:userId", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id, userId } = req.params;
      const [targetUser] = await db.select({ email: users.email, firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, userId));
      await storage.removeMemberFromOrganization(id, userId);
      // Log platform event
      db.insert(platformEvents).values({
        orgId: id,
        actorId: (req as any).user?.id,
        eventType: 'MEMBER_REMOVED',
        targetUserId: userId,
        targetEntityLabel: targetUser ? (targetUser.firstName ? `${targetUser.firstName} ${targetUser.lastName || ''}`.trim() : targetUser.email) : undefined,
        metadata: { source: 'super_admin' },
      }).catch(console.error);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // GET /api/super-admin/workspaces/:id/members — list members of a workspace
  app.get("/api/super-admin/workspaces/:id/members", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const members = await storage.getOrganizationMembers(id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  // ── Challenge CRUD ──────────────────────────────────────────────────────────

  // GET /api/super-admin/challenges — list all challenges across all workspaces
  app.get("/api/super-admin/challenges", isAuthenticated, isSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const rows = await db
        .select({
          id: challenges.id,
          title: challenges.title,
          slug: challenges.slug,
          description: challenges.description,
          shortDescription: challenges.shortDescription,
          status: challenges.status,
          deadline: challenges.deadline,
          prize: challenges.prize,
          emoji: challenges.emoji,
          tags: challenges.tags,
          maxSubmissions: challenges.maxSubmissions,
          submissionCount: challenges.submissionCount,
          evaluationCriteria: challenges.evaluationCriteria,
          createdAt: challenges.createdAt,
          orgId: challenges.orgId,
          workspaceName: organizations.name,
          workspaceSlug: organizations.slug,
        })
        .from(challenges)
        .leftJoin(organizations, eq(challenges.orgId, organizations.id))
        .orderBy(sql`${challenges.createdAt} DESC`);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges" });
    }
  });

  // POST /api/super-admin/challenges — create a challenge for a workspace
  app.post("/api/super-admin/challenges", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { orgId, title, description, shortDescription, slug, deadline, tags, maxSubmissions, emoji, status, prize, evaluationCriteria } = req.body;
      if (!orgId || !title || !description || !slug || !deadline) {
        return res.status(400).json({ message: "orgId, title, description, slug, and deadline are required" });
      }
      const [created] = await db
        .insert(challenges)
        .values({
          orgId,
          title,
          description,
          shortDescription: shortDescription || null,
          slug,
          deadline: new Date(deadline),
          tags: tags || [],
          maxSubmissions: maxSubmissions || 100,
          emoji: emoji || "🎯",
          status: status || "draft",
          prize: prize || null,
          evaluationCriteria: evaluationCriteria || null,
          createdBy: (req as any).user?.id,
        })
        .returning();
      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating challenge:", error);
      res.status(500).json({ message: "Failed to create challenge" });
    }
  });

  // PATCH /api/super-admin/challenges/:id — update a challenge
  app.patch("/api/super-admin/challenges/:id", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const allowed = ["title", "description", "shortDescription", "slug", "deadline", "tags", "maxSubmissions", "emoji", "status", "prize", "evaluationCriteria"];
      const update: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) update[key] = req.body[key];
      }
      if (update.deadline) update.deadline = new Date(update.deadline);
      update.updatedAt = new Date();

      const [updated] = await db
        .update(challenges)
        .set(update)
        .where(eq(challenges.id, id))
        .returning();
      if (!updated) return res.status(404).json({ message: "Challenge not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating challenge:", error);
      res.status(500).json({ message: "Failed to update challenge" });
    }
  });

  // DELETE /api/super-admin/challenges/:id — delete a challenge (cascade to submissions)
  app.delete("/api/super-admin/challenges/:id", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(challenges).where(eq(challenges.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting challenge:", error);
      res.status(500).json({ message: "Failed to delete challenge" });
    }
  });

  // ── Events CRUD ──────────────────────────────────────────────────────────

  // GET /api/super-admin/events — list ALL events (published + unpublished)
  app.get("/api/super-admin/events", isAuthenticated, isSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(events).orderBy(events.startDate);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // POST /api/super-admin/events — create event
  app.post("/api/super-admin/events", isAuthenticated, isSuperAdmin, validateRequest(createEventSchema), async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const [created] = await db.insert(events).values({
        title: data.title,
        shortDescription: data.shortDescription || null,
        description: data.description || null,
        location: data.location || null,
        websiteUrl: data.websiteUrl || null,
        imageUrl: data.imageUrl || null,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        isPublished: data.isPublished ?? false,
      }).returning();
      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // PATCH /api/super-admin/events/:id — update event
  app.patch("/api/super-admin/events/:id", isAuthenticated, isSuperAdmin, validateRequest(updateEventSchema), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const update: Record<string, any> = { updatedAt: new Date() };
      if (data.title !== undefined) update.title = data.title;
      if (data.shortDescription !== undefined) update.shortDescription = data.shortDescription || null;
      if (data.description !== undefined) update.description = data.description || null;
      if (data.location !== undefined) update.location = data.location || null;
      if (data.websiteUrl !== undefined) update.websiteUrl = data.websiteUrl || null;
      if (data.imageUrl !== undefined) update.imageUrl = data.imageUrl || null;
      if (data.startDate !== undefined) update.startDate = new Date(data.startDate);
      if (data.endDate !== undefined) update.endDate = data.endDate ? new Date(data.endDate) : null;
      if (data.isPublished !== undefined) update.isPublished = data.isPublished;

      const [updated] = await db.update(events).set(update).where(eq(events.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Event not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  // DELETE /api/super-admin/events/:id — delete event
  app.delete("/api/super-admin/events/:id", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(events).where(eq(events.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // ── Applications CRUD ─────────────────────────────────────────────────────

  // GET /api/super-admin/applications — list all applications newest first with joins
  app.get("/api/super-admin/applications", isAuthenticated, isSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const rows = await db
        .select({
          application: memberApplications,
          user: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            status: users.status,
          },
          org: {
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
          },
          challenge: {
            id: challenges.id,
            title: challenges.title,
          },
        })
        .from(memberApplications)
        .leftJoin(users, eq(memberApplications.userId, users.id))
        .leftJoin(organizations, eq(memberApplications.orgId, organizations.id))
        .leftJoin(challenges, eq(memberApplications.challengeId, challenges.id))
        .orderBy(desc(memberApplications.submittedAt));

      res.json(rows);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // GET /api/super-admin/applications/:id — single application detail
  app.get("/api/super-admin/applications/:id", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [row] = await db
        .select({
          application: memberApplications,
          user: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            status: users.status,
          },
          org: {
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
          },
          challenge: {
            id: challenges.id,
            title: challenges.title,
          },
        })
        .from(memberApplications)
        .leftJoin(users, eq(memberApplications.userId, users.id))
        .leftJoin(organizations, eq(memberApplications.orgId, organizations.id))
        .leftJoin(challenges, eq(memberApplications.challengeId, challenges.id))
        .where(eq(memberApplications.id, id));

      if (!row) return res.status(404).json({ message: "Application not found" });
      res.json(row);
    } catch (error) {
      console.error("Error fetching application:", error);
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  // PATCH /api/super-admin/applications/:id — update score/metrics/status
  app.patch("/api/super-admin/applications/:id", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, aiScore, aiMetrics, aiStrengths, aiRecommendations, aiInsights, manualOverride } = req.body;

      const [app] = await db.select().from(memberApplications).where(eq(memberApplications.id, id));
      if (!app) return res.status(404).json({ message: "Application not found" });

      const update: Record<string, any> = { updatedAt: new Date() };
      if (status !== undefined) { update.status = status; update.reviewedAt = new Date(); }
      if (aiScore !== undefined) update.aiScore = aiScore;
      if (aiMetrics !== undefined) update.aiMetrics = aiMetrics;
      if (aiStrengths !== undefined) update.aiStrengths = aiStrengths;
      if (aiRecommendations !== undefined) update.aiRecommendations = aiRecommendations;
      if (aiInsights !== undefined) update.aiInsights = aiInsights;

      const [updated] = await db.update(memberApplications).set(update).where(eq(memberApplications.id, id)).returning();

      // Handle manual approval/rejection side effects
      if (manualOverride && status) {
        const resendApiKey = process.env.RESEND_API_KEY;
        const resend = resendApiKey ? new Resend(resendApiKey) : null;
        const hostUrl = process.env.HOST_URL || "https://os.fikrahub.com";

        const [user] = await db.select().from(users).where(eq(users.id, app.userId));
        const [org] = await db.select().from(organizations).where(eq(organizations.id, app.orgId));

        if (user && org) {
          const userName = user.firstName || user.email || "there";
          const orgName = org.name;

          const loadTemplate = (name: string, vars: Record<string, string>) => {
            const candidates = [
              path.join(__saDir, "email-templates", `${name}.html`),
              path.join(process.cwd(), "server", "email-templates", `${name}.html`),
              path.join(process.cwd(), "dist", "email-templates", `${name}.html`),
            ];
            const found = candidates.find(p => { try { return fs.existsSync(p); } catch { return false; } });
            if (!found) return "";
            try { return mustache.render(fs.readFileSync(found, "utf8"), vars); } catch { return ""; }
          };

          if (status === "APPROVED") {
            await db.update(users).set({ status: "ACTIVE" }).where(eq(users.id, app.userId));
            if (resend) {
              const loginUrl = `${hostUrl}/w/${org.slug}`;
              const html = loadTemplate("application-approved", { userName, orgName, loginUrl });
              if (html) {
                await resend.emails.send({
                  from: process.env.EMAIL_FROM || "no-reply@fikrahub.com",
                  to: user.email,
                  subject: `🎉 You've been accepted to ${orgName}!`,
                  html,
                }).catch(console.error);
              }
            }
          } else if (status === "REJECTED") {
            if (resend) {
              const html = loadTemplate("application-rejected", { userName, orgName, ideaName: app.ideaName || "your idea" });
              if (html) {
                await resend.emails.send({
                  from: process.env.EMAIL_FROM || "no-reply@fikrahub.com",
                  to: user.email,
                  subject: `Your application to ${orgName} was not accepted`,
                  html,
                }).catch(console.error);
              }
            }
          }
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // POST /api/super-admin/applications/:id/rescreen — re-run AI screening
  app.post("/api/super-admin/applications/:id/rescreen", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [app] = await db.select().from(memberApplications).where(eq(memberApplications.id, id));
      if (!app) return res.status(404).json({ message: "Application not found" });

      // Reset to pending
      await db.update(memberApplications).set({ status: "PENDING_REVIEW", reviewedAt: null, updatedAt: new Date() }).where(eq(memberApplications.id, id));

      // Fire-and-forget re-screening
      screenApplicationAsync(id, app.challengeId || null, app.orgId).catch(console.error);

      res.json({ success: true, message: "Re-screening started" });
    } catch (error) {
      console.error("Error re-screening application:", error);
      res.status(500).json({ message: "Failed to start re-screening" });
    }
  });

  // POST /api/super-admin/applications/:id/refine — re-score with additional admin context
  app.post("/api/super-admin/applications/:id/refine", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { additionalContext } = req.body as { additionalContext?: string };
      if (!additionalContext?.trim()) return res.status(400).json({ message: "additionalContext is required" });

      const [existing] = await db.select().from(memberApplications).where(eq(memberApplications.id, id));
      if (!existing) return res.status(404).json({ message: "Application not found" });

      const result = await refineApplicationAsync(id, additionalContext.trim());
      if (!result) return res.status(500).json({ message: "AI refinement failed — check OpenAI configuration" });

      res.json(result);
    } catch (error) {
      console.error("Error refining application:", error);
      res.status(500).json({ message: "Failed to refine application" });
    }
  });

  // ── Kanban / Idea Management (Super Admin) ────────────────────────────────

  // GET /api/super-admin/kanban/ideas — fetch ideas for a workspace or challenge
  app.get("/api/super-admin/kanban/ideas", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { orgId, challengeId } = req.query as { orgId?: string; challengeId?: string };

      let conditions: any[] = [];
      if (challengeId) {
        conditions.push(eq(projects.challengeId, challengeId));
      } else if (orgId) {
        conditions.push(eq(projects.orgId, orgId));
      } else {
        return res.status(400).json({ error: "orgId or challengeId is required" });
      }

      const results = await db
        .select({
          idea: projects,
          owner: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
          },
        })
        .from(projects)
        .leftJoin(users, eq(projects.createdById, users.id))
        .where(and(...conditions))
        .orderBy(desc(projects.createdAt));

      res.json({ data: results });
    } catch (error) {
      console.error("Error fetching super-admin kanban ideas:", error);
      res.status(500).json({ error: "Failed to fetch ideas" });
    }
  });

  // GET /api/super-admin/activity-insights — cross-workspace activity stats + event log
  app.get("/api/super-admin/activity-insights", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { workspaceId, challengeId } = req.query as { workspaceId?: string; challengeId?: string };

      const wsFilter     = workspaceId  ? sql`AND o.id = ${workspaceId}`        : sql``;
      const wsFilterDirect = workspaceId ? sql`AND om.org_id = ${workspaceId}`  : sql``;
      const challengeFilter = challengeId ? sql`AND cs.challenge_id = ${challengeId}` : sql``;

      // Submissions aggregated by challenge
      const submissionsResult = await db.execute(sql`
        SELECT
          o.id            AS "workspaceId",
          o.name          AS "workspaceName",
          o.slug          AS "workspaceSlug",
          c.id            AS "challengeId",
          c.title         AS "challengeTitle",
          COUNT(cs.id)::int                        AS "totalSubmissions",
          COUNT(cs.pitch_deck_url)::int            AS "withPitchDeck",
          COUNT(cs.prototype_url)::int             AS "withPrototype",
          MIN(cs.created_at)                       AS "firstSubmissionAt",
          MAX(cs.created_at)                       AS "lastSubmissionAt"
        FROM   challenge_submissions cs
        JOIN   challenges c ON c.id = cs.challenge_id
        JOIN   organizations o ON o.id = c.org_id
        WHERE  1=1 ${wsFilter} ${challengeFilter}
        GROUP BY o.id, o.name, o.slug, c.id, c.title
        ORDER BY MAX(cs.created_at) DESC NULLS LAST
      `);

      // Applications aggregated by workspace (fixed status casing)
      const applicationsResult = await db.execute(sql`
        SELECT
          o.id   AS "workspaceId",
          o.name AS "workspaceName",
          o.slug AS "workspaceSlug",
          COUNT(*)::int                                                         AS "total",
          COUNT(*) FILTER (WHERE ma.status = 'APPROVED')::int                  AS "approved",
          COUNT(*) FILTER (WHERE ma.status = 'REJECTED')::int                  AS "rejected",
          COUNT(*) FILTER (WHERE ma.status = 'PENDING_REVIEW')::int            AS "pending",
          COUNT(*) FILTER (WHERE ma.status = 'AI_REVIEWED')::int               AS "aiReviewed"
        FROM   member_applications ma
        JOIN   organizations o ON o.id = ma.org_id
        WHERE  1=1 ${wsFilter}
        GROUP BY o.id, o.name, o.slug
        ORDER BY COUNT(*) DESC
      `);

      // Members by workspace
      const invitesResult = await db.execute(sql`
        SELECT
          o.id   AS "workspaceId",
          o.name AS "workspaceName",
          o.slug AS "workspaceSlug",
          COUNT(*)::int                                               AS "totalInvited",
          COUNT(*) FILTER (WHERE om.role = 'MEMBER')::int            AS "members",
          COUNT(*) FILTER (WHERE om.role = 'MENTOR')::int            AS "mentors",
          COUNT(*) FILTER (WHERE om.role = 'ADMIN')::int             AS "admins"
        FROM   organization_members om
        JOIN   organizations o ON o.id = om.org_id
        WHERE  om.role != 'OWNER' ${wsFilterDirect}
        GROUP BY o.id, o.name, o.slug
        ORDER BY COUNT(*) DESC
      `);

      // High-level totals (fixed status casing)
      const totalsResult = await db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int FROM challenge_submissions cs
            JOIN challenges c ON c.id = cs.challenge_id
            JOIN organizations o ON o.id = c.org_id
            WHERE 1=1 ${wsFilter} ${challengeFilter})                             AS "totalSubmissions",
          (SELECT COUNT(*)::int FROM member_applications ma
            JOIN organizations o ON o.id = ma.org_id
            WHERE 1=1 ${wsFilter})                                                AS "totalApplications",
          (SELECT COUNT(*)::int FROM member_applications ma
            JOIN organizations o ON o.id = ma.org_id
            WHERE ma.status = 'APPROVED' ${wsFilter})                             AS "approvedApplications",
          (SELECT COUNT(*)::int FROM member_applications ma
            JOIN organizations o ON o.id = ma.org_id
            WHERE ma.status = 'REJECTED' ${wsFilter})                             AS "rejectedApplications",
          (SELECT COUNT(*)::int FROM organization_members om
            WHERE om.role != 'OWNER' ${wsFilterDirect})                           AS "totalInvites"
      `);

      // Activity log — individual events sorted newest first (all time, respects workspace filter)
      const activityLogResult = await db.execute(sql`
        SELECT * FROM (
          -- Challenge submissions
          SELECT
            'submission'       AS "type",
            cs.id              AS "id",
            cs.created_at      AS "eventAt",
            u.first_name       AS "firstName",
            u.last_name        AS "lastName",
            u.email            AS "email",
            cs.title           AS "detail",
            c.title            AS "subDetail",
            o.name             AS "workspaceName",
            o.slug             AS "workspaceSlug",
            NULL               AS "status"
          FROM challenge_submissions cs
          JOIN challenges c ON c.id = cs.challenge_id
          JOIN organizations o ON o.id = c.org_id
          JOIN users u ON u.id = cs.user_id
          WHERE 1=1 ${wsFilter} ${challengeFilter}

          UNION ALL

          -- Application reviews (approved/rejected)
          SELECT
            'application'      AS "type",
            ma.id              AS "id",
            COALESCE(ma.reviewed_at, ma.submitted_at) AS "eventAt",
            u.first_name       AS "firstName",
            u.last_name        AS "lastName",
            u.email            AS "email",
            ma.idea_name       AS "detail",
            o.name             AS "subDetail",
            o.name             AS "workspaceName",
            o.slug             AS "workspaceSlug",
            ma.status          AS "status"
          FROM member_applications ma
          JOIN organizations o ON o.id = ma.org_id
          JOIN users u ON u.id = ma.user_id
          WHERE 1=1 ${wsFilter}

          UNION ALL

          -- Member invites / joins
          SELECT
            'invite'           AS "type",
            om.id              AS "id",
            om.created_at      AS "eventAt",
            u.first_name       AS "firstName",
            u.last_name        AS "lastName",
            u.email            AS "email",
            om.role::text      AS "detail",
            o.name             AS "subDetail",
            o.name             AS "workspaceName",
            o.slug             AS "workspaceSlug",
            NULL               AS "status"
          FROM organization_members om
          JOIN organizations o ON o.id = om.org_id
          JOIN users u ON u.id = om.user_id
          WHERE om.role::text != 'OWNER' ${wsFilterDirect}

          UNION ALL

          -- Platform events (role updates, member removes, idea status, program progress, etc.)
          SELECT
            pe.event_type::text AS "type",
            pe.id              AS "id",
            pe.created_at      AS "eventAt",
            actor.first_name   AS "firstName",
            actor.last_name    AS "lastName",
            COALESCE(actor.email, '')  AS "email",
            CASE
              WHEN pe.event_type = 'ROLE_UPDATED'               THEN COALESCE(target.email, pe.target_entity_label, 'Unknown user')
              WHEN pe.event_type = 'MEMBER_REMOVED'             THEN COALESCE(pe.target_entity_label, target.email, 'Unknown user')
              WHEN pe.event_type = 'IDEA_STATUS_CHANGED'        THEN pe.target_entity_label
              WHEN pe.event_type = 'PROGRAM_PROGRESS_UPDATED'   THEN 'Step ' || COALESCE((pe.metadata->>'currentStep'), '?')
              ELSE pe.target_entity_label
            END                AS "detail",
            CASE
              WHEN pe.event_type = 'ROLE_UPDATED'               THEN COALESCE((pe.metadata->>'newRole'), '')
              WHEN pe.event_type = 'MEMBER_REMOVED'             THEN ''
              WHEN pe.event_type = 'IDEA_STATUS_CHANGED'        THEN COALESCE((pe.metadata->>'previousStatus'), '') || ' → ' || COALESCE((pe.metadata->>'newStatus'), '')
              WHEN pe.event_type = 'PROGRAM_PROGRESS_UPDATED'   THEN 'Step ' || COALESCE((pe.metadata->>'previousStep'), '?') || ' → Step ' || COALESCE((pe.metadata->>'currentStep'), '?')
              ELSE ''
            END                AS "subDetail",
            o.name             AS "workspaceName",
            o.slug             AS "workspaceSlug",
            NULL               AS "status"
          FROM platform_events pe
          JOIN organizations o ON o.id = pe.org_id
          LEFT JOIN users actor  ON actor.id  = pe.actor_id
          LEFT JOIN users target ON target.id = pe.target_user_id
          WHERE 1=1 ${wsFilter}
        ) events
        ORDER BY "eventAt" DESC NULLS LAST
        LIMIT 200
      `);

      res.json({
        totals: totalsResult.rows[0] || {},
        submissions: submissionsResult.rows,
        applications: applicationsResult.rows,
        invites: invitesResult.rows,
        activityLog: activityLogResult.rows,
      });
    } catch (error) {
      console.error("Error fetching activity insights:", error);
      res.status(500).json({ error: "Failed to fetch activity insights" });
    }
  });

  // PATCH /api/super-admin/kanban/ideas/:id/status — update idea status
  app.patch("/api/super-admin/kanban/ideas/:id/status", isAuthenticated, isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: string };

      const VALID_STATUSES = ["BACKLOG", "UNDER_REVIEW", "SHORTLISTED", "IN_INCUBATION", "ARCHIVED"];
      if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const [project] = await db.select().from(projects).where(eq(projects.id, id));
      if (!project) return res.status(404).json({ error: "Idea not found" });

      const [updated] = await db
        .update(projects)
        .set({ status: status as any, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();

      // Log platform event
      db.insert(platformEvents).values({
        orgId: project.orgId,
        actorId: (req as any).user?.id,
        eventType: 'IDEA_STATUS_CHANGED',
        targetEntityId: id,
        targetEntityLabel: project.name,
        metadata: { previousStatus: project.status, newStatus: status },
      }).catch(console.error);

      res.json(updated);
    } catch (error) {
      console.error("Error updating idea status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // GET /api/super-admin/email-templates — list all templates with metadata + content
  app.get('/api/super-admin/email-templates', isAuthenticated, isSuperAdmin, (req, res) => {
    const tplDir = [
      path.join(__saDir, 'email-templates'),
      path.join(process.cwd(), 'server', 'email-templates'),
    ].find(d => { try { return fs.existsSync(d); } catch { return false; } });
    if (!tplDir) return res.json([]);
    const files = fs.readdirSync(tplDir).filter(f => f.endsWith('.html'));
    const templates = files.map(f => ({
      name: f.replace('.html', ''),
      filename: f,
      content: fs.readFileSync(path.join(tplDir, f), 'utf8'),
    }));
    res.json(templates);
  });

  // PUT /api/super-admin/email-templates/:name — update template content
  app.put('/api/super-admin/email-templates/:name', isAuthenticated, isSuperAdmin, (req, res) => {
    const { name } = req.params;
    if (!/^[a-z0-9-]+$/.test(name)) return res.status(400).json({ error: 'Invalid template name' });
    const { content } = req.body;
    if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Content required' });
    const tplDir = [
      path.join(__saDir, 'email-templates'),
      path.join(process.cwd(), 'server', 'email-templates'),
    ].find(d => { try { return fs.existsSync(d); } catch { return false; } });
    if (!tplDir) return res.status(500).json({ error: 'Template directory not found' });
    const filePath = path.join(tplDir, `${name}.html`);
    if (!filePath.startsWith(tplDir)) return res.status(400).json({ error: 'Invalid path' });
    fs.writeFileSync(filePath, content, 'utf8');
    res.json({ ok: true });
  });
}
