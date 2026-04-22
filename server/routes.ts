import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import { requireOrgMembership } from "./middleware/authorization";
import { generateBusinessAsset, generateChatResponse } from "./openai";
import { getRealtimeConnection, endRealtimeConversation } from "./gpt-realtime";
import { ResearchAgent } from "./research";
import OpenAI from 'openai';
import vercelRoutes from "./vercel-routes";
import mentorRoutes from "./mentor-routes";
import { registerIdeaRoutes } from "./idea-routes";
import { registerWorkspaceRoutes } from "./workspace-routes";
import { registerChallengeRoutes } from "./challenge-routes";
import { registerSuperAdminRoutes, getScoringConfig } from "./super-admin-routes";
import { registerEventRoutes } from "./events-routes";
import { registerProgramRoutes } from "./program-routes";
import { registerPitchLifecycleRoutes } from "./pitch-lifecycle-routes";
import { registerConsultationRoutes } from "./consultation-routes";
import { registerSupportRoutes } from "./support-routes";
import { registerDeclarationRoutes } from "./declaration-routes";
import multer from 'multer'; // ✅ Add multer import
import path from 'path'; // ✅ Add path import
import fs from 'fs'; // ✅ Add fs import
import { Resend } from 'resend';
import mustache from 'mustache';
import { fileURLToPath } from 'url';
import { parseEvaluationCriteria, parseEvaluationResponse, buildProjectEvaluationPrompt } from './lib/evaluationCriteria';
import { randomBytes } from 'crypto';
import { validateUploadedFile, sanitizeFilename } from './lib/fileValidation';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Azure OpenAI client only if credentials are available
const azureOpenAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT_DEV;
const azureOpenAIKey = process.env.AZURE_OPENAI_API_KEY_DEV;
const azureAPIVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview';
const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-fikra-dev';

// Remove trailing slash from endpoint to avoid double slashes
const cleanEndpoint = azureOpenAIEndpoint?.replace(/\/$/, '');

const openai = (azureOpenAIKey && cleanEndpoint) ? new OpenAI({
  apiKey: azureOpenAIKey,
  baseURL: `${cleanEndpoint}/openai/deployments/${azureDeployment}`,
  defaultQuery: { 'api-version': azureAPIVersion },
  defaultHeaders: { 'api-key': azureOpenAIKey },
}) : null;

// Add debug logging
if (openai) {
  console.log('✅ Azure OpenAI client initialized:', {
    endpoint: cleanEndpoint,
    deployment: azureDeployment,
    apiVersion: azureAPIVersion,
    fullBaseURL: `${cleanEndpoint}/openai/deployments/${azureDeployment}`,
    note: 'Deployment in baseURL, will pass empty string as model'
  });
}

if (!openai) {
  console.warn("⚠️  Azure OpenAI credentials not set - OpenAI features will be disabled");
}
import { insertProjectSchema, insertChatSchema, insertMessageSchema, insertAssetSchema, insertPitchDeckGenerationSchema, organizationMembers, organizations, passwordResetTokens, challenges, memberApplications, mentorAssignments, users, projects, ideas, pitchDeckGenerations, platformEvents, courseProgress, ideaEvaluations, judgeEvaluations, events, eventSpeakers, attendanceRecords, academyCourses, academyVideos, mentorBookings, mentorProfiles, scoringCriteriaConfig, assets, assetVersions } from "@shared/schema";
import { screenApplicationAsync, refineApplicationAsync } from "./lib/applicationScreening";
import { z } from "zod";
import { db } from "./db";
import { eq, and, inArray, not, desc, asc, avg, count, sql as drizzleSql, isNull, or, isNotNull } from "drizzle-orm";
import { canAccessProject, canModifyProject, canAccessChat, canAccessAssets } from "./middleware/authorization";
import { requireApiKey } from "./middleware/api-key-auth";
import { passwordResetLimiter, authRateLimiter, orgCreationLimiter, fileUploadLimiter, aiRateLimiter, dataExportLimiter } from "./middleware/security";
import { passwordValidation, handleValidationErrors } from "./middleware/validation";
import {
  updateUserProfileSchema,
  createOrganizationSchema,
  updateOrgSettingsSchema,
  addOrgMemberSchema,
  updateMemberRoleSchema,
  generatePitchDeckSchema,
  generateAssetSchema,
  chatResponseSchema,
  voiceSynthesizeSchema,
  researchQuerySchema,
  validateRequest,
} from "@shared/validation-schemas";

