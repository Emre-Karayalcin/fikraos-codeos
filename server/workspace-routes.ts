import type { Express } from "express";
import { db } from "./db";
import { organizations, users, organizationMembers } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword, comparePasswords } from "./auth";
import { storage } from "./storage";
import { randomBytes } from "crypto";
import { authRateLimiter, orgCreationLimiter } from "./middleware/security";
import { passwordValidation, handleValidationErrors, emailValidation } from "./middleware/validation";

export function registerWorkspaceRoutes(app: Express) {

  // ✅ SECURITY FIX (P1): Add rate limiting to prevent workspace enumeration
  // Reuses orgCreationLimiter (3 requests per 24 hours) to prevent abuse
  app.get('/api/workspaces/check-slug/:slug', orgCreationLimiter, async (req, res) => {
    try {
      const { slug } = req.params;

      // Validate slug format (lowercase, alphanumeric, hyphens)
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return res.json({ available: false, reason: 'Invalid format. Use lowercase letters, numbers, and hyphens only.' });
      }

      // Check if slug exists
      const existing = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);

      res.json({
        available: existing.length === 0,
        reason: existing.length > 0 ? 'This workspace name is already taken.' : undefined
      });
    } catch (error) {
      console.error('Error checking slug:', error);
      res.status(500).json({ error: 'Failed to check workspace name' });
    }
  });

  // Get workspace by slug
  app.get('/api/workspaces/:slug', async (req, res) => {
    try {
      const { slug } = req.params;

      const [workspace] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1);

      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Return public info only
      res.json({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        logoUrl: workspace.logoUrl,
        darkLogoUrl: workspace.darkLogoUrl,
        primaryColor: workspace.primaryColor,
        defaultRoute: workspace.defaultRoute,
      });
    } catch (error) {
      console.error('Error fetching workspace:', error);
      res.status(500).json({ error: 'Failed to fetch workspace' });
    }
  });

  // Create new workspace (admin signup)
  app.post('/api/workspaces/create', orgCreationLimiter, async (req, res) => {
    try {
      const {
        workspaceName,
        workspaceSlug,
        adminEmail,
        adminPassword,
        adminFirstName,
        adminLastName
      } = req.body;

      // Validate required fields
      if (!workspaceName || !workspaceSlug || !adminEmail || !adminPassword) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate password strength
      if (adminPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }
      if (!/[a-z]/.test(adminPassword)) {
        return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
      }
      if (!/[A-Z]/.test(adminPassword)) {
        return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
      }
      if (!/[0-9]/.test(adminPassword)) {
        return res.status(400).json({ error: 'Password must contain at least one number' });
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(adminPassword)) {
        return res.status(400).json({ error: 'Password must contain at least one special character' });
      }

      // Validate slug format
      if (!/^[a-z0-9-]+$/.test(workspaceSlug)) {
        return res.status(400).json({ error: 'Invalid workspace slug format' });
      }

      // Check if slug already exists
      const existingOrg = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, workspaceSlug))
        .limit(1);

      if (existingOrg.length > 0) {
        return res.status(400).json({ error: 'Workspace slug already taken' });
      }

      // Check if email already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, adminEmail))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // SECURITY: Hash password using scrypt
      const hashedPassword = await hashPassword(adminPassword);

      // Create organization
      const [organization] = await db
        .insert(organizations)
        .values({
          name: workspaceName,
          slug: workspaceSlug,
          challengesEnabled: true,
          expertsEnabled: true,
          radarEnabled: true
        })
        .returning();

      // Create admin user with unique username
      const baseUsername = adminEmail.split('@')[0];
      // Add random suffix to ensure uniqueness
      const username = `${baseUsername}`;
      const [user] = await db
        .insert(users)
        .values({
          username,
          email: adminEmail,
          password: hashedPassword,
          firstName: adminFirstName,
          lastName: adminLastName
        })
        .returning();

      // Add user as OWNER of organization
      await db.insert(organizationMembers).values({
        orgId: organization.id,
        userId: user.id,
        role: 'OWNER'
      });

      // Log the user in
      (req as any).login(user, (err: any) => {
        if (err) {
          console.error('Error logging in after signup:', err);
          return res.status(500).json({ error: 'Workspace created but login failed' });
        }

        res.json({
          success: true,
          workspace: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug
          },
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          }
        });
      });
    } catch (error) {
      console.error('Error creating workspace:', error);
      res.status(500).json({ error: 'Failed to create workspace' });
    }
  });

  // Workspace login
  app.post('/api/workspaces/:slug/login', authRateLimiter, async (req, res) => {
    try {
      const { slug } = req.params;
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Get workspace
      const [workspace] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1);

      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Get user by email (regardless of workspace membership)
      const user = await storage.getUserByEmail(email);

      if (!user || !user.password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if user is member of this workspace
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(and(
          eq(organizationMembers.userId, user.id),
          eq(organizationMembers.orgId, workspace.id)
        ))
        .limit(1);

      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this workspace' });
      }

      // Log the user in
      (req as any).login(user, (err: any) => {
        if (err) {
          console.error('Error logging in:', err);
          return res.status(500).json({ error: 'Login failed' });
        }

        res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName
          },
          workspace: {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug
          },
          role: membership.role
        });
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Workspace signup (for members)
  // SECURITY: Use centralized password validation middleware
  app.post('/api/workspaces/:slug/signup',
    authRateLimiter,
    [...emailValidation(), ...passwordValidation()],
    handleValidationErrors,
    async (req, res) => {
    try {
      const { slug } = req.params;
      const { email, password, firstName, lastName } = req.body;

      // Get workspace
      const [workspace] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1);

      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmailOrganization(email, workspace.id);
      console.log('Existing user check:', existingUser);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      // SECURITY: Hash password using scrypt
      const hashedPassword = await hashPassword(password);

      // Create user with unique username
      const baseUsername = email.split('@')[0];
      // Add random suffix to ensure uniqueness (cryptographically secure)
      const randomSuffix = randomBytes(4).toString('hex');
      const username = `${baseUsername}_${randomSuffix}`;
      const [user] = await db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
          firstName,
          lastName
        })
        .returning();

      // Add user as MEMBER of organization
      await db.insert(organizationMembers).values({
        orgId: workspace.id,
        userId: user.id,
        role: 'MEMBER'
      });

      // SECURITY: Regenerate session to prevent session fixation attacks
      (req as any).session.regenerate((regenerateErr: any) => {
        if (regenerateErr) {
          console.error('Session regeneration error:', regenerateErr);
          return res.status(500).json({ error: 'Session creation failed' });
        }

        // Log the user in
        (req as any).login(user, (err: any) => {
          if (err) {
            console.error('Error logging in after signup:', err);
            return res.status(500).json({ error: 'Account created but login failed' });
          }

          res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          },
          workspace: {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug
          }
        });
        });
      });
    } catch (error) {
      console.error('Error during signup:', error);
      res.status(500).json({ error: 'Signup failed' });
    }
  });
}
