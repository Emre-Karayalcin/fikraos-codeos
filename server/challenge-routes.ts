import type { Express } from "express";
import { isAuthenticated } from "./auth";
import { db } from "./db";
import {
  challenges,
  challengeSubmissions,
  organizations,
  organizationMembers,
  users,
  projects
} from "@shared/schema";
import { eq, and, desc, sql, asc, inArray } from "drizzle-orm";
import { verifyWorkspaceAccess, requireOrgIdAndAccess } from "./middleware/workspace-access";
import {
  createChallengeSchema,
  updateChallengeSchema,
  createSubmissionSchema,
  reorderChallengesSchema,
  validateRequest,
} from "@shared/validation-schemas";

export function registerChallengeRoutes(app: Express) {

  // GET /api/challenges - List challenges for workspace
  app.get('/api/challenges', isAuthenticated, requireOrgIdAndAccess, async (req: any, res) => {
    try {
      const { orgId, status } = req.query;

      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      let conditions: any[] = [eq(challenges.orgId, orgId)];

      // Filter by status if provided
      if (status) {
        conditions.push(eq(challenges.status, status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({
          challenge: challenges,
          creator: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(challenges)
        .leftJoin(users, eq(challenges.createdBy, users.id))
        .where(whereClause)
        .orderBy(asc(challenges.sortOrder), desc(challenges.createdAt));

      res.json(result);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      res.status(500).json({ error: 'Failed to fetch challenges' });
    }
  });

  // GET /api/challenges/slug/:slug - Get challenge by slug
  app.get('/api/challenges/slug/:slug', isAuthenticated, async (req: any, res) => {
    try {
      const { slug } = req.params;

      const [result] = await db
        .select({
          challenge: challenges,
          creator: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(challenges)
        .leftJoin(users, eq(challenges.createdBy, users.id))
        .where(eq(challenges.slug, slug));
      
      if (!result) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      // ✅ Fetch projects linked to this challenge
      const challengeProjects = await db
        .select({
          id: projects.id,
          title: projects.title,
          description: projects.description,
          type: projects.type,
          status: projects.status,
          submitted: projects.submitted,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
          deploymentUrl: projects.deploymentUrl,
          createdBy: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(projects)
        .leftJoin(users, eq(projects.createdById, users.id))
        .where(
          and(
            eq(projects.challengeId, result.challenge.id),
            eq(projects.createdById, req.user.id) // ✅ SECURITY FIX: Only show user's own ideas
          )
        )
        .orderBy(desc(projects.createdAt));

      // ✅ Attach projects to challenge
      const response = {
        ...result,
        challenge: {
          ...result.challenge,
          projects: challengeProjects
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching challenge by slug:', error);
      res.status(500).json({ error: 'Failed to fetch challenge' });
    }
  });

  // GET /api/challenges/:id - Get single challenge
  app.get('/api/challenges/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      const [result] = await db
        .select({
          challenge: challenges,
          creator: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(challenges)
        .leftJoin(users, eq(challenges.createdBy, users.id))
        .where(eq(challenges.id, id));

      if (!result) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      // Verify user has access to this workspace
      const [member] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, result.challenge.orgId),
            eq(organizationMembers.userId, req.user.id)
          )
        );

      if (!member) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(result);
    } catch (error) {
      console.error('Error fetching challenge:', error);
      res.status(500).json({ error: 'Failed to fetch challenge' });
    }
  });

  // POST /api/challenges - Create new challenge (admin only)
  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  app.post('/api/challenges', isAuthenticated, verifyWorkspaceAccess, validateRequest(createChallengeSchema), async (req: any, res) => {
    try {
      const {
        orgId,
        title,
        description,
        shortDescription,
        slug,
        deadline,
        tags,
        maxSubmissions,
        image,
        emoji,
        status,
        prize,
        evaluationCriteria
      } = req.body;

      if (!orgId || !title || !description || !deadline) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if user is admin
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, orgId),
            eq(organizationMembers.userId, req.user.id)
          )
        );

      if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Create challenge
      const [challenge] = await db.insert(challenges).values({
        orgId,
        title,
        description,
        shortDescription,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        deadline: new Date(deadline),
        tags: tags || [],
        submissionCount: 0,
        maxSubmissions: maxSubmissions || 100,
        image,
        emoji: emoji || '🎯',
        status: status || 'draft',
        prize,
        evaluationCriteria,
        createdBy: req.user.id
      }).returning();

      res.json(challenge);
    } catch (error) {
      console.error('Error creating challenge:', error);
      res.status(500).json({ error: 'Failed to create challenge' });
    }
  });

  // PATCH /api/challenges/:id - Update challenge (admin only)
  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  app.patch('/api/challenges/:id', isAuthenticated, validateRequest(updateChallengeSchema), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Get challenge to verify workspace access
      const [challenge] = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, id));

      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      // Check if user is admin
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, challenge.orgId),
            eq(organizationMembers.userId, req.user.id)
          )
        );

      if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Update challenge with field whitelisting (prevent mass assignment)
      const allowedFields = ['title', 'description', 'shortDescription', 'deadline', 'status', 'tags', 'emoji', 'prize', 'maxSubmissions', 'evaluationCriteria', 'isActive'];
      const sanitizedUpdate: any = { updatedAt: new Date() };

      allowedFields.forEach(field => {
        if (field in updateData) {
          // Convert deadline string to Date object (Drizzle timestamp columns require Date)
          sanitizedUpdate[field] = field === 'deadline' ? new Date(updateData[field]) : updateData[field];
        }
      });

      const [updated] = await db
        .update(challenges)
        .set(sanitizedUpdate)
        .where(eq(challenges.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error('Error updating challenge:', error);
      res.status(500).json({ error: 'Failed to update challenge' });
    }
  });

  // DELETE /api/challenges/:id - Delete challenge (admin only)
  app.delete('/api/challenges/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Get challenge to verify workspace access
      const [challenge] = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, id));

      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      // Check if user is admin
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, challenge.orgId),
            eq(organizationMembers.userId, req.user.id)
          )
        );

      if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // ✅ Step 1: Delete all projects associated with this challenge
      await db
        .delete(projects)
        .where(eq(projects.challengeId, id));

      // ✅ Step 2: Delete all submissions associated with this challenge
      await db
        .delete(challengeSubmissions)
        .where(eq(challengeSubmissions.challengeId, id));

      // ✅ Step 3: Delete the challenge itself
      await db
        .delete(challenges)
        .where(eq(challenges.id, id));

      res.json({ message: 'Challenge and associated projects deleted successfully' });
    } catch (error) {
      console.error('Error deleting challenge:', error);
      res.status(500).json({ error: 'Failed to delete challenge' });
    }
  });

  // POST /api/challenges/reorder - Bulk update sort order (admin only)
  app.post('/api/challenges/reorder', isAuthenticated, validateRequest(reorderChallengesSchema), async (req: any, res) => {
    try {
      const { orgId, ids } = req.body;

      // Check if user is admin
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, orgId),
            eq(organizationMembers.userId, req.user.id)
          )
        );

      if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Update each challenge's sortOrder to match the position in the ids array
      await Promise.all(
        ids.map((id: string, index: number) =>
          db.update(challenges)
            .set({ sortOrder: index, updatedAt: new Date() })
            .where(and(eq(challenges.id, id), eq(challenges.orgId, orgId)))
        )
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error reordering challenges:', error);
      res.status(500).json({ error: 'Failed to reorder challenges' });
    }
  });

  // GET /api/challenges/:id/submissions - Get submissions for a challenge
  app.get('/api/challenges/:id/submissions', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Get challenge to verify workspace access
      const [challenge] = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, id));

      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      // Verify user has access to this workspace
      const [member] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, challenge.orgId),
            eq(organizationMembers.userId, req.user.id)
          )
        );

      if (!member) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get submissions
      const submissions = await db
        .select({
          submission: challengeSubmissions,
          user: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl
          }
        })
        .from(challengeSubmissions)
        .leftJoin(users, eq(challengeSubmissions.userId, users.id))
        .where(eq(challengeSubmissions.challengeId, id))
        .orderBy(desc(challengeSubmissions.createdAt));

      res.json(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ error: 'Failed to fetch submissions' });
    }
  });

  // GET /api/challenges/:id/ideas - Get all ideas for a challenge (admin only)
  app.get('/api/challenges/:id/ideas', isAuthenticated, async (req: any, res) => {
    try {
      const { id: challengeId } = req.params;

      // Get challenge to verify access
      const [challenge] = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, challengeId));

      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      // Verify admin access
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, challenge.orgId),
            eq(organizationMembers.userId, req.user.id)
          )
        );

      if (!membership || !['OWNER', 'ADMIN', 'MENTOR'].includes(membership.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Fetch all projects for this challenge
      const challengeProjects = await db
        .select({
          idea: projects,
          owner: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl
          }
        })
        .from(projects)
        .leftJoin(users, eq(projects.createdById, users.id))
        .where(eq(projects.challengeId, challengeId))
        .orderBy(desc(projects.createdAt));

      res.json({ data: challengeProjects });
    } catch (error) {
      console.error('Error fetching challenge ideas:', error);
      res.status(500).json({ error: 'Failed to fetch challenge ideas' });
    }
  });

  // POST /api/challenges/:id/submissions - Submit to a challenge
  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  app.post('/api/challenges/:id/submissions', isAuthenticated, validateRequest(createSubmissionSchema), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, description, submissionUrl, ideaId, attachments } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      // Get challenge to verify workspace access
      const [challenge] = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, id));

      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      // Verify user has access to this workspace
      const [member] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, challenge.orgId),
            eq(organizationMembers.userId, req.user.id)
          )
        );

      if (!member) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Create submission
      const [submission] = await db.insert(challengeSubmissions).values({
        challengeId: id,
        userId: req.user.id,
        ideaId,
        title,
        description,
        submissionUrl,
        attachments: attachments || [],
        status: 'submitted'
      }).returning();

      // Update submission count
      await db
        .update(challenges)
        .set({
          submissionCount: sql`${challenges.submissionCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(challenges.id, id));

      res.json(submission);
    } catch (error) {
      console.error('Error creating submission:', error);
      res.status(500).json({ error: 'Failed to create submission' });
    }
  });

  // POST /api/challenges/:id/submit-project/:projectId - Submit an existing project to challenge
  app.post('/api/challenges/:id/submit-project/:projectId', isAuthenticated, async (req: any, res) => {
    try {
      const { id: challengeId, projectId } = req.params;
      const userId = req.user.id;

      // Verify challenge exists and is active
      const [challenge] = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, challengeId));

      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      if (challenge.status === 'ended') {
        return res.status(400).json({ error: 'Challenge has ended' });
      }

      // Check max submissions
      if (challenge.maxSubmissions && challenge.submissionCount >= challenge.maxSubmissions) {
        return res.status(400).json({ error: 'Challenge has reached maximum submissions' });
      }

      // Verify project exists and user owns it
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.createdById, userId),
            eq(projects.challengeId, challengeId)
          )
        );

      if (!project) {
        return res.status(404).json({ error: 'Project not found or not owned by you' });
      }

      // Validate required fields
      if (!project.title || project.title.trim() === '') {
        return res.status(400).json({ error: 'Project must have a title before submission' });
      }

      // Check if user already submitted to this challenge
      const existingSubmissions = await db
        .select()
        .from(challengeSubmissions)
        .where(
          and(
            eq(challengeSubmissions.challengeId, challengeId),
            eq(challengeSubmissions.userId, userId)
          )
        );

      if (existingSubmissions.length > 0) {
        return res.status(400).json({ error: 'You have already submitted to this challenge' });
      }

      // Create submission from project
      // Note: ideaId is set to null because it references the legacy 'ideas' table,
      // and this project comes from the 'projects' table. The project info is copied into the submission.
      const [submission] = await db
        .insert(challengeSubmissions)
        .values({
          challengeId,
          userId,
          ideaId: null, // Not linked to legacy ideas table
          title: project.title,
          description: project.description && project.description.trim() !== ''
            ? project.description
            : `Challenge submission for: ${challenge.title}`,
          submissionUrl: project.deploymentUrl || '',
          status: 'submitted',
          attachments: [],
        })
        .returning();

      // Mark project as submitted to hide it from "My Challenge Ideas"
      await db
        .update(projects)
        .set({ submitted: true })
        .where(eq(projects.id, projectId));

      // Increment challenge submission count
      await db
        .update(challenges)
        .set({
          submissionCount: sql`${challenges.submissionCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(challenges.id, challengeId));

      // Trigger auto-evaluation in background (non-blocking)
      // Import will be added at the top of the file
      setImmediate(async () => {
        try {
          const { evaluateProjectAsync } = await import('./lib/backgroundEvaluation.js');
          await evaluateProjectAsync(
            projectId,
            userId,
            challengeId,
            challenge.evaluationCriteria
          );
        } catch (error) {
          console.error('Background evaluation failed:', error);
          // Fail silently - don't disrupt submission flow
        }
      });

      res.json(submission);
    } catch (error) {
      console.error('Error submitting project to challenge:', error);
      // Return detailed error in development, generic in production
      const errorMessage = process.env.NODE_ENV === 'development'
        ? (error as Error).message
        : 'Failed to submit project';
      res.status(500).json({ error: errorMessage });
    }
  });
}
