import type { Express, Request, Response, NextFunction } from "express";
import { isAuthenticated, comparePasswords, hashPassword } from "./auth";
import { authRateLimiter } from "./middleware/security";
import { storage } from "./storage";
import { db } from "./db";
import { sql, eq, and } from "drizzle-orm";
import { organizations, organizationMembers, projects, challenges, assets, chats, messages, users } from "../shared/schema";

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
          COALESCE((SELECT COUNT(*)::int FROM assets           a  WHERE a.project_id IN (SELECT p.id FROM projects p WHERE p.org_id = o.id)), 0) AS "assetCount"
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
      await storage.removeMemberFromOrganization(id, userId);
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
}
