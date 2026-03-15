/**
 * ✅ SECURITY FIX (P1): Comprehensive Zod validation schemas
 * These schemas provide input validation for all endpoints to prevent:
 * - Injection attacks (XSS, SQL injection)
 * - Data corruption
 * - DoS via oversized inputs
 * - Type confusion vulnerabilities
 */

import { z } from "zod";

// ============================================================================
// IDEA ROUTES SCHEMAS
// ============================================================================

/**
 * POST /api/ideas - Create new idea
 */
export const createIdeaSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long").trim(),
  summary: z.string().min(1, "Summary is required").max(2000, "Summary too long").trim(),
  tags: z.array(z.string().max(50, "Tag too long")).max(10, "Too many tags").optional(),
  orgId: z.string().uuid("Invalid organization ID"),
  details: z.record(z.unknown()).optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']).optional(),
});

/**
 * PATCH /api/ideas/:id - Update idea
 */
export const updateIdeaSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  summary: z.string().min(1).max(2000).trim().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  details: z.record(z.unknown()).optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'ARCHIVED']).optional(),
  assignedTo: z.string().uuid().optional(),
});

/**
 * POST /api/ideas/:id/watchers - Add watcher to idea
 */
export const addWatcherSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email too long"),
});

/**
 * POST /api/ideas/:id/comments - Create comment (already has sanitization, add validation)
 */
export const createCommentSchema = z.object({
  bodyMd: z.string().min(1, "Comment body is required").max(10000, "Comment too long"),
  mentions: z.array(z.string().uuid()).max(20, "Too many mentions").optional(),
});

/**
 * PATCH /api/comments/:id - Update comment
 */
export const updateCommentSchema = z.object({
  bodyMd: z.string().min(1).max(10000).optional(),
  isDeleted: z.boolean().optional(),
});

/**
 * PATCH /api/reviews/:id - Update review
 */
export const updateReviewSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED']).optional(),
  verdict: z.string().max(2000, "Verdict too long").optional(),
  feedback: z.string().max(5000, "Feedback too long").optional(),
});

/**
 * POST /api/metrics - Upload metrics file
 */
export const uploadMetricsSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
  name: z.string().min(1, "Name is required").max(100, "Name too long").trim(),
});

/**
 * POST /api/ideas/:id/evaluate - Evaluate idea
 */
export const evaluateIdeaSchema = z.object({
  criteria: z.array(z.string()).optional(),
  useOrgCriteria: z.boolean().optional(),
});

/**
 * POST /api/ideas/:id/score - Score idea
 */
export const scoreIdeaSchema = z.object({
  metricsId: z.string().uuid("Invalid metrics ID").optional(),
});

/**
 * POST /api/organizations/:orgId/metrics - Create metrics set
 */
export const createMetricsSetSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long").trim(),
  description: z.string().max(500, "Description too long").optional(),
  criteria: z.array(z.object({
    name: z.string().min(1).max(100),
    weight: z.number().min(0).max(100).optional(),
    description: z.string().max(500).optional(),
  })).min(1, "At least one criterion required").max(20, "Too many criteria"),
});

/**
 * PATCH /api/organizations/:id - Update organization
 */
export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  logoUrl: z.string().url("Invalid logo URL").max(500).optional().or(z.literal('')),
  darkLogoUrl: z.string().url("Invalid dark logo URL").max(500).optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format (use #RRGGBB)").optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens").min(3).max(50).optional(),
  domain: z.string().max(255).optional().or(z.literal('')),
  description: z.string().max(1000).optional(),
  industry: z.string().max(100).optional(),
  website: z.string().url("Invalid website URL").max(500).optional().or(z.literal('')),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '501+']).optional(),

  // Dashboard route fields
  dashboardNameEn: z.string().max(100).optional(),
  dashboardNameAr: z.string().max(100).optional(),

  // My Ideas route fields
  myIdeasNameEn: z.string().max(100).optional(),
  myIdeasNameAr: z.string().max(100).optional(),
  myIdeasDescEn: z.string().max(500).optional(),
  myIdeasDescAr: z.string().max(500).optional(),

  // Challenges route fields
  challengesNameEn: z.string().max(100).optional(),
  challengesNameAr: z.string().max(100).optional(),
  challengesDescEn: z.string().max(500).optional(),
  challengesDescAr: z.string().max(500).optional(),

  // Radar route fields
  radarNameEn: z.string().max(100).optional(),
  radarNameAr: z.string().max(100).optional(),
  radarDescEn: z.string().max(500).optional(),
  radarDescAr: z.string().max(500).optional(),

  // Experts route fields (has title + name + desc)
  expertsTitleEn: z.string().max(100).optional(),
  expertsTitleAr: z.string().max(100).optional(),
  expertsNameEn: z.string().max(100).optional(),
  expertsNameAr: z.string().max(100).optional(),
  expertsDescEn: z.string().max(500).optional(),
  expertsDescAr: z.string().max(500).optional(),

  // Section visibility toggles
  dashboardEnabled: z.boolean().optional(),
  challengesEnabled: z.boolean().optional(),
  expertsEnabled: z.boolean().optional(),
  radarEnabled: z.boolean().optional(),
  aiBuilderEnabled: z.boolean().optional(),
  formSubmissionEnabled: z.boolean().optional(),
  academyEnabled: z.boolean().optional(),

  // Default route after login
  defaultRoute: z.string().max(100).optional(),
});

