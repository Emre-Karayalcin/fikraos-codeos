import type { Express, Request, Response, NextFunction } from "express";
import { isAuthenticated, comparePasswords } from "./auth";
import { authRateLimiter } from "./middleware/security";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";

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
}
