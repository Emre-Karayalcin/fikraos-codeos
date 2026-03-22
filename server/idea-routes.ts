import type { Express } from "express";
import { isAuthenticated } from "./auth";
import { db } from "./db";
import { sanitizeHtml, escapeHtml } from "./middleware/validation";
import { canAccessIdea, canModifyIdea, canModifyProject } from "./middleware/authorization";
import {
  createIdeaSchema,
  updateIdeaSchema,
  addWatcherSchema,
  createCommentSchema,
  updateCommentSchema,
  updateReviewSchema,
  uploadMetricsSchema,
  evaluateIdeaSchema,
  scoreIdeaSchema,
  createMetricsSetSchema,
  updateOrganizationSchema,
  validateRequest,
} from "@shared/validation-schemas";
import {
  ideas,
  projects,
  comments,
  reviews,
  metricsSets,
  ideaScores,
  auditLogs,
  notifications,
  users,
  organizationMembers,
  organizations
} from "@shared/schema";
import fs from 'fs';
import path from 'path';
import mustache from 'mustache';
import { eq, and, desc, or, sql, inArray, ilike } from "drizzle-orm";
import { aiOutputsProvider } from "./providers/aiOutputsProvider";
import { aiScoringProvider } from "./providers/aiScoringProvider";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { Resend } from 'resend';
import { fileURLToPath } from "url";
import { requireOrgIdAndAccess } from "./middleware/workspace-access";
import { fileUploadLimiter, aiRateLimiter } from "./middleware/security";

// ✅ SECURITY FIX (P1): Add file size limits to prevent DoS via memory exhaustion
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1 * 1024 * 1024,  // 1MB max for CSV/JSON metrics files
    files: 1,                    // Single file only
    fields: 10,                  // Limit form fields
    parts: 11                    // Total parts (fields + files)
  },
  fileFilter: (req, file, cb) => {
    // Only allow CSV and JSON files for metrics upload
    const allowedTypes = ['text/csv', 'application/json', 'text/plain'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and JSON files are allowed for metrics upload'));
    }
  }
});

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client only if API key is available
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