// ============================================================================
// CHALLENGE ROUTES SCHEMAS
// ============================================================================

/**
 * POST /api/challenges - Create challenge
 */
export const createChallengeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long").trim(),
  description: z.string().min(1, "Description is required").max(5000, "Description too long"),
  shortDescription: z.string().max(500, "Short description too long").optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens").min(3).max(100),
  deadline: z.union([
    z.string().datetime(),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform(v => v + 'T00:00:00.000Z'),
  ]).optional(),
  status: z.enum(['draft', 'active', 'upcoming', 'ended']).optional(),
  prize: z.string().max(500).optional(),
  emoji: z.string().max(10).optional(),
  maxSubmissions: z.number().int().positive().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  orgId: z.string().uuid("Invalid organization ID"),
  prizes: z.array(z.object({
    place: z.number().int().positive(),
    amount: z.number().nonnegative(),
    currency: z.string().length(3),
    description: z.string().max(500).optional(),
  })).max(10).optional(),
  evaluationCriteria: z.string().max(10000, "Evaluation criteria too long").optional(),
});

/**
 * PATCH /api/challenges/:id - Update challenge
 */
export const updateChallengeSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().min(1).max(5000).optional(),
  shortDescription: z.string().max(500).optional(),
  deadline: z.union([
    z.string().datetime(),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform(v => v + 'T00:00:00.000Z'),
  ]).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  status: z.enum(['draft', 'active', 'upcoming', 'ended']).optional(),
  prize: z.string().max(500).optional(),
  emoji: z.string().max(10).optional(),
  maxSubmissions: z.number().int().positive().optional(),
  evaluationCriteria: z.string().max(10000, "Evaluation criteria too long").optional(),
});

/**
 * POST /api/challenges/:id/submissions - Submit to challenge
 */
export const createSubmissionSchema = z.object({
  submissionUrl: z.string().url("Invalid submission URL").max(500),
  description: z.string().max(2000, "Description too long").optional(),
  attachments: z.array(z.object({
    name: z.string().max(255),
    url: z.string().url().max(500),
    type: z.string().max(100).optional(),
  })).max(5, "Too many attachments").optional(),
});

// ============================================================================
// MAIN ROUTES SCHEMAS
// ============================================================================

/**
 * PATCH /api/user/profile - Update user profile
 */
export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  email: z.string().email("Invalid email format").max(255).optional(),
  profileImageUrl: z.string().url("Invalid profile image URL").max(500).optional().or(z.literal('')),
  bio: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  website: z.string().url("Invalid website URL").max(500).optional().or(z.literal('')),
});

/**
 * POST /api/organizations - Create organization
 */
export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100, "Name too long").trim(),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens").min(3).max(50).optional(),
  industry: z.string().max(100).optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '501+']).optional(),
});

/**
 * PATCH /api/organizations/:orgId/admin/settings - Update org settings
 */
export const updateOrgSettingsSchema = z.object({
  logoUrl: z.string().url("Invalid logo URL").max(500).optional().or(z.literal('')),
  darkLogoUrl: z.string().url("Invalid dark logo URL").max(500).optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(50).optional(),
  name: z.string().min(1).max(100).trim().optional(),
  challengesEnabled: z.boolean().optional(),
  expertsEnabled: z.boolean().optional(),
  radarEnabled: z.boolean().optional(),
  dashboardEnabled: z.boolean().optional(),
  aiBuilderEnabled: z.boolean().optional(),
  formSubmissionEnabled: z.boolean().optional(),
  academyEnabled: z.boolean().optional(),
});