export function registerRoutes(app: Express): Server {
  // create transporter once (reuse)
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

  if (!resendClient) {
    console.warn("⚠️  RESEND_API_KEY not set - Email features will be disabled");
  }

  // Auth middleware - includes user registration, login, logout endpoints
  setupAuth(app);

  // Workspace management routes (multi-tenancy)
  registerWorkspaceRoutes(app);

  // Idea management routes
  registerIdeaRoutes(app);

  // Challenge management routes
  registerChallengeRoutes(app);

  // Super admin platform routes
  registerSuperAdminRoutes(app);

  // Events routes (public read + super admin CRUD)
  registerEventRoutes(app);

  // ✅ Multer storage configuration for evaluation criteria JSON files
  const criteriaStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'evaluation-criteria');
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename: orgId-timestamp-originalname (cryptographically secure)
      const uniqueSuffix = `${Date.now()}-${randomBytes(8).toString('hex')}`;
      const ext = path.extname(file.originalname);
      const nameWithoutExt = path.basename(file.originalname, ext);

      // SECURITY: Enhanced filename sanitization with length limits
      const maxFilenameLength = 100;
      let sanitized = nameWithoutExt
        .normalize('NFD') // Unicode normalization
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9_-]/gi, '_') // Remove special chars
        .toLowerCase()
        .slice(0, maxFilenameLength); // Limit length

      // Prevent empty filenames
      if (!sanitized || sanitized.length === 0) {
        sanitized = 'upload';
      }

      cb(null, `${sanitized}-${uniqueSuffix}${ext}`);
    }
  });

  // ✅ Multer upload middleware for JSON files with enhanced security
  const uploadCriteria = multer({
    storage: criteriaStorage,
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB limit for JSON files
      files: 1 // Only allow 1 file at a time
    },
    fileFilter: (req, file, cb) => {
      // Whitelist approach: Only accept JSON files
      const allowedMimeTypes = ['application/json', 'text/json'];
      const allowedExtensions = ['.json'];

      const ext = path.extname(file.originalname).toLowerCase();
      const mimeType = file.mimetype.toLowerCase();

      if (allowedMimeTypes.includes(mimeType) && allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        console.warn(`Rejected file upload: ${file.originalname} (${file.mimetype})`);
        cb(new Error('Invalid file type. Only JSON files are allowed.'));
      }
    }
  });

  // ✅ Multer storage for PPTX pitch deck uploads
  const pitchStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'pitch');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${randomBytes(8).toString('hex')}`;
      const ext = path.extname(file.originalname);
      const nameWithoutExt = path.basename(file.originalname, ext);
      const sanitized = nameWithoutExt
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_-]/gi, '_')
        .toLowerCase()
        .slice(0, 100) || 'upload';
      cb(null, `${sanitized}-${uniqueSuffix}${ext}`);
    }
  });

  const uploadPitch = multer({
    storage: pitchStorage,
    limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
      const allowed = ['application/vnd.openxmlformats-officedocument.presentationml.presentation'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.includes(file.mimetype) && ext === '.pptx') {
        cb(null, true);
      } else {
        cb(new Error('Only .pptx files are allowed.'));
      }
    }
  });

  app.post('/api/uploads/pitch-deck', isAuthenticated, uploadPitch.single('file'), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const url = `/uploads/pitch/${req.file.filename}`;
    res.json({ url, name: req.file.originalname });
  });

  // User info endpoint with organization memberships
  app.get('/api/user', isAuthenticated, async (req: any, res) => {
    try {
      // Fetch user's organization memberships with role info
      const preferredSlug = typeof req.query?.slug === 'string' ? req.query.slug : undefined;
      let memberships = await db
         .select({
           orgId: organizationMembers.orgId,
           role: organizationMembers.role,
           orgName: organizations.name,
           orgSlug: organizations.slug
         })
         .from(organizationMembers)
         .innerJoin(organizations, eq(organizationMembers.orgId, organizations.id))
         .where(eq(organizationMembers.userId, req.user.id));

      // If a slug was supplied, move that membership to the front (if present)
      if (preferredSlug && Array.isArray(memberships) && memberships.length > 1) {
        const idx = memberships.findIndex((m: any) => m.orgSlug === preferredSlug);
        if (idx > 0) {
          const [match] = memberships.splice(idx, 1);
          memberships.unshift(match);
        }
      }
      // Check if user is admin of any organization
      const isAdmin = memberships.some(m => m.role === 'OWNER' || m.role === 'ADMIN');

      res.json({
        ...req.user,
        memberships,
        isAdmin,
        primaryOrgId: memberships[0]?.orgId // First org as primary
      });
    } catch (error) {
      console.error('Error fetching user memberships:', error);
      // Fallback to basic user info if there's an error
      res.json(req.user);
    }
  });

  // Update user profile endpoint
  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  app.patch('/api/user/profile', isAuthenticated, validateRequest(updateUserProfileSchema), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, email, profileImageUrl } = req.body;
      
      const updatedUser = await storage.updateUser(userId, {
        firstName,
        lastName,
        email,
        profileImageUrl
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Export user data endpoint
  // SECURITY FIX (P2): Added dataExportLimiter to prevent abuse
  app.post('/api/user/export', isAuthenticated, dataExportLimiter, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get user's data
      const userData = await storage.getUserData(userId);
      
      res.json({
        user: req.user,
        projects: userData.projects,
        chats: userData.chats,
        messages: userData.messages,
        assets: userData.assets,
        exportedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error exporting user data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Delete user account endpoint
  app.delete('/api/user/delete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Delete all user's data
      await storage.deleteUser(userId);
      
      // Logout the user
      req.logout((err: any) => {
        if (err) {
          console.error("Error logging out after account deletion:", err);
        }
      });
      
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Organization routes
  app.get('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organizations = await storage.getUserOrganizations(userId);
      res.json(organizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  app.post('/api/organizations', isAuthenticated, validateRequest(createOrganizationSchema), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name } = req.body;
      
      const organization = await storage.createOrganization({ name }, userId);
      res.json(organization);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  // Admin middleware - checks if user has ADMIN or OWNER role in organization
  const isOrgAdmin = async (req: any, res: any, next: any) => {
    try {
      const { orgId } = req.params;
      const userId = req.user.id;
      
      const userRole = await storage.getUserRole(userId, orgId);
      if (!userRole || (userRole !== 'ADMIN' && userRole !== 'OWNER')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      next();
    } catch (error) {
      console.error("Error checking admin role:", error);
      res.status(500).json({ message: "Failed to verify admin access" });
    }
  };

  // Check admin role endpoint - returns role info without blocking
  // ✅ SECURITY FIX (P2): Add authorization check to prevent organization enumeration
  app.get('/api/organizations/:orgId/admin/check-role', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user.id;

      const userRole = await storage.getUserRole(userId, orgId);

      // ✅ SECURITY FIX (P2): Return 403 if user is not a member
      // Prevents enumeration of valid organization IDs
      if (!userRole) {
        return res.status(403).json({
          message: 'Access denied',
          error: 'You are not a member of this organization'
        });
      }

      res.json({
        role: userRole,
        isAdmin: userRole === 'ADMIN' || userRole === 'OWNER'
      });
    } catch (error) {
      console.error("Error checking admin role:", error);
      res.status(500).json({ message: "Failed to verify admin access" });
    }
  });

  // SECURITY: Public endpoint requires API key authentication
  app.post('/api/public/projects', requireApiKey, orgCreationLimiter, async (req, res) => {
    try {
      const { email, title, description, verscale_chat_id, old_verscale_chat_id } = req.body;

      // Validate required fields
      if (!email) {
        return res.status(400).json({ 
          success: false,
          error: 'Email is required',
          message: 'Please provide an email address'
        });
      }

      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Title is required',
          message: 'Please provide a project title'
        });
      }

      // ✅ Validate verscale_chat_id is required
      if (!verscale_chat_id) {
        return res.status(400).json({
          success: false,
          error: 'verscale_chat_id is required',
          message: 'Please provide a verscale_chat_id'
        });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: `No user found with email: ${email}`
        });
      }

      // Get user's primary organization
      const organizations = await storage.getUserOrganizations(user.id);
      
      if (!organizations || organizations.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No organization found',
          message: 'User does not belong to any organization'
        });
      }

      const primaryOrg = organizations[0];

      // ✅ Check if this is an update operation (old_verscale_chat_id provided)
      if (old_verscale_chat_id) {
        console.log(`🔄 Update operation detected: email=${email}, old_chat_id=${old_verscale_chat_id}, new_chat_id=${verscale_chat_id}`);
        
        // Find existing project by email + old_verscale_chat_id
        const existingProjects = await storage.getProjectsByOrg(primaryOrg.id);
        const existingProject = existingProjects.find((p: any) => 
          p.createdById === user.id && 
          p.verscale_chat_id === old_verscale_chat_id
        );

        if (existingProject) {
          console.log(`✅ Found existing project to update: ${existingProject.id}`);
          
          // Update the existing project with new verscale_chat_id
          const updatedProject = await storage.updateProject(existingProject.id, {
            verscale_chat_id: verscale_chat_id,
            title: title, // Also update title in case it changed
            description: description || existingProject.description,
            updatedAt: new Date()
          });

          console.log(`✅ Updated project ${existingProject.id}: old_chat_id=${old_verscale_chat_id} → new_chat_id=${verscale_chat_id}`);

          return res.status(200).json({
            success: true,
            data: {
              id: updatedProject.id,
              title: updatedProject.title,
              description: updatedProject.description,
              verscale_chat_id: updatedProject.verscale_chat_id,
              old_verscale_chat_id: old_verscale_chat_id,
              orgId: updatedProject.orgId,
              userId: user.id,
              createdAt: updatedProject.createdAt,
              updatedAt: updatedProject.updatedAt
            },
            message: 'Project updated successfully'
          });
        } else {
          console.log(`⚠️ No existing project found with old_verscale_chat_id=${old_verscale_chat_id}, creating new project instead`);
          // If no existing project found, continue to create new one
        }
      }

      // ✅ Create new project (either no old_verscale_chat_id or update target not found)
      const projectData = insertProjectSchema.parse({
        orgId: primaryOrg.id,
        title,
        description: description || null,
        type: 'DEVELOP',
        status: 'BACKLOG',
        verscale_chat_id: verscale_chat_id,
        createdById: user.id,
        tags: []
      });

      const project = await storage.createProject(projectData);

      console.log(`✅ Public API: Created project for user ${email} (${user.id}) with verscale_chat_id=${verscale_chat_id}`);

      res.status(201).json({
        success: true,
        data: {
          id: project.id,
          title: project.title,
          description: project.description,
          verscale_chat_id: project.verscale_chat_id,
          orgId: project.orgId,
          userId: user.id,
          createdAt: project.createdAt
        },
        message: 'Project created successfully'
      });

    } catch (error) {
      console.error('❌ Public API - Create/Update project error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create or update project',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Admin routes
  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  app.patch('/api/organizations/:orgId/admin/settings', isAuthenticated, isOrgAdmin, validateRequest(updateOrgSettingsSchema), async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const { logoUrl, primaryColor, slug, challengesEnabled, expertsEnabled, radarEnabled, dashboardEnabled, aiBuilderEnabled, formSubmissionEnabled, academyEnabled, consultationEnabled, consultationMinCredits, consultationMaxEligible } = req.body;

      const updatedOrg = await storage.updateOrganization(orgId, {
        logoUrl,
        primaryColor,
        slug,
        challengesEnabled,
        expertsEnabled,
        radarEnabled,
        dashboardEnabled,
        aiBuilderEnabled,
        formSubmissionEnabled,
        academyEnabled,
        consultationEnabled,
        consultationMinCredits,
        consultationMaxEligible,
      });

      res.json(updatedOrg);
    } catch (error) {
      console.error("Error updating organization settings:", error);
      res.status(500).json({ message: "Failed to update organization settings" });
    }
  });

  app.get('/api/organizations/:orgId/admin/members', isAuthenticated, isOrgAdmin, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const members = await storage.getOrganizationMembers(orgId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching organization members:", error);
      res.status(500).json({ message: "Failed to fetch organization members" });
    }
  });

  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  app.post('/api/organizations/:orgId/admin/members', isAuthenticated, isOrgAdmin, validateRequest(addOrgMemberSchema), async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const { email, role } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'Email is required' });
      }

      // make sure no user with this email is already a member of the org
      const existingMemberUser = await storage.getUserByEmailOrganization(email, orgId);
      if (existingMemberUser) {
        return res.status(400).json({ message: 'A user with this email is already a member of the organization' });
      }

      // create a new user for this invite (temp credentials)
      const localPart = email.split('@')[0].replace(/[^\w\-\.]/g, '').slice(0, 20) || 'user';
      const username = `${localPart}`;

      // Generate cryptographically secure temporary password — user will set real password during registration
      // Password format: alphanumeric + special chars, 16 characters long
      const rawPassword = randomBytes(16).toString('base64').slice(0, 16);
      // SECURITY: Hash password using scrypt
      const hashedPassword = await hashPassword(rawPassword);

      const newUser = await storage.createUser({
        email,
        username,
        firstName: 'New',
        lastName: 'User',
        password: hashedPassword,
        status: 'PENDING'
      });

      // add user to organization
      await storage.addOrganizationMember(orgId, newUser.id, role || 'MEMBER');

      // prepare registration link (frontend should prefill email + org slug)
      const org = await storage.getOrganization(orgId).catch(() => null);
      const hostUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
      const orgSlug = org?.slug || orgId;
      const registerUrl = `${hostUrl}/w/${orgSlug}/register?email=${encodeURIComponent(email)}&userId=${encodeURIComponent(newUser.id)}&role=${encodeURIComponent(role || 'MEMBER')}`;

      // render & send invite email (uses existing invite template; button should point to registerUrl)
      if (resendClient) {
        const orgName = org?.name || 'your workspace';
        const userName = newUser.firstName || newUser.username || newUser.email;

        const templateCandidates = [
          path.join(__dirname, 'email-templates', 'invite-member.html'),
          path.join(process.cwd(), 'server', 'email-templates', 'invite-member.html'),
          path.join(process.cwd(), 'dist', 'email-templates', 'invite-member.html'),
          path.join(process.cwd(), 'email-templates', 'invite-member.html')
        ];

        let html = '';
        const found = templateCandidates.find(p => {
          try { return fs.existsSync(p); } catch { return false; }
        });

        if (found) {
          try {
            const htmlTemplate = fs.readFileSync(found, 'utf8');
            html = mustache.render(htmlTemplate, {
              orgName,
              userName,
              role: role || 'MEMBER',
              acceptUrl: registerUrl,
              hostUrl,
              orgSlug
            });
          } catch (tplErr) {
            console.warn('Failed to read/render email template at', found, tplErr);
          }
        }

        if (!html) {
          const inlineTemplate = `<html><body>
            <p>Hi {{userName}},</p>
            <p>You have been invited to join <strong>{{orgName}}</strong> on FikraHub.</p>
            <p>Click the button below to complete your registration (your email will be pre-filled):</p>
            <p><a href="{{registerUrl}}">Complete registration</a></p>
            <p>If that doesn't work, open {{hostUrl}} and enter workspace slug: <strong>{{orgSlug}}</strong></p>
          </body></html>`;
          html = mustache.render(inlineTemplate, { orgName, userName, registerUrl, hostUrl, orgSlug });
        }

        try {
          await resendClient.emails.send({
            from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com',
            to: email,
            subject: `You're invited to ${org?.name || 'FikraHub'}`,
            html
          });
          console.log(`✅ Invite email sent to ${email} for org ${orgId}`);
        } catch (err) {
          console.error('❌ Resend failed to send invite email:', err);
          console.log('Invitation content (fallback log):', { to: email, subject: `You're invited to ${org?.name || 'FikraHub'}`, htmlSnippet: html.substring(0,300) });
        }
      } else {
        console.log(`ℹ️ Resend not configured. Skipping send. Invitation details: to=${email}, orgSlug=${orgSlug}`);
      }

      res.json({ message: "Member added successfully", user: { id: newUser.id, email: newUser.email, username: newUser.username } });
    } catch (error) {
      console.error("Error adding organization member:", error);
      res.status(500).json({ message: "Failed to add organization member" });
    }
  });

  // ✅ SECURITY FIX (P1): Add comprehensive input validation
  app.patch('/api/organizations/:orgId/admin/members/:userId', isAuthenticated, isOrgAdmin, validateRequest(updateMemberRoleSchema), async (req: any, res) => {
    try {
      const { orgId, userId } = req.params;
      const { role } = req.body;
      
      await storage.updateMemberRole(orgId, userId, role);
      // Log platform event
      db.insert(platformEvents).values({
        orgId,
        actorId: req.user.id,
        eventType: 'ROLE_UPDATED',
        targetUserId: userId,
        metadata: { newRole: role },
      }).catch(console.error);
      res.json({ message: "Member role updated successfully" });
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ message: "Failed to update member role" });
    }
  });

  app.post('/api/workspaces/:slug/complete-invite', authRateLimiter, async (req: any, res) => {
    try {
      const { email, password, firstName, lastName, userId } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
      }

      // verify userId present
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'userId is required' });
      }

      // fetch invited user
      const invited = await storage.getUser(userId);
      if (!invited) {
        return res.status(404).json({ error: 'Invited user not found' });
      }

      // Allow if PENDING, or ACTIVE but password not yet set (CSV-imported users set to ACTIVE prematurely)
      const passwordNotSet = !invited.password || invited.password === '';
      if (invited.status !== 'PENDING' && !(invited.status === 'ACTIVE' && passwordNotSet)) {
        console.warn(`Invite completion attempted for non-pending user: ${userId}, status: ${invited.status}`);
        return res.status(400).json({ error: 'Invalid invite or invite already completed' });
      }

      // Validate password strength
      if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) ||
          !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
        });
      }

      // hash password and update user
      // SECURITY: Hash password using scrypt
      const hashed = await hashPassword(password);
      const updated = await storage.updateUser(invited.id, {
        email,
        firstName: firstName || invited.firstName || '',
        lastName: lastName || invited.lastName || '',
        password: hashed,
        status: 'ACTIVE',
      });

      // Auto-login if possible (Passport style)
      if (typeof req.logIn === 'function') {
        req.logIn(updated, (err: any) => {
          if (err) {
            console.error('Auto-login failed after signup:', err);
            if (req.session) (req.session as any).userId = updated.id;
            return res.status(500).json({ error: 'Failed to create session after signup' });
          }
          return res.json({ success: true, user: updated });
        });
        return;
      }

      if (req.session) {
        (req.session as any).userId = updated.id;
      }

      res.json({ success: true, user: updated });
    } catch (error) {
      console.error('Signup completion error:', error);
      res.status(500).json({ error: 'Signup failed' });
    }
  });

  app.delete('/api/organizations/:orgId/admin/members/:userId', isAuthenticated, isOrgAdmin, async (req: any, res) => {
    try {
      const { orgId, userId } = req.params;
      
      // Prevent removing the last owner
      const userRole = await storage.getUserRole(userId, orgId);
      if (userRole === 'OWNER') {
        const allMembers = await storage.getOrganizationMembers(orgId);
        const owners = allMembers.filter(m => m.role === 'OWNER');
        if (owners.length <= 1) {
          return res.status(400).json({ message: "Cannot remove the last owner" });
        }
      }
      
      await storage.removeMemberFromOrganization(orgId, userId);
      res.json({ message: "Member removed successfully" });
    } catch (error) {
      console.error("Error removing organization member:", error);
      res.status(500).json({ message: "Failed to remove organization member" });
    }
  });

  app.get('/api/organizations/:orgId/admin/stats', isAuthenticated, isOrgAdmin, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const stats = await storage.getOrganizationStats(orgId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching organization stats:", error);
      res.status(500).json({ message: "Failed to fetch organization stats" });
    }
  });

  app.get('/api/organizations/:orgId/admin/ideas', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user.id;
      const userRole = await storage.getUserRole(userId, orgId);
      if (!userRole || (userRole !== 'ADMIN' && userRole !== 'OWNER' && userRole !== 'MENTOR')) {
        return res.status(403).json({ message: "Access required" });
      }
      const projects = await storage.getProjectsByOrg(orgId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching organization ideas:", error);
      res.status(500).json({ message: "Failed to fetch organization ideas" });
    }
  });

  app.delete('/api/organizations/:orgId/admin/ideas/:ideaId', isAuthenticated, isOrgAdmin, async (req: any, res) => {
    try {
      const { ideaId } = req.params;
      await storage.deleteProject(ideaId);
      res.json({ message: "Idea deleted successfully" });
    } catch (error) {
      console.error("Error deleting idea:", error);
      res.status(500).json({ message: "Failed to delete idea" });
    }
  });

  // Project routes
  app.get('/api/organizations/:orgId/projects', isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const projects = await storage.getProjectsByOrg(orgId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Project routes
  app.get('/api/organizations/:orgId/projects-user', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user.id;
      const projects = await storage.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projectData = insertProjectSchema.parse({
        ...req.body,
        type: req.body.type || 'LAUNCH',
        createdById: userId,
      });

      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // List projects by organization
  app.get('/api/projects', isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.query;
      if (!orgId || typeof orgId !== 'string') {
        return res.status(400).json({ message: "Organization ID is required" });
      }

      const projects = await storage.getProjectsByOrg(orgId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Update project endpoint (with authorization check)
  app.patch('/api/projects/:id', isAuthenticated, canModifyProject, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Whitelist allowed update fields to prevent mass assignment
      const allowedFields = ['title', 'description', 'status', 'tags', 'type', 'deploymentUrl', 'pitchDeckUrl', 'verscale_chat_id'];
      const safeUpdateData: any = {};

      for (const field of allowedFields) {
        if (field in updateData) {
          safeUpdateData[field] = updateData[field];
        }
      }

      const project = await storage.updateProject(id, safeUpdateData);
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Export project + all assets as a PDF
  app.get('/api/projects/:id/export-pdf', isAuthenticated, canAccessProject, async (req: any, res) => {
    try {
      const project = req.project;
      const assets = await storage.getAssetsByProject(project.id);

      const { buildExportHtml, convertHtmlToPdf } = await import('./project-export.js');
      const html = buildExportHtml(project, assets);
      const pdfBuffer = await convertHtmlToPdf(html);

      const safeTitle = (project.title || 'project').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}-export.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer);
    } catch (error: any) {
      console.error('Error exporting project PDF:', error?.message || error);
      res.status(500).json({ message: error?.message || 'Failed to generate PDF export' });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, canAccessProject, async (req: any, res) => {
    try {
      const project = req.project;
      // Attach owner user info
      let owner = null;
      if (project.createdById) {
        const [ownerUser] = await db.select({
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }).from(users).where(eq(users.id, project.createdById));
        owner = ownerUser || null;
      }
      res.json({ ...project, owner });
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, canModifyProject, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Authorization already checked by canModifyProject middleware
      await storage.deleteProject(id);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Submit project:
  //   - Projects with no challengeId: 1 submission per workspace
  //   - Projects tied to a challenge: 1 submission per challenge
  app.post('/api/projects/:id/submit', isAuthenticated, canModifyProject, async (req: any, res) => {
    try {
      const project = req.project; // attached by canModifyProject middleware
      const userId = req.user.id;

      if (project.submitted) {
        return res.status(400).json({ error: 'Project is already submitted' });
      }

      const allUserProjects = await storage.getProjectsByUser(userId);

      if (project.challengeId) {
        // 1 submission per challenge
        const alreadySubmitted = allUserProjects.find(
          (p: any) => p.challengeId === project.challengeId && p.submitted && p.id !== project.id
        );
        if (alreadySubmitted) {
          return res.status(400).json({ error: 'You have already submitted an idea for this challenge' });
        }
      } else {
        // 1 submission per workspace (only count projects not tied to any challenge)
        const alreadySubmitted = allUserProjects.find(
          (p: any) => p.orgId === project.orgId && !p.challengeId && p.submitted && p.id !== project.id
        );
        if (alreadySubmitted) {
          return res.status(400).json({ error: 'You have already submitted an idea for this workspace' });
        }
      }

      const updated = await storage.updateProject(project.id, { submitted: true });
      res.json(updated);

      // Fire-and-forget: send idea submission confirmation email
      (async () => {
        try {
          const resendApiKey = process.env.RESEND_API_KEY;
          const resendClient = resendApiKey ? new Resend(resendApiKey) : null;
          if (!resendClient) return;

          const hostUrl = process.env.HOST_URL || 'https://os.fikrahub.com';

          const [submitter] = await db.select({ email: users.email, firstName: users.firstName })
            .from(users).where(eq(users.id, userId)).limit(1);
          const org = await storage.getOrganization(project.orgId);
          if (!submitter?.email || !org) return;

          let challengeTitle: string | null = null;
          if (project.challengeId) {
            const [ch] = await db.select({ title: challenges.title })
              .from(challenges).where(eq(challenges.id, project.challengeId)).limit(1);
            challengeTitle = ch?.title ?? null;
          }

          const templatePaths = [
            path.join(__dirname, 'email-templates', 'idea-submission-confirmation.html'),
            path.join(process.cwd(), 'server', 'email-templates', 'idea-submission-confirmation.html'),
            path.join(process.cwd(), 'dist', 'email-templates', 'idea-submission-confirmation.html'),
          ];
          const templateFile = templatePaths.find(p => { try { return fs.existsSync(p); } catch { return false; } });
          if (!templateFile) return;

          const vars: Record<string, string> = {
            userName: submitter.firstName || submitter.email,
            orgName: org.name,
            ideaTitle: (project as any).title || 'Your Idea',
            submittedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            dashboardUrl: `${hostUrl}/w/${org.slug}`,
          };
          if (challengeTitle) vars.challengeTitle = challengeTitle;
          if ((project as any).sector) vars.sector = (project as any).sector;

          const html = mustache.render(fs.readFileSync(templateFile, 'utf8'), vars);
          if (!html) return;

          await resendClient.emails.send({
            from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com',
            to: submitter.email,
            subject: `✅ Your idea "${vars.ideaTitle}" has been submitted to ${org.name}`,
            html,
          });
        } catch (emailErr) {
          console.error('Error sending idea submission email:', emailErr);
        }
      })();
    } catch (error) {
      console.error('Error submitting project:', error);
      res.status(500).json({ error: 'Failed to submit project' });
    }
  });

  // ── Program Progress routes ──────────────────────────────────────────────────
  // GET /api/organizations/:orgId/program-progress — any authenticated member
  app.get('/api/organizations/:orgId/program-progress', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user.id;
      const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
      const isSuperAdmin = superAdminEmails.includes((req.user.email || '').toLowerCase());
      if (!isSuperAdmin) {
        const role = await storage.getUserRole(userId, orgId);
        if (!role) return res.status(403).json({ message: 'Access denied' });
      }
      const progress = await storage.getProgramProgress(orgId);
      // Return defaults if not yet configured
      if (!progress) {
        return res.json({
          orgId,
          currentStep: 1,
          steps: [
            { titleEn: 'Ideation & Business Foundations', titleAr: 'الريادة وأسس الأعمال' },
            { titleEn: 'Product Strategy & Validation', titleAr: 'استراتيجية المنتج والتحقق' },
            { titleEn: 'Product Design & Insights', titleAr: 'تصميم المنتج والرؤى' },
            { titleEn: 'Pitching & Presentation', titleAr: 'العرض التقديمي' },
          ],
        });
      }
      res.json(progress);
    } catch (error) {
      console.error('Error fetching program progress:', error);
      res.status(500).json({ message: 'Failed to fetch program progress' });
    }
  });

  // PATCH /api/organizations/:orgId/program-progress — Admin/Owner or Super Admin
  app.patch('/api/organizations/:orgId/program-progress', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user.id;
      const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
      const isSuperAdmin = superAdminEmails.includes((req.user.email || '').toLowerCase());
      if (!isSuperAdmin) {
        const role = await storage.getUserRole(userId, orgId);
        if (!role || (role !== 'ADMIN' && role !== 'OWNER')) {
          return res.status(403).json({ message: 'Admin or Owner access required' });
        }
      }
      const { currentStep, steps } = req.body;
      if (currentStep !== undefined && (typeof currentStep !== 'number' || currentStep < 1 || currentStep > 4)) {
        return res.status(400).json({ message: 'currentStep must be 1–4' });
      }
      if (steps !== undefined && (!Array.isArray(steps) || steps.length !== 4)) {
        return res.status(400).json({ message: 'steps must be an array of exactly 4 items' });
      }
      // Fetch current to fill in unchanged fields
      const existing = await storage.getProgramProgress(orgId);
      const newStep = currentStep ?? existing?.currentStep ?? 1;
      const newSteps = steps ?? existing?.steps ?? [
        { titleEn: 'Ideation & Business Foundations', titleAr: 'الريادة وأسس الأعمال' },
        { titleEn: 'Product Strategy & Validation', titleAr: 'استراتيجية المنتج والتحقق' },
        { titleEn: 'Product Design & Insights', titleAr: 'تصميم المنتج والرؤى' },
        { titleEn: 'Pitching & Presentation', titleAr: 'العرض التقديمي' },
      ];
      const updated = await storage.upsertProgramProgress(orgId, newStep, newSteps, userId);
      // Log platform event
      db.insert(platformEvents).values({
        orgId,
        actorId: userId,
        eventType: 'PROGRAM_PROGRESS_UPDATED',
        metadata: { currentStep: newStep, previousStep: existing?.currentStep ?? null },
      }).catch(console.error);
      res.json(updated);
    } catch (error) {
      console.error('Error updating program progress:', error);
      res.status(500).json({ message: 'Failed to update program progress' });
    }
  });

  // ── Mentor assignments ─────────────────────────────────────────────────────
  // GET /api/organizations/:orgId/mentor-assignments — Admin/Owner: list all assignments with member details
  app.get('/api/organizations/:orgId/mentor-assignments', isAuthenticated, isOrgAdmin, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const rows = await storage.getMentorAssignmentsWithDetails(orgId);
      // For each assignment row, also fetch the member's user info
      const memberIds = [...new Set(rows.map((r: any) => r.memberUserId as string))];
      let memberMap: Record<string, any> = {};
      if (memberIds.length > 0) {
        const members = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            profileImageUrl: users.profileImageUrl,
          })
          .from(users)
          .where(inArray(users.id, memberIds));
        memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
      }
      res.json(rows.map((r: any) => ({ ...r, memberInfo: memberMap[r.memberUserId] ?? null })));
    } catch (error) {
      console.error('Error fetching mentor assignments:', error);
      res.status(500).json({ message: 'Failed to fetch mentor assignments' });
    }
  });

  // POST /api/organizations/:orgId/mentor-assignments — Admin/Owner: assign a member to a mentor
  app.post('/api/organizations/:orgId/mentor-assignments', isAuthenticated, isOrgAdmin, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const { mentorUserId, memberUserId } = req.body;
      if (!mentorUserId || !memberUserId) {
        return res.status(400).json({ message: 'mentorUserId and memberUserId are required' });
      }
      // Validate both users are members of this org
      const [mentorMembership, memberMembership] = await Promise.all([
        storage.hasOrganizationMember(orgId, mentorUserId),
        storage.hasOrganizationMember(orgId, memberUserId),
      ]);
      if (!mentorMembership) return res.status(400).json({ message: 'Mentor is not a member of this workspace' });
      if (!memberMembership) return res.status(400).json({ message: 'Member is not a member of this workspace' });
      // Verify mentor has MENTOR role
      const mentorRole = await storage.getUserRole(mentorUserId, orgId);
      if (mentorRole !== 'MENTOR') {
        return res.status(400).json({ message: 'Selected user does not have the MENTOR role' });
      }
      const assignment = await storage.assignMemberToMentor(orgId, mentorUserId, memberUserId);
      res.status(201).json(assignment);
    } catch (error) {
      console.error('Error creating mentor assignment:', error);
      res.status(500).json({ message: 'Failed to create assignment' });
    }
  });

  // DELETE /api/organizations/:orgId/mentor-assignments/:id — Admin/Owner: remove assignment
  app.delete('/api/organizations/:orgId/mentor-assignments/:id', isAuthenticated, isOrgAdmin, async (req: any, res) => {
    try {
      const { orgId, id } = req.params;
      await storage.removeMentorAssignment(id, orgId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing mentor assignment:', error);
      res.status(500).json({ message: 'Failed to remove assignment' });
    }
  });

  // GET /api/mentor-profile/my-participants — Mentor: get assigned members + their ideas & pitch decks
  app.get('/api/mentor-profile/my-participants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      // Get this mentor's org
      const [membership] = await db
        .select({ orgId: organizationMembers.orgId, role: organizationMembers.role })
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, userId))
        .limit(1);
      if (!membership) return res.json([]);
      const { orgId, role } = membership;
      if (role !== 'MENTOR' && role !== 'ADMIN' && role !== 'OWNER') {
        return res.status(403).json({ message: 'Access denied' });
      }
      const participantIds = await storage.getMentorParticipantIds(userId, orgId);
      if (participantIds.length === 0) return res.json([]);
      // Fetch participant user info
      const members = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
        })
        .from(users)
        .where(inArray(users.id, participantIds));
      // Fetch their ideas (projects) — includes pitchDeckUrl and deploymentUrl
      const memberProjects = await db
        .select({
          id: projects.id,
          orgId: projects.orgId,
          title: projects.title,
          description: projects.description,
          status: projects.status,
          type: projects.type,
          tags: projects.tags,
          pitchDeckUrl: projects.pitchDeckUrl,
          deploymentUrl: projects.deploymentUrl,
          submitted: projects.submitted,
          createdById: projects.createdById,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .where(inArray(projects.createdById, participantIds));
      // Fetch generated pitch decks by projectId
      const projectIds = memberProjects.map((p) => p.id);
      const memberPitchDecks = projectIds.length > 0
        ? await db
            .select({
              id: pitchDeckGenerations.id,
              projectId: pitchDeckGenerations.projectId,
              status: pitchDeckGenerations.status,
              downloadUrl: pitchDeckGenerations.downloadUrl,
              createdById: pitchDeckGenerations.createdById,
              createdAt: pitchDeckGenerations.createdAt,
            })
            .from(pitchDeckGenerations)
            .where(inArray(pitchDeckGenerations.projectId, projectIds))
        : [];
      // Index pitch decks by projectId for fast lookup
      const pitchDecksByProject: Record<string, any[]> = {};
      for (const deck of memberPitchDecks) {
        if (!pitchDecksByProject[deck.projectId]) pitchDecksByProject[deck.projectId] = [];
        pitchDecksByProject[deck.projectId].push(deck);
      }
      // Enrich each project with its pitch decks
      const enrichedProjects = memberProjects.map((p) => ({
        ...p,
        pitchDecks: pitchDecksByProject[p.id] ?? [],
      }));
      // Group by member
      const memberMap: Record<string, any> = {};
      for (const m of members) {
        memberMap[m.id] = {
          user: m,
          ideas: enrichedProjects.filter((p) => p.createdById === m.id),
        };
      }
      res.json(Object.values(memberMap));
    } catch (error) {
      console.error('Error fetching mentor participants:', error);
      res.status(500).json({ message: 'Failed to fetch participants' });
    }
  });

  // Academy course progress routes
  app.get('/api/academy/progress/:courseSlug', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { courseSlug } = req.params;
      const progress = await storage.getCourseProgress(userId, courseSlug);
      res.json(progress);
    } catch (error) {
      console.error('Error fetching course progress:', error);
      res.status(500).json({ error: 'Failed to fetch progress' });
    }
  });

  app.post('/api/academy/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { courseSlug, videoSlug, watchedSeconds, completed } = req.body;
      if (!courseSlug || !videoSlug || typeof watchedSeconds !== 'number') {
        return res.status(400).json({ error: 'courseSlug, videoSlug, and watchedSeconds are required' });
      }
      const record = await storage.upsertVideoProgress(
        userId, courseSlug, videoSlug,
        Math.max(0, Math.round(watchedSeconds)),
        !!completed
      );
      res.json(record);
    } catch (error) {
      console.error('Error saving course progress:', error);
      res.status(500).json({ error: 'Failed to save progress' });
    }
  });

  // Academy progress summary for all users in a workspace (admin use)
  // Returns { [userId]: { completedVideos, totalVideos, pct } }
  app.get('/api/workspaces/:orgId/admin/academy-progress', isAuthenticated, async (req: any, res) => {
    try {
      await requireOrgAdmin(req, req.params.orgId);
      const { orgId } = req.params;

      // Get all member userIds in this workspace
      const members = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(eq(organizationMembers.orgId, orgId));

      if (members.length === 0) return res.json({});

      const userIds = members.map((m) => m.userId);

      // Get all completed video entries for these users
      const rows = await db
        .select({ userId: courseProgress.userId, completed: courseProgress.completed })
        .from(courseProgress)
        .where(
          and(
            inArray(courseProgress.userId, userIds),
            eq(courseProgress.courseSlug, 'fikrahub-fundamentals')
          )
        );

      const TOTAL_VIDEOS = 14;

      // Aggregate per user
      const result: Record<string, { completedVideos: number; totalVideos: number; pct: number }> = {};
      for (const userId of userIds) {
        const userRows = rows.filter((r) => r.userId === userId);
        const completedVideos = userRows.filter((r) => r.completed).length;
        result[userId] = {
          completedVideos,
          totalVideos: TOTAL_VIDEOS,
          pct: Math.round((completedVideos / TOTAL_VIDEOS) * 100),
        };
      }

      res.json(result);
    } catch (error) {
      console.error('Error fetching academy progress:', error);
      res.status(500).json({ error: 'Failed to fetch academy progress' });
    }
  });

  // GET /api/workspaces/:orgId/admin/member-ai-scores
  // Returns { [userId]: { aiScore: number | null, appStatus: string } }
  app.get('/api/workspaces/:orgId/admin/member-ai-scores', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      const rows = await db
        .select({
          userId: memberApplications.userId,
          aiScore: memberApplications.aiScore,
          appStatus: memberApplications.status,
        })
        .from(memberApplications)
        .innerJoin(organizationMembers, and(
          eq(memberApplications.userId, organizationMembers.userId),
          eq(memberApplications.orgId, organizationMembers.orgId)
        ))
        .where(eq(memberApplications.orgId, orgId));

      const result: Record<string, { aiScore: number | null; appStatus: string }> = {};
      for (const row of rows) {
        result[row.userId] = { aiScore: row.aiScore ?? null, appStatus: row.appStatus };
      }
      res.json(result);
    } catch (error) {
      console.error('Error fetching member AI scores:', error);
      res.status(500).json({ error: 'Failed to fetch member AI scores' });
    }
  });

  // GET /api/workspaces/:orgId/admin/rejected-applications
  app.get('/api/workspaces/:orgId/admin/rejected-applications', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      const rows = await db
        .select({
          id: memberApplications.id,
          ideaName: memberApplications.ideaName,
          sector: memberApplications.sector,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          submittedAt: memberApplications.submittedAt,
        })
        .from(memberApplications)
        .innerJoin(users, eq(memberApplications.userId, users.id))
        .where(and(
          eq(memberApplications.orgId, orgId),
          eq(memberApplications.status, 'REJECTED')
        ));

      res.json(rows);
    } catch (error) {
      console.error('Error fetching rejected applications:', error);
      res.status(500).json({ error: 'Failed to fetch rejected applications' });
    }
  });

  // GET /api/workspaces/:orgId/admin/scoring-criteria — PMO can read
  app.get('/api/workspaces/:orgId/admin/scoring-criteria', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const [pmo, judge] = await Promise.all([getScoringConfig('pmo'), getScoringConfig('judge')]);
      res.json({ pmo, judge });
    } catch (err) {
      console.error('scoring-criteria GET error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/workspaces/:orgId/admin/scoring-criteria/:type — PMO can edit
  app.put('/api/workspaces/:orgId/admin/scoring-criteria/:type', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, type } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      if (type !== 'pmo' && type !== 'judge') return res.status(400).json({ error: 'type must be pmo or judge' });
      const config = req.body;
      if (!config?.categories || !Array.isArray(config.categories)) {
        return res.status(400).json({ error: 'Invalid config: categories array required' });
      }
      const totalWeight = config.categories.reduce((sum: number, cat: any) => {
        return sum + cat.questions.reduce((s: number, q: any) => s + (q.weight || 0), 0);
      }, 0);
      if (Math.abs(totalWeight - 100) > 1) {
        return res.status(400).json({ error: `Question weights must sum to 100 (got ${totalWeight})` });
      }
      const [existing] = await db.select().from(scoringCriteriaConfig).where(eq(scoringCriteriaConfig.type, type));
      if (existing) {
        await db.update(scoringCriteriaConfig).set({ config, updatedBy: req.user.id, updatedAt: new Date() }).where(eq(scoringCriteriaConfig.type, type));
      } else {
        await db.insert(scoringCriteriaConfig).values({ type, config, updatedBy: req.user.id });
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('scoring-criteria PUT error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/workspaces/:orgId/admin/idea-evaluations/:projectId
  app.get('/api/workspaces/:orgId/admin/idea-evaluations/:projectId', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, projectId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const [evaluation] = await db.select().from(ideaEvaluations).where(eq(ideaEvaluations.projectId, projectId));
      if (!evaluation) return res.status(404).json({ error: 'No evaluation found' });
      res.json(evaluation);
    } catch (error) {
      console.error('Error fetching idea evaluation:', error);
      res.status(500).json({ error: 'Failed to fetch evaluation' });
    }
  });

  // POST /api/workspaces/:orgId/admin/idea-evaluations/:projectId — upsert
  app.post('/api/workspaces/:orgId/admin/idea-evaluations/:projectId', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, projectId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      const { b1, b2, b3, b4, b5, t1, t2, t3, t4, s1, s2, s3 } = req.body;
      const toNum = (v: any) => (v != null ? Number(v) : null);

      const bn1 = toNum(b1), bn2 = toNum(b2), bn3 = toNum(b3), bn4 = toNum(b4), bn5 = toNum(b5);
      const tn1 = toNum(t1), tn2 = toNum(t2), tn3 = toNum(t3), tn4 = toNum(t4);
      const sn1 = toNum(s1), sn2 = toNum(s2), sn3 = toNum(s3);

      // Load weights from DB (falls back to defaults if not configured)
      const pmoConfig = await getScoringConfig('pmo');
      const allQuestions = pmoConfig.categories.flatMap(c => c.questions);
      const getW = (id: string) => allQuestions.find(q => q.id === id)?.weight ?? 0;

      const computeScore = (vals: (number | null)[], weights: number[]) => {
        let score = 0;
        for (let i = 0; i < vals.length; i++) {
          if (vals[i] != null) score += (vals[i]! / 5) * weights[i];
        }
        return score;
      };
      const raw = computeScore(
        [bn1, bn2, bn3, bn4, bn5, tn1, tn2, tn3, tn4, sn1, sn2, sn3],
        ['b1','b2','b3','b4','b5','t1','t2','t3','t4','s1','s2','s3'].map(getW)
      );
      const totalScore = Math.round(raw);

      const [existing] = await db.select().from(ideaEvaluations).where(eq(ideaEvaluations.projectId, projectId));
      let result;
      if (existing) {
        [result] = await db.update(ideaEvaluations)
          .set({ b1: bn1, b2: bn2, b3: bn3, b4: bn4, b5: bn5, t1: tn1, t2: tn2, t3: tn3, t4: tn4, s1: sn1, s2: sn2, s3: sn3, totalScore, updatedAt: new Date() })
          .where(eq(ideaEvaluations.projectId, projectId))
          .returning();
      } else {
        [result] = await db.insert(ideaEvaluations)
          .values({ projectId, orgId, evaluatedBy: req.user.id, b1: bn1, b2: bn2, b3: bn3, b4: bn4, b5: bn5, t1: tn1, t2: tn2, t3: tn3, t4: tn4, s1: sn1, s2: sn2, s3: sn3, totalScore })
          .returning();
      }
      res.json(result);

      // Fire-and-forget: notify org admins that a PMO evaluation was submitted
      setImmediate(async () => {
        try {
          const resendApiKey = process.env.RESEND_API_KEY;
          if (!resendApiKey) return;
          const resendClient = new Resend(resendApiKey);
          const hostUrl = process.env.HOST_URL || 'https://os.fikrahub.com';

          // Load org admins/owners with their email
          const adminRows = await db
            .select({ email: users.email, firstName: users.firstName })
            .from(organizationMembers)
            .innerJoin(users, eq(organizationMembers.userId, users.id))
            .where(and(
              eq(organizationMembers.orgId, orgId),
              inArray(organizationMembers.role as any, ['ADMIN', 'OWNER'])
            ));

          if (!adminRows.length) return;

          // Load project title
          const [project] = await db.select({ title: projects.title }).from(projects).where(eq(projects.id, projectId));
          const ideaTitle = project?.title || projectId;

          // Load evaluator name
          const [evaluator] = await db.select({ firstName: users.firstName, email: users.email }).from(users).where(eq(users.id, req.user.id));
          const evaluatorName = evaluator?.firstName || evaluator?.email || 'Unknown';

          // Load org name
          const [orgRecord] = await db.select({ name: organizations.name, slug: organizations.slug }).from(organizations).where(eq(organizations.id, orgId));
          const orgName = orgRecord?.name || orgId;

          const loadTpl = (name: string, vars: Record<string, string>) => {
            const candidates = [
              path.join(__dirname, 'email-templates', `${name}.html`),
              path.join(process.cwd(), 'server', 'email-templates', `${name}.html`),
            ];
            const found = candidates.find(p => { try { return fs.existsSync(p); } catch { return false; } });
            if (!found) return '';
            try { return mustache.render(fs.readFileSync(found, 'utf8'), vars); } catch { return ''; }
          };

          for (const admin of adminRows) {
            if (!admin.email) continue;
            const adminName = admin.firstName || admin.email;
            const html = loadTpl('pmo-evaluation-submitted', {
              adminName,
              orgName,
              ideaTitle,
              totalScore: String(totalScore),
              evaluatorName,
              dashboardUrl: `${hostUrl}/w/${orgRecord?.slug || orgId}/admin/ideas/${projectId}`,
            });
            if (!html) continue;
            await resendClient.emails.send({
              from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com',
              to: admin.email,
              subject: `📋 PMO Evaluation Submitted — ${ideaTitle}`,
              html,
            });
          }
        } catch (emailErr) {
          console.error('Failed to send PMO evaluation email:', emailErr);
        }
      });
    } catch (error) {
      console.error('Error saving idea evaluation:', error);
      res.status(500).json({ error: 'Failed to save evaluation' });
    }
  });

  // GET /api/workspaces/:orgId/admin/leaderboard — SHORTLISTED ideas ranked by PMO score
  app.get('/api/workspaces/:orgId/admin/leaderboard', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      const rows = await db
        .select({
          projectId: projects.id,
          title: projects.title,
          ownerFirstName: users.firstName,
          ownerLastName: users.lastName,
          ownerUsername: users.username,
          totalScore: ideaEvaluations.totalScore,
          publishStatus: projects.publishStatus,
          b1: ideaEvaluations.b1, b2: ideaEvaluations.b2, b3: ideaEvaluations.b3, b4: ideaEvaluations.b4, b5: ideaEvaluations.b5,
          t1: ideaEvaluations.t1, t2: ideaEvaluations.t2, t3: ideaEvaluations.t3, t4: ideaEvaluations.t4,
          s1: ideaEvaluations.s1, s2: ideaEvaluations.s2, s3: ideaEvaluations.s3,
        })
        .from(projects)
        .innerJoin(users, eq(projects.createdById, users.id))
        .leftJoin(ideaEvaluations, eq(projects.id, ideaEvaluations.projectId))
        .where(and(eq(projects.orgId, orgId), inArray(projects.status, ['SHORTLISTED', 'IN_INCUBATION'])))
        .orderBy(desc(ideaEvaluations.totalScore));

      // Compute sub-scores for display
      const leaderboard = rows.map((r) => {
        const toNum = (v: number | null | undefined) => v ?? 0;
        const businessScore = Math.round(
          (toNum(r.b1)/5)*10 + (toNum(r.b2)/5)*8 + (toNum(r.b3)/5)*8 + (toNum(r.b4)/5)*8 + (toNum(r.b5)/5)*6
        );
        const technicalScore = Math.round(
          (toNum(r.t1)/5)*10 + (toNum(r.t2)/5)*8 + (toNum(r.t3)/5)*6 + (toNum(r.t4)/5)*6
        );
        const strategicScore = Math.round(
          (toNum(r.s1)/5)*12 + (toNum(r.s2)/5)*10 + (toNum(r.s3)/5)*8
        );
        return {
          projectId: r.projectId,
          title: r.title,
          ownerName: [r.ownerFirstName, r.ownerLastName].filter(Boolean).join(' ') || r.ownerUsername,
          totalScore: r.totalScore,
          publishStatus: r.publishStatus ?? 'NONE',
          businessScore,
          technicalScore,
          strategicScore,
        };
      });

      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  // ─── Judge endpoints ────────────────────────────────────────────────────────

  // Helper: verify caller is JUDGE in the org
  async function requireOrgJudge(req: any, orgId: string): Promise<boolean> {
    const userId = req.user?.id;
    if (!userId) return false;
    const [membership] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)));
    return membership?.role === 'JUDGE';
  }

  async function requireOrgClient(req: any, orgId: string): Promise<boolean> {
    const userId = req.user?.id;
    if (!userId) return false;
    const [membership] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)));
    return membership?.role === 'CLIENT';
  }

  // GET /api/workspaces/:orgId/judge/ideas — IN_INCUBATION ideas for judge dashboard
  app.get('/api/workspaces/:orgId/judge/ideas', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgJudge(req, orgId))) return res.status(403).json({ error: 'Judge access required' });

      const judgeId = req.user.id;
      const rows = await db
        .select({
          projectId: projects.id,
          title: projects.title,
          description: projects.description,
          tags: projects.tags,
          pitchDeckUrl: projects.pitchDeckUrl,
          submitted: projects.submitted,
          deploymentUrl: projects.deploymentUrl,
          ownerFirstName: users.firstName,
          ownerLastName: users.lastName,
          ownerUsername: users.username,
          evalId: judgeEvaluations.id,
          totalScore: judgeEvaluations.totalScore,
          pmoScore: ideaEvaluations.totalScore,
          aiScore: memberApplications.aiScore,
          aiInsights: memberApplications.aiInsights,
        })
        .from(projects)
        .innerJoin(users, eq(projects.createdById, users.id))
        .leftJoin(judgeEvaluations, and(
          eq(judgeEvaluations.projectId, projects.id),
          eq(judgeEvaluations.judgeId, judgeId)
        ))
        .leftJoin(ideaEvaluations, eq(ideaEvaluations.projectId, projects.id))
        .leftJoin(memberApplications, eq(memberApplications.userId, projects.createdById))
        .where(and(eq(projects.orgId, orgId), eq(projects.status, 'IN_INCUBATION')));

      const ideas = rows.map((r) => ({
        projectId: r.projectId,
        title: r.title,
        description: r.description,
        tags: r.tags,
        pitchDeckUrl: r.pitchDeckUrl,
        submitted: r.submitted,
        deploymentUrl: r.deploymentUrl,
        ownerName: [r.ownerFirstName, r.ownerLastName].filter(Boolean).join(' ') || r.ownerUsername,
        scored: !!r.evalId,
        totalScore: r.totalScore,
        pmoScore: r.pmoScore,
        aiScore: r.aiScore,
      }));

      res.json(ideas);
    } catch (error) {
      console.error('Error fetching judge ideas:', error);
      res.status(500).json({ error: 'Failed to fetch ideas' });
    }
  });

  // GET /api/workspaces/:orgId/judge/program-leaderboard — AI + PMO scores visible to judges
  app.get('/api/workspaces/:orgId/judge/program-leaderboard', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgJudge(req, orgId))) return res.status(403).json({ error: 'Judge access required' });

      const rows = await db
        .select({
          projectId: projects.id,
          title: projects.title,
          tags: projects.tags,
          ownerFirstName: users.firstName,
          ownerLastName: users.lastName,
          ownerUsername: users.username,
          status: projects.status,
          pmoScore: ideaEvaluations.totalScore,
          pmoB1: ideaEvaluations.b1, pmoB2: ideaEvaluations.b2, pmoB3: ideaEvaluations.b3,
          pmoB4: ideaEvaluations.b4, pmoB5: ideaEvaluations.b5,
          pmoT1: ideaEvaluations.t1, pmoT2: ideaEvaluations.t2,
          pmoT3: ideaEvaluations.t3, pmoT4: ideaEvaluations.t4,
          pmoS1: ideaEvaluations.s1, pmoS2: ideaEvaluations.s2, pmoS3: ideaEvaluations.s3,
          aiScore: memberApplications.aiScore,
          aiInsights: memberApplications.aiInsights,
          aiStrengths: memberApplications.aiStrengths,
          aiRecommendations: memberApplications.aiRecommendations,
          aiMetrics: memberApplications.aiMetrics,
        })
        .from(projects)
        .innerJoin(users, eq(projects.createdById, users.id))
        .leftJoin(ideaEvaluations, eq(ideaEvaluations.projectId, projects.id))
        .leftJoin(memberApplications, eq(memberApplications.userId, projects.createdById))
        .where(and(eq(projects.orgId, orgId), inArray(projects.status, ['IN_INCUBATION'])))
        .orderBy(desc(memberApplications.aiScore));

      const toNum = (v: number | null | undefined) => v ?? 0;
      const result = rows.map((r) => ({
        projectId: r.projectId,
        title: r.title,
        tags: r.tags,
        status: r.status,
        ownerName: [r.ownerFirstName, r.ownerLastName].filter(Boolean).join(' ') || r.ownerUsername,
        aiScore: r.aiScore,
        aiInsights: r.aiInsights,
        aiStrengths: r.aiStrengths,
        aiRecommendations: r.aiRecommendations,
        aiMetrics: r.aiMetrics,
        pmoScore: r.pmoScore,
        pmoBusinessScore: r.pmoScore != null ? Math.round(
          (toNum(r.pmoB1)/5)*10 + (toNum(r.pmoB2)/5)*8 + (toNum(r.pmoB3)/5)*8 +
          (toNum(r.pmoB4)/5)*8 + (toNum(r.pmoB5)/5)*6
        ) : null,
        pmoTechnicalScore: r.pmoScore != null ? Math.round(
          (toNum(r.pmoT1)/5)*10 + (toNum(r.pmoT2)/5)*8 + (toNum(r.pmoT3)/5)*6 + (toNum(r.pmoT4)/5)*6
        ) : null,
        pmoStrategicScore: r.pmoScore != null ? Math.round(
          (toNum(r.pmoS1)/5)*12 + (toNum(r.pmoS2)/5)*10 + (toNum(r.pmoS3)/5)*8
        ) : null,
      }));

      res.json(result);
    } catch (error) {
      console.error('Error fetching judge program leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  // GET /api/workspaces/:orgId/judge/evaluations/:projectId
  app.get('/api/workspaces/:orgId/judge/evaluations/:projectId', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, projectId } = req.params;
      if (!(await requireOrgJudge(req, orgId))) return res.status(403).json({ error: 'Judge access required' });

      const judgeId = req.user.id;
      const [evaluation] = await db
        .select()
        .from(judgeEvaluations)
        .where(and(eq(judgeEvaluations.projectId, projectId), eq(judgeEvaluations.judgeId, judgeId)));

      if (!evaluation) return res.status(404).json({ error: 'No evaluation found' });
      res.json(evaluation);
    } catch (error) {
      console.error('Error fetching judge evaluation:', error);
      res.status(500).json({ error: 'Failed to fetch evaluation' });
    }
  });

  // POST /api/workspaces/:orgId/judge/evaluations/:projectId — upsert
  app.post('/api/workspaces/:orgId/judge/evaluations/:projectId', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, projectId } = req.params;
      if (!(await requireOrgJudge(req, orgId))) return res.status(403).json({ error: 'Judge access required' });

      const judgeId = req.user.id;
      const { d1, d2, d3, d4, d5, p1, p2, p3, p4, e1, e2, e3 } = req.body;
      const toNum = (v: any) => (v != null ? Number(v) : null);

      const dn1=toNum(d1), dn2=toNum(d2), dn3=toNum(d3), dn4=toNum(d4), dn5=toNum(d5);
      const pn1=toNum(p1), pn2=toNum(p2), pn3=toNum(p3), pn4=toNum(p4);
      const en1=toNum(e1), en2=toNum(e2), en3=toNum(e3);

      // Load weights from DB
      const judgeConfig = await getScoringConfig('judge');
      const judgeQs = judgeConfig.categories.flatMap(c => c.questions);
      const jw = (id: string) => judgeQs.find(q => q.id === id)?.weight ?? 0;

      const safe = (v: number | null, weight: number) => v != null ? (v / 5) * weight : 0;
      const totalScore = Math.round(
        safe(dn1,jw('d1')) + safe(dn2,jw('d2')) + safe(dn3,jw('d3')) + safe(dn4,jw('d4')) + safe(dn5,jw('d5')) +
        safe(pn1,jw('p1')) + safe(pn2,jw('p2')) + safe(pn3,jw('p3')) + safe(pn4,jw('p4')) +
        safe(en1,jw('e1')) + safe(en2,jw('e2')) + safe(en3,jw('e3'))
      );

      const [existing] = await db
        .select({ id: judgeEvaluations.id })
        .from(judgeEvaluations)
        .where(and(eq(judgeEvaluations.projectId, projectId), eq(judgeEvaluations.judgeId, judgeId)));

      let result;
      if (existing) {
        [result] = await db.update(judgeEvaluations)
          .set({ d1:dn1, d2:dn2, d3:dn3, d4:dn4, d5:dn5, p1:pn1, p2:pn2, p3:pn3, p4:pn4, e1:en1, e2:en2, e3:en3, totalScore, updatedAt: new Date() })
          .where(and(eq(judgeEvaluations.projectId, projectId), eq(judgeEvaluations.judgeId, judgeId)))
          .returning();
      } else {
        [result] = await db.insert(judgeEvaluations)
          .values({ projectId, orgId, judgeId, d1:dn1, d2:dn2, d3:dn3, d4:dn4, d5:dn5, p1:pn1, p2:pn2, p3:pn3, p4:pn4, e1:en1, e2:en2, e3:en3, totalScore })
          .returning();
      }
      res.json(result);

      // Fire-and-forget: notify org admins
      setImmediate(async () => {
        try {
          const resendApiKey = process.env.RESEND_API_KEY;
          if (!resendApiKey) return;
          const resendClient = new Resend(resendApiKey);
          const hostUrl = process.env.HOST_URL || 'https://os.fikrahub.com';

          const adminRows = await db
            .select({ email: users.email, firstName: users.firstName })
            .from(organizationMembers)
            .innerJoin(users, eq(organizationMembers.userId, users.id))
            .where(and(eq(organizationMembers.orgId, orgId), inArray(organizationMembers.role as any, ['ADMIN', 'OWNER'])));
          if (!adminRows.length) return;

          const [project] = await db.select({ title: projects.title }).from(projects).where(eq(projects.id, projectId));
          const ideaTitle = project?.title || projectId;
          const [judge] = await db.select({ firstName: users.firstName, email: users.email }).from(users).where(eq(users.id, judgeId));
          const judgeName = judge?.firstName || judge?.email || 'Unknown';
          const [orgRecord] = await db.select({ name: organizations.name, slug: organizations.slug }).from(organizations).where(eq(organizations.id, orgId));

          for (const admin of adminRows) {
            if (!admin.email) continue;
            await resendClient.emails.send({
              from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com',
              to: admin.email,
              subject: `⚖️ Judge Evaluation Submitted — ${ideaTitle}`,
              html: `<p>Hi ${admin.firstName || admin.email},</p><p>Judge <strong>${judgeName}</strong> submitted an evaluation for <strong>${ideaTitle}</strong> with a score of <strong>${totalScore}/100</strong>.</p><p><a href="${hostUrl}/w/${orgRecord?.slug || orgId}/admin/ideas">View in Dashboard</a></p>`,
            });
          }
        } catch (emailErr) {
          console.error('Failed to send judge evaluation email:', emailErr);
        }
      });
    } catch (error) {
      console.error('Error saving judge evaluation:', error);
      res.status(500).json({ error: 'Failed to save evaluation' });
    }
  });

  // GET /api/workspaces/:orgId/admin/judge-leaderboard — IN_INCUBATION ideas ranked by total judge score
  app.get('/api/workspaces/:orgId/admin/judge-leaderboard', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      // 1. Aggregate per project: sum / avg / count of judge scores
      const aggregateRows = await db
        .select({
          projectId: projects.id,
          title: projects.title,
          ownerFirstName: users.firstName,
          ownerLastName: users.lastName,
          ownerUsername: users.username,
          publishStatus: projects.publishStatus,
          totalCombined: drizzleSql<number>`coalesce(sum(${judgeEvaluations.totalScore}), 0)`,
          avgScore: avg(judgeEvaluations.totalScore),
          judgeCount: drizzleSql<number>`count(${judgeEvaluations.id})`,
          // Category sub-scores (sum across judges, weighted)
          deckSum: drizzleSql<number>`coalesce(sum(
            (coalesce(${judgeEvaluations.d1},0)::numeric/5)*8 +
            (coalesce(${judgeEvaluations.d2},0)::numeric/5)*8 +
            (coalesce(${judgeEvaluations.d3},0)::numeric/5)*8 +
            (coalesce(${judgeEvaluations.d4},0)::numeric/5)*8 +
            (coalesce(${judgeEvaluations.d5},0)::numeric/5)*8
          ), 0)`,
          pitchSum: drizzleSql<number>`coalesce(sum(
            (coalesce(${judgeEvaluations.p1},0)::numeric/5)*8 +
            (coalesce(${judgeEvaluations.p2},0)::numeric/5)*8 +
            (coalesce(${judgeEvaluations.p3},0)::numeric/5)*8 +
            (coalesce(${judgeEvaluations.p4},0)::numeric/5)*6
          ), 0)`,
          evalSum: drizzleSql<number>`coalesce(sum(
            (coalesce(${judgeEvaluations.e1},0)::numeric/5)*10 +
            (coalesce(${judgeEvaluations.e2},0)::numeric/5)*10 +
            (coalesce(${judgeEvaluations.e3},0)::numeric/5)*10
          ), 0)`,
        })
        .from(projects)
        .innerJoin(users, eq(projects.createdById, users.id))
        .leftJoin(judgeEvaluations, eq(judgeEvaluations.projectId, projects.id))
        .where(and(eq(projects.orgId, orgId), eq(projects.status, 'IN_INCUBATION')))
        .groupBy(projects.id, users.firstName, users.lastName, users.username)
        .orderBy(drizzleSql`coalesce(sum(${judgeEvaluations.totalScore}), 0) desc`);

      // 2. All individual judge evals with judge name for per-judge breakdown
      const judgeAlias = db.select({
        projectId: judgeEvaluations.projectId,
        judgeId: judgeEvaluations.judgeId,
        judgeFirstName: users.firstName,
        judgeLastName: users.lastName,
        judgeEmail: users.email,
        totalScore: judgeEvaluations.totalScore,
        d1: judgeEvaluations.d1, d2: judgeEvaluations.d2, d3: judgeEvaluations.d3,
        d4: judgeEvaluations.d4, d5: judgeEvaluations.d5,
        p1: judgeEvaluations.p1, p2: judgeEvaluations.p2, p3: judgeEvaluations.p3, p4: judgeEvaluations.p4,
        e1: judgeEvaluations.e1, e2: judgeEvaluations.e2, e3: judgeEvaluations.e3,
      })
      .from(judgeEvaluations)
      .innerJoin(users, eq(judgeEvaluations.judgeId, users.id))
      .where(eq(judgeEvaluations.orgId, orgId));

      const evalRows = await judgeAlias;

      // Group evals by projectId
      const evalsByProject: Record<string, { judgeName: string; score: number; deckScore: number; pitchScore: number; evalScore: number }[]> = {};
      for (const e of evalRows) {
        if (!evalsByProject[e.projectId]) evalsByProject[e.projectId] = [];
        const n = (v: number | null) => v ?? 0;
        const deckScore = Math.round((n(e.d1)/5)*8 + (n(e.d2)/5)*8 + (n(e.d3)/5)*8 + (n(e.d4)/5)*8 + (n(e.d5)/5)*8);
        const pitchScore = Math.round((n(e.p1)/5)*8 + (n(e.p2)/5)*8 + (n(e.p3)/5)*8 + (n(e.p4)/5)*6);
        const evalScore = Math.round((n(e.e1)/5)*10 + (n(e.e2)/5)*10 + (n(e.e3)/5)*10);
        evalsByProject[e.projectId].push({
          judgeName: [e.judgeFirstName, e.judgeLastName].filter(Boolean).join(' ') || e.judgeEmail || e.judgeId,
          score: e.totalScore ?? 0,
          deckScore, pitchScore, evalScore,
        });
      }

      const leaderboard = aggregateRows.map((r) => ({
        projectId: r.projectId,
        title: r.title,
        ownerName: [r.ownerFirstName, r.ownerLastName].filter(Boolean).join(' ') || r.ownerUsername,
        publishStatus: r.publishStatus ?? 'NONE',
        totalCombined: Number(r.totalCombined),
        avgScore: r.avgScore != null ? Math.round(Number(r.avgScore)) : null,
        judgeCount: Number(r.judgeCount),
        deckSum: Math.round(Number(r.deckSum)),
        pitchSum: Math.round(Number(r.pitchSum)),
        evalSum: Math.round(Number(r.evalSum)),
        judges: evalsByProject[r.projectId] ?? [],
      }));

      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching judge leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch judge leaderboard' });
    }
  });

  // GET /api/workspaces/:orgId/admin/judge-leaderboard/export-csv — CSV export of judge scores
  app.get('/api/workspaces/:orgId/admin/judge-leaderboard/export-csv', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      // Reuse same queries as leaderboard
      const aggregateRows = await db
        .select({
          projectId: projects.id,
          title: projects.title,
          ownerFirstName: users.firstName,
          ownerLastName: users.lastName,
          ownerUsername: users.username,
          totalCombined: drizzleSql<number>`coalesce(sum(${judgeEvaluations.totalScore}), 0)`,
          avgScore: avg(judgeEvaluations.totalScore),
          judgeCount: drizzleSql<number>`count(${judgeEvaluations.id})`,
        })
        .from(projects)
        .innerJoin(users, eq(projects.createdById, users.id))
        .leftJoin(judgeEvaluations, eq(judgeEvaluations.projectId, projects.id))
        .where(and(eq(projects.orgId, orgId), eq(projects.status, 'IN_INCUBATION')))
        .groupBy(projects.id, users.firstName, users.lastName, users.username)
        .orderBy(drizzleSql`coalesce(sum(${judgeEvaluations.totalScore}), 0) desc`);

      const evalRows = await db.select({
        projectId: judgeEvaluations.projectId,
        judgeId: judgeEvaluations.judgeId,
        judgeFirstName: users.firstName,
        judgeLastName: users.lastName,
        judgeEmail: users.email,
        totalScore: judgeEvaluations.totalScore,
        d1: judgeEvaluations.d1, d2: judgeEvaluations.d2, d3: judgeEvaluations.d3,
        d4: judgeEvaluations.d4, d5: judgeEvaluations.d5,
        p1: judgeEvaluations.p1, p2: judgeEvaluations.p2, p3: judgeEvaluations.p3, p4: judgeEvaluations.p4,
        e1: judgeEvaluations.e1, e2: judgeEvaluations.e2, e3: judgeEvaluations.e3,
      })
      .from(judgeEvaluations)
      .innerJoin(users, eq(judgeEvaluations.judgeId, users.id))
      .where(eq(judgeEvaluations.orgId, orgId));

      const evalsByProject: Record<string, { judgeName: string; score: number; deckScore: number; pitchScore: number; evalScore: number }[]> = {};
      for (const e of evalRows) {
        if (!evalsByProject[e.projectId]) evalsByProject[e.projectId] = [];
        const n = (v: number | null) => v ?? 0;
        const deckScore = Math.round((n(e.d1)/5)*8 + (n(e.d2)/5)*8 + (n(e.d3)/5)*8 + (n(e.d4)/5)*8 + (n(e.d5)/5)*8);
        const pitchScore = Math.round((n(e.p1)/5)*8 + (n(e.p2)/5)*8 + (n(e.p3)/5)*8 + (n(e.p4)/5)*6);
        const evalScore = Math.round((n(e.e1)/5)*10 + (n(e.e2)/5)*10 + (n(e.e3)/5)*10);
        evalsByProject[e.projectId].push({
          judgeName: [e.judgeFirstName, e.judgeLastName].filter(Boolean).join(' ') || e.judgeEmail || e.judgeId,
          score: e.totalScore ?? 0,
          deckScore, pitchScore, evalScore,
        });
      }

      // Collect all unique judge names for dynamic columns
      const allJudgeNames = Array.from(new Set(evalRows.map(e =>
        [e.judgeFirstName, e.judgeLastName].filter(Boolean).join(' ') || e.judgeEmail || e.judgeId
      )));

      // Build CSV
      const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
      const judgeHeaders = allJudgeNames.flatMap(j => [`${j} Score`, `${j} Demo Deck`, `${j} Pitching`, `${j} Eval`]);
      const headers = ['Rank', 'Idea Title', 'Owner', 'Avg Score', 'Total Combined', 'Judge Count', ...judgeHeaders];

      const rows = aggregateRows.map((r, i) => {
        const ownerName = [r.ownerFirstName, r.ownerLastName].filter(Boolean).join(' ') || r.ownerUsername;
        const judges = evalsByProject[r.projectId] ?? [];
        const judgeMap: Record<string, typeof judges[0]> = {};
        for (const j of judges) judgeMap[j.judgeName] = j;
        const judgeCols = allJudgeNames.flatMap(jn => {
          const j = judgeMap[jn];
          return j ? [j.score, j.deckScore, j.pitchScore, j.evalScore] : ['', '', '', ''];
        });
        return [i + 1, r.title, ownerName, r.avgScore != null ? Math.round(Number(r.avgScore)) : '', Number(r.totalCombined), Number(r.judgeCount), ...judgeCols];
      });

      const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="judge-scores-${orgId}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting judge scores CSV:', error);
      res.status(500).json({ error: 'Failed to export' });
    }
  });

  // ─── Presentation Control (Demo Day) ─────────────────────────────────────────

  // GET /api/workspaces/:orgId/presentation/current
  app.get('/api/workspaces/:orgId/presentation/current', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
      if (!org) return res.status(404).json({ error: 'Org not found' });

      const currentProjectId = org.currentPresentingProjectId;
      let project = null;
      let allJudgesScored = false;
      let judgeCount = 0;
      let scoredCount = 0;

      if (currentProjectId) {
        const [proj] = await db.select().from(projects)
          .innerJoin(users, eq(projects.createdById, users.id))
          .where(eq(projects.id, currentProjectId))
          .limit(1);
        if (proj) {
          project = {
            id: proj.projects.id,
            title: proj.projects.title,
            ownerName: `${proj.users.firstName || ''} ${proj.users.lastName || ''}`.trim() || proj.users.username,
          };
        }

        const [jCount] = await db.select({ c: count() }).from(organizationMembers)
          .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.role, 'JUDGE')));
        judgeCount = Number(jCount?.c ?? 0);

        const [sCount] = await db.select({ c: count() }).from(judgeEvaluations)
          .where(and(eq(judgeEvaluations.projectId, currentProjectId), eq(judgeEvaluations.orgId, orgId)));
        scoredCount = Number(sCount?.c ?? 0);

        allJudgesScored = judgeCount > 0 && scoredCount >= judgeCount;
      }

      res.json({ project, allJudgesScored, judgeCount, scoredCount });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch presentation state' });
    }
  });

  // POST /api/workspaces/:orgId/admin/presentation/set
  app.post('/api/workspaces/:orgId/admin/presentation/set', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const { projectId } = req.body;
      if (!projectId) return res.status(400).json({ error: 'projectId required' });
      if (!await requireOrgAdmin(req, orgId)) return res.status(403).json({ error: 'Admin access required' });
      await db.update(organizations).set({ currentPresentingProjectId: projectId } as any).where(eq(organizations.id, orgId));
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to set presenter' });
    }
  });

  // POST /api/workspaces/:orgId/admin/presentation/clear
  app.post('/api/workspaces/:orgId/admin/presentation/clear', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!await requireOrgAdmin(req, orgId)) return res.status(403).json({ error: 'Admin access required' });
      await db.update(organizations).set({ currentPresentingProjectId: null } as any).where(eq(organizations.id, orgId));
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear presenter' });
    }
  });

  // GET /api/workspaces/:orgId/client/dashboard-stats
  app.get('/api/workspaces/:orgId/client/dashboard-stats', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const isClientRole = await requireOrgClient(req, orgId);
      const isAdminRole = await requireOrgAdmin(req, orgId);
      if (!isClientRole && !isAdminRole) return res.status(403).json({ error: 'Client access required' });

      const [
        ideasRows,
        memberCount,
        challengeCount,
      ] = await Promise.all([
        db.select({ status: projects.status }).from(projects).where(eq(projects.orgId, orgId)),
        db.select({ count: drizzleSql<number>`COUNT(*)::int` }).from(organizationMembers).where(eq(organizationMembers.orgId, orgId)),
        db.select({ count: drizzleSql<number>`COUNT(*)::int` }).from(challenges).where(eq(challenges.orgId, orgId)),
      ]);

      const pipeline: Record<string, number> = {
        BACKLOG: 0, UNDER_REVIEW: 0, SHORTLISTED: 0, IN_INCUBATION: 0, ARCHIVED: 0,
      };
      for (const row of ideasRows) {
        if (row.status in pipeline) pipeline[row.status]++;
      }

      res.json({
        totalIdeas: ideasRows.length,
        totalMembers: memberCount[0]?.count ?? 0,
        totalChallenges: challengeCount[0]?.count ?? 0,
        pipeline,
      });
    } catch (error) {
      console.error('Error fetching client dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  // GET /api/workspaces/:orgId/client/ideas
  app.get('/api/workspaces/:orgId/client/ideas', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgClient(req, orgId))) return res.status(403).json({ error: 'Client access required' });

      const rows = await db
        .select({
          id: projects.id,
          title: projects.title,
          description: projects.description,
          tags: projects.tags,
          status: projects.status,
          createdAt: projects.createdAt,
          ownerFirstName: users.firstName,
          ownerLastName: users.lastName,
          ownerUsername: users.username,
        })
        .from(projects)
        .innerJoin(users, eq(projects.createdById, users.id))
        .where(eq(projects.orgId, orgId))
        .orderBy(desc(projects.createdAt));

      res.json(rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        tags: r.tags,
        status: r.status,
        createdAt: r.createdAt,
        ownerName: [r.ownerFirstName, r.ownerLastName].filter(Boolean).join(' ') || r.ownerUsername,
      })));
    } catch (error) {
      console.error('Error fetching client ideas:', error);
      res.status(500).json({ error: 'Failed to fetch ideas' });
    }
  });

  // GET /api/workspaces/:orgId/client/leaderboard
  app.get('/api/workspaces/:orgId/client/leaderboard', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgClient(req, orgId))) return res.status(403).json({ error: 'Client access required' });

      const rows = await db
        .select({
          projectId: projects.id,
          title: projects.title,
          tags: projects.tags,
          status: projects.status,
          ownerFirstName: users.firstName,
          ownerLastName: users.lastName,
          ownerUsername: users.username,
          pmoScore: ideaEvaluations.totalScore,
          pmoB1: ideaEvaluations.b1, pmoB2: ideaEvaluations.b2, pmoB3: ideaEvaluations.b3,
          pmoB4: ideaEvaluations.b4, pmoB5: ideaEvaluations.b5,
          pmoT1: ideaEvaluations.t1, pmoT2: ideaEvaluations.t2,
          pmoT3: ideaEvaluations.t3, pmoT4: ideaEvaluations.t4,
          pmoS1: ideaEvaluations.s1, pmoS2: ideaEvaluations.s2, pmoS3: ideaEvaluations.s3,
          aiScore: memberApplications.aiScore,
        })
        .from(projects)
        .innerJoin(users, eq(projects.createdById, users.id))
        .leftJoin(ideaEvaluations, eq(ideaEvaluations.projectId, projects.id))
        .leftJoin(memberApplications, eq(memberApplications.userId, projects.createdById))
        .where(and(eq(projects.orgId, orgId), inArray(projects.status, ['SHORTLISTED', 'IN_INCUBATION'])))
        .orderBy(desc(memberApplications.aiScore));

      const toNum = (v: number | null | undefined) => v ?? 0;
      res.json(rows.map((r) => ({
        projectId: r.projectId,
        title: r.title,
        tags: r.tags,
        status: r.status,
        ownerName: [r.ownerFirstName, r.ownerLastName].filter(Boolean).join(' ') || r.ownerUsername,
        aiScore: r.aiScore,
        pmoScore: r.pmoScore,
        pmoBusinessScore: r.pmoScore != null ? Math.round(
          (toNum(r.pmoB1)/5)*10 + (toNum(r.pmoB2)/5)*8 + (toNum(r.pmoB3)/5)*8 +
          (toNum(r.pmoB4)/5)*8 + (toNum(r.pmoB5)/5)*6
        ) : null,
        pmoTechnicalScore: r.pmoScore != null ? Math.round(
          (toNum(r.pmoT1)/5)*10 + (toNum(r.pmoT2)/5)*8 + (toNum(r.pmoT3)/5)*6 + (toNum(r.pmoT4)/5)*6
        ) : null,
        pmoStrategicScore: r.pmoScore != null ? Math.round(
          (toNum(r.pmoS1)/5)*12 + (toNum(r.pmoS2)/5)*10 + (toNum(r.pmoS3)/5)*8
        ) : null,
      })));
    } catch (error) {
      console.error('Error fetching client leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  // ─── Publish finalists / winners ─────────────────────────────────────────────

  // Shared email helper (reuse loadTpl pattern from PMO evaluation)
  function loadTpl(name: string, vars: Record<string, string>): string {
    const candidates = [
      path.join(__dirname, 'email-templates', `${name}.html`),
      path.join(process.cwd(), 'server', 'email-templates', `${name}.html`),
    ];
    const found = candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
    if (!found) return '';
    try { return mustache.render(fs.readFileSync(found, 'utf8'), vars); } catch { return ''; }
  }

  // POST /api/workspaces/:orgId/admin/leaderboard/publish-finalists
  // Marks top 7 SHORTLISTED/IN_INCUBATION ideas (by PMO score) as FINALIST and emails each owner.
  app.post('/api/workspaces/:orgId/admin/leaderboard/publish-finalists', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      // Fetch ordered leaderboard
      const rows = await db
        .select({
          projectId: projects.id,
          title: projects.title,
          ownerId: projects.createdById,
          ownerEmail: users.email,
          ownerFirstName: users.firstName,
          totalScore: ideaEvaluations.totalScore,
        })
        .from(projects)
        .innerJoin(users, eq(projects.createdById, users.id))
        .leftJoin(ideaEvaluations, eq(projects.id, ideaEvaluations.projectId))
        .where(and(eq(projects.orgId, orgId), inArray(projects.status, ['SHORTLISTED', 'IN_INCUBATION'])))
        .orderBy(desc(ideaEvaluations.totalScore));

      const top7 = rows.slice(0, 7);
      if (top7.length === 0) return res.status(400).json({ error: 'No eligible ideas to publish' });

      const now = new Date();
      const publisherId = req.user.id;

      // Mark all eligible ideas as NONE first (reset previous run), then mark top 7 as FINALIST
      const allIds = rows.map((r) => r.projectId);
      await db.update(projects)
        .set({ publishStatus: 'NONE', publishedAt: null, publishedById: null })
        .where(inArray(projects.id, allIds));

      await db.update(projects)
        .set({ publishStatus: 'FINALIST', publishedAt: now, publishedById: publisherId })
        .where(inArray(projects.id, top7.map((r) => r.projectId)));

      // Load org info for emails
      const [orgRecord] = await db
        .select({ name: organizations.name, slug: organizations.slug })
        .from(organizations)
        .where(eq(organizations.id, orgId));
      const orgName = orgRecord?.name || orgId;
      const hostUrl = process.env.HOST_URL || 'https://os.fikrahub.com';

      // Fire-and-forget emails
      setImmediate(async () => {
        try {
          const resendApiKey = process.env.RESEND_API_KEY;
          if (!resendApiKey) return;
          const resendClient = new Resend(resendApiKey);
          for (const r of top7) {
            if (!r.ownerEmail) continue;
            const html = loadTpl('finalist-announced', {
              orgName,
              userName: r.ownerFirstName || r.ownerEmail,
              ideaTitle: r.title,
              dashboardUrl: `${hostUrl}/w/${orgRecord?.slug || orgId}/my-ideas`,
            });
            if (!html) continue;
            await resendClient.emails.send({
              from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com',
              to: r.ownerEmail,
              subject: `🏆 You're a Finalist! — ${orgName}`,
              html,
            });
          }
        } catch (emailErr) {
          console.error('Failed to send finalist emails:', emailErr);
        }
      });

      res.json({ published: top7.length, projectIds: top7.map((r) => r.projectId) });
    } catch (error) {
      console.error('Error publishing finalists:', error);
      res.status(500).json({ error: 'Failed to publish finalists' });
    }
  });

  // POST /api/workspaces/:orgId/admin/judge-leaderboard/publish-winners
  // Marks top 3 IN_INCUBATION ideas (by judge score) as WINNER and emails each owner.
  app.post('/api/workspaces/:orgId/admin/judge-leaderboard/publish-winners', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      // Fetch ordered judge leaderboard (aggregate scores)
      const rows = await db
        .select({
          projectId: projects.id,
          title: projects.title,
          ownerEmail: users.email,
          ownerFirstName: users.firstName,
          totalCombined: drizzleSql<number>`coalesce(sum(${judgeEvaluations.totalScore}), 0)`,
        })
        .from(projects)
        .innerJoin(users, eq(projects.createdById, users.id))
        .leftJoin(judgeEvaluations, eq(judgeEvaluations.projectId, projects.id))
        .where(and(eq(projects.orgId, orgId), inArray(projects.status, ['IN_INCUBATION', 'ARCHIVED'])))
        .groupBy(projects.id, users.email, users.firstName)
        .orderBy(drizzleSql`coalesce(sum(${judgeEvaluations.totalScore}), 0) desc`);

      const top3 = rows.slice(0, 3);
      if (top3.length === 0) return res.status(400).json({ error: 'No eligible ideas to publish' });

      const now = new Date();
      const publisherId = req.user.id;
      const RANK_LABELS = ['1st Place', '2nd Place', '3rd Place'];
      const RANK_MEDALS = ['🥇', '🥈', '🥉'];

      // Reset previous winners: clear publishStatus and return to IN_INCUBATION
      const allIds = rows.map((r) => r.projectId);
      await db.update(projects)
        .set({ publishStatus: 'NONE', publishedAt: null, publishedById: null, status: 'IN_INCUBATION' })
        .where(inArray(projects.id, allIds));

      // Mark top 3 as WINNER and move to Results Published
      await db.update(projects)
        .set({ publishStatus: 'WINNER', publishedAt: now, publishedById: publisherId, status: 'ARCHIVED' })
        .where(inArray(projects.id, top3.map((r) => r.projectId)));

      // Load org info for emails
      const [orgRecord] = await db
        .select({ name: organizations.name, slug: organizations.slug })
        .from(organizations)
        .where(eq(organizations.id, orgId));
      const orgName = orgRecord?.name || orgId;
      const hostUrl = process.env.HOST_URL || 'https://os.fikrahub.com';

      setImmediate(async () => {
        try {
          const resendApiKey = process.env.RESEND_API_KEY;
          if (!resendApiKey) return;
          const resendClient = new Resend(resendApiKey);
          for (let i = 0; i < top3.length; i++) {
            const r = top3[i];
            if (!r.ownerEmail) continue;
            const html = loadTpl('winner-announced', {
              orgName,
              userName: r.ownerFirstName || r.ownerEmail,
              ideaTitle: r.title,
              rankMedal: RANK_MEDALS[i],
              rankLabel: RANK_LABELS[i],
              dashboardUrl: `${hostUrl}/w/${orgRecord?.slug || orgId}/my-ideas`,
            });
            if (!html) continue;
            await resendClient.emails.send({
              from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com',
              to: r.ownerEmail,
              subject: `${RANK_MEDALS[i]} You're a Winner! — ${orgName}`,
              html,
            });
          }
        } catch (emailErr) {
          console.error('Failed to send winner emails:', emailErr);
        }
      });

      res.json({ published: top3.length, projectIds: top3.map((r) => r.projectId) });
    } catch (error) {
      console.error('Error publishing winners:', error);
      res.status(500).json({ error: 'Failed to publish winners' });
    }
  });

  // ─── Workspace-scoped events (PMO admin) ─────────────────────────────────────

  // GET /api/workspaces/:orgId/admin/events — returns workspace events + global (super admin) events
  app.get('/api/workspaces/:orgId/admin/events', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const rows = await db.select().from(events)
        .where(or(eq(events.orgId, orgId), isNull(events.orgId)))
        .orderBy(events.startDate);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching workspace events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  // POST /api/workspaces/:orgId/admin/events
  app.post('/api/workspaces/:orgId/admin/events', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const data = req.body;
      if (!data.title || !data.startDate) return res.status(400).json({ error: 'title and startDate are required' });
      const [created] = await db.insert(events).values({
        orgId,
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
      console.error('Error creating workspace event:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  });

  // PATCH /api/workspaces/:orgId/admin/events/:id
  app.patch('/api/workspaces/:orgId/admin/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, id } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
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
      if (!updated) return res.status(404).json({ error: 'Event not found' });
      res.json(updated);
    } catch (error) {
      console.error('Error updating workspace event:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  });

  // DELETE /api/workspaces/:orgId/admin/events/:id
  app.delete('/api/workspaces/:orgId/admin/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, id } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      await db.delete(events).where(eq(events.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting workspace event:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  });

  // ─── Event Speakers ────────────────────────────────────────────────────────
  app.get('/api/workspaces/:orgId/admin/events/:eventId/speakers', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, eventId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const speakers = await db.select().from(eventSpeakers).where(eq(eventSpeakers.eventId, eventId)).orderBy(asc(eventSpeakers.displayOrder));
      res.json(speakers);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch speakers' }); }
  });

  app.post('/api/workspaces/:orgId/admin/events/:eventId/speakers', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, eventId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const { name, role, company, bio, imageUrl, displayOrder } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });
      const [speaker] = await db.insert(eventSpeakers).values({ eventId, name, role, company, bio, imageUrl, displayOrder: displayOrder ?? 0 }).returning();
      res.status(201).json(speaker);
    } catch (e) { res.status(500).json({ error: 'Failed to add speaker' }); }
  });

  app.patch('/api/workspaces/:orgId/admin/events/:eventId/speakers/:speakerId', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, speakerId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const { name, role, company, bio, imageUrl, displayOrder } = req.body;
      const [speaker] = await db.update(eventSpeakers).set({ name, role, company, bio, imageUrl, displayOrder }).where(eq(eventSpeakers.id, speakerId)).returning();
      res.json(speaker);
    } catch (e) { res.status(500).json({ error: 'Failed to update speaker' }); }
  });

  app.delete('/api/workspaces/:orgId/admin/events/:eventId/speakers/:speakerId', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, speakerId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      await db.delete(eventSpeakers).where(eq(eventSpeakers.id, speakerId));
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete speaker' }); }
  });

  // ─── Attendance Tracking ───────────────────────────────────────────────────
  // Login logs — workspace members with platform login counts
  app.get('/api/workspaces/:orgId/admin/login-logs', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      const members = await db
        .select({
          userId: organizationMembers.userId,
          role: organizationMembers.role,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
          email: users.email,
          loginCount: (users as any).loginCount,
          lastLoginAt: (users as any).lastLoginAt,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(eq(organizationMembers.orgId, orgId))
        .orderBy(desc((users as any).lastLoginAt));

      res.json(members);
    } catch (error) {
      console.error('Error fetching login logs:', error);
      res.status(500).json({ error: 'Failed to fetch login logs' });
    }
  });

  app.get('/api/workspaces/:orgId/admin/attendance', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const { status, userId, date } = req.query as Record<string, string>;
      const conditions = [eq(attendanceRecords.orgId, orgId)];
      if (status) conditions.push(eq(attendanceRecords.status, status));
      if (userId) conditions.push(eq(attendanceRecords.userId, userId));
      if (date) conditions.push(eq(attendanceRecords.scheduledDate, date));
      const records = await db
        .select({
          id: attendanceRecords.id,
          userId: attendanceRecords.userId,
          bookingId: attendanceRecords.bookingId,
          sessionType: attendanceRecords.sessionType,
          scheduledDate: attendanceRecords.scheduledDate,
          scheduledTime: attendanceRecords.scheduledTime,
          checkedInAt: attendanceRecords.checkedInAt,
          checkedOutAt: attendanceRecords.checkedOutAt,
          status: attendanceRecords.status,
          notes: attendanceRecords.notes,
          memberFirstName: users.firstName,
          memberLastName: users.lastName,
          memberEmail: users.email,
        })
        .from(attendanceRecords)
        .innerJoin(users, eq(attendanceRecords.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(attendanceRecords.scheduledDate));
      res.json(records);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch attendance' }); }
  });

  app.post('/api/workspaces/:orgId/admin/attendance', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const { userId, bookingId, sessionType, scheduledDate, scheduledTime, status, notes } = req.body;
      if (!userId || !scheduledDate) return res.status(400).json({ error: 'userId and scheduledDate required' });
      const [record] = await db.insert(attendanceRecords).values({ orgId, userId, bookingId, sessionType, scheduledDate, scheduledTime, status: status || 'SCHEDULED', notes }).returning();
      res.status(201).json(record);
    } catch (e) { res.status(500).json({ error: 'Failed to create attendance record' }); }
  });

  app.patch('/api/workspaces/:orgId/admin/attendance/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, id } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const { status, checkedInAt, checkedOutAt, notes } = req.body;
      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (checkedInAt !== undefined) updateData.checkedInAt = checkedInAt ? new Date(checkedInAt) : null;
      if (checkedOutAt !== undefined) updateData.checkedOutAt = checkedOutAt ? new Date(checkedOutAt) : null;
      if (notes !== undefined) updateData.notes = notes;
      const [record] = await db.update(attendanceRecords).set(updateData).where(and(eq(attendanceRecords.id, id), eq(attendanceRecords.orgId, orgId))).returning();
      res.json(record);
    } catch (e) { res.status(500).json({ error: 'Failed to update attendance record' }); }
  });

  // ─── Admin Pitch Decks ────────────────────────────────────────────────────
  app.get('/api/workspaces/:orgId/admin/pitch-decks', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const rows = await db
        .select({
          id: pitchDeckGenerations.id,
          status: pitchDeckGenerations.status,
          template: pitchDeckGenerations.template,
          downloadUrl: pitchDeckGenerations.downloadUrl,
          createdAt: pitchDeckGenerations.createdAt,
          projectId: pitchDeckGenerations.projectId,
          projectTitle: projects.title,
          creatorFirstName: users.firstName,
          creatorLastName: users.lastName,
        })
        .from(pitchDeckGenerations)
        .innerJoin(projects, eq(projects.id, pitchDeckGenerations.projectId))
        .innerJoin(users, eq(users.id, pitchDeckGenerations.createdById))
        .where(eq(projects.orgId, orgId))
        .orderBy(desc(pitchDeckGenerations.createdAt));
      res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch pitch decks' }); }
  });

  // ─── Academy Course Management ─────────────────────────────────────────────
  app.get('/api/academy/courses', isAuthenticated, async (req: any, res) => {
    try {
      const courses = await db.select().from(academyCourses).where(eq(academyCourses.isPublished, true)).orderBy(asc(academyCourses.displayOrder));
      const withVideos = await Promise.all(courses.map(async (c) => {
        const videos = await db.select().from(academyVideos).where(and(eq(academyVideos.courseId, c.id), eq(academyVideos.isPublished, true))).orderBy(asc(academyVideos.displayOrder));
        return { ...c, videos };
      }));
      res.json(withVideos);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch courses' }); }
  });

  app.get('/api/academy/courses/:slug', isAuthenticated, async (req: any, res) => {
    try {
      const [course] = await db.select().from(academyCourses).where(eq(academyCourses.slug, req.params.slug));
      if (!course) return res.status(404).json({ error: 'Course not found' });
      const videos = await db.select().from(academyVideos).where(and(eq(academyVideos.courseId, course.id), eq(academyVideos.isPublished, true))).orderBy(asc(academyVideos.displayOrder));
      res.json({ ...course, videos });
    } catch (e) { res.status(500).json({ error: 'Failed to fetch course' }); }
  });

  app.get('/api/workspaces/:orgId/admin/academy/courses', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const courses = await db.select().from(academyCourses).orderBy(asc(academyCourses.displayOrder));
      const withVideos = await Promise.all(courses.map(async (c) => {
        const videos = await db.select().from(academyVideos).where(eq(academyVideos.courseId, c.id)).orderBy(asc(academyVideos.displayOrder));
        return { ...c, videos };
      }));
      res.json(withVideos);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch courses' }); }
  });

  app.post('/api/workspaces/:orgId/admin/academy/courses', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const { title, description, thumbnailUrl, isPublished, displayOrder } = req.body;
      if (!title) return res.status(400).json({ error: 'Title is required' });
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
      const [course] = await db.insert(academyCourses).values({ orgId: orgId || null, slug, title, description, thumbnailUrl, isPublished: isPublished ?? false, displayOrder: displayOrder ?? 0 }).returning();
      res.status(201).json({ ...course, videos: [] });
    } catch (e) { res.status(500).json({ error: 'Failed to create course' }); }
  });

  app.patch('/api/workspaces/:orgId/admin/academy/courses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, id } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const { title, description, thumbnailUrl, isPublished, displayOrder } = req.body;
      const [course] = await db.update(academyCourses).set({ title, description, thumbnailUrl, isPublished, displayOrder, updatedAt: new Date() }).where(eq(academyCourses.id, id)).returning();
      res.json(course);
    } catch (e) { res.status(500).json({ error: 'Failed to update course' }); }
  });

  app.delete('/api/workspaces/:orgId/admin/academy/courses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, id } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      await db.delete(academyCourses).where(eq(academyCourses.id, id));
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete course' }); }
  });

  app.post('/api/workspaces/:orgId/admin/academy/courses/:id/videos', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, id } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const { title, description, videoUrl, durationSeconds, displayOrder, isPublished } = req.body;
      if (!title || !videoUrl) return res.status(400).json({ error: 'Title and videoUrl are required' });
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
      const [video] = await db.insert(academyVideos).values({ courseId: id, slug, title, description, videoUrl, durationSeconds: durationSeconds ?? 0, displayOrder: displayOrder ?? 0, isPublished: isPublished ?? true }).returning();
      res.status(201).json(video);
    } catch (e) { res.status(500).json({ error: 'Failed to add video' }); }
  });

  app.patch('/api/workspaces/:orgId/admin/academy/courses/:id/videos/:videoId', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, videoId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const { title, description, videoUrl, durationSeconds, displayOrder, isPublished } = req.body;
      const [video] = await db.update(academyVideos).set({ title, description, videoUrl, durationSeconds, displayOrder, isPublished }).where(eq(academyVideos.id, videoId)).returning();
      res.json(video);
    } catch (e) { res.status(500).json({ error: 'Failed to update video' }); }
  });

  app.delete('/api/workspaces/:orgId/admin/academy/courses/:id/videos/:videoId', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, videoId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      await db.delete(academyVideos).where(eq(academyVideos.id, videoId));
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete video' }); }
  });

  // GET /api/workspaces/:orgId/admin/email-templates — list email templates (PMO admin access)
  app.get('/api/workspaces/:orgId/admin/email-templates', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      const tplDir = [
        path.join(__dirname, 'email-templates'),
        path.join(process.cwd(), 'server', 'email-templates'),
      ].find(d => { try { return fs.existsSync(d); } catch { return false; } });
      if (!tplDir) return res.json([]);
      const files = fs.readdirSync(tplDir).filter((f: string) => f.endsWith('.html'));
      const templates = files.map((f: string) => ({
        name: f.replace('.html', ''),
        filename: f,
        content: fs.readFileSync(path.join(tplDir, f), 'utf8'),
      }));
      res.json(templates);
    } catch (error) {
      console.error('Error fetching email templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // PUT /api/workspaces/:orgId/admin/email-templates/:name — update template (PMO admin access)
  app.put('/api/workspaces/:orgId/admin/email-templates/:name', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, name } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
      if (!/^[a-z0-9-]+$/.test(name)) return res.status(400).json({ error: 'Invalid template name' });
      const { content } = req.body;
      if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Content required' });
      const tplDir = [
        path.join(__dirname, 'email-templates'),
        path.join(process.cwd(), 'server', 'email-templates'),
      ].find(d => { try { return fs.existsSync(d); } catch { return false; } });
      if (!tplDir) return res.status(500).json({ error: 'Template directory not found' });
      const filePath = path.join(tplDir, `${name}.html`);
      if (!filePath.startsWith(tplDir)) return res.status(400).json({ error: 'Invalid path' });
      fs.writeFileSync(filePath, content, 'utf8');
      res.json({ ok: true });
    } catch (error) {
      console.error('Error saving email template:', error);
      res.status(500).json({ error: 'Failed to save template' });
    }
  });

  // GET /api/workspaces/:orgId/admin/activity-insights — workspace-scoped activity insights for PMO admins
  app.get('/api/workspaces/:orgId/admin/activity-insights', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      const { challengeId } = req.query as { challengeId?: string };
      const challengeFilter = challengeId ? drizzleSql`AND cs.challenge_id = ${challengeId}` : drizzleSql``;

      const submissionsResult = await db.execute(drizzleSql`
        SELECT
          c.id            AS "challengeId",
          c.title         AS "challengeTitle",
          COUNT(cs.id)::int                        AS "totalSubmissions",
          COUNT(cs.pitch_deck_url)::int            AS "withPitchDeck",
          COUNT(cs.prototype_url)::int             AS "withPrototype",
          MIN(cs.created_at)                       AS "firstSubmissionAt",
          MAX(cs.created_at)                       AS "lastSubmissionAt"
        FROM   challenge_submissions cs
        JOIN   challenges c ON c.id = cs.challenge_id
        WHERE  c.org_id = ${orgId} ${challengeFilter}
        GROUP BY c.id, c.title
        ORDER BY MAX(cs.created_at) DESC NULLS LAST
      `);

      const applicationsResult = await db.execute(drizzleSql`
        SELECT
          COUNT(*)::int                                                         AS "total",
          COUNT(*) FILTER (WHERE ma.status = 'APPROVED')::int                  AS "approved",
          COUNT(*) FILTER (WHERE ma.status = 'REJECTED')::int                  AS "rejected",
          COUNT(*) FILTER (WHERE ma.status = 'PENDING_REVIEW')::int            AS "pending",
          COUNT(*) FILTER (WHERE ma.status = 'AI_REVIEWED')::int               AS "aiReviewed"
        FROM   member_applications ma
        WHERE  ma.org_id = ${orgId}
      `);

      const invitesResult = await db.execute(drizzleSql`
        SELECT
          COUNT(*)::int                                               AS "totalInvited",
          COUNT(*) FILTER (WHERE om.role = 'MEMBER')::int            AS "members",
          COUNT(*) FILTER (WHERE om.role = 'MENTOR')::int            AS "mentors",
          COUNT(*) FILTER (WHERE om.role = 'ADMIN')::int             AS "admins"
        FROM   organization_members om
        WHERE  om.org_id = ${orgId} AND om.role != 'OWNER'
      `);

      const totalsResult = await db.execute(drizzleSql`
        SELECT
          (SELECT COUNT(*)::int FROM challenge_submissions cs
            JOIN challenges c ON c.id = cs.challenge_id
            WHERE c.org_id = ${orgId} ${challengeFilter})            AS "totalSubmissions",
          (SELECT COUNT(*)::int FROM member_applications ma
            WHERE ma.org_id = ${orgId})                              AS "totalApplications",
          (SELECT COUNT(*)::int FROM member_applications ma
            WHERE ma.org_id = ${orgId} AND ma.status = 'APPROVED')  AS "approvedApplications",
          (SELECT COUNT(*)::int FROM member_applications ma
            WHERE ma.org_id = ${orgId} AND ma.status = 'REJECTED')  AS "rejectedApplications",
          (SELECT COUNT(*)::int FROM organization_members om
            WHERE om.org_id = ${orgId} AND om.role != 'OWNER')      AS "totalInvites"
      `);

      const activityLogResult = await db.execute(drizzleSql`
        SELECT * FROM (
          SELECT
            'submission'  AS "type",
            cs.id         AS "id",
            cs.created_at AS "eventAt",
            u.first_name  AS "firstName",
            u.last_name   AS "lastName",
            u.email       AS "email",
            cs.title      AS "detail",
            c.title       AS "subDetail",
            NULL          AS "status"
          FROM challenge_submissions cs
          JOIN challenges c ON c.id = cs.challenge_id
          JOIN users u ON u.id = cs.user_id
          WHERE c.org_id = ${orgId} ${challengeFilter}

          UNION ALL

          SELECT
            'application' AS "type",
            ma.id         AS "id",
            COALESCE(ma.reviewed_at, ma.submitted_at) AS "eventAt",
            u.first_name  AS "firstName",
            u.last_name   AS "lastName",
            u.email       AS "email",
            ma.idea_name  AS "detail",
            NULL          AS "subDetail",
            ma.status     AS "status"
          FROM member_applications ma
          JOIN users u ON u.id = ma.user_id
          WHERE ma.org_id = ${orgId}

          UNION ALL

          SELECT
            'invite'      AS "type",
            om.id         AS "id",
            om.created_at AS "eventAt",
            u.first_name  AS "firstName",
            u.last_name   AS "lastName",
            u.email       AS "email",
            om.role::text AS "detail",
            NULL          AS "subDetail",
            NULL          AS "status"
          FROM organization_members om
          JOIN users u ON u.id = om.user_id
          WHERE om.org_id = ${orgId} AND om.role::text != 'OWNER'

          UNION ALL

          SELECT
            pe.event_type::text AS "type",
            pe.id               AS "id",
            pe.created_at       AS "eventAt",
            actor.first_name    AS "firstName",
            actor.last_name     AS "lastName",
            COALESCE(actor.email, '') AS "email",
            CASE
              WHEN pe.event_type = 'ROLE_UPDATED'             THEN COALESCE(target.email, pe.target_entity_label, 'Unknown user')
              WHEN pe.event_type = 'MEMBER_REMOVED'           THEN COALESCE(pe.target_entity_label, target.email, 'Unknown user')
              WHEN pe.event_type = 'IDEA_STATUS_CHANGED'      THEN pe.target_entity_label
              WHEN pe.event_type = 'PROGRAM_PROGRESS_UPDATED' THEN 'Step ' || COALESCE((pe.metadata->>'currentStep'), '?')
              ELSE pe.target_entity_label
            END AS "detail",
            CASE
              WHEN pe.event_type = 'ROLE_UPDATED'             THEN COALESCE((pe.metadata->>'newRole'), '')
              WHEN pe.event_type = 'IDEA_STATUS_CHANGED'      THEN COALESCE((pe.metadata->>'previousStatus'), '') || ' → ' || COALESCE((pe.metadata->>'newStatus'), '')
              WHEN pe.event_type = 'PROGRAM_PROGRESS_UPDATED' THEN 'Step ' || COALESCE((pe.metadata->>'previousStep'), '?') || ' → Step ' || COALESCE((pe.metadata->>'currentStep'), '?')
              ELSE ''
            END AS "subDetail",
            NULL AS "status"
          FROM platform_events pe
          JOIN organizations o ON o.id = pe.org_id
          LEFT JOIN users actor  ON actor.id  = pe.actor_id
          LEFT JOIN users target ON target.id = pe.target_user_id
          WHERE pe.org_id = ${orgId}
        ) events
        ORDER BY "eventAt" DESC NULLS LAST
        LIMIT 200
      `);

      res.json({
        totals: totalsResult.rows[0] || {},
        submissions: submissionsResult.rows,
        applications: applicationsResult.rows[0] || {},
        invites: invitesResult.rows[0] || {},
        activityLog: activityLogResult.rows,
      });
    } catch (error) {
      console.error('Error fetching workspace activity insights:', error);
      res.status(500).json({ error: 'Failed to fetch activity insights' });
    }
  });

  // GET /api/workspaces/:orgId/admin/edit-history — AI output edit history for activity insights
  app.get('/api/workspaces/:orgId/admin/edit-history', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      const rows = await db
        .select({
          id: assetVersions.id,
          label: assetVersions.label,
          editedAt: assetVersions.createdAt,
          assetTitle: assets.title,
          assetKind: assets.kind,
          projectId: projects.id,
          projectTitle: projects.title,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          username: users.username,
        })
        .from(assetVersions)
        .innerJoin(assets, eq(assets.id, assetVersions.assetId))
        .innerJoin(projects, eq(projects.id, assets.projectId))
        .innerJoin(users, eq(users.id, assets.createdById))
        .where(eq(projects.orgId, orgId))
        .orderBy(desc(assetVersions.createdAt))
        .limit(200);

      res.json(rows);
    } catch (error) {
      console.error('Error fetching edit history:', error);
      res.status(500).json({ error: 'Failed to fetch edit history' });
    }
  });

  // ─── End judge endpoints ─────────────────────────────────────────────────────

  // Chat routes
  app.get('/api/projects/:projectId/chats', isAuthenticated, canAccessProject, async (req, res) => {
    try {
      const { projectId } = req.params;
      const chats = await storage.getChatsByProject(projectId);
      res.json(chats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  app.get('/api/chats/:id', isAuthenticated, canAccessChat, async (req, res) => {
    try {
      const { id } = req.params;
      const chat = await storage.getChat(id);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      res.json(chat);
    } catch (error) {
      console.error("Error fetching chat:", error);
      res.status(500).json({ message: "Failed to fetch chat" });
    }
  });

  app.post('/api/chats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chatData = insertChatSchema.parse({
        ...req.body,
        createdById: userId,
      });
      
      const chat = await storage.createChat(chatData);
      res.json(chat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid chat data", errors: error.errors });
      }
      console.error("Error creating chat:", error);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });

  app.get('/api/chats/:id/messages', isAuthenticated, canAccessChat, async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getMessagesByChat(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Message routes
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Asset routes
  app.get('/api/projects/:projectId/assets', isAuthenticated, canAccessAssets, async (req, res) => {
    try {
      const { projectId } = req.params;
      const assets = await storage.getAssetsByProject(projectId);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.post('/api/assets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const assetData = insertAssetSchema.parse({
        ...req.body,
        createdById: userId,
      });

      const asset = await storage.createAsset(assetData);
      res.json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid asset data", errors: error.errors });
      }
      console.error("Error creating asset:", error);
      res.status(500).json({ message: "Failed to create asset" });
    }
  });

  // Update asset data (manual edit)
  app.patch('/api/assets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { data } = req.body;

      if (!data) {
        return res.status(400).json({ message: "Missing asset data" });
      }

      // Get asset to verify ownership/permission
      const asset = await storage.getAsset(id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      // Update asset
      const updated = await storage.updateAsset(id, {
        data,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating asset:", error);
      res.status(500).json({ message: "Failed to update asset" });
    }
  });

  // Get version history for an asset
  app.get('/api/assets/:id/versions', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const versions = await storage.getAssetVersions(id);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching asset versions:", error);
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  });

  // Restore an asset to a specific version
  app.post('/api/assets/:id/versions/:versionId/restore', isAuthenticated, async (req: any, res) => {
    try {
      const { id, versionId } = req.params;
      const version = await storage.getAssetVersion(versionId);
      if (!version || version.assetId !== id) {
        return res.status(404).json({ message: "Version not found" });
      }
      const updated = await storage.updateAsset(id, { data: version.data });
      res.json(updated);
    } catch (error) {
      console.error("Error restoring asset version:", error);
      res.status(500).json({ message: "Failed to restore version" });
    }
  });

  // AI-powered section regeneration
  app.post('/api/assets/:id/ai-edit', isAuthenticated, aiRateLimiter, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { section, instructions, currentData } = req.body;

      if (!section || !instructions) {
        return res.status(400).json({ message: "Missing section or instructions" });
      }

      // Get asset to verify ownership/permission
      const asset = await storage.getAsset(id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      // Determine if we're editing all or a specific section
      const isEditAll = section === "_ALL_";

      let systemPrompt: string;
      if (isEditAll) {
        systemPrompt = `You are an AI assistant helping to edit business assets.
The user wants to modify the ENTIRE ${asset.kind} asset.
Current complete data: ${JSON.stringify(currentData, null, 2)}

User instructions: ${instructions}

Respond ONLY with a valid JSON object containing ALL fields of the asset with the requested modifications applied. Maintain the same structure and field names. Do not include any markdown formatting or additional text.`;
      } else {
        systemPrompt = `You are an AI assistant helping to edit business assets.
The user wants to modify the "${section}" section of a ${asset.kind} asset.
Current data for this section: ${JSON.stringify(currentData[section], null, 2)}

User instructions: ${instructions}

Respond ONLY with a valid JSON object containing the updated "${section}" field. Do not include any markdown formatting or additional text.`;
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the updated data based on the instructions." }
        ],
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content?.trim() || "{}";

      // Parse AI response
      let newData;
      try {
        const parsed = JSON.parse(response);

        if (isEditAll) {
          // For full edit, use the entire parsed response
          newData = parsed;
        } else {
          // For section edit, extract the section and merge
          const updatedSection = parsed[section] || parsed;
          newData = {
            ...currentData,
            [section]: updatedSection,
          };
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", response);
        return res.status(500).json({ message: "AI generated invalid response" });
      }

      // Return proposed changes without saving to database
      // User will review and approve changes in the frontend
      // Changes will be saved when user clicks "Save Changes" in the modal
      res.json({
        ...asset,
        data: newData,
      });
    } catch (error) {
      console.error("Error regenerating asset section:", error);
      res.status(500).json({ message: "Failed to regenerate section with AI" });
    }
  });

  // SlideSpeak pitch deck generation route with database persistence
  // ✅ SECURITY FIX (P1): Add AI rate limiter (50 req/hour) + input validation
  app.post('/api/generate-pitch-deck', isAuthenticated, aiRateLimiter, validateRequest(generatePitchDeckSchema), async (req: any, res) => {
    try {
      const { pitchData, projectId, assetId } = req.body;
      
      if (!pitchData || !pitchData.slides || !projectId) {
        return res.status(400).json({ message: 'Invalid pitch data or missing project ID' });
      }

      console.log('🎯 Starting pitch deck generation for project:', projectId);

      const { generatePitchDeckFile } = await import('./slidespeak.js');
      const result = await generatePitchDeckFile(pitchData);
      
      if (result.success && result.taskId) {
        console.log('✅ SlideSpeak task created:', result.taskId);
        
        // Save generation to database
        const generationData = insertPitchDeckGenerationSchema.parse({
          projectId,
          assetId: assetId || null,
          taskId: result.taskId,
          status: 'GENERATING' as const,
          template: pitchData.template || 'Modern Business',
          theme: pitchData.theme || 'Professional', 
          colorScheme: pitchData.colorScheme || 'Blue',
          fontFamily: pitchData.fontFamily || 'Inter',
          createdById: req.user.id,
        });

        const generation = await storage.createPitchDeckGeneration(generationData);

        res.json({
          success: true,
          taskId: result.taskId,
          generationId: generation.id,
          message: result.message
        });
      } else {
        console.error('❌ SlideSpeak generation failed:', result.error);
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error generating pitch deck:', error);
      res.status(500).json({ message: 'Failed to generate pitch deck file' });
    }
  });

  // Check SlideSpeak task status route with database updates
  app.get('/api/check-pitch-status/:taskId', isAuthenticated, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      console.log('🔍 Checking status for task:', taskId);
      
      // Get generation record from database
      const generation = await storage.getPitchDeckGenerationByTaskId(taskId);
      if (!generation) {
        return res.status(404).json({
          success: false,
          error: 'Generation not found'
        });
      }

      if (generation.status === 'COMPLETED' && generation.downloadUrl) {
        return res.json({
          success: true,
          status: 'SUCCESS',
          downloadUrl: generation.downloadUrl,
          pptxUrl: generation.downloadUrl,
          message: 'SUCCESS',
          taskId,
          generation
        });
      }

      // Check SlideSpeak status
      const { checkSlidesSpeakStatus } = await import('./slidespeak.js');
      const result = await checkSlidesSpeakStatus(taskId);
      
      // Update database based on SlideSpeak response
      let updatedGeneration = generation;
      if (result.success && result.downloadUrl) {
        console.log('✅ Generation completed, updating database with download URL');
        updatedGeneration = await storage.updatePitchDeckGeneration(generation.id, {
          status: 'COMPLETED',
          downloadUrl: result.downloadUrl,
        });
      } else if (result.status === 'FAILURE' || result.status === 'REVOKED') {
        console.log('❌ Generation failed, updating database');
        updatedGeneration = await storage.updatePitchDeckGeneration(generation.id, {
          status: 'FAILED',
          errorMessage: result.message || 'Generation failed',
        });
      }

      // Return the result with database status
      res.json({
        ...result,
        generation: updatedGeneration
      });
    } catch (error) {
      console.error('Task status check error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Get pitch deck generations for a project
  app.get('/api/projects/:projectId/pitch-deck-generations', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      console.log('📋 Fetching pitch deck generations for project:', projectId);
      
      const generations = await storage.getPitchDeckGenerationsByProject(projectId);
      res.json(generations);
    } catch (error) {
      console.error('Error fetching pitch deck generations:', error);
      res.status(500).json({ message: 'Failed to fetch pitch deck generations' });
    }
  });

  // Delete pitch deck generation
  app.delete('/api/pitch-deck-generations/:generationId', isAuthenticated, async (req: any, res) => {
    try {
      const { generationId } = req.params;
      const userId = req.user.id;
      
      console.log('🗑️ Deleting pitch deck generation:', generationId);
      
      // Get the generation to verify ownership
      const generation = await storage.getPitchDeckGenerationById(generationId);
      if (!generation) {
        return res.status(404).json({ message: 'Generation not found' });
      }
      
      // Check if user owns this generation (through project ownership or being creator)
      if (generation.createdById !== userId) {
        return res.status(403).json({ message: 'Not authorized to delete this generation' });
      }
      
      await storage.deletePitchDeckGeneration(generationId);
      res.json({ success: true, message: 'Generation deleted successfully' });
    } catch (error) {
      console.error('Error deleting pitch deck generation:', error);
      res.status(500).json({ message: 'Failed to delete generation' });
    }
  });

  // Get all pitch deck generations for the current authenticated user (user-centric Pitch tab)
  app.get('/api/my-pitch-decks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const decks = await storage.getPitchDeckGenerationsByUser(userId);
      res.json(decks);
    } catch (error) {
      console.error('Error fetching user pitch decks:', error);
      res.status(500).json({ message: 'Failed to fetch pitch decks' });
    }
  });

  // Get single pitch deck generation by ID (for the viewer page)
  app.get('/api/my-pitch-decks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const generation = await storage.getPitchDeckGenerationById(req.params.id);
      if (!generation) return res.status(404).json({ message: 'Not found' });
      if (generation.createdById !== userId) return res.status(403).json({ message: 'Forbidden' });
      res.json(generation);
    } catch (error) {
      console.error('Error fetching pitch deck:', error);
      res.status(500).json({ message: 'Failed to fetch pitch deck' });
    }
  });

  // Serve PPTX file inline (no Content-Disposition: attachment) for in-browser viewing
  app.get('/api/pitch-preview/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const generation = await storage.getPitchDeckGenerationById(req.params.id);
      if (!generation) return res.status(404).json({ message: 'Not found' });
      if (generation.createdById !== userId) return res.status(403).json({ message: 'Forbidden' });
      if (!generation.downloadUrl) return res.status(404).json({ message: 'File not ready' });

      // downloadUrl is like /uploads/pitch/filename.pptx → resolve to disk path
      const relPath = generation.downloadUrl.startsWith('/') ? generation.downloadUrl.slice(1) : generation.downloadUrl;
      const filePath = path.join(process.cwd(), relPath);
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on disk' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (error) {
      console.error('Error serving pitch file:', error);
      res.status(500).json({ message: 'Failed to serve file' });
    }
  });

  // Create a pitch deck from plain text topic (simplified user-centric pitch endpoint)
  app.post('/api/my-pitch-decks', isAuthenticated, aiRateLimiter, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const {
        plain_text, projectId, length, tone, template, custom_user_instructions,
        verbosity, language, speaker_notes, fetch_images, stock_images,
        use_branded_logo, content_expansion,
      } = req.body;

      if (!plain_text || !projectId) {
        return res.status(400).json({ message: 'plain_text and projectId are required' });
      }

      const apiKey = process.env.SLIDESPEAK_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: 'SlideSpeak API key not configured' });
      }

      const slideCount = Math.max(3, Math.min(parseInt(length) || 8, 20));
      const chosenTemplate = template || 'default';

      // SlideSpeak accepts: 'default' | 'casual' | 'professional' | 'funny' | 'educational' | 'sales_pitch'
      // Map our UI tone labels (possibly capitalised) to the expected lowercase API values
      const toneMap: Record<string, string> = {
        professional: 'professional',
        casual: 'casual',
        funny: 'funny',
        educational: 'educational',
        sales_pitch: 'sales_pitch',
        salespitch: 'sales_pitch',
        'sales pitch': 'sales_pitch',
        default: 'default',
      };
      const normalizedTone = tone ? (toneMap[tone.toLowerCase()] ?? 'professional') : undefined;

      // Build SlideSpeak request body
      const slideSpeakBody: Record<string, any> = {
        plain_text,
        length: slideCount,
        template: chosenTemplate,
        language: language || 'ORIGINAL',
      };
      if (normalizedTone) slideSpeakBody.tone = normalizedTone;
      if (verbosity) slideSpeakBody.verbosity = verbosity;
      if (typeof speaker_notes === 'boolean') slideSpeakBody.speaker_notes = speaker_notes;
      if (typeof fetch_images === 'boolean') slideSpeakBody.fetch_images = fetch_images;
      if (typeof stock_images === 'boolean') slideSpeakBody.stock_images = stock_images;
      if (typeof use_branded_logo === 'boolean') slideSpeakBody.use_branded_logo = use_branded_logo;
      if (typeof content_expansion === 'boolean') slideSpeakBody.content_expansion = content_expansion;
      if (custom_user_instructions) slideSpeakBody.custom_user_instructions = custom_user_instructions;

      // Call SlideSpeak directly with plain_text
      const response = await fetch('https://api.slidespeak.co/api/v1/presentation/generate', {
        method: 'POST',
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(slideSpeakBody),
      });

      const data = await response.json() as any;
      if (!response.ok || !data.task_id) {
        return res.status(500).json({ success: false, error: data.message || 'Failed to initiate generation' });
      }

      const generationData = insertPitchDeckGenerationSchema.parse({
        projectId,
        assetId: null,
        taskId: data.task_id,
        status: 'GENERATING' as const,
        template: chosenTemplate,
        theme: tone || 'Professional',
        colorScheme: 'Blue',
        fontFamily: 'Inter',
        createdById: userId,
      });

      const generation = await storage.createPitchDeckGeneration(generationData);
      res.json({ success: true, taskId: data.task_id, generationId: generation.id });
    } catch (error) {
      console.error('Error creating user pitch deck:', error);
      res.status(500).json({ message: 'Failed to create pitch deck' });
    }
  });

  // Asset generation route
  // ✅ SECURITY FIX (P1): Add AI rate limiter (50 req/hour) + input validation
  app.post('/api/generate-asset', isAuthenticated, aiRateLimiter, validateRequest(generateAssetSchema), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { type, context, businessDescription, projectId, additionalData } = req.body;
      console.log(`🤖 Generating business asset of type "${type}" for project ${projectId}...`);
      const generatedAsset = await generateBusinessAsset({
        type,
        context,
        businessDescription,
        additionalData,
      });

      // Save to database
      const assetData = insertAssetSchema.parse({
        projectId,
        kind: type,
        title: generatedAsset.title,
        data: generatedAsset.data,
        markdown: generatedAsset.markdown,
        html: generatedAsset.html,
        createdById: userId,
      });

      const asset = await storage.createAsset(assetData);
      res.json(asset);
    } catch (error) {
      console.error("Error generating asset:", error);
      res.status(500).json({ message: "Failed to generate asset" });
    }
  });

  // AI Chat response route
  // ✅ SECURITY FIX (P1): Add AI rate limiter (50 req/hour) + input validation
  app.post('/api/chat/response', isAuthenticated, aiRateLimiter, validateRequest(chatResponseSchema), async (req, res) => {
    try {
      const { message, context, mode } = req.body;
      console.log(`🤖 Generating AI response for message (${mode || 'balanced'} mode):`, message.substring(0, 50) + "...");
      const response = await generateChatResponse(message, context, mode || 'balanced');
      
      // Handle structured response with assets
      if (typeof response === 'object' && response.assets) {
        console.log(`🎨 Structured response detected! Assets object:`, JSON.stringify(response.assets, null, 2));
        
        // Store assets if any were generated
        if (context.projectId && response.assets.data) {
          const assetsToStore = [];
          const { data } = response.assets;
          
          // Convert each asset type to our storage format
          for (const [key, value] of Object.entries(data)) {
            if (value && Object.keys(value).length > 0) {
              const assetType = key.toUpperCase().replace(/-/g, '_');
              assetsToStore.push({
                projectId: context.projectId,
                kind: assetType,
                title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                data: value,
                createdById: (req.user as any)?.id || '1',
              });
            }
          }
          
          // Store all assets
          for (const asset of assetsToStore) {
            await storage.createAsset({
              ...asset,
              kind: asset.kind as 'LEAN_CANVAS' | 'SWOT' | 'PERSONA' | 'JOURNEY_MAP' | 'MARKETING_PLAN' | 'COMPETITOR_MAP' | 'TAM_SAM_SOM' | 'PITCH_OUTLINE'
            });
          }
          
          console.log(`📊 Stored ${assetsToStore.length} assets for project ${context.projectId}:`, assetsToStore.map(a => a.kind).join(', '));
        }
        
        res.json({ response: response.response, assets: response.assets });
      } else {
        res.json({ response });
      }
    } catch (error) {
      console.error("Error generating chat response:", error);
      res.status(500).json({ message: "Failed to generate response" });
    }
  });

  // Voice synthesis route
  // ✅ SECURITY FIX (P1): Add AI rate limiter (50 req/hour) + input validation
  app.post('/api/voice/synthesize', isAuthenticated, aiRateLimiter, validateRequest(voiceSynthesizeSchema), async (req, res) => {
    try {
      const { text, voice_id } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }
      
      const audioBuffer = await generateSpeech({ text, voice_id });
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600'
      });
      
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating speech:", error);
      res.status(500).json({ message: "Failed to generate speech" });
    }
  });

  // Research endpoint using Perplexity API with streaming
  // ✅ SECURITY FIX (P1): Add AI rate limiter (50 req/hour) + input validation
  app.post("/api/research/perplexity", isAuthenticated, aiRateLimiter, validateRequest(researchQuerySchema), async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      // Check if Perplexity API key is available
      if (!process.env.PERPLEXITY_API_KEY) {
        // Fallback to simulated response if no API key
        return res.json({
          content: `Research completed for: ${query}. Market analysis shows strong potential with favorable competitive positioning and clear growth opportunities.`,
          keyFindings: [
            "Market shows significant growth potential with emerging opportunities",
            "Competitive landscape reveals positioning advantages for new entrants", 
            "Technology trends indicate favorable timing for market entry",
            "Customer segment analysis reveals specific unmet needs"
          ],
          citations: [
            "https://example.com/market-analysis",
            "https://example.com/competitor-research",
            "https://example.com/tech-trends"
          ]
        });
      }

      // Set up Server-Sent Events for real-time updates
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      });

      // Send detailed status updates
      const sendStatus = (message: string) => {
        res.write(`data: ${JSON.stringify({ type: 'status', message })}\n\n`);
      };

      sendStatus('Initializing comprehensive research query...');
      await new Promise(resolve => setTimeout(resolve, 400));
      
      sendStatus('Connecting to Perplexity AI research network...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      sendStatus('Searching academic databases and web sources...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      sendStatus('Gathering real-time market data and industry reports...');

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          search_domain_filter: ["wsj.com", "ft.com", "bloomberg.com", "techcrunch.com", "wamda.com", "menabytes.com", "crunchbase.com", "pitchbook.com", "cbinsights.com", "mckinsey.com", "bcg.com", "deloitte.com", "pwc.com", "statista.com", "grandviewresearch.com", "marketsandmarkets.com"],
          search_recency_filter: "month",
          return_citations: true,
          return_images: false,
          messages: [
            {
              role: 'system',
              content: 'You are a world-class business research analyst with deep expertise in market analysis, strategic consulting, and global business intelligence. Provide exceptionally detailed, current, and diverse research with these mandatory sections: Executive Summary (4-5 key insights with specific metrics), Market Landscape (specific market size from 2024/2025 data, growth rates with CAGR, emerging trends with adoption timelines), Competitive Analysis (top 7-10 players including startups and regional leaders with latest revenue/market share/funding data), Technology & Innovation (current technology stack, disruptive technologies, AI/automation impact, sustainability trends), Regional Analysis (North America, Europe, MENA, Asia-Pacific with local players and cultural factors), Strategic Opportunities (5-7 high-impact opportunities with implementation complexity and timeline), Risk Assessment (market, regulatory, competitive, operational, geopolitical risks with mitigation strategies), Investment Thesis (specific funding requirements, realistic ROI projections 2025-2030, exit scenarios with comparable transactions), and Future Roadmap (detailed 2-5 year outlook with quarterly milestones and KPIs). Use clean formatting without markdown asterisks. Include latest 2024-2025 data, specific numbers, percentages, dollar amounts, and actionable insights. Prioritize diverse data sources, emerging market perspectives, and underrepresented segments. Make this comprehensive, investor-grade intelligence.'
            },
            {
              role: 'user',
              content: `Conduct comprehensive market research and strategic analysis on: "${query}". Requirements: (1) Latest 2024-2025 market data with specific revenue figures and growth projections, (2) Global competitive landscape including established players, emerging startups, and regional champions across different markets, (3) Technology trends including AI integration, automation impact, and sustainability factors, (4) Regulatory environment and compliance requirements across major markets (US, EU, MENA, APAC), (5) Investment and funding landscape with recent deals, valuations, and funding trends, (6) Diverse go-to-market strategies for different customer segments and geographies, (7) Operational challenges with practical solutions and best practices, (8) Partnership ecosystem and channel opportunities, (9) International expansion strategies with market-specific considerations, (10) Realistic scenario planning for 2025-2030 with quarterly milestones, (11) ESG considerations and sustainability requirements, (12) Demographic diversity analysis including underserved markets and emerging consumer segments. Focus on actionable, data-driven intelligence that provides strategic decision-making insights for entrepreneurs and investors. Include specific company examples, financial metrics, and implementation timelines.`
            }
          ]
        }),
      });

      console.log('Perplexity API request sent, awaiting response...', response);

      await new Promise(resolve => setTimeout(resolve, 400));
      sendStatus('Processing AI analysis and extracting key insights...');

      if (!response.ok) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: `Research failed: ${response.status}` })}\n\n`);
        res.end();
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      sendStatus('Analyzing competitive landscape and market trends...');

      const data = await response.json();
      console.log('Perplexity API Response:', JSON.stringify(data, null, 2));
      
      await new Promise(resolve => setTimeout(resolve, 300));
      sendStatus('Compiling citations and verifying source reliability...');
      
      let content = data.choices?.[0]?.message?.content;
      const searchResults = data.search_results || [];
      
      // Clean up markdown formatting - remove asterisks and improve readability
      if (content) {
        content = content
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold asterisks
          .replace(/\*(.*?)\*/g, '$1') // Remove italic asterisks
          .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up extra line breaks
          .replace(/^#+\s*/gm, '## ') // Normalize headers
          .trim();
      }

      if (!content) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'No content received from research API' })}\n\n`);
        res.end();
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 400));
      sendStatus('Formatting comprehensive research report...');

      // Extract key findings from the response
      const keyFindings = extractKeyFindings(content);

      // Format sources from search_results (Perplexity's actual format)  
      const sources = searchResults.map((result: any, index: number) => ({
        title: result.title || `Source ${index + 1}`,
        url: result.url,
        snippet: `Last updated: ${result.last_updated || 'Recently'}. ${result.title || 'Research source providing relevant data and insights.'}`
      }));

      await new Promise(resolve => setTimeout(resolve, 300));
      sendStatus('Research complete! Delivering comprehensive analysis...');

      // Send final result
      res.write(`data: ${JSON.stringify({ 
        type: 'result', 
        data: {
          content,
          keyFindings,
          sources,
          searchResults // Also include raw search results for debugging
        }
      })}\n\n`);
      
      res.end();

    } catch (error) {
      console.error('Research error:', error);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: `Research failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      })}\n\n`);
      res.end();
    }
  });

  // Follow-up research endpoint
  // ✅ SECURITY FIX (P1): Add AI rate limiter (50 req/hour)
  app.post('/api/research/followup', isAuthenticated, aiRateLimiter, async (req, res) => {
    try {
      const { question, context, previousQuery } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }

      if (!process.env.PERPLEXITY_API_KEY) {
        return res.status(500).json({
          error: 'Perplexity API key not configured'
        });
      }

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a comprehensive business research analyst. The user is asking a follow-up question about their previous research. Provide detailed, focused analysis that EXTENDS and ENHANCES the existing research. Use markdown formatting with clear headers (##, ###), bullet points, tables, and bold text. Focus on providing NEW insights, data, or perspectives that complement the original research. Be specific, actionable, and comprehensive. Structure your response as a cohesive analysis section that could be appended to the existing research.'
            },
            {
              role: 'user',
              content: `Previous research query: "${previousQuery}"\n\nPrevious research context:\n${context}\n\nFollow-up question: ${question}\n\nPlease provide detailed analysis that specifically addresses this follow-up question while building upon the previous research.`
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Follow-up API Response:', JSON.stringify(data, null, 2));
      
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from Perplexity API');
      }

      res.json({
        content,
        question
      });

    } catch (error) {
      console.error('Follow-up error:', error);
      res.status(500).json({ 
        error: 'Follow-up failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  function extractKeyFindings(content: string): string[] {
    const lines = content.split('\n').filter(line => line.trim());
    const findings: string[] = [];
    
    // Enhanced extraction logic for comprehensive research
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for various bullet/list formats and key indicators
      if (trimmed.match(/^[-•*▪▫]\s+/) || 
          trimmed.match(/^\d+\.\s+/) ||
          trimmed.match(/^[A-Z][a-z]*:\s/) || // "Market: ..." format
          trimmed.toLowerCase().includes('market size') ||
          trimmed.toLowerCase().includes('growth rate') ||
          trimmed.toLowerCase().includes('key player') ||
          trimmed.toLowerCase().includes('opportunity') ||
          trimmed.toLowerCase().includes('trend') ||
          trimmed.toLowerCase().includes('challenge') ||
          trimmed.toLowerCase().includes('competitive') ||
          trimmed.toLowerCase().includes('revenue') ||
          trimmed.toLowerCase().includes('forecast')) {
        
        const cleaned = trimmed.replace(/^[-•*▪▫\d\.\s]*/, '').replace(/^[A-Z][a-z]*:\s*/, '');
        if (cleaned.length > 15 && cleaned.length < 200) {
          findings.push(cleaned);
        }
      }
    }
    
    // If no structured findings, extract meaningful sentences with business insights
    if (findings.length === 0) {
      const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 30);
      for (const sentence of sentences.slice(0, 6)) {
        const trimmed = sentence.trim();
        if (trimmed.match(/\b(market|revenue|growth|competitor|opportunity|trend|customer|business|industry)\b/i)) {
          findings.push(trimmed + '.');
        }
      }
    }
    
    return findings.slice(0, 6); // Return up to 6 key findings
  }

  // News API endpoint with multi-language support
  app.get('/api/news', isAuthenticated, async (req, res) => {
    try {
      const { 
        topic = 'technology', 
        country = 'us', 
        page = '1',
        language = 'en' // ✅ Add language parameter with default
      } = req.query;
      
      if (!process.env.NEWSDATA_API_KEY) {
        // Fallback to mock data if no API key
        return res.json({
          status: "success",
          totalResults: 8,
          results: [
            {
              article_id: "1",
              title: "Saudi Arabia launches new AI research institute in Riyadh",
              link: "https://arabnews.com/saudi-ai-institute-riyadh",
              creator: ["Arab News"],
              description: "The Kingdom announces a major investment in artificial intelligence research with focus on Arabic language processing and computer vision.",
              pubDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              source_id: "arabnews",
              source_url: "https://arabnews.com",
              image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=200&fit=crop",
              category: ["technology"]
            },
            {
              article_id: "2",
              title: "UAE's ADNOC announces $15B investment in clean energy",
              link: "https://thenationalnews.com/adnoc-clean-energy-investment",
              creator: ["The National"],
              description: "Major investment in renewable energy infrastructure across the Gulf region signals commitment to green transition.",
              pubDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
              source_id: "thenational",
              source_url: "https://thenationalnews.com",
              image_url: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=400&h=200&fit=crop",
              category: ["business"]
            }
          ]
        });
      }

      // ✅ Build NewsData.io API URL with dynamic language
      let url = `https://newsdata.io/api/1/latest?apikey=${process.env.NEWSDATA_API_KEY}&language=${language}`;
      
      // Add topic-specific keywords (adjust based on language if needed)
      switch (topic) {
        case 'for-you':
          url += '&category=business,technology';
          url += '&q=' + encodeURIComponent(
            language === 'ar' 
              ? 'شركة ناشئة OR تقنية مالية OR دبي OR السعودية OR الإمارات OR منطقة الشرق الأوسط'
              : 'startup OR fintech OR Dubai OR Saudi OR UAE OR MENA'
          );
          break;
        case 'innovation':
          url += '&category=technology,science';
          url += '&q=' + encodeURIComponent(
            language === 'ar'
              ? 'ابتكار OR اختراق OR نيوم OR "مدينة ذكية" OR دبي'
              : 'innovation OR breakthrough OR NEOM OR "smart city" OR Dubai'
          );
          break;
        case 'ai':
          url += '&category=technology';
          url += '&q=' + encodeURIComponent(
            language === 'ar'
              ? '"الذكاء الاصطناعي" OR AI OR ChatGPT OR دبي OR السعودية'
              : '"artificial intelligence" OR AI OR ChatGPT OR Dubai OR Saudi'
          );
          break;
        case 'investments':
          url += '&category=business';
          url += '&q=' + encodeURIComponent(
            language === 'ar'
              ? '"رأس المال الاستثماري" OR استثمار OR تمويل OR دبي OR السعودية OR منطقة الشرق الأوسط'
              : '"venture capital" OR investment OR funding OR Dubai OR Saudi OR MENA'
          );
          break;
        case 'yc-startups':
          url += '&category=business,technology';
          url += '&q=' + encodeURIComponent(
            language === 'ar'
              ? 'شركة ناشئة OR رائد أعمال OR دبي OR السعودية OR مصر OR منطقة الشرق الأوسط'
              : 'startup OR entrepreneur OR Dubai OR Saudi OR Egypt OR MENA'
          );
          break;
        default:
          url += '&category=business,technology';
      }
      
      // Add MENA country focus for better regional coverage (max 5 countries for free tier)
      url += '&country=ae,sa,qa,us,gb'; // Saudi, UAE, Qatar + major tech hubs
      
      console.log(`📰 Fetching news from NewsData.io for topic: ${topic}, language: ${language}`);
      console.log(`📰 API URL: ${url.replace(process.env.NEWSDATA_API_KEY || '', '[API_KEY_HIDDEN]')}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FikraHub-App/1.0'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`📰 NewsData.io API error (${response.status}):`, errorText);
        console.error(`📰 Full URL that failed:`, url);
        throw new Error(`NewsData.io API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // Enhanced strict image validation function
      const isValidImage = (imageUrl: string): boolean => {
        if (!imageUrl || imageUrl.trim() === '' || imageUrl === 'null' || imageUrl === 'undefined') return false;
        
        // Must be valid HTTP/HTTPS URL
        if (!imageUrl.startsWith('http')) return false;
        
        // Skip common broken/placeholder patterns (expanded list)
        const invalidPatterns = [
          'placeholder', 'default', 'no-image', 'missing', 'broken', 'error',
          'logo.png', 'logo.jpg', 'favicon', 'avatar.png', 'generic', 'sample',
          '1x1.gif', 'spacer.gif', 'blank.', 'transparent.', 'empty.',
          'dummy', 'test.', 'null', 'undefined', 'loading.',
          // Crypto-specific placeholder patterns
          'coin-placeholder', 'crypto-default', 'bitcoin-logo', 'ethereum-logo',
          'token-default', 'chart-placeholder', 'price-chart-default'
        ];
        
        const lowerUrl = imageUrl.toLowerCase();
        if (invalidPatterns.some(pattern => lowerUrl.includes(pattern))) return false;
        
        // Skip very short URLs (likely invalid)
        if (imageUrl.length < 20) return false;
        
        // Skip URLs that look like API endpoints or non-image paths
        const invalidPaths = ['/api/', '/json', '/xml', '/rss', '/feed'];
        if (invalidPaths.some(path => lowerUrl.includes(path))) return false;
        
        // Must have valid image extension or be from reputable domains
        const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
        const reputableDomains = [
          // Image hosting services
          'unsplash.com', 'pexels.com', 'pixabay.com', 'images.unsplash.com',
          'cdn.', 'cloudinary.com', 'amazonaws.com', 'cloudfront.net',
          'wp.com', 'wordpress.com', 'gravatar.com', 'ytimg.com',
          // News media domains
          'reuters.com', 'bloomberg.com', 'cnn.com', 'bbc.com', 'guardian.com',
          'washingtonpost.com', 'nytimes.com', 'wsj.com', 'ft.com',
          // Tech/crypto news domains
          'coindesk.com', 'cointelegraph.com', 'cryptonews.com', 'decrypt.co',
          'techcrunch.com', 'verge.com', 'arstechnica.com', 'wired.com',
          // Middle East news domains
          'thenationalnews.com', 'arabnews.com', 'gulfnews.com', 'khaleejtimes.com'
        ];
        
        const hasValidExtension = validExtensions.some(ext => lowerUrl.includes(ext));
        const fromReputableDomain = reputableDomains.some(domain => lowerUrl.includes(domain));
        
        // Additional validation: URL should not end with common non-image file extensions
        const invalidExtensions = ['.html', '.php', '.asp', '.xml', '.json', '.txt', '.pdf'];
        const hasInvalidExtension = invalidExtensions.some(ext => lowerUrl.endsWith(ext));
        
        if (hasInvalidExtension) return false;
        
        // Must either have valid extension OR be from reputable domain
        return hasValidExtension || fromReputableDomain;
      };
      
      // Transform the data and filter for high-quality articles with valid images
      const articlesWithImages = data.results
        ?.filter((article: any) => {
          // STRICT image filtering - absolutely no articles without valid images
          if (!isValidImage(article.image_url)) {
            console.log(`🚫 Filtered out article without valid image: "${article.title}" - Image URL: ${article.image_url}`);
            return false;
          }
          
          // Must have meaningful title and description
          if (!article.title || article.title.length < 10) {
            console.log(`🚫 Filtered out article with short title: "${article.title}"`);
            return false;
          }
          if (!article.description || article.description.length < 20) {
            console.log(`🚫 Filtered out article with short description: "${article.title}"`);
            return false;
          }
          
          // Additional quality filters for crypto articles
          const title = article.title.toLowerCase();
          
          // Skip articles with spammy crypto titles (common in low-quality sources)
          const spammyPatterns = [
            'bulls eye', 'targets $', 'price prediction', 'to the moon',
            'moonshot', 'explosive growth', 'massive gains', 'next 100x'
          ];
          
          if (spammyPatterns.some(pattern => title.includes(pattern))) {
            console.log(`🚫 Filtered out potentially spammy crypto article: "${article.title}"`);
            return false;
          }
          
          return true;
        })
        ?.map((article: any, index: number) => ({
          id: article.article_id || String(index + 1),
          topic: topic,
          title: article.title || 'Untitled',
          url: article.link || '#',
          source: article.source_name || article.source_id || (article.creator?.[0] || 'Unknown Source'),
          image: article.image_url,
          publishedAt: article.pubDate || new Date().toISOString(),
          summary: article.description || article.content?.substring(0, 200) + '...' || 'No description available',
          score: Math.floor(Math.random() * 20) + 80, // Random score 80-99 (UI only, not security-sensitive)
          tags: article.category || ['News'],
          sourceCount: Math.floor(Math.random() * 5) + 1, // Random count 1-5 (UI only, not security-sensitive)
          sourceDomain: article.source_url ? new URL(article.source_url).hostname : 'unknown.com'
        })) || [];

      // Remove duplicates based on title (case-insensitive)
      const uniqueArticles = articlesWithImages.reduce((acc: any[], current: any) => {
        const normalizedTitle = current.title.toLowerCase().trim();
        
        // Check if we already have an article with this title
        const isDuplicate = acc.some(article => 
          article.title.toLowerCase().trim() === normalizedTitle
        );
        
        if (!isDuplicate) {
          acc.push(current);
        } else {
          console.log(`🚫 Removed duplicate article: "${current.title}"`);
        }
        
        return acc;
      }, []);

      // Take only first 15 unique articles
      const finalArticles = uniqueArticles.slice(0, 15);
      console.log(`📰 Filtered ${finalArticles.length} high-quality articles with valid images from ${data.results?.length || 0} total results`);
      
      res.json({
        status: data.status,
        totalResults: finalArticles.length,
        results: finalArticles
      });
      
    } catch (error) {
      console.error('News API error:', error);
      console.log('🔄 Falling back to mock data due to API error');
      
      // Always fall back to mock data when external API fails
      return res.json({
        status: "success",
        totalResults: 8,
        results: [
          {
            id: "1",
            topic: "ai",
            title: "Saudi Arabia launches new AI research institute in Riyadh",
            url: "https://arabnews.com/saudi-ai-institute-riyadh",
            source: "Arab News",
            image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=200&fit=crop",
            publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            summary: "The Kingdom announces a major investment in artificial intelligence research with focus on Arabic language processing and computer vision.",
            score: 95,
            tags: ["Saudi", "AI", "Research"],
            sourceCount: 12,
            sourceDomain: "arabnews.com"
          },
          {
            id: "2",
            topic: "investments",
            title: "UAE's ADNOC announces $15B investment in clean energy",
            url: "https://thenationalnews.com/adnoc-clean-energy-investment",
            source: "The National",
            image: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=400&h=200&fit=crop",
            publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            summary: "Major investment in renewable energy infrastructure across the Gulf region signals commitment to green transition.",
            score: 88,
            tags: ["UAE", "Investment", "Clean Energy"],
            sourceCount: 8,
            sourceDomain: "thenationalnews.com"
          },
          {
            id: "3",
            topic: "innovation",
            title: "NEOM unveils breakthrough in desalination technology",
            url: "https://reuters.com/neom-desalination-breakthrough",
            source: "Reuters",
            image: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=400&h=200&fit=crop",
            publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
            summary: "Revolutionary solar-powered desalination plant achieves 40% efficiency improvement over traditional methods.",
            score: 82,
            tags: ["Saudi", "NEOM", "Technology"],
            sourceCount: 15,
            sourceDomain: "reuters.com"
          },
          {
            id: "4",
            topic: "yc-startups",
            title: "Egyptian fintech startup raises $50M Series B",
            url: "https://wamda.com/egyptian-fintech-series-b",
            source: "Wamda",
            image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=200&fit=crop",
            publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            summary: "Cairo-based payment platform expands across MENA region with backing from international VCs.",
            score: 78,
            tags: ["Egypt", "Fintech", "Series B"],
            sourceCount: 6,
            sourceDomain: "wamda.com"
          },
          {
            id: "5",
            topic: "ai",
            title: "Dubai launches Arabic language AI model for government services",
            url: "https://khaleejtimes.com/dubai-arabic-ai-model",
            source: "Khaleej Times",
            image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=200&fit=crop",
            publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            summary: "Dubai government partners with local tech companies to develop first comprehensive Arabic LLM for public sector automation.",
            score: 90,
            tags: ["UAE", "AI", "Government"],
            sourceCount: 7,
            sourceDomain: "khaleejtimes.com"
          },
          {
            id: "6",
            topic: "investments",
            title: "Qatar Investment Authority backs $2B Middle East tech fund",
            url: "https://zawya.com/qatar-tech-fund-investment",
            source: "Zawya",
            image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=200&fit=crop",
            publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            summary: "New venture capital fund targets early-stage startups across the Middle East with focus on fintech and healthtech.",
            score: 85,
            tags: ["Qatar", "VC Fund", "Startups"],
            sourceCount: 10,
            sourceDomain: "zawya.com"
          },
          {
            id: "7",
            topic: "innovation",
            title: "Moroccan startup develops AI-powered agriculture platform",
            url: "https://menabytes.com/morocco-agritech-platform",
            source: "MENAbytes",
            image: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=200&fit=crop",
            publishedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
            summary: "Casablanca-based AgriTech startup uses machine learning to optimize crop yields and reduce water consumption.",
            score: 76,
            tags: ["Morocco", "AgriTech", "Sustainability"],
            sourceCount: 4,
            sourceDomain: "menabytes.com"
          },
          {
            id: "8",
            topic: "yc-startups",
            title: "Saudi logistics startup expands to 5 GCC countries",
            url: "https://argaam.com/saudi-logistics-expansion",
            source: "Argaam",
            image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=200&fit=crop",
            publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
            summary: "Riyadh-based logistics platform secures regional expansion funding and partnerships with major e-commerce players.",
            score: 73,
            tags: ["Saudi", "Logistics", "E-commerce"],
            sourceCount: 5,
            sourceDomain: "argaam.com"
          }
        ]
      });
    }
  });

  // Research endpoint (original streaming version)
  // ✅ SECURITY FIX (P1): Add AI rate limiter (50 req/hour)
  app.post('/api/research', isAuthenticated, aiRateLimiter, async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      console.log(`🔍 Starting research for: "${query}"`);
      
      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const researchAgent = new ResearchAgent();
      await researchAgent.conductResearch(query, res);
      
      res.end();
    } catch (error) {
      console.error("Research error:", error);
      res.status(500).json({ message: "Research failed" });
    }
  });

  function parseJSONResponse(responseText: string): any {
    try {
      let jsonString = responseText.trim();
      
      // Extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                        responseText.match(/```\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch) {
        jsonString = jsonMatch[1] || jsonMatch[0];
      }
      
      // Clean up any leading/trailing non-JSON characters
      jsonString = jsonString.trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("❌ Failed to parse JSON response:", error);
      return null;
    }
  }

  async function extractBusinessContextFromConversation(
    messages: any[],
    language: string
  ): Promise<{ ideaName: string; launchLocation: string; hasIdea: boolean; hasLocation: boolean }> {
    try {
      // Use Azure OpenAI client
      if (!openai) {
        // Return default values if AI service not configured
        console.error('❌ Azure OpenAI client not configured');
        return { ideaName: '', launchLocation: '', hasIdea: false, hasLocation: false };
      }

      // Get only user messages for analysis
      const userMessages = messages
        .filter((m: any) => m.role === 'user')
        .map((m: any) => m.text)
        .join('\n---\n');

      const response = await openai.chat.completions.create({
        model: azureDeployment,
        max_tokens: 500,
        temperature: 0.3,
        messages: [{
          role: 'system',
          content: 'You are an expert business analyst. Respond ONLY with valid JSON, no other text.'
        }, {
          role: 'user',
          content: `You are an expert business analyst. Analyze this conversation and extract the business idea and target location.

  **Conversation History:**
  ${userMessages}

  **Your Task:**
  1. Identify the MAIN business idea (the most detailed, comprehensive business description)
  2. Identify the target market/location (country, region, or city)

  **Rules:**
  - For business idea: Look for detailed descriptions with business context, features, market size, revenue model
  - Ignore casual greetings like "hello", "hi", "how are you"
  - For location: Look for explicit mentions of countries, cities, or regions
  - If no clear location mentioned, return empty string (don't guess)
  - If multiple ideas mentioned, pick the most detailed/recent one
  - Extract exact text, don't summarize or modify

  **Response Format (JSON only):**
  {
    "ideaName": "exact business idea text from conversation",
    "launchLocation": "exact location text or empty string",
    "hasIdea": true/false,
    "hasLocation": true/false,
    "confidence": "high/medium/low"
  }

  **Examples:**

  Input: "I want to develop Supply Chain Sustainability Intelligence platform..."
  Output:
  {
    "ideaName": "Supply Chain Sustainability Intelligence Enterprise platform that provides end-to-end visibility into supply chain environmental impact with AI-driven recommendations...",
    "launchLocation": "",
    "hasIdea": true,
    "hasLocation": false,
    "confidence": "high"
  }

  Input: "Hi there\n---\nFood delivery app for Dubai\n---\nUAE"
  Output:
  {
    "ideaName": "Food delivery app for Dubai",
    "launchLocation": "UAE",
    "hasIdea": true,
    "hasLocation": true,
    "confidence": "high"
  }

  Return ONLY the JSON object, no other text.`
        }]
      });

      const text = response.choices[0]?.message?.content || '{}';

      // ✅ Use shared JSON parser
      const result = parseJSONResponse(text);

      if (!result) {
        console.error('❌ Failed to parse OpenAI response');
        return {
          ideaName: '',
          launchLocation: '',
          hasIdea: false,
          hasLocation: false
        };
      }

      console.log('✅ OpenAI extracted business context:', {
        hasIdea: result.hasIdea,
        hasLocation: result.hasLocation,
        confidence: result.confidence,
        ideaLength: result.ideaName?.length || 0,
        location: result.launchLocation || 'none'
      });

      return {
        ideaName: result.ideaName || '',
        launchLocation: result.launchLocation || '',
        hasIdea: result.hasIdea || false,
        hasLocation: result.hasLocation || false
      };

    } catch (error: any) {
      console.error('❌ Failed to extract business context:', error);
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        type: error?.type,
        response: error?.response?.data
      });
      return {
        ideaName: '',
        launchLocation: '',
        hasIdea: false,
        hasLocation: false
      };
    }
  }

  // AI Cofounder Chat Route - conversational flow  
  // ✅ SECURITY FIX (P1): Add AI rate limiter (50 req/hour)
  app.post('/api/agent/chat', isAuthenticated, aiRateLimiter, async (req, res) => {
    try {
      const { message, chatId, language = 'en' } = req.body;
      
      if (!chatId) {
        return res.status(400).json({ message: "Chat ID is required" });
      }

      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      // Store user message
      if (message && message.trim() && message !== "__AGENT_START__") {
        await storage.createMessage({
          chatId,
          role: "user",
          text: message,
        });
      }

      const messages = await storage.getMessagesByChat(chatId);
      
      // ✅ Check if we have all 13 assets (generation complete)
      const existingAssets = await storage.getAssetsByProject(chat.projectId);
      const hasAllAssets = existingAssets.length >= 13;
      
      // ✅ CRITICAL: If all assets exist, ONLY handle updates, NEVER generate new ones
      if (hasAllAssets) {
        // Only process if user sent an actual message (not __AGENT_START__)
        if (message && message.trim() && message !== "__AGENT_START__") {
          console.log('✅ Checking for update intent...');
          
          const intent = await detectAssetIntent(message, existingAssets, language);
          
          // ✅ CRITICAL: Check if intent exists before processing
          if (intent) {
            console.log(`🎯 User wants to ${intent.action} ${intent.isMultiple ? 'multiple assets' : intent.assetTypes.length === 0 ? 'all assets' : 'single asset'}`);
            console.log(`📝 Assets: ${intent.assetTypes.join(', ') || 'ALL'}`);
            
            // Extract idea name and location
            const userMessages = messages.filter((m: any) => m.role === 'user');
            let ideaName = '';
            let launchLocation = '';
            
            for (const msg of userMessages) {
              const text = msg.text?.toLowerCase() || '';
              if (!ideaName && msg.text && msg.text.trim().length > 10) {
                const businessKeywords = ['app', 'platform', 'service', 'product', 'business', 'startup'];
                if (businessKeywords.some(keyword => text.includes(keyword))) {
                  ideaName = msg.text;
                  break;
                }
              }
            }
            
            if (!ideaName) ideaName = chat.title || 'Business Idea';
            
            for (let i = userMessages.length - 1; i >= 0; i--) {
              const text = userMessages[i].text?.toLowerCase() || '';
              if (text.length < 30 && (text.includes('uae') || text.includes('dubai') || 
                  text.includes('usa') || text.includes('saudi') || text.includes('egypt'))) {
                launchLocation = userMessages[i].text || '';
                break;
              }
            }
            
            if (!launchLocation) launchLocation = 'UAE';
            
            // ✅ Use bulk handler for ALL modification intents
            await handleBulkAssetUpdate({
              chatId,
              projectId: chat.projectId,
              assetTypes: intent.assetTypes,
              action: intent.action,
              modification: intent.modification,
              targetFields: intent.targetFields,
              ideaName,
              launchLocation,
              language,
              userId: (req as any).user?.id
            });
            
            // ✅ CRITICAL: Return immediately after handling
            return res.json({ message: "Asset update completed" });
          } else {
            // ✅ No modification intent - respond conversationally
            console.log('ℹ️ No modification intent - responding conversationally');
            
            let conversationalResponse = '';
            try {
              // Use Azure OpenAI client
              if (!openai) {
                return res.status(503).json({ error: 'AI service not configured' });
              }

              const response = await openai.chat.completions.create({
                model: azureDeployment,
                max_tokens: 300,
                temperature: 0.7,
                messages: [
                  {
                    role: 'system',
                    content: language === 'ar'
                      ? 'أنت شريك أعمال ذكي ودود. المستخدم لديه بالفعل 13 أصلاً تجارياً كاملاً. رد بطريقة طبيعية ومفيدة. إذا سألوا عن التعديلات، أخبرهم أنه يمكنهم طلب تحديث أي أصل.'
                      : 'You are a friendly AI business cofounder. The user already has all 13 business assets completed. Respond naturally and helpfully. If they ask about changes, let them know they can request updates to any asset.'
                  },
                  {
                    role: 'user',
                    content: language === 'ar'
                      ? `المستخدم لديه جميع الأصول الـ 13 المكتملة. رسالته: "${message}". رد بطريقة طبيعية ومفيدة (2-3 جمل).`
                      : `User has all 13 assets completed. Their message: "${message}". Respond naturally and helpfully (2-3 sentences).`
                  }
                ]
              });

              conversationalResponse = response.choices[0]?.message?.content ||
                (language === 'ar'
                  ? 'شكراً لك! لديك جميع أصولك التجارية جاهزة. هل تريد تحديث أي منها؟'
                  : 'Thanks! You have all your business assets ready. Would you like to update any of them?');
            } catch (error) {
              console.error('❌ Failed to generate conversational response:', error);
              conversationalResponse = language === 'ar'
                ? 'شكراً لك! لديك جميع أصولك التجارية الـ 13 جاهزة. يمكنك طلب تحديث أي أصل في أي وقت.'
                : 'Thanks! You have all 13 business assets ready. You can request updates to any asset anytime.';
            }

            const agentMessage = await storage.createMessage({
              chatId,
              role: "assistant",
              text: conversationalResponse,
            });

            // ✅ CRITICAL: Return immediately after conversational response
            return res.json(agentMessage);
          }
        } else {
          // ✅ __AGENT_START__ or empty message when all assets exist
          console.log('ℹ️ Agent start message with all assets - responding with completion status');
          
          const completionMessage = language === 'ar'
            ? '✅ تم إنشاء جميع أصولك التجارية الـ 13 بنجاح!\n\nيمكنك الآن:\n• مراجعة الأصول في اللوحة اليمنى\n• طلب تحديثات أو تعديلات على أي أصل\n• تصدير أصولك\n\nكيف يمكنني مساعدتك اليوم؟'
            : '✅ All 13 business assets have been successfully generated!\n\nYou can now:\n• Review assets in the right panel\n• Request updates or modifications to any asset\n• Export your assets\n\nHow can I help you today?';

          const agentMessage = await storage.createMessage({
            chatId,
            role: "assistant",
            text: completionMessage,
          });

          // ✅ CRITICAL: Return immediately
          return res.json(agentMessage);
        }
      }
      
      // ✅ ONLY REACH HERE IF hasAllAssets === false
      // This is the ONLY path that can trigger new asset generation
      console.log('📝 Less than 13 assets - proceeding with normal generation flow');
      
      const userMessages = messages.filter((m: any) => m.role === 'user');
      const hasGenerationStart = messages.some((m: any) => 
        m.role === 'assistant' && (m.text?.includes('create your complete business framework') || m.text?.includes('Starting to build'))
      );

      // ✅ USE CLAUDE TO EXTRACT CONTEXT instead of manual parsing
      const context = await extractBusinessContextFromConversation(messages, language);
      
      let ideaName = context.ideaName;
      let launchLocation = context.launchLocation;
      let hasIdea = context.hasIdea;
      let hasLocation = context.hasLocation;
      
      console.log(`🤖 Claude extraction: hasIdea=${hasIdea}, hasLocation=${hasLocation}`);
      console.log(`📝 Extracted - Idea: "${ideaName.substring(0, 100)}..."`);
      console.log(`📍 Location: "${launchLocation}"`);
      
      const needsIdea = !hasIdea;
      const needsLocation = !hasLocation;
      
      console.log(`🤖 Smart extraction: hasIdea=${hasIdea}, hasLocation=${hasLocation}, hasGeneration=${hasGenerationStart}`);
      console.log(`📝 Extracted - Idea: "${ideaName}", Location: "${launchLocation}"`);
      console.log(`🎯 Still needs: idea=${needsIdea}, location=${needsLocation}`);
      
      const readyForGeneration = hasIdea && hasLocation && !hasGenerationStart;
      
      if (readyForGeneration) {
        console.log('🚀 FORCING GENERATION START - Have both idea and location!');
      } else {
        const assistantMessageCount = messages.filter(m => m.role === 'assistant').length;
        const userMessageCount = userMessages.length;

        // Only skip if we have MORE assistant messages than user messages (strictly greater)
        if (assistantMessageCount > userMessageCount) {
          console.log('🚫 Skipping duplicate response - already responded to latest user message');
          return res.json({ message: "Response already sent" });
        }
      }
      
      const recentUserMessage = userMessages[userMessages.length - 1]?.text || '';

      let agentState = 'ask_idea';
      
      if (hasGenerationStart) {
        agentState = 'completed';
        console.log(`🎯 Agent state: COMPLETED`);
      } else if (hasIdea && hasLocation) {
        agentState = 'generate_framework';
        console.log(`🎯 Agent state: GENERATE_FRAMEWORK - READY TO START GENERATION!`);
      } else if (needsIdea && needsLocation) {
        agentState = 'ask_idea';
        console.log(`🎯 Agent state: ASK_IDEA`);
      } else if (needsLocation) {
        agentState = 'ask_location';
        console.log(`🎯 Agent state: ASK_LOCATION`);
      } else if (needsIdea) {
        agentState = 'ask_idea_clarify';
        console.log(`🎯 Agent state: ASK_IDEA_CLARIFY`);
      }

      let responseText = '';

      try {
        if (!openai) {
          throw new Error('Azure OpenAI not configured');
        }

        console.log(`🤖 Generating response via Azure OpenAI - State: ${language}`);
        const languageInstructions = language === 'ar'
          ? 'IMPORTANT: Respond in Arabic only. You are an Arabic-speaking AI Business Cofounder (شريك ذكي في الأعمال). Use proper Arabic grammar and business terminology.'
          : 'Respond in English only.';

        let systemPrompt = '';
        let userPrompt = '';

        if (agentState === 'ask_idea') {
          systemPrompt = language === 'ar'
            ? 'أنت شريك أعمال ذكي ودود. ابدأ المحادثة بترحيب دافئ واطلب من المستخدم مشاركة فكرته التجارية بطريقة طبيعية ومحادثة.'
            : 'You are a friendly AI business cofounder. Start the conversation with a warm greeting and naturally ask the user to share their business idea.';

          userPrompt = language === 'ar'
            ? 'ابدأ محادثة جديدة مع رائد أعمال. رحب به واطلب منه مشاركة فكرته التجارية بطريقة ودية وطبيعية (2-3 جمل).'
            : 'Start a new conversation with an entrepreneur. Greet them warmly and ask them to share their business idea in a friendly, natural way (2-3 sentences).';
        } else if (agentState === 'ask_location') {
          systemPrompt = language === 'ar'
            ? `أنت شريك أعمال ذكي. المستخدم شارك فكرته: "${ideaName}". أظهر اهتمامك وحماسك، ثم اسأل عن السوق المستهدف بطريقة طبيعية.`
            : `You are a friendly AI business cofounder. The user shared their idea: "${ideaName}". Show genuine interest and excitement, then naturally ask about their target market.`;

          userPrompt = language === 'ar'
            ? `الفكرة التجارية: "${ideaName}". أظهر حماسك لهذه الفكرة واسأل بشكل طبيعي عن السوق أو المنطقة المستهدفة (2-3 جمل).`
            : `Business idea: "${ideaName}". Show excitement about this idea and naturally ask about the target market or region (2-3 sentences).`;
        } else if (agentState === 'ask_idea_clarify') {
          systemPrompt = language === 'ar'
            ? 'أنت شريك أعمال ذكي. المستخدم لم يقدم فكرة واضحة بعد. اطلب منه توضيح فكرته بطريقة ودية.'
            : 'You are a friendly AI business cofounder. The user hasn\'t provided a clear idea yet. Gently ask them to clarify their business idea.';

          userPrompt = language === 'ar'
            ? `آخر رسالة من المستخدم: "${recentUserMessage}". اطلب منه توضيح فكرته التجارية بطريقة ودية (2-3 جمل).`
            : `User's last message: "${recentUserMessage}". Gently ask them to clarify their business idea (2-3 sentences).`;
        } else {
          systemPrompt = language === 'ar'
            ? `أنت شريك أعمال ذكي ومتعاون. ${ideaName ? `الفكرة: "${ideaName}".` : ''} ${launchLocation ? `السوق: "${launchLocation}".` : ''} استمر في المحادثة بشكل طبيعي.`
            : `You are a friendly, collaborative AI business cofounder. ${ideaName ? `Idea: "${ideaName}".` : ''} ${launchLocation ? `Market: "${launchLocation}".` : ''} Continue the conversation naturally.`;

          userPrompt = language === 'ar'
            ? `آخر رسالة من المستخدم: "${recentUserMessage}". رد عليه بطريقة طبيعية ومفيدة (2-3 جمل).`
            : `User's last message: "${recentUserMessage}". Respond naturally and helpfully (2-3 sentences).`;
        }

        const response = await openai.chat.completions.create({
          model: azureDeployment,
          max_tokens: 500,
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content: `${languageInstructions}\n\n${systemPrompt}\n\nGuidelines:\n- Be warm, friendly, and conversational\n- No emojis\n- Keep responses concise (2-3 sentences)\n- Sound natural, not robotic\n- Show genuine interest and excitement`
            },
            {
              role: 'user',
              content: userPrompt
            }
          ]
        });

        responseText = (response.choices[0]?.message?.content || 'No response generated').trim();
        console.log('✅ Generated response via Azure OpenAI');
      } catch (error) {
        console.error('❌ Azure OpenAI request failed:', error);
        if (language === 'ar') {
          if (agentState === 'ask_idea') {
            responseText = "مرحباً! أنا هنا لمساعدتك في تحويل فكرتك إلى مشروع حقيقي. ما هي الفكرة التجارية التي تفكر فيها؟";
          } else if (agentState === 'ask_location') {
            responseText = `"${ideaName}" تبدو فكرة رائعة! أود معرفة المزيد عن السوق المستهدف. في أي منطقة أو بلد تخطط لإطلاق هذا المشروع؟`;
          } else {
            responseText = "شكراً على المعلومات. دعنا نبدأ في بناء خطة العمل الخاصة بك!";
          }
        } else {
          if (agentState === 'ask_idea') {
            responseText = "Hi there! I'm here to help turn your vision into a solid business plan. What business idea are you thinking about?";
          } else if (agentState === 'ask_location') {
            responseText = `"${ideaName}" sounds really interesting! I'd love to learn more about your target market. Which region or country are you planning to launch in?`;
          } else {
            responseText = "Thanks for sharing that. Let's start building out your business framework!";
          }
        }
      }

      // [Rest of your existing generation flow continues...]
      if (agentState === 'generate_framework') {
        if (language === 'ar') {
          responseText = `ممتاز! لدي كل ما أحتاجه:\n\n✅ المشروع: ${ideaName}\n\n✅ السوق: ${launchLocation}\n\nبدء إنتاج إطار العمل التجاري الكامل الآن...`;
        } else {
          responseText = `Perfect! I have everything I need:\n\n✅ Business: ${ideaName}\n✅ Market: ${launchLocation}\n\nStarting your complete business framework generation now...`;
        }
          
        console.log(`🚀 GENERATION TRIGGERED! Starting sequential asset generation for "${ideaName}" in "${launchLocation}"...`);
        
        const generateAssets = async () => {
            try {
              console.log(`🚀 Starting asset generation for "${ideaName}" in "${launchLocation}"`);
              console.log(`👤 Using authenticated user ID: ${(req as any).user?.id}`);
              
              const assets = [
                { name: 'Lean Canvas', type: 'LEAN_CANVAS' },
                { name: 'SWOT Analysis', type: 'SWOT' },
                { name: 'User Personas', type: 'PERSONA' },
                { name: 'User Stories', type: 'USER_STORIES' },
                { name: 'Interview Questions', type: 'INTERVIEW_QUESTIONS' },
                { name: 'Customer Journey Map', type: 'JOURNEY_MAP' },
                { name: 'Marketing Plan', type: 'MARKETING_PLAN' },
                { name: 'Brand Wheel', type: 'BRAND_WHEEL' },
                { name: 'Brand Identity', type: 'BRAND_IDENTITY' },
                { name: 'Competitor Analysis', type: 'COMPETITOR_MAP' },
                { name: 'TAM/SAM/SOM Analysis', type: 'TAM_SAM_SOM' },
                { name: 'Team Roles', type: 'TEAM_ROLES' },
                { name: 'Pitch Deck Outline', type: 'PITCH_OUTLINE' }
              ];

              // Create a checklist status message that we'll update
              const buildStatusText = (currentIndex: number, completed: boolean[] = []) => {
                const lines = [language === 'ar' ? '🚀 جاري إنشاء إطار العمل الخاص بك:' : '🚀 Building your business framework:'];
                assets.forEach((asset, idx) => {
                  const assetName = language === 'ar' ? {
                    'LEAN_CANVAS': 'نموذج الأعمال المبسط',
                    'SWOT': 'تحليل SWOT',
                    'PERSONA': 'شخصيات المستخدمين',
                    'USER_STORIES': 'قصص المستخدمين',
                    'INTERVIEW_QUESTIONS': 'أسئلة المقابلة',
                    'JOURNEY_MAP': 'رحلة العميل',
                    'MARKETING_PLAN': 'خطة التسويق',
                    'BRAND_WHEEL': 'عجلة العلامة التجارية',
                    'BRAND_IDENTITY': 'هوية العلامة التجارية',
                    'COMPETITOR_MAP': 'خريطة المنافسين',
                    'TAM_SAM_SOM': 'تحليل حجم السوق',
                    'TEAM_ROLES': 'أدوار الفريق',
                    'PITCH_OUTLINE': 'مخطط العرض'
                  }[asset.type] || asset.name : asset.name;

                  if (completed[idx]) {
                    lines.push(`✅ ${assetName}`);
                  } else if (idx === currentIndex) {
                    lines.push(`🔄 ${assetName}...`);
                  } else {
                    lines.push(`⏳ ${assetName}`);
                  }
                });
                return lines.join('\n');
              };

              const completedAssets: boolean[] = new Array(assets.length).fill(false);

              const statusMessage = await storage.createMessage({
                chatId,
                role: "assistant",
                text: buildStatusText(0, completedAssets),
              });

              for (let i = 0; i < assets.length; i++) {
                const asset = assets[i];
                console.log(`🔄 Generating ${asset.name}...`);

                // Update status to show current asset being generated
                await storage.updateMessage(statusMessage.id, {
                  text: buildStatusText(i, completedAssets)
                });

                // Brief delay to show the "generating" status
                await new Promise(resolve => setTimeout(resolve, 500));

                // Generate asset using OpenAI
                console.log(`🤖 Generating ${asset.name} for ${ideaName} in ${launchLocation} using OpenAI...`);

                // Call OpenAI to generate real, custom content for this asset
                let assetData;
                try {
                  const generatedAsset = await generateBusinessAsset({
                    type: asset.type,
                    context: `Launching in ${launchLocation}`,
                    businessDescription: ideaName,
                    additionalData: { language }
                  });

                  assetData = {
                    title: generatedAsset.title || asset.name,
                    summary: `AI-generated ${asset.name} for ${ideaName} in ${launchLocation}`,
                    data: generatedAsset.data
                  };

                  console.log(`✅ OpenAI generated ${asset.name} successfully`);
                } catch (aiError) {
                  console.error(`❌ OpenAI generation failed for ${asset.name}:`, aiError);
                  // Fallback to basic structure if AI fails
                  assetData = {
                    title: asset.name,
                    summary: `${asset.name} for ${ideaName} in ${launchLocation}`,
                    data: {
                      note: 'AI generation unavailable - please regenerate this asset',
                      businessIdea: ideaName,
                      launchLocation: launchLocation
                    }
                  };
                }

                // Store the asset in database
                console.log(`💾 Attempting to store ${asset.name} in database...`);
                console.log(`📋 Asset data:`, { projectId: chat.projectId, kind: asset.type, title: assetData.title });
                
                try {
                  const createdAsset = await storage.createAsset({
                    projectId: chat.projectId,
                    kind: asset.type as 'LEAN_CANVAS' | 'SWOT' | 'PERSONA' | 'JOURNEY_MAP' | 'MARKETING_PLAN' | 'COMPETITOR_MAP' | 'TAM_SAM_SOM' | 'PITCH_OUTLINE' | 'USER_STORIES' | 'INTERVIEW_QUESTIONS' | 'TEAM_ROLES' | 'BRAND_WHEEL' | 'BRAND_IDENTITY',
                    title: assetData.title,
                    data: assetData.data,
                    language: language,
                    createdById: (req as any).user?.id || chat.createdById || 'f07ddef9-f9eb-4ae0-969f-026eb133f3a0', // Use actual authenticated user ID
                  });
                  
                  console.log(`✅ ${asset.name} stored successfully with ID: ${createdAsset.id}`);

                  // Mark this asset as completed
                  completedAssets[i] = true;

                  // Update status to show asset completed
                  await storage.updateMessage(statusMessage.id, {
                    text: buildStatusText(i + 1 < assets.length ? i + 1 : i, completedAssets)
                  });

                  // Brief delay to show completion before next asset
                  await new Promise(resolve => setTimeout(resolve, 800));
                } catch (storageError) {
                  console.error(`❌ Failed to store ${asset.name}:`, storageError);
                  
                  // Update status message to show error
                  await storage.updateMessage(statusMessage.id, {
                    text: `❌ Error generating ${asset.name} (${i + 1}/${assets.length})`
                  });
                  
                  throw storageError; // Re-throw to trigger main error handler
                }

                
                // Wait before next asset
                await new Promise(resolve => setTimeout(resolve, 500));
              }

              // Final status update - mark all as completed
              completedAssets.fill(true);
              await storage.updateMessage(statusMessage.id, {
                text: language === 'ar'
                  ? '🎉 اكتمل! جميع أصول الأعمال تم إنشاؤها بنجاح.\n\n' + assets.map(a => {
                      const assetName = {
                        'LEAN_CANVAS': 'نموذج الأعمال المبسط',
                        'SWOT': 'تحليل SWOT',
                        'PERSONA': 'شخصيات المستخدمين',
                        'USER_STORIES': 'قصص المستخدمين',
                        'INTERVIEW_QUESTIONS': 'أسئلة المقابلة',
                        'JOURNEY_MAP': 'رحلة العميل',
                        'MARKETING_PLAN': 'خطة التسويق',
                        'BRAND_WHEEL': 'عجلة العلامة التجارية',
                        'BRAND_IDENTITY': 'هوية العلامة التجارية',
                        'COMPETITOR_MAP': 'خريطة المنافسين',
                        'TAM_SAM_SOM': 'تحليل حجم السوق',
                        'TEAM_ROLES': 'أدوار الفريق',
                        'PITCH_OUTLINE': 'مخطط العرض'
                      }[a.type] || a.name;
                      return `✅ ${assetName}`;
                    }).join('\n')
                  : '🎉 Complete! All business assets generated successfully.\n\n' + assets.map(a => `✅ ${a.name}`).join('\n')
              });

              // Send a follow-up message encouraging user interaction
              await storage.createMessage({
                chatId,
                role: "assistant",
                text: language === 'ar'
                  ? "🚀 إطار العمل التجاري الكامل جاهز الآن! يمكنك عرض جميع الأصول المُنشأة في اللوحة اليمنى. لا تتردد في طرح أسئلة حول أي أصل محدد، أو طلب تعديلات، أو اطلب مني التوسع في أقسام معينة. ما الذي تود استكشافه أولاً؟"
                  : "🚀 Your complete business framework is now ready! You can view all the generated assets in the right panel. Feel free to ask me questions about any specific asset, request modifications, or ask me to expand on particular sections. What would you like to explore first?"
              });

            } catch (error) {
              console.error('❌ Failed to generate business framework:', error);
              console.error('Error details:', (error as Error).stack);
              
              // Send error message instead of updating non-existent status message
              await storage.createMessage({
                chatId,
                role: "assistant",
                text: "Error occurred during generation. Please try starting a new conversation."
              });
            }
          };

          // Start generation asynchronously but track completion
          console.log(`⏰ Scheduling generation to start...`);
          setImmediate(async () => {
            console.log(`🚀 EXECUTING generateAssets() now!`);
            await generateAssets();
            console.log(`✅ Generation complete!`);
          });
      }

      const agentMessage = await storage.createMessage({
        chatId,
        role: "assistant",
        text: responseText,
      });

      res.json(agentMessage);

    } catch (error) {
      console.error("Error in agent chat:", error);
      res.status(500).json({ message: "Failed to process agent message" });
    }
  });

  // GPT Realtime API routes for expert consultations
  app.post('/api/realtime/conversation/start', isAuthenticated, async (req: any, res) => {
    try {
      const { expertType, language } = req.body;

      if (!expertType) {
        return res.status(400).json({ error: 'Expert type is required' });
      }

      console.log(`Starting realtime conversation for ${expertType} expert in language ${language || 'en'}`);

      // Fetch user's projects/ideas for context (same logic as text chat)
      let userIdeas = '';
      try {
        const userId = req.user.id;
        const organizations = await storage.getUserOrganizations(userId);
        if (organizations && organizations.length > 0) {
          const projects = await storage.getProjectsByOrg(organizations[0].id);
          if (projects && projects.length > 0) {
            const ideasSummary = projects
              .map((p: any, idx: number) => {
                const ideaInfo = p.description || p.title || 'Untitled idea';
                return `${idx + 1}. ${ideaInfo}`;
              })
              .join('\n');

            userIdeas = language === 'ar'
              ? `\n\nأفكار المستخدم الحالية:\n${ideasSummary}\n\nاستخدم هذه المعلومات لتقديم نصائح أكثر تخصيصاً وذات صلة.`
              : `\n\nUser's Current Ideas:\n${ideasSummary}\n\nUse this information to provide more personalized and relevant advice.`;

            console.log(`📋 Loaded ${projects.length} ideas for expert context`);
          }
        }
      } catch (error) {
        console.error('Error fetching user projects:', error);
        // Continue without ideas context if fetch fails
      }

      // Get GPT Realtime connection details with expert configuration
      const result = await getRealtimeConnection({
        expertType: expertType as 'gtm' | 'finance' | 'product',
        language: language || 'en',
        userIdeas
      });

      // Generate unique session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      res.json({
        conversationId: sessionId,
        conversation_id: sessionId,
        websocketUrl: result.websocketUrl,
        sessionConfig: result.sessionConfig,
        status: 'started',
        expertType
      });
    } catch (error) {
      console.error('Error starting Realtime conversation:', error);
      res.status(500).json({ error: 'Failed to start conversation' });
    }
  });

  app.post('/api/realtime/conversation/end', isAuthenticated, async (req: any, res) => {
    try {
      const { conversationId } = req.body;

      if (!conversationId) {
        return res.status(400).json({ error: 'Conversation ID is required' });
      }

      console.log(`Ending realtime conversation: ${conversationId}`);

      // End GPT Realtime conversation (cleanup happens on WebSocket close)
      await endRealtimeConversation(conversationId);

      res.json({
        status: 'ended',
        conversationId
      });
    } catch (error) {
      console.error('Error ending Realtime conversation:', error);
      res.status(500).json({ error: 'Failed to end conversation' });
    }
  });

  app.post('/api/experts/text-chat', isAuthenticated, async (req: any, res) => {
    try {
      const { message, expertType, agentId, language } = req.body;
      
      if (!message || !expertType) {
        return res.status(400).json({ error: 'Message and expertType are required' });
      }

      // Fetch user's projects/ideas for context
      let userIdeas = '';
      try {
        const userId = req.user.id;
        const organizations = await storage.getUserOrganizations(userId);
        const projects = await storage.getProjectsByOrg(organizations[0].id);
        if (projects && projects.length > 0) {
          const ideasSummary = projects
            .map((p: any, idx: number) => {
              const ideaInfo = p.description || p.title || 'Untitled idea';
              return `${idx + 1}. ${ideaInfo}`;
            })
            .join('\n');
          
          userIdeas = language === 'ar' 
            ? `\n\nأفكار المستخدم الحالية:\n${ideasSummary}\n\nاستخدم هذه المعلومات لتقديم نصائح أكثر تخصيصاً وذات صلة.`
            : `\n\nUser's Current Ideas:\n${ideasSummary}\n\nUse this information to provide more personalized and relevant advice.`;
          
          console.log(`📋 Loaded ${projects.length} ideas for expert context`);
        }
      } catch (error) {
        console.error('Error fetching user projects:', error);
        // Continue without ideas context if fetch fails
      }

      // Create expert-specific system prompts with language support and user context
      const createSystemPrompt = (expertType: string, language: string, userIdeas: string = '') => {
        const languageInstruction = language === 'ar' 
          ? 'IMPORTANT: Respond in Arabic only. You are an Arabic-speaking AI Business Cofounder (شريك ذكي في الأعمال). Use proper Arabic grammar and business terminology.' 
          : 'Respond in English only.';
        
        const basePrompts = {
          gtm: `You are a Go-to-Market Strategy Expert with 15+ years of experience helping startups and scale-ups launch products successfully. 

          Your expertise includes:
          - Market research and competitive analysis
          - Customer segmentation and targeting
          - Pricing strategy and positioning
          - Sales funnel optimization
          - Growth hacking and acquisition channels
          - Partnership and distribution strategies${userIdeas}

          Respond in a conversational, advisory tone as if you're a senior consultant. Keep responses focused, actionable, and ask insightful follow-up questions. Limit responses to 2-3 sentences maximum.`,
                    
                    finance: `You are a Finance and Investment Expert with 15+ years of experience in startup funding, financial planning, and venture capital.

          Your expertise includes:
          - Financial modeling and forecasting
          - Investment rounds and valuation
          - Unit economics and profitability analysis
          - Cash flow management and runway planning
          - Fundraising strategy and pitch preparation
          - Financial risk assessment${userIdeas}

          Respond in a conversational, advisory tone as if you're a senior financial consultant. Keep responses focused, actionable, and ask insightful follow-up questions. Limit responses to 2-3 sentences maximum.`,
                    
                    product: `You are a Product Strategy Expert with 15+ years of experience in product management, user experience, and product-market fit.

          Your expertise includes:
          - Product-market fit validation
          - User research and customer feedback analysis
          - Feature prioritization and roadmap planning
          - User experience design and optimization
          - Product analytics and metrics
          - Agile development and iteration strategies${userIdeas}

          Respond in a conversational, advisory tone as if you're a senior product consultant. Keep responses focused, actionable, and ask insightful follow-up questions. Limit responses to 2-3 sentences maximum.`
        };
        
        const basePrompt = basePrompts[expertType as keyof typeof basePrompts];
        return `${languageInstruction}\n\n${basePrompt}`;
      };

      // Get the appropriate system prompt with language support and user ideas
      const systemPrompt = createSystemPrompt(expertType, language || 'en', userIdeas);
      
      if (!systemPrompt) {
        return res.status(400).json({ error: 'Invalid expert type' });
      }

      console.log(`${expertType} expert responding to: ${message}${userIdeas ? ' (with user ideas context)' : ''}`);

      if (!openai) {
        return res.status(503).json({ error: 'OpenAI API not configured' });
      }

      // Use OpenAI to generate expert response
      const openaiResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user', 
            content: message
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      const response = openaiResponse.choices[0].message.content || 'I apologize, but I encountered an issue generating a response. Please try again.';
      
      res.json({ 
        response,
        expertType,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in text chat:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  // SSE Agent endpoint for real-time generation
  // ✅ SECURITY FIX (P1): Add AI rate limiter (50 req/hour)
  app.post('/api/agent/start', isAuthenticated, aiRateLimiter, async (req: any, res) => {
    try {
      const { ideaName, launchLocation, projectId } = req.body;
      const user = req.user;

      if (!ideaName || !launchLocation || !projectId) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }

      console.log(`🚀 Starting agent for ${ideaName} in ${launchLocation}`);

      // Set up SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const sendSSE = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Import AgentRunner
      const { AgentRunner, createBusinessPlan } = await import('./agent/runner.js');
      
      // Create agent plan and runner
      const plan = createBusinessPlan(ideaName, launchLocation);
      const runner = new AgentRunner(plan);

      // Set up event handlers
      runner.on('event', async (event: any) => {
        try {
          // Send real-time update via SSE
          sendSSE(event);

          // Also save status messages to chat for persistence
          if (event.type === 'status') {
            const chat = await storage.getChatsByProject(projectId);
            if (chat && chat.length > 0) {
              const chatId = chat[0].id;
              
              if (event.data.completed) {
                // Step completed
                await storage.createMessage({
                  chatId,
                  role: 'assistant',
                  text: event.data.message
                });
              } else if (event.data.progress) {
                // Update or create status message
                await storage.createMessage({
                  chatId,
                  role: 'assistant',
                  text: `${event.data.message} (${event.data.progress}/${event.data.total})`
                });
              }
            }
          }

          // Handle completion
          if (event.type === 'done') {
            const chat = await storage.getChatsByProject(projectId);
            if (chat && chat.length > 0) {
              const chatId = chat[0].id;
              
              // Send completion message to chat
              await storage.createMessage({
                chatId,
                role: 'assistant',
                text: '🎉 Congratulations! Your complete business framework has been generated successfully! All 8 business assets are now ready for your review in the outputs panel.'
              });
            }
            
            // Close SSE connection
            res.write('data: {"type":"complete"}\n\n');
            res.end();
          }

          // Handle errors
          if (event.type === 'error') {
            const chat = await storage.getChatsByProject(projectId);
            if (chat && chat.length > 0) {
              const chatId = chat[0].id;
              await storage.createMessage({
                chatId,
                role: 'assistant',
                text: `❌ Generation failed: ${event.data.error}`
              });
            }
            res.end();
          }

        } catch (error) {
          console.error('Error handling agent event:', error);
        }
      });

      // Start the agent (this will emit events as it progresses)
      runner.start().catch((error) => {
        console.error('Agent runner error:', error);
        sendSSE({ type: 'error', data: { error: error.message } });
        res.end();
      });

      // Handle client disconnect
      req.on('close', () => {
        console.log('Client disconnected from SSE');
        res.end();
      });

    } catch (error) {
      console.error('Error starting agent:', error);
      res.status(500).json({ message: 'Failed to start agent' });
    }
  });

  const httpServer = createServer(app);
  
  // OpenAI Chat API endpoint for Launch mode
  app.post('/api/openai/chat', isAuthenticated, async (req: any, res) => {
    try {
      const { messages, model = 'gpt-4', temperature = 0.7, max_tokens = 4000 } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      if (!openai) {
        return res.status(503).json({ error: 'OpenAI API not configured' });
      }

      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: 'gpt-4', // Using gpt-4 for now as gpt-5 might not be available yet
        messages,
        temperature,
        max_tokens,
      });

      res.json(response);

    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
        }
        if (error.message.includes('insufficient_quota')) {
          return res.status(402).json({ error: 'OpenAI quota exceeded. Please check your OpenAI account.' });
        }
        if (error.message.includes('invalid_api_key')) {
          return res.status(401).json({ error: 'Invalid OpenAI API key.' });
        }
      }

      res.status(500).json({ 
        error: 'AI service temporarily unavailable',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Anthropic Claude API endpoint for ultra-advanced code generation
  app.post('/api/anthropic/chat', isAuthenticated, async (req: any, res) => {
    try {
      const { messages, model = 'claude-sonnet-4-5-20250929', temperature = 0.8, max_tokens = 8000 } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      // Import Anthropic SDK
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });

      // Handle system messages properly for Anthropic
      let systemPrompt = '';
      const userMessages = messages.filter(msg => {
        if (msg.role === 'system') {
          systemPrompt = msg.content;
          return false;
        }
        return true;
      });

      console.log('🚀 Calling FikraHub AI for ultra-slick interface generation...');

      const anthropicResponse = await anthropic.messages.create({
        model,
        max_tokens,
        system: systemPrompt || undefined,
        messages: userMessages,
        temperature: 0.8
      });

      // Convert Anthropic response to OpenAI-compatible format
      const content = anthropicResponse.content[0]?.type === 'text' 
        ? anthropicResponse.content[0].text 
        : 'No response generated';

      console.log('✅ Claude response received, length:', content.length);

      const compatibleResponse = {
        choices: [{
          message: {
            content: content
          }
        }]
      };

      res.json(compatibleResponse);

    } catch (error) {
      console.error('Anthropic API Error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
        }
        if (error.message.includes('quota')) {
          return res.status(402).json({ error: 'Anthropic quota exceeded. Please check your account.' });
        }
        if (error.message.includes('api_key')) {
          return res.status(401).json({ error: 'Invalid Anthropic API key.' });
        }
      }

      res.status(500).json({ 
        error: 'Claude AI service temporarily unavailable',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Vercel deployment routes
  app.use('/api/vercel', vercelRoutes);
  app.use('/api', mentorRoutes);
  registerProgramRoutes(app);
  registerPitchLifecycleRoutes(app);
  registerConsultationRoutes(app);
  registerSupportRoutes(app);
  registerDeclarationRoutes(app);

    // Add this interface near the top of the file, after imports
  interface AssetUpdateIntent {
    assetTypes: string[]; // Changed from single to array
    action: 'REGENERATE' | 'UPDATE' | 'MODIFY' | 'EXPAND' | 'CLARIFY' | 'DELETE' | 'REGENERATE_ALL';
    modification: string;
    targetFields?: { [assetType: string]: string }; // Map of asset type to field
    isMultiple: boolean; // Flag for bulk operations
  }

  function parseAssetIntentResponse(responseText: string): AssetUpdateIntent | null {
  try {
    let jsonString = responseText.trim();
    
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                      responseText.match(/```\s*([\s\S]*?)\s*```/);
    
    if (jsonMatch) {
      jsonString = jsonMatch[1] || jsonMatch[0];
    }
    
    jsonString = jsonString.trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    const parsed = JSON.parse(jsonString);
    
    // Support both single and multiple asset updates
    if ('assetTypes' in parsed || 'assetType' in parsed) {
      // Convert single to array format for consistency
      if ('assetType' in parsed && !('assetTypes' in parsed)) {
        parsed.assetTypes = parsed.assetType ? [parsed.assetType] : [];
        parsed.isMultiple = false;
      } else {
        parsed.isMultiple = parsed.assetTypes && parsed.assetTypes.length > 1;
      }
      
      // ✅ CRITICAL FIX: Always return result if action exists, even with empty assetTypes
      // This prevents falling through to generation logic
      if (parsed.action) {
        // Validate action types
        const validActions = ['REGENERATE', 'UPDATE', 'MODIFY', 'EXPAND', 'CLARIFY', 'DELETE', 'REGENERATE_ALL'];
        if (validActions.includes(parsed.action)) {
          console.log(`✅ Valid intent detected: action=${parsed.action}, assetTypes=${parsed.assetTypes.length}`);
          return parsed;
        }
      }
    }
    
    console.log('⚠️ Parsed response missing required fields or invalid action');
    return null;
  } catch (error) {
    console.error("❌ Failed to parse asset intent response:", error);
    return null;
  }
  }

  // ✅ Enhanced detectAssetIntent with better handling
  async function detectAssetIntent(
    userMessage: string,
    existingAssets: any[],
    language: string
  ): Promise<AssetUpdateIntent | null> {
    try {
      // Use Azure OpenAI client
      if (!openai) {
        // Return null if AI service not configured
        console.error('❌ Azure OpenAI client not configured');
        return null;
      }

      const assetTypesList = existingAssets.map(a => a.kind).join(', ');

      const response = await openai.chat.completions.create({
        model: "",
        max_tokens: 800,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: 'You are an expert business analyst. Respond ONLY with valid JSON, no other text.'
          },
          {
            role: 'user',
            content: `You are an expert business analyst. Analyze this user message and determine if they want to modify, delete, or regenerate business assets.

  **User Message:** "${userMessage}"

  **Available Business Assets:** ${assetTypesList}

  **Your Task:**
  1. Identify which asset types they want to modify (can be multiple or ALL)
  2. Determine the action type:
    - REGENERATE: Completely redo specific asset(s) from scratch
    - REGENERATE_ALL: Regenerate ALL 13 assets (when user says "regenerate everything", "redo all", "recreate all", "update all data", "clarify all", "make all clearer")
    - DELETE: User wants to delete and recreate asset(s) (keywords: delete, remove, clear, erase)
    - UPDATE: Modify specific parts while keeping most content
    - EXPAND: Add more details without removing existing content
    - CLARIFY: Add explanations or make existing content clearer
  3. Extract their specific modification request
  4. Identify target fields if they mention specific sections

  **CRITICAL RULES:**
  - If user says "update/clarify/improve ALL data" or "make everything clearer" → use REGENERATE_ALL action with empty assetTypes array
  - If user mentions specific assets → populate assetTypes array
  - For general improvements across all assets → use REGENERATE_ALL
  - ALWAYS set action field, never leave it undefined

  **Response Format:**
  You MUST respond with ONLY a valid JSON object, no other text. Format:

  {
    "assetTypes": ["ASSET_NAME_1", "ASSET_NAME_2"] or [],
    "action": "REGENERATE" or "UPDATE" or "EXPAND" or "CLARIFY" or "DELETE" or "REGENERATE_ALL",
    "modification": "user's specific request in plain text",
    "targetFields": {"ASSET_NAME_1": "field_name"} or null,
    "isMultiple": true or false
  }

  **Examples:**

  User: "Update data more clear"
  Response:
  {
    "assetTypes": [],
    "action": "REGENERATE_ALL",
    "modification": "make all data clearer and more comprehensive",
    "targetFields": null,
    "isMultiple": true
  }

  User: "Make everything clearer"
  Response:
  {
    "assetTypes": [],
    "action": "REGENERATE_ALL",
    "modification": "clarify and improve all content",
    "targetFields": null,
    "isMultiple": true
  }

  User: "Clarify all assets"
  Response:
  {
    "assetTypes": [],
    "action": "REGENERATE_ALL",
    "modification": "clarify all business assets",
    "targetFields": null,
    "isMultiple": true
  }

  User: "Update the SWOT analysis and user personas to focus more on Middle East market"
  Response:
  {
    "assetTypes": ["SWOT", "PERSONA"],
    "action": "UPDATE",
    "modification": "focus more on Middle East market",
    "targetFields": {"SWOT": "opportunities", "PERSONA": "demographics"},
    "isMultiple": true
  }

  User: "Clarify the marketing plan"
  Response:
  {
    "assetTypes": ["MARKETING_PLAN"],
    "action": "CLARIFY",
    "modification": "make marketing plan clearer with more details",
    "targetFields": null,
    "isMultiple": false
  }

  User: "Hello, how are you?"
  Response:
  {
    "assetTypes": [],
    "action": "UPDATE",
    "modification": "",
    "targetFields": null,
    "isMultiple": false
  }

  **Important Rules:**
  - If message is NOT about modifying assets, return empty assetTypes array with UPDATE action
  - Asset types must EXACTLY match available list (case-sensitive)
  - For "delete" keywords → use DELETE action
  - For "regenerate everything/all" or "update all" → use REGENERATE_ALL action
  - For general improvement requests without specific assets → use REGENERATE_ALL
  - Return ONLY JSON, no explanations
  - Support multiple assets in single request
  - NEVER return undefined action`
        }]
      });

      const text = response.choices[0]?.message?.content || '{}';

      console.log('🤖 OpenAI response for intent detection:', text.substring(0, 300));
      
      const result = parseAssetIntentResponse(text);
      
      // ✅ CRITICAL FIX: Check if result exists and has valid action
      if (result) {
        // Check if it's a modification intent (not just casual chat)
        const isModificationIntent = 
          result.assetTypes.length > 0 || 
          result.action === 'REGENERATE_ALL' ||
          (result.modification && result.modification.trim().length > 0);
        
        if (isModificationIntent) {
          console.log(`✅ Successfully detected modification intent:`, {
            action: result.action,
            assetTypes: result.assetTypes,
            isMultiple: result.isMultiple,
            modification: result.modification.substring(0, 50)
          });
          return result;
        } else {
          console.log('ℹ️ Result exists but not a modification intent (casual chat)');
          return null;
        }
      }
      
      console.log('ℹ️ No valid asset modification intent detected');
      return null;
      
    } catch (error) {
      console.error('❌ Error detecting asset intent:', error);
      return null;
    }
  }

  // ✅ Enhanced handleAssetUpdate to support bulk operations and delete
  interface EnhancedAssetUpdateParams {
    chatId: string;
    projectId: string;
    assetTypes: string[]; // Now supports multiple
    action: string;
    modification: string;
    targetFields?: { [key: string]: string };
    ideaName: string;
    launchLocation: string;
    language: string;
    userId: string;
  }

  async function handleBulkAssetUpdate(params: EnhancedAssetUpdateParams) {
  const {
    chatId,
    projectId,
    assetTypes,
    action,
    modification,
    targetFields,
    ideaName,
    launchLocation,
    language,
    userId
  } = params;

  try {
    const assets = await storage.getAssetsByProject(projectId);
    console.log(`🔍 Handling bulk asset update: action=${action}, assets=${assetTypes.join(', ') || 'ALL'}`);
    
    // ✅ CRITICAL: If assetTypes is empty but action is CLARIFY/UPDATE/EXPAND, treat as REGENERATE_ALL
    if (assetTypes.length === 0 && (action === 'CLARIFY' || action === 'UPDATE' || action === 'EXPAND')) {
      console.log(`⚠️ Empty assetTypes with ${action} action - converting to REGENERATE_ALL to avoid creating new assets`);
      
      const statusMessage = await storage.createMessage({
        chatId,
        role: "assistant",
        text: language === 'ar'
          ? `🔄 جاري ${action === 'CLARIFY' ? 'توضيح' : action === 'EXPAND' ? 'توسيع' : 'تحديث'} جميع الأصول الـ 13...\n\n📝 التعديل: "${modification}"\n\n⏱️ هذا قد يستغرق بضع دقائق...`
          : `🔄 ${action === 'CLARIFY' ? 'Clarifying' : action === 'EXPAND' ? 'Expanding' : 'Updating'} all 13 assets...\n\n📝 Modification: "${modification}"\n\n⏱️ This may take a few minutes...`
      });

      // Get all asset types to update
      const allAssetTypes = [
        'LEAN_CANVAS', 'SWOT', 'PERSONA', 'USER_STORIES', 
        'INTERVIEW_QUESTIONS', 'JOURNEY_MAP', 'MARKETING_PLAN',
        'BRAND_WHEEL', 'BRAND_IDENTITY', 'COMPETITOR_MAP',
        'TAM_SAM_SOM', 'TEAM_ROLES', 'PITCH_OUTLINE'
      ];

      let completed = 0;
      const total = allAssetTypes.length;

      for (const assetType of allAssetTypes) {
        const existingAsset = assets.find((a: any) => a.kind === assetType);
        
        if (!existingAsset) {
          console.log(`⚠️ Asset ${assetType} not found, skipping...`);
          continue;
        }

        completed++;
        console.log(`🔄 [${completed}/${total}] ${action}ing ${assetType}...`);

        // Update progress
        await storage.updateMessage(statusMessage.id, {
          text: language === 'ar'
            ? `🔄 جاري ${action === 'CLARIFY' ? 'التوضيح' : action === 'EXPAND' ? 'التوسيع' : 'التحديث'}... (${completed}/${total})\n\n📝 الآن: ${assetType.replace(/_/g, ' ')}`
            : `🔄 ${action === 'CLARIFY' ? 'Clarifying' : action === 'EXPAND' ? 'Expanding' : 'Updating'}... (${completed}/${total})\n\n📝 Current: ${assetType.replace(/_/g, ' ')}`
        });

        const enhancedPrompt = buildUpdatePrompt({
          assetType,
          action,
          modification,
          existingData: existingAsset.data,
          ideaName,
          launchLocation,
          language
        });

        const updatedAsset = await generateBusinessAsset({
          type: assetType,
          context: enhancedPrompt,
          businessDescription: ideaName,
          additionalData: { language, modification, action }
        });

        // ✅ UPDATE existing asset, don't create new one
        await storage.updateAsset(existingAsset.id, {
          data: updatedAsset.data,
          updatedAt: new Date()
        });

        // Brief delay between assets
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await storage.updateMessage(statusMessage.id, {
        text: language === 'ar'
          ? `✅ تم ${action === 'CLARIFY' ? 'توضيح' : action === 'EXPAND' ? 'توسيع' : 'تحديث'} جميع الأصول الـ 13 بنجاح!\n\n📝 التعديل المطبق: "${modification}"\n\n💡 يمكنك الآن مراجعة جميع التحديثات.`
          : `✅ Successfully ${action === 'CLARIFY' ? 'clarified' : action === 'EXPAND' ? 'expanded' : 'updated'} all 13 assets!\n\n📝 Applied modification: "${modification}"\n\n💡 You can now review all updates.`
      });

      await storage.createMessage({
        chatId,
        role: "assistant",
        text: language === 'ar'
          ? `🎉 تم تحديث إطار العمل الكامل! هل تريد إجراء أي تعديلات إضافية؟`
          : `🎉 Complete framework update done! Would you like any additional modifications?`
      });

      return;
    }
    
    // ✅ Handle REGENERATE_ALL - regenerate all 13 assets
    if (action === 'REGENERATE_ALL') {
      console.log('🔄 REGENERATE_ALL detected - regenerating all 13 assets...');
      
      const statusMessage = await storage.createMessage({
        chatId,
        role: "assistant",
        text: language === 'ar'
          ? `🔄 جاري إعادة توليد جميع الأصول الـ 13...\n\n📝 التعديل: "${modification}"\n\n⏱️ هذا قد يستغرق بضع دقائق...`
          : `🔄 Regenerating all 13 assets...\n\n📝 Modification: "${modification}"\n\n⏱️ This may take a few minutes...`
      });

      // Get all asset types to regenerate
      const allAssetTypes = [
        'LEAN_CANVAS', 'SWOT', 'PERSONA', 'USER_STORIES', 
        'INTERVIEW_QUESTIONS', 'JOURNEY_MAP', 'MARKETING_PLAN',
        'BRAND_WHEEL', 'BRAND_IDENTITY', 'COMPETITOR_MAP',
        'TAM_SAM_SOM', 'TEAM_ROLES', 'PITCH_OUTLINE'
      ];

      let completed = 0;
      const total = allAssetTypes.length;

      for (const assetType of allAssetTypes) {
        const existingAsset = assets.find((a: any) => a.kind === assetType);
        
        if (!existingAsset) {
          console.log(`⚠️ Asset ${assetType} not found, skipping...`);
          continue;
        }

        completed++;
        console.log(`🔄 [${completed}/${total}] Regenerating ${assetType}...`);

        // Update progress
        await storage.updateMessage(statusMessage.id, {
          text: language === 'ar'
            ? `🔄 جاري إعادة التوليد... (${completed}/${total})\n\n📝 الآن: ${assetType.replace(/_/g, ' ')}`
            : `🔄 Regenerating... (${completed}/${total})\n\n📝 Current: ${assetType.replace(/_/g, ' ')}`
        });

        const enhancedPrompt = buildUpdatePrompt({
          assetType,
          action: 'REGENERATE',
          modification,
          existingData: existingAsset.data,
          ideaName,
          launchLocation,
          language
        });

        const regeneratedAsset = await generateBusinessAsset({
          type: assetType,
          context: enhancedPrompt,
          businessDescription: ideaName,
          additionalData: { language, modification, action: 'REGENERATE' }
        });

        // ✅ UPDATE existing asset, don't create new one
        await storage.updateAsset(existingAsset.id, {
          data: regeneratedAsset.data,
          updatedAt: new Date()
        });

        // Brief delay between assets
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await storage.updateMessage(statusMessage.id, {
        text: language === 'ar'
          ? `✅ تم إعادة توليد جميع الأصول الـ 13 بنجاح!\n\n📝 التعديل المطبق: "${modification}"\n\n💡 يمكنك الآن مراجعة جميع التحديثات.`
          : `✅ Successfully regenerated all 13 assets!\n\n📝 Applied modification: "${modification}"\n\n💡 You can now review all updates.`
      });

      await storage.createMessage({
        chatId,
        role: "assistant",
        text: language === 'ar'
          ? `🎉 تمت إعادة بناء إطار العمل الكامل! هل تريد إجراء أي تعديلات إضافية؟`
          : `🎉 Complete framework rebuild done! Would you like any additional modifications?`
      });

      return;
    }

      // ✅ Handle DELETE action with auto-regeneration
      if (action === 'DELETE') {
        console.log(`🗑️ DELETE detected for assets: ${assetTypes.join(', ')}`);
        
        const statusMessage = await storage.createMessage({
          chatId,
          role: "assistant",
          text: language === 'ar'
            ? `🗑️ جاري حذف وإعادة إنشاء ${assetTypes.length} أصل...\n\n📝 ${assetTypes.map(t => t.replace(/_/g, ' ')).join(', ')}`
            : `🗑️ Deleting and recreating ${assetTypes.length} asset(s)...\n\n📝 ${assetTypes.map(t => t.replace(/_/g, ' ')).join(', ')}`
        });

        for (let i = 0; i < assetTypes.length; i++) {
          const assetType = assetTypes[i];
          const existingAsset = assets.find((a: any) => a.kind === assetType);
          
          if (!existingAsset) {
            console.log(`⚠️ Asset ${assetType} not found for deletion`);
            continue;
          }

          console.log(`🗑️ [${i + 1}/${assetTypes.length}] Deleting and regenerating ${assetType}...`);

          // Update progress
          await storage.updateMessage(statusMessage.id, {
            text: language === 'ar'
              ? `🔄 [${i + 1}/${assetTypes.length}] جاري حذف وإعادة إنشاء ${assetType.replace(/_/g, ' ')}...`
              : `🔄 [${i + 1}/${assetTypes.length}] Deleting and recreating ${assetType.replace(/_/g, ' ')}...`
          });

          // Generate fresh asset (simulates delete + recreate)
          const enhancedPrompt = `Create a completely new ${assetType} for "${ideaName}" in "${launchLocation}".

  User's request: "${modification}"

  Generate fresh content from scratch with:
  - Latest 2024/2025 market data
  - Comprehensive analysis
  - Actionable insights
  - ${language === 'ar' ? 'Arabic language' : 'English language'}`;

          const newAsset = await generateBusinessAsset({
            type: assetType,
            context: enhancedPrompt,
            businessDescription: ideaName,
            additionalData: { language, modification, action: 'DELETE' }
          });

          await storage.updateAsset(existingAsset.id, {
            data: newAsset.data,
            updatedAt: new Date()
          });

          await new Promise(resolve => setTimeout(resolve, 500));
        }

        await storage.updateMessage(statusMessage.id, {
          text: language === 'ar'
            ? `✅ تم حذف وإعادة إنشاء ${assetTypes.length} أصل بنجاح!\n\n🗑️ الأصول المحذوفة والمعاد إنشاؤها:\n${assetTypes.map(t => `• ${t.replace(/_/g, ' ')}`).join('\n')}\n\n💡 جميع البيانات جديدة ومحدثة.`
            : `✅ Successfully deleted and recreated ${assetTypes.length} asset(s)!\n\n🗑️ Deleted and recreated:\n${assetTypes.map(t => `• ${t.replace(/_/g, ' ')}`).join('\n')}\n\n💡 All data is fresh and updated.`
        });

        await storage.createMessage({
          chatId,
          role: "assistant",
          text: language === 'ar'
            ? `هل تريد إجراء أي تعديلات أخرى؟`
            : `Would you like to make any other changes?`
        });

        return;
      }

      // ✅ Handle standard bulk updates (UPDATE, EXPAND, CLARIFY)
      if (assetTypes.length > 1) {
        console.log(`🔄 Bulk ${action} for ${assetTypes.length} assets: ${assetTypes.join(', ')}`);
        
        const statusMessage = await storage.createMessage({
          chatId,
          role: "assistant",
          text: language === 'ar'
            ? `🔄 جاري تحديث ${assetTypes.length} أصول...\n\n📝 ${assetTypes.map(t => t.replace(/_/g, ' ')).join(', ')}`
            : `🔄 Updating ${assetTypes.length} assets...\n\n📝 ${assetTypes.map(t => t.replace(/_/g, ' ')).join(', ')}`
        });

        for (let i = 0; i < assetTypes.length; i++) {
          const assetType = assetTypes[i];
          const targetField = targetFields?.[assetType];
          const existingAsset = assets.find((a: any) => a.kind === assetType);
          
          if (!existingAsset) {
            console.log(`⚠️ Asset ${assetType} not found`);
            continue;
          }

          console.log(`🔄 [${i + 1}/${assetTypes.length}] ${action} ${assetType}...`);

          // Update progress
          await storage.updateMessage(statusMessage.id, {
            text: language === 'ar'
              ? `🔄 [${i + 1}/${assetTypes.length}] جاري ${action === 'UPDATE' ? 'تحديث' : action === 'EXPAND' ? 'توسيع' : 'توضيح'} ${assetType.replace(/_/g, ' ')}...`
              : `🔄 [${i + 1}/${assetTypes.length}] ${action}ing ${assetType.replace(/_/g, ' ')}...`
          });

          const enhancedPrompt = buildUpdatePrompt({
            assetType,
            action,
            modification,
            targetField,
            existingData: existingAsset.data,
            ideaName,
            launchLocation,
            language
          });

          const updatedAsset = await generateBusinessAsset({
            type: assetType,
            context: enhancedPrompt,
            businessDescription: ideaName,
            additionalData: { language, modification, action, targetField }
          });

          await storage.updateAsset(existingAsset.id, {
            data: updatedAsset.data,
            updatedAt: new Date()
          });

          await new Promise(resolve => setTimeout(resolve, 500));
        }

        await storage.updateMessage(statusMessage.id, {
          text: language === 'ar'
            ? `✅ تم تحديث ${assetTypes.length} أصول بنجاح!\n\n📝 الأصول المحدثة:\n${assetTypes.map(t => `• ${t.replace(/_/g, ' ')}`).join('\n')}\n\n💡 التعديل المطبق: "${modification}"`
            : `✅ Successfully updated ${assetTypes.length} assets!\n\n📝 Updated assets:\n${assetTypes.map(t => `• ${t.replace(/_/g, ' ')}`).join('\n')}\n\n💡 Applied: "${modification}"`
        });

        await storage.createMessage({
          chatId,
          role: "assistant",
          text: language === 'ar'
            ? `هل تريد إجراء أي تعديلات إضافية؟`
            : `Would you like any additional modifications?`
        });

        return;
      }

      // ✅ Single asset update (existing logic)
      const assetType = assetTypes[0];
      const targetField = targetFields?.[assetType];
      const existingAsset = assets.find((a: any) => a.kind === assetType);
      
      if (!existingAsset) {
        throw new Error(`Asset ${assetType} not found`);
      }

      console.log(`🔄 Single ${action} for ${assetType}...`);

      const actionText = language === 'ar' 
        ? action === 'REGENERATE' ? 'إعادة توليد' : action === 'EXPAND' ? 'توسيع' : 'تحديث'
        : action === 'REGENERATE' ? 'Regenerating' : action === 'EXPAND' ? 'Expanding' : 'Updating';

      const assetNameAr = {
        'LEAN_CANVAS': 'نموذج الأعمال',
        'SWOT': 'تحليل SWOT',
        'PERSONA': 'شخصيات المستخدمين',
        'USER_STORIES': 'قصص المستخدمين',
        'INTERVIEW_QUESTIONS': 'أسئلة المقابلة',
        'JOURNEY_MAP': 'رحلة العميل',
        'MARKETING_PLAN': 'خطة التسويق',
        'BRAND_WHEEL': 'عجلة العلامة',
        'BRAND_IDENTITY': 'هوية العلامة',
        'COMPETITOR_MAP': 'تحليل المنافسين',
        'TAM_SAM_SOM': 'تحليل السوق',
        'TEAM_ROLES': 'أدوار الفريق',
        'PITCH_OUTLINE': 'مخطط العرض'
      }[assetType] || assetType;

      const assetDisplayName = language === 'ar' ? assetNameAr : assetType.replace(/_/g, ' ');

      const statusMessage = await storage.createMessage({
        chatId,
        role: "assistant",
        text: language === 'ar'
          ? `🔄 جاري ${actionText} ${assetDisplayName}...\n\n📝 التعديل المطلوب: "${modification}"`
          : `🔄 ${actionText} ${assetDisplayName}...\n\n📝 Requested change: "${modification}"`
      });

      const enhancedPrompt = buildUpdatePrompt({
        assetType,
        action,
        modification,
        targetField,
        existingData: existingAsset.data,
        ideaName,
        launchLocation,
        language
      });

      const regeneratedAsset = await generateBusinessAsset({
        type: assetType,
        context: enhancedPrompt,
        businessDescription: ideaName,
        additionalData: { language, modification, action, targetField }
      });

      await storage.updateAsset(existingAsset.id, {
        data: regeneratedAsset.data,
        updatedAt: new Date()
      });

      await storage.updateMessage(statusMessage.id, {
        text: language === 'ar'
          ? `✅ تم ${actionText} ${assetDisplayName} بنجاح!\n\n📝 التعديل المطبق: "${modification}"\n\n💡 يمكنك الآن مراجعة التحديث.`
          : `✅ ${assetDisplayName} ${action.toLowerCase()}ed successfully!\n\n📝 Applied change: "${modification}"\n\n💡 You can now review the update.`
      });

      await storage.createMessage({
        chatId,
        role: "assistant",
        text: language === 'ar'
          ? `هل تريد إجراء أي تعديلات أخرى؟`
          : `Would you like to make any other changes?`
      });

    } catch (error) {
      console.error(`❌ Failed to update assets:`, error);
      
      await storage.createMessage({
        chatId,
        role: "assistant",
        text: language === 'ar'
          ? `❌ عذراً، حدث خطأ أثناء التحديث. يرجى المحاولة مرة أخرى.`
          : `❌ Sorry, an error occurred during update. Please try again.`
      });
    }
  }

  // Add this function after detectAssetIntent
  function buildUpdatePrompt(params: {
    assetType: string;
    action: string;
    modification: string;
    targetField?: string;
    existingData: any;
    ideaName: string;
    launchLocation: string;
    language: string;
  }): string {
    const { assetType, action, modification, targetField, existingData, ideaName, launchLocation, language } = params;

    let prompt = `You are updating an existing ${assetType} for: "${ideaName}" launching in "${launchLocation}".

  **Current ${assetType} Data:**
  ${JSON.stringify(existingData, null, 2)}

  **User's Request:** "${modification}"
  **Action:** ${action}
  ${targetField ? `**Focus Field:** ${targetField}` : ''}

  **Instructions:**
  `;

    if (action === 'REGENERATE') {
      prompt += `
  - Completely regenerate the ${assetType} from scratch
  - Apply user's modification: "${modification}"
  - Keep the same JSON structure
  - Make it comprehensive and detailed
  - Use latest 2024/2025 data and insights
  `;
    } else if (action === 'UPDATE') {
      prompt += `
  - Keep most existing content unchanged
  - Only modify parts related to: "${modification}"
  ${targetField ? `- Focus specifically on the "${targetField}" section` : ''}
  - Maintain consistency across all sections
  - Improve quality while applying changes
  `;
    } else if (action === 'EXPAND') {
      prompt += `
  - Keep ALL existing content
  - Add more details about: "${modification}"
  ${targetField ? `- Expand the "${targetField}" section with additional insights` : ''}
  - Add relevant examples, data, metrics
  - Make it more comprehensive and actionable
  `;
    } else if (action === 'CLARIFY') {
      prompt += `
  - Keep existing content
  - Add clarification about: "${modification}"
  - Provide more specific examples and details
  - Make the content easier to understand
  `;
    }

    prompt += `
  **Language:** ${language === 'ar' ? 'Arabic (العربية)' : 'English'}
  **Output:** Return the complete updated ${assetType} in the exact same JSON structure.`;

    return prompt;
  }

  // Use memory storage for GCS upload (no local filesystem)
  const uploadLogo = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept images only
      const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/svg+xml',
        'image/webp'
      ];

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, SVG, and WebP images are allowed.'));
      }
    }
  });

  // ✅ SECURITY FIX (P1): Add file upload rate limiter (10 uploads/hour)
  app.post('/api/upload/logo', isAuthenticated, fileUploadLimiter, uploadLogo.single('logo'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // SECURITY: Validate file content matches declared type (magic number validation)
      const validation = await validateUploadedFile(req.file, {
        allowedExtensions: ['.png', '.jpg', '.jpeg', '.svg', '.webp'],
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
        maxSizeInBytes: 5 * 1024 * 1024, // 5MB
        validateContent: 'image'
      });

      if (!validation.valid) {
        return res.status(400).json({
          error: 'File validation failed',
          details: validation.error
        });
      }

      // Get user's organization ID for multi-tenant isolation
      const userId = req.user.id;
      const membership = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, userId)
      });

      // Upload to Google Cloud Storage
      const { uploadToGCS } = await import('./lib/gcsUpload');
      const result = await uploadToGCS({
        file: req.file,
        folder: 'logos',
        organizationId: membership?.orgId
      });

      console.log(`✅ Logo uploaded to GCS: ${result.filename}`);
      console.log(`🔗 Public URL: ${result.url}`);

      res.json({
        success: true,
        url: result.url,
        filename: result.filename,
        size: result.size,
        mimetype: result.mimetype
      });

    } catch (error) {
      console.error('❌ Logo upload error:', error);

      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'File too large',
            details: 'Logo must be less than 5MB'
          });
        }
      }

      res.status(500).json({
        error: 'Failed to upload logo',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/presentation/:fileId/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const { fileId } = req.params;

      // SECURITY: Validate fileId to prevent path traversal attacks
      if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
        return res.status(400).json({ error: 'Invalid file ID format' });
      }

      // Use basename to prevent directory traversal
      const safeFileId = path.basename(fileId);

      console.log(`📥 Converting PPTX to PDF: ${safeFileId}`);

      // Check if PDF already exists in cache
      const cachedPdfPath = path.join(process.cwd(), 'public', 'pdfs', `${safeFileId}.pdf`);

      // SECURITY: Verify the resolved path is within allowed directory
      const resolvedPath = path.resolve(cachedPdfPath);
      const allowedDir = path.resolve(process.cwd(), 'public', 'pdfs');
      if (!resolvedPath.startsWith(allowedDir)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (fs.existsSync(cachedPdfPath)) {
        console.log(`✅ Serving cached PDF: ${safeFileId}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${safeFileId}.pdf"`);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

        const pdfBuffer = fs.readFileSync(cachedPdfPath);
        return res.send(pdfBuffer);
      }

      // Find the local PPTX file — fileId is the filename without extension
      const localPptxPath = path.join(process.cwd(), 'uploads', 'pitch', `${safeFileId}.pptx`);

      if (!fs.existsSync(localPptxPath)) {
        return res.status(404).json({ error: 'PPTX file not found on server' });
      }

      // Pass the buffer directly — no URL/SSRF concerns
      const pptxBuffer = fs.readFileSync(localPptxPath);
      const { convertPptxToPdf } = await import('./google-driver.js');
      const pdfRelUrl = await convertPptxToPdf(pptxBuffer);

      // pdfRelUrl is like /pdfs/converted-xxx.pdf
      const generatedPdfPath = path.join(process.cwd(), 'public', pdfRelUrl);

      // Rename to use safeFileId for caching
      const newPdfPath = path.join(process.cwd(), 'public', 'pdfs', `${safeFileId}.pdf`);
      if (fs.existsSync(generatedPdfPath)) {
        fs.renameSync(generatedPdfPath, newPdfPath);
      }

      console.log(`✅ PDF generated and cached: ${safeFileId}.pdf`);

      // Send PDF file
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${safeFileId}.pdf"`);
      res.setHeader('Cache-Control', 'public, max-age=86400');

      const pdfBuffer = fs.readFileSync(newPdfPath);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('❌ PDF conversion error:', error);

      // SECURITY: Only expose error details in development
      res.status(500).json({
        error: 'Failed to convert presentation to PDF',
        ...(process.env.NODE_ENV === 'development' && {
          message: error instanceof Error ? error.message : 'Unknown error',
          hint: 'Make sure google-credentials.json is configured'
        })
      });
    }
  });

  // Password reset: request reset (store token in DB and email link)
  app.post('/api/workspaces/:slug/forgot-password', passwordResetLimiter, async (req: any, res) => {
    try {
      const { slug } = req.params;
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email required" });

      // Find workspace/org
      const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
      if (!org) return res.status(404).json({ error: "Workspace not found" });

      // Find user in this org (use timing-safe check to prevent email enumeration)
      const user = await storage.getUserByEmailOrganization(email, org.id);

      // Always return success to prevent email enumeration
      // If user not found, we'll just not send email but return 200
      if (!user) {
        console.log(`Password reset requested for non-existent email: ${email}`);
        // Return success anyway to prevent email enumeration
        return res.json({ success: true });
      }

      // Generate cryptographically secure token
      const { randomBytes } = await import('crypto');
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Persist token
      await storage.createPasswordResetToken(token, user.id, org.id, expiresAt);

      const hostUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
      const resetUrl = `${hostUrl}/w/${slug}/reset-password?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(user.id)}`;

      // Render email (use template if present)
      let html = `<p>Hi ${user.firstName || user.username || ''},</p>
                  <p>We received a request to reset your password for workspace <strong>${org.name}</strong>.</p>
                  <p>Click the link below to reset your password (valid for 30 minutes):</p>
                  <p><a href="${resetUrl}">Reset password</a></p>
                  <p>If you didn't request this, you can safely ignore this email.</p>`;

      // Try send via Resend if configured
      if (resendClient) {
        try {
          await resendClient.emails.send({
            from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com',
            to: user.email,
            subject: `Reset your password for ${org.name}`,
            html
          });
        } catch (err) {
          console.error('Failed to send reset email via Resend:', err);
        }
      } else {
        console.log('Reset email (no mailer configured):', { to: user.email, resetUrl });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to send reset email" });
    }
  });

  // Password reset: verify token and update password (one-time)
  // SECURITY: Use centralized password validation middleware
  app.post('/api/workspaces/:slug/reset-password',
    passwordResetLimiter,
    passwordValidation(),
    handleValidationErrors,
    async (req: any, res) => {
    try {
      const { slug } = req.params;
      const { token, userId, password } = req.body;

      if (!token || !userId) {
        return res.status(400).json({ error: "Missing token or userId" });
      }

      // find workspace/org
      const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
      if (!org) return res.status(404).json({ error: "Workspace not found" });

      // SECURITY FIX (P2): Use database transaction to prevent race condition
      // Atomically check token validity, mark as used, and update password
      const hashed = await hashPassword(password);

      let tokenRow: any;
      try {
        await db.transaction(async (tx) => {
          // Fetch and mark token as used in a single atomic operation
          const [token_record] = await tx
            .update(passwordResetTokens)
            .set({ used: true, usedAt: new Date() })
            .where(and(
              eq(passwordResetTokens.token, token),
              eq(passwordResetTokens.userId, userId),
              eq(passwordResetTokens.orgId, org.id),
              eq(passwordResetTokens.used, false)
            ))
            .returning();

          if (!token_record) {
            throw new Error('Invalid or already used token');
          }

          tokenRow = token_record;

          // Check expiry
          if (new Date(token_record.expiresAt).getTime() < Date.now()) {
            throw new Error('Expired token');
          }

          // Update password in the same transaction
          await tx.update(users)
            .set({ password: hashed })
            .where(eq(users.id, userId));
        });
      } catch (error: any) {
        if (error.message === 'Invalid or already used token') {
          return res.status(400).json({ error: "Invalid or used token" });
        }
        if (error.message === 'Expired token') {
          return res.status(400).json({ error: "Expired token" });
        }
        throw error;
      }

      // auto-login if possible
      const invitedUser = await storage.getUser(userId);
      if (typeof req.logIn === 'function') {
        req.logIn(invitedUser, (err: any) => {
          if (err) {
            console.error('Auto-login after reset failed:', err);
            if (req.session) (req.session as any).userId = invitedUser?.id;
            return res.status(500).json({ error: 'Password updated but session creation failed' });
          }
          return res.json({ success: true, user: invitedUser });
        });
        return;
      }

      if (req.session) (req.session as any).userId = invitedUser?.id;
      res.json({ success: true, user: invitedUser });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // ✅ Upload evaluation criteria JSON endpoint
  // SECURITY FIX (P1): Added fileUploadLimiter to prevent DoS
  app.post('/api/organizations/:orgId/upload-criteria',
    isAuthenticated,
    isOrgAdmin,
    fileUploadLimiter,
    uploadCriteria.single('criteria'), 
    async (req: any, res) => {
      try {
        const { orgId } = req.params;
        const userId = req.user.id;
        
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        // Read and validate JSON content
        const fileContent = fs.readFileSync(req.file.path, 'utf-8');
        let jsonData;
        
        try {
          jsonData = JSON.parse(fileContent);
          
          // Validate JSON structure (basic validation)
          if (!jsonData || typeof jsonData !== 'object') {
            fs.unlinkSync(req.file.path); // Delete invalid file
            return res.status(400).json({ 
              error: 'Invalid JSON structure',
              details: 'File must contain a valid JSON object' 
            });
          }
          
          // Optional: Add more specific validation for evaluation criteria format
          // Example: check for required fields like metrics, weights, etc.
          
        } catch (parseError) {
          fs.unlinkSync(req.file.path); // Delete invalid file
          return res.status(400).json({ 
            error: 'Invalid JSON file',
            details: 'File contains malformed JSON' 
          });
        }

        // Generate file metadata (cryptographically secure)
        const fileId = `criteria_${Date.now()}_${randomBytes(6).toString('hex')}`;
        const filePath = `/uploads/evaluation-criteria/${req.file.filename}`;
        
        const fileMetadata = {
          id: fileId,
          name: req.file.originalname,
          path: filePath,
          uploadedAt: new Date().toISOString(),
          uploadedBy: userId,
          size: req.file.size,
          mimetype: req.file.mimetype
        };

        // Get current organization
        const org = await storage.getOrganization(orgId);
        if (!org) {
          fs.unlinkSync(req.file.path); // Delete file if org not found
          return res.status(404).json({ error: 'Organization not found' });
        }

        // Get existing files array or initialize empty array
        const existingFiles = Array.isArray(org.evaluationCriteriaFiles) 
          ? org.evaluationCriteriaFiles 
          : [];

        // Add new file to array
        const updatedFiles = [...existingFiles, fileMetadata];

        // Update organization with new files array
        await storage.updateOrganization(orgId, {
          evaluationCriteriaFiles: updatedFiles
        });

        console.log(`✅ Evaluation criteria uploaded: ${req.file.filename} for org ${orgId}`);
        console.log(`📁 File path: ${req.file.path}`);
        console.log(`🔗 Access URL: ${filePath}`);

        res.json({
          success: true,
          file: fileMetadata,
          totalFiles: updatedFiles.length
        });

      } catch (error) {
        console.error('❌ Criteria upload error:', error);
        
        // Clean up uploaded file on error
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        if (error instanceof multer.MulterError) {
          if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
              error: 'File too large',
              details: 'JSON file must be less than 2MB' 
            });
          }
        }

        res.status(500).json({ 
          error: 'Failed to upload evaluation criteria',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
  });

  // ✅ Get all evaluation criteria files for organization
  // SECURITY FIX (P0): Added requireOrgMembership to prevent IDOR
  app.get('/api/organizations/:orgId/criteria-files',
    isAuthenticated,
    requireOrgMembership,
    async (req: any, res) => {
      try {
        const { orgId } = req.params;
        
        const org = await storage.getOrganization(orgId);
        if (!org) {
          return res.status(404).json({ error: 'Organization not found' });
        }

        const files = Array.isArray(org.evaluationCriteriaFiles) 
          ? org.evaluationCriteriaFiles 
          : [];

        res.json({
          success: true,
          files,
          totalFiles: files.length
        });

      } catch (error) {
        console.error('❌ Error fetching criteria files:', error);
        res.status(500).json({ 
          error: 'Failed to fetch evaluation criteria files' 
        });
      }
  });

  // ✅ Delete evaluation criteria file
  app.delete('/api/organizations/:orgId/criteria-files/:fileId', 
    isAuthenticated, 
    isOrgAdmin, 
    async (req: any, res) => {
      try {
        const { orgId, fileId } = req.params;
        
        const org = await storage.getOrganization(orgId);
        if (!org) {
          return res.status(404).json({ error: 'Organization not found' });
        }

        const files = Array.isArray(org.evaluationCriteriaFiles) 
          ? org.evaluationCriteriaFiles 
          : [];

        // Find file to delete
        const fileToDelete = files.find((f: any) => f.id === fileId);
        if (!fileToDelete) {
          return res.status(404).json({ error: 'File not found' });
        }

        // Delete physical file
        const physicalPath = path.join(process.cwd(), 'uploads', 'evaluation-criteria', path.basename(fileToDelete.path));
        if (fs.existsSync(physicalPath)) {
          fs.unlinkSync(physicalPath);
          console.log(`🗑️ Deleted physical file: ${physicalPath}`);
        }

        // Remove from database
        const updatedFiles = files.filter((f: any) => f.id !== fileId);
        await storage.updateOrganization(orgId, {
          evaluationCriteriaFiles: updatedFiles
        });

        console.log(`✅ Deleted criteria file: ${fileId} from org ${orgId}`);

        res.json({
          success: true,
          deletedFileId: fileId,
          remainingFiles: updatedFiles.length
        });

      } catch (error) {
        console.error('❌ Error deleting criteria file:', error);
        res.status(500).json({ 
          error: 'Failed to delete evaluation criteria file' 
        });
      }
  });

  // ✅ Download/view evaluation criteria file content
  // SECURITY FIX (P0): Added requireOrgMembership to prevent IDOR
  app.get('/api/organizations/:orgId/criteria-files/:fileId/content',
    isAuthenticated,
    requireOrgMembership,
    async (req: any, res) => {
      try {
        const { orgId, fileId } = req.params;
        
        const org = await storage.getOrganization(orgId);
        if (!org) {
          return res.status(404).json({ error: 'Organization not found' });
        }

        const files = Array.isArray(org.evaluationCriteriaFiles) 
          ? org.evaluationCriteriaFiles 
          : [];

        const file = files.find((f: any) => f.id === fileId);
        if (!file) {
          return res.status(404).json({ error: 'File not found' });
        }

        // Read file content
        const physicalPath = path.join(process.cwd(), 'uploads', 'evaluation-criteria', path.basename(file.path));
        
        if (!fs.existsSync(physicalPath)) {
          return res.status(404).json({ 
            error: 'File not found on disk',
            details: 'Physical file may have been deleted' 
          });
        }

        const content = fs.readFileSync(physicalPath, 'utf-8');
        const jsonData = JSON.parse(content);

        res.json({
          success: true,
          file: {
            id: file.id,
            name: file.name,
            uploadedAt: file.uploadedAt,
            uploadedBy: file.uploadedBy
          },
          content: jsonData
        });

      } catch (error) {
        console.error('❌ Error reading criteria file:', error);
        res.status(500).json({ 
          error: 'Failed to read evaluation criteria file' 
        });
      }
  });

  app.post('/api/organizations/:orgId/evaluation-criteria-text',
    isAuthenticated,
    isOrgAdmin,
    async (req: any, res) => {
      try {
        const { orgId } = req.params;
        const { criteriaText } = req.body;

        // ✅ Allow undefined or empty string
        if (criteriaText !== undefined && typeof criteriaText !== 'string') {
          return res.status(400).json({ error: 'Criteria text must be a string' });
        }

        const trimmedText = (criteriaText || '').trim();

        // ✅ Validate JSON format only if not empty
        if (trimmedText !== '') {
          try {
            JSON.parse(trimmedText);
          } catch (e) {
            return res.status(400).json({ 
              error: 'Invalid JSON format',
              details: 'Criteria text must be valid JSON or empty' 
            });
          }
        }

        // Update organization - store empty string if empty
        await storage.updateOrganization(orgId, {
          evaluationCriteriaText: trimmedText
        });

        console.log(`✅ Evaluation criteria text ${trimmedText ? 'saved' : 'cleared'} for org ${orgId}`);

        res.json({
          success: true,
          message: trimmedText 
            ? 'Evaluation criteria saved successfully' 
            : 'Evaluation criteria cleared successfully'
        });

      } catch (error) {
        console.error('❌ Error saving criteria text:', error);
        res.status(500).json({ 
          error: 'Failed to save evaluation criteria',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
  });

  // ✅ NEW: Get evaluation criteria text (legacy)
  app.get('/api/organizations/:orgId/evaluation-criteria-text',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { orgId } = req.params;
        
        const org = await storage.getOrganization(orgId);
        if (!org) {
          return res.status(404).json({ error: 'Organization not found' });
        }

        res.json({
          success: true,
          criteriaText: org.evaluationCriteriaText || ''
        });

      } catch (error) {
        console.error('❌ Error fetching criteria text:', error);
        res.status(500).json({ 
          error: 'Failed to fetch evaluation criteria' 
        });
      }
  });

  app.post('/api/projects/:projectId/evaluate',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { projectId } = req.params;
        const userId = req.user.id;

        // Get project
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }

        // Get organization
        const org = await storage.getOrganization(project.orgId);
        if (!org) {
          return res.status(404).json({ error: 'Organization not found' });
        }

        // Determine evaluation criteria source
        let criteriaFiles = org.evaluationCriteriaFiles || [];
        let criteriaText = org.evaluationCriteriaText || '';

        // Check if project is linked to a challenge with custom criteria
        if (project.challengeId) {
          const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, project.challengeId));

          if (challenge?.evaluationCriteria && challenge.evaluationCriteria.trim()) {
            // Prioritize challenge-specific criteria
            criteriaFiles = [];
            criteriaText = challenge.evaluationCriteria;
            console.log('📋 Using challenge-specific evaluation criteria');
          }
        }

        if (!criteriaFiles.length && !criteriaText) {
          return res.status(400).json({
            error: 'No evaluation criteria configured',
            details: 'Please configure evaluation criteria in workspace settings first'
          });
        }

        const { systemPrompt, files: filesUsed, combined } = await parseEvaluationCriteria(
          criteriaFiles,
          criteriaText
        );

        console.log('📊 Generating evaluation with criteria:', {
          filesUsed,
          hasTextCriteria: !!criteriaText,
          combinedKeys: Object.keys(combined)
        });

        // Build prompt
        const userPrompt = buildProjectEvaluationPrompt(project);

        // Check if OpenAI is available
        if (!openai) {
          return res.status(503).json({
            error: 'AI service not configured',
            details: 'Azure OpenAI credentials are not set'
          });
        }

        // ✅ Call Azure OpenAI API with retry logic
        let attempts = 0;
        const maxAttempts = 3;
        let evaluationData = null;

        while (attempts < maxAttempts && !evaluationData) {
          attempts++;
          console.log(`🤖 Attempt ${attempts}/${maxAttempts} - Calling Azure OpenAI API...`);

          try {
            const response = await openai.chat.completions.create({
              model: '', // Empty string when deployment is in baseURL
              max_tokens: 4096,
              temperature: 0.3, // ✅ Lower temperature for more consistent JSON
              messages: [
                {
                  role: 'system',
                  content: systemPrompt
                },
                {
                  role: 'user',
                  content: userPrompt
                }
              ],
              response_format: { type: 'json_object' } // Request JSON mode
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
              throw new Error('Unexpected response from Azure OpenAI');
            }

            console.log('📝 Azure OpenAI response received, length:', content.length);
            console.log('📄 Response preview:', content.substring(0, 200));

            // ✅ Use robust parser
            evaluationData = parseEvaluationResponse(content);

            if (!evaluationData) {
              console.warn(`⚠️ Attempt ${attempts} failed to parse JSON, retrying...`);
              
              // Add small delay before retry
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } else {
              console.log(`✅ Successfully parsed evaluation on attempt ${attempts}`);
            }

          } catch (parseError) {
            console.error(`❌ Attempt ${attempts} failed:`, parseError);
            
            if (attempts >= maxAttempts) {
              throw parseError;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // ✅ Final validation
        if (!evaluationData) {
          console.error('❌ All parsing attempts failed');
          return res.status(500).json({ 
            error: 'Failed to parse AI response',
            details: 'The AI returned invalid JSON format after multiple attempts. Please try again.',
            hint: 'This might be a temporary issue with the AI service.'
          });
        }

        // ✅ Validate data integrity
        if (typeof evaluationData.overallScore !== 'number' || 
            evaluationData.overallScore < 0 || 
            evaluationData.overallScore > 100) {
          console.warn('⚠️ Invalid overall score, using default');
          evaluationData.overallScore = 50;
        }

        if (!Array.isArray(evaluationData.metrics) || evaluationData.metrics.length === 0) {
          console.warn('⚠️ Invalid or empty metrics array, using defaults');
          evaluationData.metrics = [
            {
              name: 'Market Opportunity',
              score: 70,
              rationale: 'Evaluation data incomplete - please regenerate',
              icon: '📊',
              trend: 'N/A'
            }
          ];
        }

        if (!Array.isArray(evaluationData.strengths)) {
          evaluationData.strengths = ['Evaluation incomplete - please regenerate'];
        }

        if (!Array.isArray(evaluationData.recommendations)) {
          evaluationData.recommendations = ['Evaluation incomplete - please regenerate'];
        }

        // Save to database
        const evaluation = await storage.createProjectEvaluation({
          projectId,
          orgId: project.orgId,
          overallScore: evaluationData.overallScore,
          metrics: evaluationData.metrics,
          strengths: evaluationData.strengths,
          recommendations: evaluationData.recommendations,
          insights: evaluationData.insights || 'No insights generated',
          evaluatedBy: userId,
          criteriaSnapshot: {
            files: filesUsed,
            text: criteriaText
          }
        });

        console.log(`✅ Evaluation created for project ${projectId}`);

        res.json({
          success: true,
          evaluation
        });

      } catch (error) {
        console.error('❌ Error generating evaluation:', error);
        
        res.status(500).json({ 
          error: 'Failed to generate evaluation',
          details: error instanceof Error ? error.message : 'Unknown error',
          hint: 'Please check your evaluation criteria configuration and try again.'
        });
      }
  });

  // ✅ Get latest evaluation for a project
  app.get('/api/projects/:projectId/evaluation',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { projectId } = req.params;

        const evaluation = await storage.getLatestProjectEvaluation(projectId);

        if (!evaluation) {
          return res.status(404).json({ 
            error: 'No evaluation found',
            details: 'Generate an evaluation first'
          });
        }

        res.json({
          success: true,
          evaluation
        });

      } catch (error) {
        console.error('❌ Error fetching evaluation:', error);
        res.status(500).json({ 
          error: 'Failed to fetch evaluation' 
        });
      }
  });

  // ✅ Get all evaluations for a project (history)
  app.get('/api/projects/:projectId/evaluations',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { projectId } = req.params;

        const evaluations = await storage.getProjectEvaluations(projectId);

        res.json({
          success: true,
          evaluations,
          total: evaluations.length
        });

      } catch (error) {
        console.error('❌ Error fetching evaluations:', error);
        res.status(500).json({ 
          error: 'Failed to fetch evaluations' 
        });
      }
  });

  // ✅ Delete evaluation
  app.delete('/api/projects/:projectId/evaluations/:evaluationId',
    isAuthenticated,
    isOrgAdmin,
    async (req: any, res) => {
      try {
        const { evaluationId } = req.params;

        await storage.deleteProjectEvaluation(evaluationId);

        console.log(`✅ Evaluation deleted: ${evaluationId}`);

        res.json({
          success: true,
          message: 'Evaluation deleted successfully'
        });

      } catch (error) {
        console.error('❌ Error deleting evaluation:', error);
        res.status(500).json({
          error: 'Failed to delete evaluation'
        });
      }
  });

  // ── Public Workspace Discovery ────────────────────────────────────────────

  // GET /api/public/workspaces — public, returns all workspaces for the entry page dropdown
  app.get('/api/public/workspaces', async (_req, res) => {
    try {
      const result = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          logoUrl: organizations.logoUrl,
          primaryColor: organizations.primaryColor,
        })
        .from(organizations)
        .orderBy(organizations.name);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
  });

  // ── Member Application Routes ─────────────────────────────────────────────

  // GET /api/workspaces/:slug/active-challenges — public, for onboarding form
  app.get('/api/workspaces/:slug/active-challenges', async (req: any, res) => {
    try {
      const { slug } = req.params;
      const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
      if (!org) return res.status(404).json({ error: 'Workspace not found' });

      const result = await db
        .select()
        .from(challenges)
        .where(eq(challenges.orgId, org.id));

      const visible = result.filter(c => c.status === 'active' || c.status === 'upcoming');
      res.json(visible.map(c => ({ challenge: c })));
    } catch (error) {
      console.error('Error fetching active challenges:', error);
      res.status(500).json({ error: 'Failed to fetch challenges' });
    }
  });

  // POST /api/applications/submit — no auth required
  app.post('/api/applications/submit', authRateLimiter, async (req: any, res) => {
    try {
      const {
        userId, email, slug,
        challengeId,
        ideaName, sector, problemStatement,
        solutionDescription, differentiator, targetUser,
        relevantSkills, previousWinner, hasValidation, validationDetails,
        firstName, lastName, password,
      } = req.body;

      if (!userId || !email || !slug) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate user exists and is PENDING
      const invited = await storage.getUser(userId);
      if (!invited || invited.status !== 'PENDING') {
        return res.status(400).json({ error: 'Invalid or already used invite link' });
      }

      // Get org from slug
      const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
      if (!org) return res.status(404).json({ error: 'Workspace not found' });

      // Check no existing application for this user
      const existing = await db.select().from(memberApplications).where(eq(memberApplications.userId, userId));
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Application already submitted' });
      }

      // Validate password strength
      if (!password || password.length < 8 ||
          !/[a-z]/.test(password) || !/[A-Z]/.test(password) ||
          !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
        });
      }

      // Hash password and update user (keep status PENDING)
      const hashed = await hashPassword(password);
      await storage.updateUser(userId, {
        firstName: firstName || '',
        lastName: lastName || '',
        password: hashed,
      });

      // Insert application
      const [application] = await db.insert(memberApplications).values({
        userId,
        orgId: org.id,
        challengeId: challengeId || null,
        ideaName: ideaName || null,
        sector: sector || null,
        problemStatement: problemStatement || null,
        solutionDescription: solutionDescription || null,
        differentiator: differentiator || null,
        targetUser: targetUser || null,
        relevantSkills: relevantSkills || null,
        previousWinner: previousWinner || null,
        hasValidation: hasValidation || null,
        validationDetails: validationDetails || null,
        status: 'PENDING_REVIEW',
      }).returning();

      // Send confirmation + submission review emails
      if (resendClient) {
        const loadTemplate = (name: string) => {
          const candidates = [
            path.join(__dirname, 'email-templates', `${name}.html`),
            path.join(process.cwd(), 'server', 'email-templates', `${name}.html`),
            path.join(process.cwd(), 'dist', 'email-templates', `${name}.html`),
          ];
          const found = candidates.find(p => { try { return fs.existsSync(p); } catch { return false; } });
          if (!found) return null;
          try { return fs.readFileSync(found, 'utf8'); } catch { return null; }
        };

        const userName = firstName || email;

        // 1. Confirmation email
        const confirmTpl = loadTemplate('application-confirmation');
        if (confirmTpl) {
          try {
            await resendClient.emails.send({
              from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com',
              to: email,
              subject: `Application received — ${org.name}`,
              html: mustache.render(confirmTpl, { userName, orgName: org.name, ideaName: ideaName || 'your idea' }),
            });
          } catch (err) {
            console.error('Failed to send confirmation email:', err);
          }
        }

        // 2. Submission review email
        const reviewTpl = loadTemplate('application-submission-review');
        if (reviewTpl) {
          try {
            // Resolve challenge name if provided
            let challengeName = '';
            if (challengeId) {
              const [ch] = await db.select({ title: challenges.title }).from(challenges).where(eq(challenges.id, challengeId)).limit(1);
              challengeName = ch?.title || '';
            }
            await resendClient.emails.send({
              from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com',
              to: email,
              subject: `Your submission summary — ${org.name}`,
              html: mustache.render(reviewTpl, {
                userName,
                orgName: org.name,
                challengeName,
                ideaName: ideaName || '',
                sector: sector || '',
                problemStatement: problemStatement || '',
                solutionDescription: solutionDescription || '',
                differentiator: differentiator || '',
                targetUser: targetUser || '',
                relevantSkills: relevantSkills || '',
                validationDetails: validationDetails || '',
              }),
            });
          } catch (err) {
            console.error('Failed to send submission review email:', err);
          }
        }
      }

      // Fire-and-forget AI screening
      screenApplicationAsync(application.id, challengeId || null, org.id).catch(console.error);

      res.json({ success: true });
    } catch (error) {
      console.error('Application submit error:', error);
      res.status(500).json({ error: 'Failed to submit application' });
    }
  });

  // GET /api/my-application — authenticated, returns current user's application
  app.get('/api/my-application', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      const [application] = await db
        .select()
        .from(memberApplications)
        .where(eq(memberApplications.userId, userId));

      if (!application) return res.json(null);

      res.json({
        id: application.id,
        ideaName: application.ideaName,
        solutionDescription: application.solutionDescription,
        differentiator: application.differentiator,
        targetUser: application.targetUser,
        problemStatement: application.problemStatement,
        challengeId: application.challengeId,
        sector: application.sector,
        status: application.status,
      });
    } catch (error) {
      console.error('Error fetching my application:', error);
      res.status(500).json({ error: 'Failed to fetch application' });
    }
  });

  // ── Workspace-level Admin Application Management ────────────────────────────

  // Helper: verify user is ADMIN or OWNER of the given org
  async function requireOrgAdmin(req: any, orgId: string): Promise<boolean> {
    const userId = req.user?.id;
    if (!userId) return false;
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)));
    return !!member && (member.role === 'OWNER' || member.role === 'ADMIN');
  }

  // GET /api/workspaces/:orgId/admin/applications
  app.get('/api/workspaces/:orgId/admin/applications', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      const rows = await db
        .select({
          application: memberApplications,
          user: { id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, status: users.status },
          org: { id: organizations.id, name: organizations.name, slug: organizations.slug },
          challenge: { id: challenges.id, title: challenges.title },
        })
        .from(memberApplications)
        .leftJoin(users, eq(memberApplications.userId, users.id))
        .leftJoin(organizations, eq(memberApplications.orgId, organizations.id))
        .leftJoin(challenges, eq(memberApplications.challengeId, challenges.id))
        .where(eq(memberApplications.orgId, orgId))
        .orderBy(desc(memberApplications.submittedAt));

      res.json(rows);
    } catch (error) {
      console.error('Error fetching workspace applications:', error);
      res.status(500).json({ error: 'Failed to fetch applications' });
    }
  });

  // PATCH /api/workspaces/:orgId/admin/applications/:id
  app.patch('/api/workspaces/:orgId/admin/applications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, id } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      const { status, aiScore, aiMetrics, aiStrengths, aiRecommendations, aiInsights, manualOverride } = req.body;

      const [application] = await db.select().from(memberApplications).where(and(eq(memberApplications.id, id), eq(memberApplications.orgId, orgId)));
      if (!application) return res.status(404).json({ error: 'Application not found' });

      // Enforce per-workspace capacity cap for approvals
      if (status === 'APPROVED' && application.status !== 'APPROVED') {
        const [org] = await db.select({ acceptanceCapacity: organizations.acceptanceCapacity })
          .from(organizations).where(eq(organizations.id, orgId)).limit(1);
        const capacity = org?.acceptanceCapacity ?? 280;
        const [{ value: approvedCount }] = await db
          .select({ value: count() })
          .from(memberApplications)
          .where(and(eq(memberApplications.orgId, orgId), eq(memberApplications.status, 'APPROVED')));
        if (approvedCount >= capacity) {
          return res.status(409).json({ error: `Capacity full — ${capacity} applicants have already been accepted for this workspace.` });
        }
      }

      const update: Record<string, any> = { updatedAt: new Date() };
      if (status !== undefined) { update.status = status; update.reviewedAt = new Date(); }
      if (aiScore !== undefined) update.aiScore = aiScore;
      if (aiMetrics !== undefined) update.aiMetrics = aiMetrics;
      if (aiStrengths !== undefined) update.aiStrengths = aiStrengths;
      if (aiRecommendations !== undefined) update.aiRecommendations = aiRecommendations;
      if (aiInsights !== undefined) update.aiInsights = aiInsights;

      const [updated] = await db.update(memberApplications).set(update).where(eq(memberApplications.id, id)).returning();

      if (manualOverride && status) {
        const resendApiKey = process.env.RESEND_API_KEY;
        const resendClient = resendApiKey ? new Resend(resendApiKey) : null;
        const hostUrl = process.env.HOST_URL || 'https://os.fikrahub.com';
        const [appUser] = await db.select().from(users).where(eq(users.id, application.userId));
        const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));

        if (appUser && org && resendClient) {
          const userName = appUser.firstName || appUser.email || 'there';
          const orgName = org.name;
          const loadTpl = (name: string, vars: Record<string, string>) => {
            const candidates = [
              path.join(__dirname, 'email-templates', `${name}.html`),
              path.join(process.cwd(), 'server', 'email-templates', `${name}.html`),
            ];
            const found = candidates.find(p => { try { return fs.existsSync(p); } catch { return false; } });
            if (!found) return '';
            try { return mustache.render(fs.readFileSync(found, 'utf8'), vars); } catch { return ''; }
          };

          if (status === 'APPROVED') {
            await db.update(users).set({ status: 'ACTIVE' }).where(eq(users.id, application.userId));
            // Auto-move all BACKLOG projects from this user in this workspace to UNDER_REVIEW
            await db.update(projects)
              .set({ status: 'UNDER_REVIEW' })
              .where(and(
                eq(projects.createdById, application.userId),
                eq(projects.orgId, orgId),
                eq(projects.status, 'BACKLOG')
              ));
            const html = loadTpl('application-approved', { userName, orgName, loginUrl: `${hostUrl}/w/${org.slug}` });
            if (html) resendClient.emails.send({ from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com', to: appUser.email, subject: `🎉 You've been accepted to ${orgName}!`, html }).catch(console.error);
          } else if (status === 'REJECTED') {
            const html = loadTpl('application-rejected', { userName, orgName, ideaName: application.ideaName || 'your idea' });
            if (html) resendClient.emails.send({ from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com', to: appUser.email, subject: `Your application to ${orgName} was not accepted`, html }).catch(console.error);
          }
        }
      }

      res.json(updated);
    } catch (error) {
      console.error('Error updating workspace application:', error);
      res.status(500).json({ error: 'Failed to update application' });
    }
  });

  // POST /api/workspaces/:orgId/admin/applications/:id/rescreen
  app.post('/api/workspaces/:orgId/admin/applications/:id/rescreen', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, id } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      const [application] = await db.select().from(memberApplications).where(and(eq(memberApplications.id, id), eq(memberApplications.orgId, orgId)));
      if (!application) return res.status(404).json({ error: 'Application not found' });

      await db.update(memberApplications).set({ status: 'PENDING_REVIEW', reviewedAt: null, updatedAt: new Date() }).where(eq(memberApplications.id, id));
      screenApplicationAsync(id, application.challengeId || null, orgId).catch(console.error);

      res.json({ success: true, message: 'Re-screening started' });
    } catch (error) {
      console.error('Error re-screening workspace application:', error);
      res.status(500).json({ error: 'Failed to start re-screening' });
    }
  });

  // POST /api/workspaces/:orgId/admin/applications/:id/refine
  app.post('/api/workspaces/:orgId/admin/applications/:id/refine', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId, id } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      const { additionalContext } = req.body as { additionalContext?: string };
      if (!additionalContext?.trim()) return res.status(400).json({ error: 'additionalContext is required' });

      const [application] = await db.select().from(memberApplications).where(and(eq(memberApplications.id, id), eq(memberApplications.orgId, orgId)));
      if (!application) return res.status(404).json({ error: 'Application not found' });

      const result = await refineApplicationAsync(id, additionalContext.trim());
      if (!result) return res.status(500).json({ error: 'AI refinement failed — check OpenAI configuration' });

      res.json(result);
    } catch (error) {
      console.error('Error refining workspace application:', error);
      res.status(500).json({ error: 'Failed to refine application' });
    }
  });

  // GET /api/workspaces/:orgId/admin/applications/stats
  app.get('/api/workspaces/:orgId/admin/applications/stats', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      const [org] = await db.select({ acceptanceCapacity: organizations.acceptanceCapacity })
        .from(organizations).where(eq(organizations.id, orgId)).limit(1);
      const capacity = org?.acceptanceCapacity ?? 280;

      const [{ approved }] = await db.select({ approved: count() }).from(memberApplications).where(and(eq(memberApplications.orgId, orgId), eq(memberApplications.status, 'APPROVED')));
      const [{ rejected }] = await db.select({ rejected: count() }).from(memberApplications).where(and(eq(memberApplications.orgId, orgId), eq(memberApplications.status, 'REJECTED')));
      const [{ pendingEmail }] = await db.select({ pendingEmail: count() }).from(memberApplications).where(and(eq(memberApplications.orgId, orgId), eq(memberApplications.status, 'APPROVED'), isNull(memberApplications.acceptanceEmailSentAt)));
      const [{ pendingRejEmail }] = await db.select({ pendingRejEmail: count() }).from(memberApplications).where(and(eq(memberApplications.orgId, orgId), eq(memberApplications.status, 'REJECTED'), isNull(memberApplications.rejectionEmailSentAt)));

      res.json({ approved, rejected, capacity, pendingAcceptanceEmail: pendingEmail, pendingRejectionEmail: pendingRejEmail });
    } catch (error) {
      console.error('Error fetching application stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // POST /api/workspaces/:orgId/admin/applications/bulk-accept-email
  app.post('/api/workspaces/:orgId/admin/applications/bulk-accept-email', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      const resendApiKey = process.env.RESEND_API_KEY;
      const resendClient = resendApiKey ? new Resend(resendApiKey) : null;
      if (!resendClient) return res.status(503).json({ error: 'Email service not configured' });

      const hostUrl = process.env.HOST_URL || 'https://os.fikrahub.com';

      const candidates = await db
        .select({
          id: memberApplications.id,
          ideaName: memberApplications.ideaName,
          aiScore: memberApplications.aiScore,
          userId: memberApplications.userId,
          userEmail: users.email,
          userFirstName: users.firstName,
          userPassword: users.password,
          orgName: organizations.name,
          orgSlug: organizations.slug,
        })
        .from(memberApplications)
        .innerJoin(users, eq(users.id, memberApplications.userId))
        .innerJoin(organizations, eq(organizations.id, memberApplications.orgId))
        .where(and(eq(memberApplications.orgId, orgId), eq(memberApplications.status, 'APPROVED'), isNull(memberApplications.acceptanceEmailSentAt)));

      const loadTpl = (name: string, vars: Record<string, string>) => {
        const cands = [path.join(__dirname, 'email-templates', `${name}.html`), path.join(process.cwd(), 'server', 'email-templates', `${name}.html`)];
        const found = cands.find(p => { try { return fs.existsSync(p); } catch { return false; } });
        if (!found) return '';
        try { return mustache.render(fs.readFileSync(found, 'utf8'), vars); } catch { return ''; }
      };

      let sent = 0; let failed = 0;
      for (const row of candidates) {
        // If user has no password yet (CSV-imported), send them to set-password page first
        const hasPassword = row.userPassword && row.userPassword.length > 0;
        const loginUrl = hasPassword
          ? `${hostUrl}/w/${row.orgSlug}`
          : `${hostUrl}/w/${row.orgSlug}/onboard?userId=${row.userId}&email=${encodeURIComponent(row.userEmail)}`;

        const html = loadTpl('application-approved', { userName: row.userFirstName || row.userEmail || 'there', orgName: row.orgName, loginUrl });
        if (!html) { failed++; continue; }
        try {
          await resendClient.emails.send({ from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com', to: row.userEmail, subject: `🎉 You've been accepted to ${row.orgName}!`, html });

          // For new users without a password, also send the set-password email
          if (!hasPassword) {
            const setPasswordUrl = `${hostUrl}/w/${row.orgSlug}/onboard?userId=${row.userId}&email=${encodeURIComponent(row.userEmail)}`;
            const pwHtml = loadTpl('csv-onboarding', { orgName: row.orgName, firstName: row.userFirstName || row.userEmail || 'there', email: row.userEmail, ideaName: '', setPasswordUrl });
            if (pwHtml) {
              await resendClient.emails.send({ from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com', to: row.userEmail, subject: `Welcome to ${row.orgName} — Set Your Password`, html: pwHtml });
            }
          }

          await db.update(users).set({ status: 'ACTIVE' }).where(eq(users.id, row.userId));
          await db.update(memberApplications).set({ acceptanceEmailSentAt: new Date(), updatedAt: new Date() }).where(eq(memberApplications.id, row.id));
          sent++;
        } catch { failed++; }
      }

      res.json({ sent, failed, total: candidates.length });
    } catch (error) {
      console.error('Error sending bulk acceptance emails:', error);
      res.status(500).json({ error: 'Failed to send bulk acceptance emails' });
    }
  });

  // POST /api/workspaces/:orgId/admin/applications/bulk-reject-email
  app.post('/api/workspaces/:orgId/admin/applications/bulk-reject-email', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });

      const resendApiKey = process.env.RESEND_API_KEY;
      const resendClient = resendApiKey ? new Resend(resendApiKey) : null;
      if (!resendClient) return res.status(503).json({ error: 'Email service not configured' });

      const candidates = await db
        .select({
          id: memberApplications.id,
          ideaName: memberApplications.ideaName,
          userEmail: users.email,
          userFirstName: users.firstName,
          orgName: organizations.name,
        })
        .from(memberApplications)
        .innerJoin(users, eq(users.id, memberApplications.userId))
        .innerJoin(organizations, eq(organizations.id, memberApplications.orgId))
        .where(and(eq(memberApplications.orgId, orgId), eq(memberApplications.status, 'REJECTED'), isNull(memberApplications.rejectionEmailSentAt)));

      const loadTpl = (name: string, vars: Record<string, string>) => {
        const cands = [path.join(__dirname, 'email-templates', `${name}.html`), path.join(process.cwd(), 'server', 'email-templates', `${name}.html`)];
        const found = cands.find(p => { try { return fs.existsSync(p); } catch { return false; } });
        if (!found) return '';
        try { return mustache.render(fs.readFileSync(found, 'utf8'), vars); } catch { return ''; }
      };

      let sent = 0; let failed = 0;
      for (const row of candidates) {
        const html = loadTpl('application-rejected', { userName: row.userFirstName || row.userEmail || 'there', orgName: row.orgName, ideaName: row.ideaName || 'your idea' });
        if (!html) { failed++; continue; }
        try {
          await resendClient.emails.send({ from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com', to: row.userEmail, subject: `Your application to ${row.orgName} was not accepted`, html });
          await db.update(memberApplications).set({ rejectionEmailSentAt: new Date(), updatedAt: new Date() }).where(eq(memberApplications.id, row.id));
          sent++;
        } catch { failed++; }
      }

      res.json({ sent, failed, total: candidates.length });
    } catch (error) {
      console.error('Error sending bulk rejection emails:', error);
      res.status(500).json({ error: 'Failed to send bulk rejection emails' });
    }
  });

  // ── CSV Import ────────────────────────────────────────────────────────────────
  // POST /api/workspaces/:orgId/admin/applications/import-csv
  const uploadCsv = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) cb(null, true);
      else cb(new Error('Only CSV files are allowed'));
    },
  });

  app.post(
    '/api/workspaces/:orgId/admin/applications/import-csv',
    isAuthenticated,
    uploadCsv.single('file'),
    async (req: any, res) => {
      try {
        const { orgId } = req.params;
        if (!(await requireOrgAdmin(req, orgId))) return res.status(403).json({ error: 'Admin access required' });
        if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

        const { parse } = await import('csv-parse/sync');

        const records: Record<string, string>[] = parse(req.file.buffer, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        });

        if (!records.length) return res.status(400).json({ error: 'CSV file is empty' });

        // Validate required columns exist
        const requiredCols = ['full_name', 'email_address', 'idea_name', 'sector', 'problem_statement', 'solution_description'];
        const headerCols = Object.keys(records[0]);
        const missingCols = requiredCols.filter(c => !headerCols.includes(c));
        if (missingCols.length) {
          return res.status(400).json({ error: `CSV missing required columns: ${missingCols.join(', ')}` });
        }

        const org = await db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
          .from(organizations).where(eq(organizations.id, orgId)).limit(1).then(r => r[0]);
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        const APP_URL = process.env.HOST_URL || `${req.protocol}://${req.get('host')}`;
        const resendApiKey = process.env.RESEND_API_KEY;
        const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

        const loadTpl = (name: string, vars: Record<string, string>) => {
          const cands = [path.join(__dirname, 'email-templates', `${name}.html`), path.join(process.cwd(), 'server', 'email-templates', `${name}.html`)];
          const found = cands.find(p => { try { return fs.existsSync(p); } catch { return false; } });
          if (!found) return '';
          try { return mustache.render(fs.readFileSync(found, 'utf8'), vars); } catch { return ''; }
        };

        const seenEmails = new Set<string>();
        const warnings: string[] = [];
        const errors: string[] = [];
        let imported = 0;

        const cleanStr = (v: string | undefined) => (v || '').trim() || null;
        const demoFields = ['date_of_birth', 'phone_number', 'nationality', 'gender', 'national_id',
          'current_education_status', 'university', 'major', 'study_start_date', 'study_end_date',
          'based_in_saudi_arabia', 'saudi_region'];

        for (let i = 0; i < records.length; i++) {
          const row = records[i];
          const rowNum = i + 2;
          const email = (row['email_address'] || '').toLowerCase().trim();
          const fullName = (row['full_name'] || '').trim();

          // Validation
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push(`Row ${rowNum}: invalid or missing email`);
            continue;
          }
          if (!fullName) {
            errors.push(`Row ${rowNum}: missing full_name`);
            continue;
          }

          // Dedup within CSV
          if (seenEmails.has(email)) {
            warnings.push(`Row ${rowNum}: duplicate email ${email} — only first occurrence processed`);
            continue;
          }
          seenEmails.add(email);

          try {
            const isPrevWinner = (row['previous_program_winner'] || '').toLowerCase();
            const metadata: Record<string, string> = {};
            for (const f of demoFields) { if (row[f]) metadata[f] = row[f]; }

            const ideaFields = {
              ideaName: cleanStr(row['idea_name']),
              sector: cleanStr(row['sector']),
              problemStatement: cleanStr(row['problem_statement']),
              solutionDescription: cleanStr(row['solution_description']),
              differentiator: cleanStr(row['why_choose_solution']),
              targetUser: cleanStr(row['target_user']),
              relevantSkills: cleanStr(row['relevant_skills_experience']),
              previousWinner: isPrevWinner === 'yes' ? 'yes' : isPrevWinner === 'no' ? 'no' : (null as any),
              hasValidation: cleanStr(row['initial_design_testing_validation']) ? 'yes' : (null as any),
              validationDetails: cleanStr(row['initial_design_testing_validation']),
              metadata,
              status: 'PENDING_REVIEW' as const,
            };

            // Check if user exists
            const existingUser = await db.select({ id: users.id, firstName: users.firstName, status: users.status })
              .from(users).where(eq(users.email, email)).limit(1).then(r => r[0]);

            let targetUserId: string;
            let isNewUser = false;

            if (existingUser) {
              targetUserId = existingUser.id;
              // Ensure org membership
              const hasMembership = await db.select({ id: organizationMembers.id })
                .from(organizationMembers)
                .where(and(eq(organizationMembers.userId, existingUser.id), eq(organizationMembers.orgId, orgId)))
                .limit(1).then(r => r[0]);
              if (!hasMembership) {
                await db.insert(organizationMembers).values({ id: crypto.randomUUID(), orgId, userId: existingUser.id, role: 'MEMBER' });
              }
            } else {
              // Create new PENDING user
              isNewUser = true;
              targetUserId = crypto.randomUUID();
              const nameParts = fullName.split(' ');
              await db.insert(users).values({
                id: targetUserId,
                email,
                firstName: nameParts[0] || fullName,
                lastName: nameParts.slice(1).join(' ') || '',
                password: '',
                status: 'PENDING',
                role: 'MEMBER',
              });
              await db.insert(organizationMembers).values({ id: crypto.randomUUID(), orgId, userId: targetUserId, role: 'MEMBER' });
            }

            // Check for existing application
            const existingApp = await db.select({ id: memberApplications.id, status: memberApplications.status })
              .from(memberApplications)
              .where(and(eq(memberApplications.userId, targetUserId), eq(memberApplications.orgId, orgId)))
              .limit(1).then(r => r[0]);

            // Skip if already scored
            if (existingApp?.status === 'AI_REVIEWED' || existingApp?.status === 'APPROVED') {
              warnings.push(`Row ${rowNum}: ${email} already scored (${existingApp.status}) — skipped`);
              imported++;
              continue;
            }

            let appId: string;
            if (existingApp) {
              await db.update(memberApplications).set({ ...ideaFields, updatedAt: new Date() }).where(eq(memberApplications.id, existingApp.id));
              appId = existingApp.id;
            } else {
              const [created] = await db.insert(memberApplications).values({
                id: crypto.randomUUID(), userId: targetUserId, orgId, ...ideaFields,
              }).returning();
              appId = created.id;
            }

            // Trigger AI scoring
            screenApplicationAsync(appId, null, orgId).catch(console.error);

            // NOTE: No email is sent at import time.
            // The set-password email is sent together with the acceptance email
            // so that rejected users never receive a password setup link.

            imported++;
          } catch (rowErr) {
            console.error(`CSV import row ${rowNum} error:`, rowErr);
            errors.push(`Row ${rowNum}: failed to process ${email}`);
          }
        }

        res.json({ imported, warnings, errors, total: records.length });
      } catch (error: any) {
        console.error('CSV import error:', error);
        if (error instanceof multer.MulterError || error.message?.includes('Only CSV')) {
          return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to import CSV' });
      }
    }
  );

  return httpServer;
}