if (!anthropic) {
  console.warn("⚠️  ANTHROPIC_API_KEY not set - AI evaluation features will be disabled");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function registerIdeaRoutes(app: Express) {

  // GET /api/ideas - List ideas with filters and pagination
  // SECURITY: Added workspace access verification to prevent unauthorized access
  app.get('/api/ideas/management', isAuthenticated, requireOrgIdAndAccess, async (req: any, res) => {
    try {
      const {
        orgId,
        sort = 'createdAt',
        page = '1',
        pageSize = '20'
      } = req.query;

      const pageNum = parseInt(page);
      const pageSizeNum = parseInt(pageSize);
      const offset = (pageNum - 1) * pageSizeNum;

      let conditions: any[] = [];

      // Filter by orgId if provided
      if (orgId) {
        conditions.push(eq(projects.orgId, orgId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(whereClause);

      // Get paginated results
      let query = db
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
        .where(whereClause)
        .limit(pageSizeNum)
        .offset(offset);

      // Apply sorting
      if (sort === 'createdAt') {
        query = query.orderBy(desc(projects.createdAt)) as any;
      } else if (sort === 'updatedAt') {
        query = query.orderBy(desc(projects.updatedAt)) as any;
      } else if (sort === 'title') {
        query = query.orderBy(projects.title) as any;
      }

      const results = await query;

      res.json({
        data: results,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total: Number(count),
          totalPages: Math.ceil(Number(count) / pageSizeNum)
        }
      });
    } catch (error) {
      console.error('Error fetching ideas:', error);
      res.status(500).json({ error: 'Failed to fetch ideas' });
    }
  });

  // GET /api/ideas/:id - Get single idea with details
  // SECURITY FIX (P0): Added canAccessIdea to prevent IDOR
  app.get('/api/ideas/management/:id', isAuthenticated, canAccessIdea, async (req: any, res) => {
    try {
      const { id } = req.params;

      const [result] = await db
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
        .where(eq(projects.id, id));

      if (!result) {
        return res.status(404).json({ error: 'Idea not found' });
      }

      // Get latest score
      const latestScore = await db
        .select()
        .from(ideaScores)
        .where(eq(ideaScores.ideaId, id))
        .orderBy(desc(ideaScores.createdAt))
        .limit(1);

      res.json({
        ...result,
        commentsCount: 0,
        reviewersCount: 0,
        latestScore: latestScore[0] || null
      });
    } catch (error) {
      console.error('Error fetching idea:', error);
      res.status(500).json({ error: 'Failed to fetch idea' });
    }
  });

  // PATCH /api/ideas/:id/status - Update idea status
  // SECURITY FIX (P1): Added canModifyProject to prevent IDOR (projects table, not ideas)
  app.patch('/api/ideas/management/:id/status', isAuthenticated, canModifyProject, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const actorId = req.user.id;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      // Get current idea
      const [currentIdea] = await db.select().from(projects).where(eq(projects.id, id));
      if (!currentIdea) {
        return res.status(404).json({ error: 'Idea not found' });
      }

      // Update status
      const [updatedIdea] = await db
        .update(projects)
        .set({ status, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();

      // // Create audit log
      // await db.insert(auditLogs).values({
      //   ideaId: id,
      //   actorId,
      //   type: 'STATUS_CHANGED',
      //   data: {
      //     from: currentIdea.status,
      //     to: status
      //   }
      // });

      // // Create notification for owner if not the actor
      // if (currentIdea.createdById !== actorId) {
      //   await db.insert(notifications).values({
      //     userId: currentIdea.createdById,
      //     kind: 'STATUS_CHANGED',
      //     payload: {
      //       ideaId: id,
      //       ideaTitle: currentIdea.title,
      //       from: currentIdea.status,
      //       to: status,
      //       actorId
      //     }
      //   });
      // }

      res.json(updatedIdea);

      // Fire-and-forget: send stage notification email to the idea owner
      setImmediate(async () => {
        try {
          const hostUrl = process.env.HOST_URL || 'https://os.fikrahub.com';
          const resendApiKey = process.env.RESEND_API_KEY;
          if (!resendApiKey) return;
          const resendClient = new Resend(resendApiKey);

          const templateMap: Record<string, { tpl: string; subject: string }> = {
            UNDER_REVIEW: { tpl: 'idea-stage-program-participation', subject: '🚀 Your idea has advanced to Program Participation' },
            SHORTLISTED:  { tpl: 'idea-stage-predemo',               subject: '⭐ Your idea is in Pre-Demo Evaluation' },
            IN_INCUBATION:{ tpl: 'idea-stage-demoday',               subject: "🏆 You've been selected for Demo Day!" },
            ARCHIVED:     { tpl: 'idea-stage-results',               subject: '📢 Program Results Published' },
          };

          const mapping = templateMap[status];
          if (!mapping) return;

          const [owner] = await db.select().from(users).where(eq(users.id, currentIdea.createdById));
          if (!owner?.email) return;

          const [org] = await db.select().from(organizations).where(eq(organizations.id, currentIdea.orgId));
          if (!org) return;

          const loadTpl = (name: string, vars: Record<string, string>) => {
            const candidates = [
              path.join(__dirname, 'email-templates', `${name}.html`),
              path.join(process.cwd(), 'server', 'email-templates', `${name}.html`),
            ];
            const found = candidates.find(p => { try { return fs.existsSync(p); } catch { return false; } });
            if (!found) return '';
            try { return mustache.render(fs.readFileSync(found, 'utf8'), vars); } catch { return ''; }
          };

          const userName = owner.firstName || owner.email || 'there';
          const html = loadTpl(mapping.tpl, {
            userName,
            orgName: org.name,
            ideaTitle: currentIdea.title,
            dashboardUrl: `${hostUrl}/w/${org.slug || org.id}/my-ideas`,
          });
          if (!html) return;

          await resendClient.emails.send({
            from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com',
            to: owner.email,
            subject: mapping.subject,
            html,
          });
        } catch (emailErr) {
          console.error('Failed to send idea stage email:', emailErr);
        }
      });
    } catch (error) {
      console.error('Error updating idea status:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  // GET /api/my-ideas - Flat list of projects (ideas) owned by the current user (for dropdowns)
  app.get('/api/my-ideas', isAuthenticated, async (req: any, res) => {
    try {
      const myIdeas = await db
        .select({ id: projects.id, title: projects.title })
        .from(projects)
        .where(eq(projects.createdById, req.user.id))
        .orderBy(projects.title);
      res.json(myIdeas);
    } catch (error) {
      console.error('Error fetching user ideas:', error);
      res.status(500).json({ error: 'Failed to fetch ideas' });
    }
  });

  // GET /api/ideas - List ideas with filters and pagination
  app.get('/api/ideas', isAuthenticated, async (req: any, res) => {
    try {
      const {
        status,
        tag,
        ownerId,
        orgId,
        q,
        sort = 'createdAt',
        page = '1',
        pageSize = '20'
      } = req.query;

      const pageNum = parseInt(page);
      const pageSizeNum = parseInt(pageSize);
      const offset = (pageNum - 1) * pageSizeNum;

      let conditions: any[] = [];

      // Filter by orgId if provided
      if (orgId) {
        conditions.push(eq(ideas.orgId, orgId));
      }

      // Filter by status (can be array)
      if (status) {
        const statuses = Array.isArray(status) ? status : [status];
        conditions.push(inArray(ideas.status, statuses));
      }

      // Filter by owner
      if (ownerId) {
        conditions.push(eq(ideas.ownerId, ownerId));
      }

      // SECURITY: Search by title/summary using parameterized query to prevent SQL injection
      if (q) {
        const searchPattern = `%${q}%`;
        conditions.push(
          or(
            ilike(ideas.title, searchPattern),
            ilike(ideas.summary, searchPattern)
          )
        );
      }

      // Tag filter (check if tag exists in tags array)
      // ✅ SECURITY FIX (P1): Use proper parameterization to prevent SQL injection
      if (tag && typeof tag === 'string') {
        // Validate and limit tag length
        const trimmedTag = tag.trim().slice(0, 100);
        if (trimmedTag.length > 0) {
          // Use Drizzle's parameterized query - the tag is properly escaped
          const tagArray = [trimmedTag];
          conditions.push(sql`${ideas.tags} @> ${tagArray}::jsonb`);
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(ideas)
        .where(whereClause);

      // Get paginated results
      let query = db
        .select({
          idea: ideas,
          owner: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl
          }
        })
        .from(ideas)
        .leftJoin(users, eq(ideas.ownerId, users.id))
        .where(whereClause)
        .limit(pageSizeNum)
        .offset(offset);

      // Apply sorting
      if (sort === 'createdAt') {
        query = query.orderBy(desc(ideas.createdAt)) as any;
      } else if (sort === 'updatedAt') {
        query = query.orderBy(desc(ideas.updatedAt)) as any;
      } else if (sort === 'title') {
        query = query.orderBy(ideas.title) as any;
      }

      const results = await query;

      res.json({
        data: results,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total: Number(count),
          totalPages: Math.ceil(Number(count) / pageSizeNum)
        }
      });
    } catch (error) {
      console.error('Error fetching ideas:', error);
      res.status(500).json({ error: 'Failed to fetch ideas' });
    }
  });

  // POST /api/ideas - Create new idea
  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  app.post('/api/ideas', isAuthenticated, validateRequest(createIdeaSchema), async (req: any, res) => {
    try {
      const { title, summary, tags, orgId, details } = req.body;
      const ownerId = req.user.id;

      if (!title || !summary || !orgId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const [idea] = await db.insert(ideas).values({
        title,
        summary,
        tags: tags || [],
        ownerId,
        orgId,
        details: details || {},
        status: 'BACKLOG'
      }).returning();

      // Create audit log
      await db.insert(auditLogs).values({
        ideaId: idea.id,
        actorId: ownerId,
        type: 'STATUS_CHANGED',
        data: {
          from: null,
          to: 'BACKLOG',
          reason: 'Idea created'
        }
      });

      res.json(idea);
    } catch (error) {
      console.error('Error creating idea:', error);
      res.status(500).json({ error: 'Failed to create idea' });
    }
  });

  // GET /api/ideas/:id - Get single idea with details
  // SECURITY FIX (P0): Added canAccessIdea middleware to prevent IDOR
  app.get('/api/ideas/:id', isAuthenticated, canAccessIdea, async (req: any, res) => {
    try {
      const { id } = req.params;

      const [result] = await db
        .select({
          idea: ideas,
          owner: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl
          }
        })
        .from(ideas)
        .leftJoin(users, eq(ideas.ownerId, users.id))
        .where(eq(ideas.id, id));

      if (!result) {
        return res.status(404).json({ error: 'Idea not found' });
      }

      // Get counts for related data
      const [commentsCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(and(eq(comments.ideaId, id), eq(comments.isDeleted, false)));

      const [reviewersCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(reviews)
        .where(eq(reviews.ideaId, id));

      // Get latest score
      const latestScore = await db
        .select()
        .from(ideaScores)
        .where(eq(ideaScores.ideaId, id))
        .orderBy(desc(ideaScores.createdAt))
        .limit(1);

      res.json({
        ...result,
        commentsCount: Number(commentsCount.count),
        reviewersCount: Number(reviewersCount.count),
        latestScore: latestScore[0] || null
      });
    } catch (error) {
      console.error('Error fetching idea:', error);
      res.status(500).json({ error: 'Failed to fetch idea' });
    }
  });

  // PATCH /api/ideas/:id/status - Update idea status
  app.patch('/api/ideas/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const actorId = req.user.id;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      // Get current idea
      const [currentIdea] = await db.select().from(ideas).where(eq(ideas.id, id));
      if (!currentIdea) {
        return res.status(404).json({ error: 'Idea not found' });
      }

      // SECURITY: Check authorization - user must be owner OR admin of the organization
      const isOwner = currentIdea.ownerId === actorId;

      if (!isOwner) {
        // Check if user is admin
        const [member] = await db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.orgId, currentIdea.orgId),
              eq(organizationMembers.userId, actorId)
            )
          );

        const isAdmin = member && (member.role === 'OWNER' || member.role === 'ADMIN');

        if (!isAdmin) {
          return res.status(403).json({ error: 'Not authorized to modify this idea' });
        }
      }

      // Update status
      const [updatedIdea] = await db
        .update(ideas)
        .set({ status, updatedAt: new Date() })
        .where(eq(ideas.id, id))
        .returning();

      // Create audit log
      await db.insert(auditLogs).values({
        ideaId: id,
        actorId,
        type: 'STATUS_CHANGED',
        data: {
          from: currentIdea.status,
          to: status
        }
      });

      // Create notification for owner if not the actor
      if (currentIdea.ownerId !== actorId) {
        await db.insert(notifications).values({
          userId: currentIdea.ownerId,
          kind: 'STATUS_CHANGED',
          payload: {
            ideaId: id,
            ideaTitle: currentIdea.title,
            from: currentIdea.status,
            to: status,
            actorId
          }
        });
      }

      res.json(updatedIdea);
    } catch (error) {
      console.error('Error updating idea status:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  // SECURITY FIX (P1): Added canModifyIdea to prevent unauthorized modifications
  app.patch('/api/ideas/management/:id', isAuthenticated, canModifyIdea, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, description, tags } = req.body;
      const actorId = req.user.id;

      // Get current idea for audit log
      const [currentIdea] = await db.select().from(projects).where(eq(projects.id, id));
      if (!currentIdea) {
        return res.status(404).json({ error: 'Idea not found' });
      }

      const updateData: any = { updatedAt: new Date() };
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (tags !== undefined) updateData.tags = tags;

      const [updatedIdea] = await db
        .update(projects)
        .set(updateData)
        .where(eq(projects.id, id))
        .returning();

      if (!updatedIdea) {
        return res.status(404).json({ error: 'Idea not found' });
      }

      res.json(updatedIdea);
    } catch (error) {
      console.error('Error updating idea:', error);
      res.status(500).json({ error: 'Failed to update idea' });
    }
  });

  // PATCH /api/ideas/:id - Update idea details
  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  app.patch('/api/ideas/:id', isAuthenticated, validateRequest(updateIdeaSchema), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, summary, tags, details, status } = req.body;
      const actorId = req.user.id;

      // Get current idea for audit log
      const [currentIdea] = await db.select().from(ideas).where(eq(ideas.id, id));
      if (!currentIdea) {
        return res.status(404).json({ error: 'Idea not found' });
      }

      // SECURITY: Check authorization - user must be owner OR admin of the organization
      const isOwner = currentIdea.ownerId === actorId;

      if (!isOwner) {
        // Check if user is admin
        const [member] = await db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.orgId, currentIdea.orgId),
              eq(organizationMembers.userId, actorId)
            )
          );

        const isAdmin = member && (member.role === 'OWNER' || member.role === 'ADMIN');

        if (!isAdmin) {
          return res.status(403).json({ error: 'Not authorized to modify this idea' });
        }
      }

      const updateData: any = { updatedAt: new Date() };
      if (title !== undefined) updateData.title = title;
      if (summary !== undefined) updateData.summary = summary;
      if (tags !== undefined) updateData.tags = tags;
      if (details !== undefined) updateData.details = details;
      if (status !== undefined) updateData.status = status;

      const [updatedIdea] = await db
        .update(ideas)
        .set(updateData)
        .where(eq(ideas.id, id))
        .returning();

      if (!updatedIdea) {
        return res.status(404).json({ error: 'Idea not found' });
      }

      // Create audit log if status changed
      if (status !== undefined && status !== currentIdea.status) {
        await db.insert(auditLogs).values({
          ideaId: id,
          actorId,
          type: 'STATUS_CHANGED',
          data: {
            from: currentIdea.status,
            to: status
          }
        });

        // Create notification for owner if not the actor
        if (currentIdea.ownerId !== actorId) {
          await db.insert(notifications).values({
            userId: currentIdea.ownerId,
            kind: 'STATUS_CHANGED',
            payload: {
              ideaId: id,
              ideaTitle: currentIdea.title,
              from: currentIdea.status,
              to: status,
              actorId
            }
          });
        }
      }

      res.json(updatedIdea);
    } catch (error) {
      console.error('Error updating idea:', error);
      res.status(500).json({ error: 'Failed to update idea' });
    }
  });

  // DELETE /api/ideas/:id - Delete idea
  app.delete('/api/ideas/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if idea exists and user has permission
      const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));

      if (!idea) {
        return res.status(404).json({ error: 'Idea not found' });
      }

      // Check if user is owner or admin
      const [member] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, idea.orgId),
            eq(organizationMembers.userId, userId)
          )
        );

      const isOwner = idea.ownerId === userId;
      const isAdmin = member && (member.role === 'OWNER' || member.role === 'ADMIN');

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Not authorized to delete this idea' });
      }

      // Delete the idea (cascade will handle related records)
      await db.delete(ideas).where(eq(ideas.id, id));

      // Note: Audit log for IDEA_DELETED not created as it's not in the audit_log_type enum

      res.json({ message: 'Idea deleted successfully' });
    } catch (error) {
      console.error('Error deleting idea:', error);
      res.status(500).json({ error: 'Failed to delete idea' });
    }
  });

  // GET /api/ideas/:id/ai-outputs - Get AI outputs for an idea
  // SECURITY FIX (P0): Added canAccessIdea to prevent IDOR
  app.get('/api/ideas/management/:id/ai-outputs', isAuthenticated, canAccessIdea, async (req: any, res) => {
    try {
      const { id } = req.params;
      const outputs = await aiOutputsProvider.list(id);
      res.json(outputs);
    } catch (error) {
      console.error('Error fetching AI outputs:', error);
      res.status(500).json({ error: 'Failed to fetch AI outputs' });
    }
  });

  // GET /api/ideas/management/:id/lifecycle - Get lifecycle stats for a project
  // SECURITY FIX (P0): Added canAccessIdea to prevent IDOR
  app.get('/api/ideas/management/:id/lifecycle', isAuthenticated, canAccessIdea, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Get project
      const [project] = await db.select().from(projects).where(eq(projects.id, id));
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Get project assets count
      // NOTE: project.id is from database record (not user input), so this is safe from SQLi
      const projectAssets = await db
        .select({ count: sql<number>`count(*)` })
        .from(sql`project_assets`)
        .where(sql`project_id = ${project.id}`);

      const assetsCount = projectAssets[0]?.count || 0;

      // Calculate durations
      const createdTime = new Date(project.createdAt).getTime();
      const updatedTime = new Date(project.updatedAt).getTime();
      const now = Date.now();

      const totalDuration = now - createdTime;
      const currentStatusDuration = now - updatedTime;
      const ageDays = Math.floor(totalDuration / (1000 * 60 * 60 * 24));
      const daysInCurrentStatus = Math.floor(currentStatusDuration / (1000 * 60 * 60 * 24));

      // Generate activity timeline based on created/updated dates
      const timeline = [
        {
          id: '1',
          type: 'STATUS_CHANGED',
          status: 'BACKLOG',
          date: project.createdAt,
          actor: 'System',
          description: 'Idea created'
        }
      ];

      if (project.status !== 'BACKLOG') {
        timeline.push({
          id: '2',
          type: 'STATUS_CHANGED',
          status: project.status,
          date: project.updatedAt,
          actor: 'System',
          description: `Status changed to ${project.status}`
        });
      }

      res.json({
        idea: {
          id: project.id,
          title: project.title,
          status: project.status || 'BACKLOG',
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          ageDays,
          daysInCurrentStatus
        },
        timeline,
        metrics: {
          totalAssets: Number(assetsCount),
          aiOutputsCount: Number(assetsCount), // Same as totalAssets for compatibility
          commentsCount: 0,
          reviewersCount: 0,
          scoresCount: 0,
          totalTransitions: timeline.length - 1, // Number of status changes
          velocity: ageDays > 0 ? Math.round((Number(assetsCount) / ageDays) * 10) / 10 : 0,
          latestScore: null // Evaluation scores not available for projects
        },
        statusDurations: {
          [project.status || 'BACKLOG']: daysInCurrentStatus // Use days instead of milliseconds
        },
        currentStatus: project.status || 'BACKLOG',
        isProject: true
      });
    } catch (error) {
      console.error('Error fetching lifecycle data:', error);
      res.status(500).json({ error: 'Failed to fetch lifecycle data' });
    }
  });

  // GET /api/ideas/:id/ai-outputs - Get AI outputs for an idea
  // SECURITY FIX (P0): Added canAccessIdea to prevent IDOR
  app.get('/api/ideas/:id/ai-outputs', isAuthenticated, canAccessIdea, async (req: any, res) => {
    try {
      const { id } = req.params;
      const outputs = await aiOutputsProvider.list(id);
      res.json(outputs);
    } catch (error) {
      console.error('Error fetching AI outputs:', error);
      res.status(500).json({ error: 'Failed to fetch AI outputs' });
    }
  });

  // POST /api/ideas/:id/ai-outputs - Create AI output for an idea
  // SECURITY FIX (P1): Added canModifyIdea to prevent IDOR
  app.post('/api/ideas/:id/ai-outputs', isAuthenticated, canModifyIdea, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { kind, content } = req.body;

      if (!kind || !content) {
        return res.status(400).json({ error: 'Kind and content are required' });
      }

      const output = await aiOutputsProvider.create(id, kind, content);
      res.json(output);
    } catch (error) {
      console.error('Error creating AI output:', error);
      res.status(500).json({ error: 'Failed to create AI output' });
    }
  });

  // POST /api/ideas/:id/comments - Add comment to idea
  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  // SECURITY FIX (P1): Added canAccessIdea to prevent commenting on unauthorized ideas
  app.post('/api/ideas/:id/comments', isAuthenticated, canAccessIdea, validateRequest(createCommentSchema), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { bodyMd, mentions } = req.body;
      const authorId = req.user.id;

      if (!bodyMd) {
        return res.status(400).json({ error: 'Comment body is required' });
      }

      // ✅ SECURITY FIX (P1): Sanitize comment body to prevent Stored XSS
      const sanitizedBody = sanitizeHtml(bodyMd);

      // Validate length (max 10,000 characters)
      if (sanitizedBody.length > 10000) {
        return res.status(400).json({ error: 'Comment body too long (max 10,000 characters)' });
      }

      // Validate mentions array (max 20 mentions)
      const validatedMentions = Array.isArray(mentions) ? mentions.slice(0, 20) : [];

      // Create comment
      const [comment] = await db.insert(comments).values({
        ideaId: id,
        authorId,
        bodyMd: sanitizedBody,
        mentions: validatedMentions
      }).returning();

      // Create audit log
      await db.insert(auditLogs).values({
        ideaId: id,
        actorId: authorId,
        type: 'COMMENT_ADDED',
        data: { commentId: comment.id }
      });

      // Create notifications for mentions
      if (mentions && mentions.length > 0) {
        const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));

        for (const userId of mentions) {
          await db.insert(notifications).values({
            userId,
            kind: 'MENTION',
            payload: {
              ideaId: id,
              ideaTitle: idea.title,
              commentId: comment.id,
              authorId
            }
          });
        }
      }

      // Get comment with author info
      const [result] = await db
        .select({
          comment: comments,
          author: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl
          }
        })
        .from(comments)
        .leftJoin(users, eq(comments.authorId, users.id))
        .where(eq(comments.id, comment.id));

      res.json(result);
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  });

  // GET /api/ideas/:id/comments - Get comments for an idea
  // SECURITY FIX (P0): Added canAccessIdea to prevent IDOR
  app.get('/api/ideas/:id/comments', isAuthenticated, canAccessIdea, async (req: any, res) => {
    try {
      const { id } = req.params;

      const results = await db
        .select({
          comment: comments,
          author: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl
          }
        })
        .from(comments)
        .leftJoin(users, eq(comments.authorId, users.id))
        .where(and(eq(comments.ideaId, id), eq(comments.isDeleted, false)))
        .orderBy(desc(comments.createdAt));

      res.json(results);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });

  // POST /api/projects/:id/comments - Add comment to project (moved from ideas)
  app.post('/api/projects/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params; // id = projectId
      const { bodyMd, mentions, status } = req.body; // status optional: used to indicate this comment is for a status change
      const authorId = req.user.id;

      if (!bodyMd) {
        return res.status(400).json({ error: 'Comment body is required' });
      }

      // Create comment
      const [comment] = await db.insert(comments).values({
        projectId: id,
        authorId,
        bodyMd,
        mentions: mentions || []
      }).returning();

      // Create notifications for mentions
      if (mentions && mentions.length > 0) {
        const [project] = await db.select().from(projects).where(eq(projects.id, id));

        for (const userId of mentions) {
          await db.insert(notifications).values({
            userId,
            kind: 'MENTION',
            payload: {
              projectId: id,
              projectTitle: project?.title,
              commentId: comment.id,
              authorId
            }
          });
        }
      }

      // Get comment with author info
      const [result] = await db
        .select({
          comment: comments,
          author: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
            email: users.email
          }
        })
        .from(comments)
        .leftJoin(users, eq(comments.authorId, users.id))
        .where(eq(comments.id, comment.id));

      // Non-blocking: notify project owner by DB notification + email (use resend)
      (async () => {
        try {
          const [projectOwnerRow] = await db
            .select({
              project: projects,
              owner: {
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName
              },
              orgSlug: organizations.slug
            })
            .from(projects)
            .leftJoin(users, eq(projects.createdById, users.id))
            .leftJoin(organizations, eq(projects.orgId, organizations.id))
            .where(eq(projects.id, id));

          const ownerEmail = projectOwnerRow?.owner?.email;
          const ownerId = projectOwnerRow?.owner?.id;
          const projectTitle = projectOwnerRow?.project?.title;

          // send email if owner has email
          if (ownerEmail && process.env.RESEND_API_KEY) {
            // lazy-load Resend to keep this change local to handler
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const resend = new Resend(process.env.RESEND_API_KEY);
            const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@fikrahub.com';

            const actorName = result?.author ? (result.author.firstName || result.author.username) : 'Someone';
            let subject: string;
            let html: string;

            // Prefer an external HTML template if available, fallback to simple inline html.
            subject = status
              ? `Your project "${projectTitle}" status: ${status}`
              : `New comment on your project "${projectTitle}"`;

            const hostUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
            const orgSlug = projectOwnerRow?.orgSlug || 'default';
            const viewUrl = `${hostUrl}/w/${orgSlug}/my-ideas`;

            const templateCandidates = [
              path.join(__dirname, 'email-templates', 'project-comment.html'),
              path.join(process.cwd(), 'server', 'email-templates', 'project-comment.html'),
              path.join(process.cwd(), 'dist', 'email-templates', 'project-comment.html'),
              path.join(process.cwd(), 'email-templates', 'project-comment.html')
            ];

            const foundTpl = templateCandidates.find(p => {
              try { return fs.existsSync(p); } catch { return false; }
            });

            if (foundTpl) {
              try {
                const tpl = fs.readFileSync(foundTpl, 'utf8');
                // ✅ SECURITY FIX (P1): Escape all user-controlled data in email templates
                html = mustache.render(tpl, {
                  orgName: escapeHtml(projectOwnerRow?.project?.orgName || projectOwnerRow?.project?.title || orgSlug),
                  actorName: escapeHtml(actorName),
                  projectTitle: escapeHtml(projectTitle),
                  commentBodyHtml: sanitizeHtml(bodyMd || '').replace(/\n/g, '<br/>'),
                  status: status ? escapeHtml(status) : null,
                  viewUrl,
                  hostUrl,
                  orgSlug
                });
              } catch (tplErr) {
                console.warn('Failed to render project-comment template:', tplErr);
                // ✅ SECURITY FIX (P1): Escape user data in fallback template
                html = `<p>${escapeHtml(actorName)} ${(status ? `updated the status of your project to <strong>${escapeHtml(status)}</strong>` : `left a comment on your project`) } "<strong>${escapeHtml(projectTitle)}</strong>".</p>
                        <hr/><div>${sanitizeHtml(bodyMd || '').replace(/\n/g, '<br/>')}</div>
                        <p><a href="${viewUrl}">View project</a></p>`;
              }
            } else {
              // ✅ SECURITY FIX (P1): Escape user data in fallback template
              html = `<p>${escapeHtml(actorName)} ${(status ? `updated the status of your project to <strong>${escapeHtml(status)}</strong>` : `left a comment on your project`) } "<strong>${escapeHtml(projectTitle)}</strong>".</p>
                      <hr/><div>${sanitizeHtml(bodyMd || '').replace(/\n/g, '<br/>')}</div>
                      <p><a href="${viewUrl}">View project</a></p>`;
            }

            try {
              await resend.emails.send({
                from: EMAIL_FROM,
                to: ownerEmail,
                subject,
                html
              });
            } catch (emailErr) {
              console.error('Error sending project comment email:', emailErr);
            }
          }
        } catch (e) {
          console.error('Error notifying project owner for comment:', e);
        }
      })();

      res.json(result);
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  });

  // GET /api/projects/:id/comments - Get comments for a project (moved from ideas)
  // SECURITY FIX (P0): Added canAccessIdea to prevent IDOR
  app.get('/api/projects/:id/comments', isAuthenticated, canAccessIdea, async (req: any, res) => {
    try {
      const { id } = req.params; // projectId

      const results = await db
        .select({
          comment: comments,
          author: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl
          }
        })
        .from(comments)
        .leftJoin(users, eq(comments.authorId, users.id))
        .where(and(eq(comments.projectId, id), eq(comments.isDeleted, false)))
        .orderBy(desc(comments.createdAt));

      res.json(results);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });

  // PATCH /api/comments/:id - Update comment (adjust audit log to use projectId)
  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  app.patch('/api/comments/:id', isAuthenticated, validateRequest(updateCommentSchema), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { bodyMd, isDeleted } = req.body;
      const userId = req.user.id;

      // Check if user is the author
      const [comment] = await db.select().from(comments).where(eq(comments.id, id));
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      if (comment.authorId !== userId) {
        return res.status(403).json({ error: 'Not authorized to edit this comment' });
      }

      const updateData: any = { updatedAt: new Date() };
      // ✅ SECURITY FIX (P1): Sanitize comment body on update to prevent Stored XSS
      if (bodyMd !== undefined) {
        const sanitizedBody = sanitizeHtml(bodyMd);
        if (sanitizedBody.length > 10000) {
          return res.status(400).json({ error: 'Comment body too long (max 10,000 characters)' });
        }
        updateData.bodyMd = sanitizedBody;
      }
      if (isDeleted !== undefined) updateData.isDeleted = isDeleted;

      const [updatedComment] = await db
        .update(comments)
        .set(updateData)
        .where(eq(comments.id, id))
        .returning();

      // Create audit log (use comment.projectId)
      await db.insert(auditLogs).values({
        ideaId: comment.projectId,
        actorId: userId,
        type: isDeleted ? 'COMMENT_DELETED' : 'COMMENT_EDITED',
        data: { commentId: id }
      });

      res.json(updatedComment);
    } catch (error) {
      console.error('Error updating comment:', error);
      res.status(500).json({ error: 'Failed to update comment' });
    }
  });

  // POST /api/ideas/:id/reviewers - Invite reviewer
  // SECURITY FIX (P1): Added canModifyIdea to prevent IDOR
  app.post('/api/ideas/:id/reviewers', isAuthenticated, canModifyIdea, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reviewerId } = req.body;
      const actorId = req.user.id;

      if (!reviewerId) {
        return res.status(400).json({ error: 'Reviewer ID is required' });
      }

      // Check if review already exists
      const existingReview = await db
        .select()
        .from(reviews)
        .where(and(eq(reviews.ideaId, id), eq(reviews.reviewerId, reviewerId)));

      if (existingReview.length > 0) {
        return res.status(400).json({ error: 'Reviewer already invited' });
      }

      // Create review invitation
      const [review] = await db.insert(reviews).values({
        ideaId: id,
        reviewerId,
        status: 'PENDING'
      }).returning();

      // Create audit log
      await db.insert(auditLogs).values({
        ideaId: id,
        actorId,
        type: 'REVIEWER_ASSIGNED',
        data: { reviewerId }
      });

      // Create notification
      const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));
      await db.insert(notifications).values({
        userId: reviewerId,
        kind: 'REVIEW_ASSIGNED',
        payload: {
          ideaId: id,
          ideaTitle: idea.title,
          reviewId: review.id,
          actorId
        }
      });

      res.json(review);
    } catch (error) {
      console.error('Error inviting reviewer:', error);
      res.status(500).json({ error: 'Failed to invite reviewer' });
    }
  });

  // GET /api/ideas/:id/reviewers - Get reviewers for an idea
  // SECURITY FIX (P0): Added canAccessIdea to prevent IDOR
  app.get('/api/ideas/:id/reviewers', isAuthenticated, canAccessIdea, async (req: any, res) => {
    try {
      const { id } = req.params;

      const results = await db
        .select({
          review: reviews,
          reviewer: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl
          }
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.reviewerId, users.id))
        .where(eq(reviews.ideaId, id))
        .orderBy(desc(reviews.createdAt));

      res.json(results);
    } catch (error) {
      console.error('Error fetching reviewers:', error);
      res.status(500).json({ error: 'Failed to fetch reviewers' });
    }
  });

  // PATCH /api/reviews/:id - Update review
  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  app.patch('/api/reviews/:id', isAuthenticated, validateRequest(updateReviewSchema), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, verdict, rationale } = req.body;
      const userId = req.user.id;

      // Check if user is the reviewer
      const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
      if (!review) {
        return res.status(404).json({ error: 'Review not found' });
      }
      if (review.reviewerId !== userId) {
        return res.status(403).json({ error: 'Not authorized to update this review' });
      }

      const updateData: any = { updatedAt: new Date() };
      if (status !== undefined) updateData.status = status;
      if (verdict !== undefined) updateData.verdict = verdict;
      if (rationale !== undefined) updateData.rationale = rationale;

      const [updatedReview] = await db
        .update(reviews)
        .set(updateData)
        .where(eq(reviews.id, id))
        .returning();

      // Create audit log
      await db.insert(auditLogs).values({
        ideaId: review.ideaId,
        actorId: userId,
        type: 'REVIEW_INVITE',
        data: {
          reviewId: id,
          status,
          verdict
        }
      });

      res.json(updatedReview);
    } catch (error) {
      console.error('Error updating review:', error);
      res.status(500).json({ error: 'Failed to update review' });
    }
  });

  // POST /api/metrics - Upload metrics set
  // ✅ SECURITY FIX (P1): Add file upload rate limiter (10 uploads/hour)
  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  app.post('/api/metrics', isAuthenticated, fileUploadLimiter, validateRequest(uploadMetricsSchema), upload.single('file'), async (req: any, res) => {
    try {
      const { orgId, name } = req.body;
      const userId = req.user.id;
      const file = req.file;

      if (!orgId || !name || !file) {
        return res.status(400).json({ error: 'Organization ID, name, and file are required' });
      }

      let metrics: Array<{ metric: string; weight: number; description: string }>;

      // Parse CSV or JSON
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        const records = parse(file.buffer, {
          columns: true,
          skip_empty_lines: true
        });

        metrics = records.map((record: any) => ({
          metric: record.metric || record.name,
          weight: parseFloat(record.weight) || 0,
          description: record.description || ''
        }));
      } else if (file.mimetype === 'application/json') {
        const data = JSON.parse(file.buffer.toString());
        metrics = data.metrics || data;
      } else {
        return res.status(400).json({ error: 'Unsupported file format. Use CSV or JSON.' });
      }

      // Validate metrics
      const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
      if (Math.abs(totalWeight - 1) > 0.01) {
        return res.status(400).json({ error: 'Metric weights must sum to 1.0' });
      }

      // Create metrics set
      const [metricsSet] = await db.insert(metricsSets).values({
        orgId,
        name,
        payload: { metrics },
        createdBy: userId
      }).returning();

      res.json(metricsSet);
    } catch (error) {
      console.error('Error uploading metrics:', error);
      res.status(500).json({ error: 'Failed to upload metrics' });
    }
  });

  // GET /api/metrics/latest - Get latest metrics set for org
  app.get('/api/metrics/latest', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.query;

      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const [metricsSet] = await db
        .select()
        .from(metricsSets)
        .where(eq(metricsSets.orgId, orgId))
        .orderBy(desc(metricsSets.createdAt))
        .limit(1);

      if (!metricsSet) {
        return res.status(404).json({ error: 'No metrics set found' });
      }

      res.json(metricsSet);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  // GET /api/metrics - Get all metrics sets for org
  app.get('/api/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.query;

      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const metricsSetsData = await db
        .select()
        .from(metricsSets)
        .where(eq(metricsSets.orgId, orgId))
        .orderBy(desc(metricsSets.createdAt));

      res.json(metricsSetsData);
    } catch (error) {
      console.error('Error fetching metrics sets:', error);
      res.status(500).json({ error: 'Failed to fetch metrics sets' });
    }
  });

  // POST /api/ideas/:id/evaluate - Simple evaluation endpoint (uses default metrics)
  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  // SECURITY FIX (P1): Added aiRateLimiter to prevent cost abuse
  // SECURITY FIX (P1): Added canAccessIdea to prevent unauthorized AI evaluations
  app.post('/api/ideas/:id/evaluate', isAuthenticated, canAccessIdea, aiRateLimiter, validateRequest(evaluateIdeaSchema), async (req: any, res) => {
    try {
      const { id } = req.params;
      const actorId = req.user.id;

      // Get idea
      const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));
      if (!idea) {
        return res.status(404).json({ error: 'Idea not found' });
      }

      // Use latest metrics set for org
      const [metricsSet] = await db
        .select()
        .from(metricsSets)
        .where(eq(metricsSets.orgId, idea.orgId))
        .orderBy(desc(metricsSets.createdAt))
        .limit(1);

      if (!metricsSet) {
        return res.status(404).json({ error: 'No evaluation criteria found for this organization. Please configure evaluation criteria in settings.' });
      }

      // Score the idea
      const result = await aiScoringProvider.score(idea, metricsSet.payload);

      // Save score
      const [score] = await db.insert(ideaScores).values({
        ideaId: id,
        metricsId: metricsSet.id,
        breakdown: result.breakdown,
        total: result.total
      }).returning();

      // Create audit log
      await db.insert(auditLogs).values({
        ideaId: id,
        actorId,
        type: 'SCORED',
        data: {
          scoreId: score.id,
          total: result.total,
          metricsId: metricsSet.id
        }
      });

      res.json(score);
    } catch (error) {
      console.error('Error evaluating idea:', error);
      res.status(500).json({ error: 'Failed to evaluate idea' });
    }
  });

  // POST /api/ideas/:id/score - Score an idea
  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  // SECURITY FIX (P1): Added aiRateLimiter to prevent cost abuse
  // SECURITY FIX (P1): Added canAccessIdea to prevent unauthorized AI scoring
  app.post('/api/ideas/:id/score', isAuthenticated, canAccessIdea, aiRateLimiter, validateRequest(scoreIdeaSchema), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { metricsId } = req.body;
      const actorId = req.user.id;

      // Get idea
      const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));
      if (!idea) {
        return res.status(404).json({ error: 'Idea not found' });
      }

      // Get metrics set
      let metricsSet;
      if (metricsId) {
        [metricsSet] = await db.select().from(metricsSets).where(eq(metricsSets.id, metricsId));
      } else {
        // Use latest metrics set for org
        [metricsSet] = await db
          .select()
          .from(metricsSets)
          .where(eq(metricsSets.orgId, idea.orgId))
          .orderBy(desc(metricsSets.createdAt))
          .limit(1);
      }

      if (!metricsSet) {
        return res.status(404).json({ error: 'No metrics set found' });
      }

      // Score the idea
      const result = await aiScoringProvider.score(idea, metricsSet.payload);

      // Save score
      const [score] = await db.insert(ideaScores).values({
        ideaId: id,
        metricsId: metricsSet.id,
        breakdown: result.breakdown,
        total: result.total
      }).returning();

      // Create audit log
      await db.insert(auditLogs).values({
        ideaId: id,
        actorId,
        type: 'SCORED',
        data: {
          scoreId: score.id,
          total: result.total,
          metricsId: metricsSet.id
        }
      });

      // Create notification for owner
      if (idea.ownerId !== actorId) {
        await db.insert(notifications).values({
          userId: idea.ownerId,
          kind: 'SCORED',
          payload: {
            ideaId: id,
            ideaTitle: idea.title,
            scoreId: score.id,
            total: result.total,
            actorId
          }
        });
      }

      res.json(score);
    } catch (error) {
      console.error('Error scoring idea:', error);
      res.status(500).json({ error: 'Failed to score idea' });
    }
  });

  // GET /api/ideas/:id/scores - Get scores for an idea
  // SECURITY FIX (P0): Added canAccessIdea to prevent IDOR
  app.get('/api/ideas/:id/scores', isAuthenticated, canAccessIdea, async (req: any, res) => {
    try {
      const { id } = req.params;

      const scores = await db
        .select({
          score: ideaScores,
          metricsSet: metricsSets
        })
        .from(ideaScores)
        .leftJoin(metricsSets, eq(ideaScores.metricsId, metricsSets.id))
        .where(eq(ideaScores.ideaId, id))
        .orderBy(desc(ideaScores.createdAt));

      res.json(scores);
    } catch (error) {
      console.error('Error fetching scores:', error);
      res.status(500).json({ error: 'Failed to fetch scores' });
    }
  });

  // GET /api/ideas/:id/audit-logs - Get audit logs for an idea
  // SECURITY FIX (P0): Added canAccessIdea to prevent IDOR
  app.get('/api/ideas/:id/audit-logs', isAuthenticated, canAccessIdea, async (req: any, res) => {
    try {
      const { id } = req.params;

      const logs = await db
        .select({
          log: auditLogs,
          actor: {
            id: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl
          }
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorId, users.id))
        .where(eq(auditLogs.ideaId, id))
        .orderBy(desc(auditLogs.createdAt));

      res.json(logs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });

  // GET /api/ideas/:id/lifecycle - Get lifecycle stats for an idea
  // SECURITY FIX (P0): Added canAccessIdea to prevent IDOR
  app.get('/api/ideas/:id/lifecycle', isAuthenticated, canAccessIdea, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Get idea
      const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));
      if (!idea) {
        return res.status(404).json({ error: 'Idea not found' });
      }

      // Get status change logs
      const statusLogs = await db
        .select()
        .from(auditLogs)
        .where(and(eq(auditLogs.ideaId, id), eq(auditLogs.type, 'STATUS_CHANGED')))
        .orderBy(auditLogs.createdAt);

      // Calculate time in each status
      const statusDurations: Record<string, number> = {};
      let lastStatus = 'BACKLOG';
      let lastTime = new Date(idea.createdAt).getTime();

      for (const log of statusLogs) {
        const currentTime = new Date(log.createdAt).getTime();
        const duration = currentTime - lastTime;
        statusDurations[lastStatus] = (statusDurations[lastStatus] || 0) + duration;
        lastStatus = (log.data as any).to;
        lastTime = currentTime;
      }

      // Add time in current status
      const now = Date.now();
      statusDurations[lastStatus] = (statusDurations[lastStatus] || 0) + (now - lastTime);

      // Get counts
      const [commentsCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(and(eq(comments.ideaId, id), eq(comments.isDeleted, false)));

      const [reviewersCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(reviews)
        .where(eq(reviews.ideaId, id));

      const [scoresCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(ideaScores)
        .where(eq(ideaScores.ideaId, id));

      res.json({
        statusDurations,
        currentStatus: idea.status,
        commentsCount: Number(commentsCount.count),
        reviewersCount: Number(reviewersCount.count),
        scoresCount: Number(scoresCount.count),
        createdAt: idea.createdAt,
        updatedAt: idea.updatedAt
      });
    } catch (error) {
      console.error('Error fetching lifecycle data:', error);
      res.status(500).json({ error: 'Failed to fetch lifecycle data' });
    }
  });

  // GET /api/notifications - Get notifications for current user
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { unreadOnly } = req.query;

      let query = db.select().from(notifications).where(eq(notifications.userId, userId));

      if (unreadOnly === 'true') {
        query = query.where(sql`${notifications.readAt} IS NULL`) as any;
      }

      const results = await query.orderBy(desc(notifications.createdAt)).limit(50);

      res.json(results);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  // PATCH /api/notifications/:id/read - Mark notification as read
  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const [notification] = await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
        .returning();

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json(notification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  // GET /api/organizations/:orgId/metrics - Get evaluation criteria
  app.get('/api/organizations/:orgId/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;

      // Get latest metrics set for organization
      const [metricsSet] = await db
        .select()
        .from(metricsSets)
        .where(eq(metricsSets.orgId, orgId))
        .orderBy(desc(metricsSets.createdAt))
        .limit(1);

      if (!metricsSet) {
        return res.status(404).json({ error: 'No evaluation criteria found' });
      }

      res.json(metricsSet);
    } catch (error) {
      console.error('Error fetching evaluation criteria:', error);
      res.status(500).json({ error: 'Failed to fetch evaluation criteria' });
    }
  });

  // POST /api/organizations/:orgId/metrics - Upload evaluation criteria
  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  app.post('/api/organizations/:orgId/metrics', isAuthenticated, validateRequest(createMetricsSetSchema), async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const { criteria } = req.body;

      if (!criteria) {
        return res.status(400).json({ error: 'Criteria is required' });
      }

      // Parse criteria (expecting JSON string)
      let parsedCriteria;
      try {
        parsedCriteria = typeof criteria === 'string' ? JSON.parse(criteria) : criteria;
      } catch (error) {
        return res.status(400).json({ error: 'Invalid JSON format for criteria' });
      }

      // Validate criteria structure
      if (typeof parsedCriteria !== 'object' || !parsedCriteria) {
        return res.status(400).json({ error: 'Criteria must be an object' });
      }

      // Check user has admin access
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

      // Create new metrics set
      const [metricsSet] = await db.insert(metricsSets).values({
        orgId,
        name: `Custom Criteria - ${new Date().toISOString().split('T')[0]}`,
        payload: parsedCriteria
      }).returning();

      res.json(metricsSet);
    } catch (error) {
      console.error('Error uploading evaluation criteria:', error);
      res.status(500).json({ error: 'Failed to upload evaluation criteria' });
    }
  });
    
  app.get('/api/users-admin', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = typeof req.query.orgId === 'string' ? req.query.orgId : undefined;

      // SECURITY FIX: Only select fields actually used in response (defense-in-depth)
      // Note: password field is NOT needed for this endpoint
      const allUsers = await db.select({
        u: {
          id: users.id,
          email: users.email,
          username: users.username
        }
      }).from(users).orderBy(users.email);

      // Fetch memberships (userId -> orgSlug, orgId)
      const memberships = await db
        .select({
          userId: organizationMembers.userId,
          orgId: organizationMembers.orgId,
          orgSlug: organizations.slug
        })
        .from(organizationMembers)
        .leftJoin(organizations, eq(organizationMembers.orgId, organizations.id));

      const slugsByUser = new Map<string, string[]>();
      const memberSetForOrg = new Set<string>();

      for (const m of memberships) {
        if (!m.userId) continue;
        const arr = slugsByUser.get(m.userId) || [];
        if (m.orgSlug) arr.push(m.orgSlug);
        slugsByUser.set(m.userId, arr);
        if (orgId && m.orgId === orgId) memberSetForOrg.add(m.userId);
      }

      const result = allUsers
        .map(r => r.u)
        .filter(u => {
          // exclude system users without id/email
          if (!u || !u.id || !u.email) return false;
          // if orgId provided, exclude users already members of that org
          if (orgId && memberSetForOrg.has(u.id)) return false;
          return true;
        })
        .map(u => {
          const slugs = slugsByUser.get(u.id) || [];
          const label = slugs.length > 0
            ? `${u.email} (workspace: ${slugs.join(', ')})`
            : `${u.email}`;
          return { id: u.id, label };
        });

      res.json(result);
    } catch (error) {
      console.error('Error fetching users list:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // GET /api/organizations/:id - Get organization details
  app.get('/api/organizations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if user has access to this organization
      const [member] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, id),
            eq(organizationMembers.userId, userId)
          )
        );

      if (!member) {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }

      // Get organization data
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id));

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      res.json(org);
    } catch (error) {
      console.error('Error fetching organization:', error);
      res.status(500).json({ error: 'Failed to fetch organization' });
    }
  });

  // PATCH /api/organizations/:id - Update organization (admin only)
  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  app.patch('/api/organizations/:id', isAuthenticated, validateRequest(updateOrganizationSchema), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const {
        name,
        logoUrl,
        darkLogoUrl,
        primaryColor,
        challengesEnabled,
        expertsEnabled,
        radarEnabled,
        dashboardEnabled,
        aiBuilderEnabled,
        formSubmissionEnabled,
        academyEnabled,
        defaultRoute,
        // route fields (optional)
        dashboardNameEn,
        dashboardNameAr,
        myIdeasNameEn,
        myIdeasNameAr,
        myIdeasDescEn,
        myIdeasDescAr,
        challengesNameEn,
        challengesNameAr,
        challengesDescEn,
        challengesDescAr,
        radarNameEn,
        radarNameAr,
        radarDescEn,
        radarDescAr,
        expertsTitleEn,
        expertsTitleAr,
        expertsNameEn,
        expertsNameAr,
        expertsDescEn,
        expertsDescAr
      } = req.body;
      // Check if user has admin access
      const [member] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, id),
            eq(organizationMembers.userId, userId)
          )
        );

      if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
        return res.status(403).json({ error: 'Admin access required to update organization' });
      }

      // Build update object with only provided fields
      const updateData: any = { updatedAt: new Date() };
      if (name !== undefined) updateData.name = name;
      if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
      if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
      if (challengesEnabled !== undefined) updateData.challengesEnabled = challengesEnabled;
      if (expertsEnabled !== undefined) updateData.expertsEnabled = expertsEnabled;
      if (radarEnabled !== undefined) updateData.radarEnabled = radarEnabled;
      if (dashboardEnabled !== undefined) updateData.dashboardEnabled = dashboardEnabled;
      if (aiBuilderEnabled !== undefined) updateData.aiBuilderEnabled = aiBuilderEnabled;
      if (formSubmissionEnabled !== undefined) updateData.formSubmissionEnabled = formSubmissionEnabled;
      if (academyEnabled !== undefined) updateData.academyEnabled = academyEnabled;
      if (darkLogoUrl !== undefined) updateData.darkLogoUrl = darkLogoUrl;

      // default route
      if (defaultRoute !== undefined) updateData.defaultRoute = defaultRoute;

      // route name / desc / title fields (store on org)
      if (dashboardNameEn !== undefined) updateData.dashboardNameEn = dashboardNameEn;
      if (dashboardNameAr !== undefined) updateData.dashboardNameAr = dashboardNameAr;
      if (myIdeasNameEn !== undefined) updateData.myIdeasNameEn = myIdeasNameEn;
      if (myIdeasNameAr !== undefined) updateData.myIdeasNameAr = myIdeasNameAr;
      if (myIdeasDescEn !== undefined) updateData.myIdeasDescEn = myIdeasDescEn;
      if (myIdeasDescAr !== undefined) updateData.myIdeasDescAr = myIdeasDescAr;
      if (challengesNameEn !== undefined) updateData.challengesNameEn = challengesNameEn;
      if (challengesNameAr !== undefined) updateData.challengesNameAr = challengesNameAr;
      if (challengesDescEn !== undefined) updateData.challengesDescEn = challengesDescEn;
      if (challengesDescAr !== undefined) updateData.challengesDescAr = challengesDescAr;
      if (radarNameEn !== undefined) updateData.radarNameEn = radarNameEn;
      if (radarNameAr !== undefined) updateData.radarNameAr = radarNameAr;
      if (radarDescEn !== undefined) updateData.radarDescEn = radarDescEn;
      if (radarDescAr !== undefined) updateData.radarDescAr = radarDescAr;
      if (expertsTitleEn !== undefined) updateData.expertsTitleEn = expertsTitleEn;
      if (expertsTitleAr !== undefined) updateData.expertsTitleAr = expertsTitleAr;
      if (expertsNameEn !== undefined) updateData.expertsNameEn = expertsNameEn;
      if (expertsNameAr !== undefined) updateData.expertsNameAr = expertsNameAr;
      if (expertsDescEn !== undefined) updateData.expertsDescEn = expertsDescEn;
      if (expertsDescAr !== undefined) updateData.expertsDescAr = expertsDescAr;

      // Update organization
      const [updatedOrg] = await db
        .update(organizations)
        .set(updateData)
        .where(eq(organizations.id, id))
        .returning();

      if (!updatedOrg) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      res.json(updatedOrg);
    } catch (error) {
      console.error('Error updating organization:', error);
      res.status(500).json({ error: 'Failed to update organization' });
    }
  });
}