/**
 * POST /api/organizations/:orgId/admin/members - Add org member
 */
export const addOrgMemberSchema = z.object({
  email: z.string().email("Invalid email format").max(255),
  role: z.enum(['MEMBER', 'ADMIN', 'OWNER', 'MENTOR']).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

/**
 * PATCH /api/organizations/:orgId/admin/members/:userId - Update member role
 */
export const updateMemberRoleSchema = z.object({
  role: z.enum(['MEMBER', 'ADMIN', 'OWNER', 'MENTOR'], {
    errorMap: () => ({ message: "Role must be MEMBER, ADMIN, OWNER, or MENTOR" })
  }),
});

/**
 * POST /api/generate-pitch-deck - Generate pitch deck
 */
export const generatePitchDeckSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  assetId: z.string().uuid("Invalid asset ID").optional(),
  pitchData: z.object({
    title: z.string().max(200).optional(),
    slides: z.array(z.object({
      title: z.string().max(200),
      content: z.union([z.string().max(2000), z.array(z.string())]), // Accept string or array of strings
      layout: z.string().max(50).optional(),
      keyPoints: z.array(z.string()).optional(),
      speakerNotes: z.string().optional(),
    }).passthrough()).min(1, "At least one slide required").max(50, "Too many slides"),
    template: z.string().max(50).optional(),
    theme: z.string().max(50).optional(),
    colorScheme: z.string().max(50).optional(),
    fontFamily: z.string().max(50).optional(),
  }).passthrough(), // Allow additional fields from frontend
});

/**
 * POST /api/generate-asset - Generate business asset
 */
export const generateAssetSchema = z.object({
  type: z.enum(['BUSINESS_PLAN', 'PITCH_DECK', 'FINANCIAL_MODEL', 'MARKET_ANALYSIS', 'SWOT', 'OTHER']),
  context: z.string().max(5000, "Context too long").optional(),
  businessDescription: z.string().min(1, "Business description is required").max(2000),
  projectId: z.string().uuid("Invalid project ID"),
  additionalData: z.record(z.unknown()).optional(),
});

/**
 * POST /api/chat/response - AI chat response
 */
export const chatResponseSchema = z.object({
  message: z.string().min(1, "Message is required").max(5000, "Message too long"),
  context: z.string().max(10000, "Context too long").optional(),
  mode: z.enum(['balanced', 'creative', 'precise']).optional(),
  chatId: z.string().uuid().optional(),
});

/**
 * POST /api/voice/synthesize - Synthesize voice
 */
export const voiceSynthesizeSchema = z.object({
  text: z.string().min(1, "Text is required").max(5000, "Text too long (max 5000 characters)"),
  voice_id: z.string().max(100).optional(),
  model_id: z.string().max(100).optional(),
});

/**
 * POST /api/research/perplexity - Research query
 */
export const researchQuerySchema = z.object({
  query: z.string().min(1, "Query is required").max(1000, "Query too long"),
  context: z.string().max(5000).optional(),
  model: z.string().max(100).optional(),
});

// ============================================================================
// OPENAI ROUTES SCHEMAS
// ============================================================================

/**
 * POST /openai/chat - OpenAI chat
 */
export const openaiChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().max(10000, "Message content too long"),
  })).min(1, "At least one message required").max(50, "Too many messages"),
  model: z.string().max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().max(4000).optional(),
});

/**
 * POST /openai/anthropic/chat - Anthropic chat
 */
export const anthropicChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(10000, "Message content too long"),
  })).min(1, "At least one message required").max(50, "Too many messages"),
  model: z.string().max(100).optional(),
  max_tokens: z.number().int().positive().max(4000).optional(),
});

// ============================================================================
// VALIDATION HELPER
// ============================================================================

/**
 * Middleware factory to validate request body against a Zod schema
 */
export function validateRequest(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      console.error('❌ Validation failed:', JSON.stringify(result.error.flatten().fieldErrors, null, 2));
      console.error('📦 Request body:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }
    // Replace req.body with validated and sanitized data
    req.body = result.data;
    next();
  };
}
