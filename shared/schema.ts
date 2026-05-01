import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const projectEvaluations = pgTable("project_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  
  // Overall score
  overallScore: integer("overall_score").notNull(), // 0-100
  
  // Detailed metrics (flexible JSON structure)
  metrics: jsonb("metrics").$type<{
    name: string;
    score: number;
    rationale: string;
    icon?: string;
    trend?: string;
  }[]>().notNull(),
  
  // Strengths and recommendations
  strengths: jsonb("strengths").$type<string[]>().notNull(),
  recommendations: jsonb("recommendations").$type<string[]>().notNull(),
  
  // AI-generated insights
  insights: text("insights"),
  
  // Metadata
  evaluatedBy: varchar("evaluated_by").references(() => users.id),
  evaluatedAt: timestamp("evaluated_at").defaultNow().notNull(),
  
  // Criteria used (snapshot for historical tracking)
  criteriaSnapshot: jsonb("criteria_snapshot").$type<{
    files: string[];
    text: string;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  token: varchar("token").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  orgId: varchar("org_id").references(() => organizations.id),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userStatusEnum = pgEnum("user_status", ["PENDING", "ACTIVE"]);
// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 50 }),
  email: varchar("email"),
  password: varchar("password", { length: 255 }),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  status: userStatusEnum("status").default("ACTIVE"),
  profileImageUrl: varchar("profile_image_url"),
  loginCount: integer("login_count").default(0),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  logoUrl: varchar("logo_url"),
  darkLogoUrl: varchar("dark_logo_url"),
  primaryColor: varchar("primary_color").default("#4588f5"),
  slug: varchar("slug").unique().notNull(), // Must be unique for /w/<slug> routing
  domain: varchar("domain"), // Optional custom domain
  challengesEnabled: boolean("challenges_enabled").default(true),
  expertsEnabled: boolean("experts_enabled").default(true),
  radarEnabled: boolean("radar_enabled").default(true),
  dashboardEnabled: boolean("dashboard_enabled").default(true),
  aiBuilderEnabled: boolean("ai_builder_enabled").default(true),
  formSubmissionEnabled: boolean("form_submission_enabled").default(true),
  manualBuildEnabled: boolean("manual_build_enabled").default(true),
  academyEnabled: boolean("academy_enabled").default(true),
  evaluationCriteriaFiles: jsonb("evaluation_criteria_files").$type<{
    id: string;
    name: string;
    path: string;
    uploadedAt: string;
    uploadedBy: string;
  }[]>().default(sql`'[]'::jsonb`),

  evaluationCriteriaText: text("evaluation_criteria_text"),

  // Default route after login (key like 'navigation.dashboard' etc)
  defaultRoute: varchar("default_route").default("navigation.dashboard"),

  // Route name / description / title overrides stored on organization
  // dashboard (name only)
  dashboardNameEn: varchar("dashboard_name_en"),
  dashboardNameAr: varchar("dashboard_name_ar"),

  // myIdeas
  myIdeasNameEn: varchar("my_ideas_name_en"),
  myIdeasNameAr: varchar("my_ideas_name_ar"),
  myIdeasDescEn: varchar("my_ideas_desc_en"),
  myIdeasDescAr: varchar("my_ideas_desc_ar"),

  // challenges
  challengesNameEn: varchar("challenges_name_en"),
  challengesNameAr: varchar("challenges_name_ar"),
  challengesDescEn: varchar("challenges_desc_en"),
  challengesDescAr: varchar("challenges_desc_ar"),
  // radar
  radarNameEn: varchar("radar_name_en"),
  radarNameAr: varchar("radar_name_ar"),
  radarDescEn: varchar("radar_desc_en"),
  radarDescAr: varchar("radar_desc_ar"),
  // experts (has special title + name + desc)
  expertsTitleEn: varchar("experts_title_en"),
  expertsTitleAr: varchar("experts_title_ar"),
  expertsNameEn: varchar("experts_name_en"),
  expertsNameAr: varchar("experts_name_ar"),
  expertsDescEn: varchar("experts_desc_en"),
  expertsDescAr: varchar("experts_desc_ar"),
  acceptanceCapacity: integer("acceptance_capacity").default(280).notNull(),
  location: varchar("location", { length: 500 }),
  // Mentor feedback reminder config (hours after session until mentor gets reminder)
  mentorFeedbackReminderHours: integer("mentor_feedback_reminder_hours").default(24),
  // Session reminder config (hours BEFORE session to send reminder to participants)
  sessionReminderHours: integer("session_reminder_hours").default(24),
  // Participant weekly mentorship booking limits (null = unlimited)
  mentorWeeklySessionLimit: integer("mentor_weekly_session_limit"),
  mentorWeeklyHoursLimit: integer("mentor_weekly_hours_limit"),
  // Consultation feature config
  consultationEnabled: boolean("consultation_enabled").default(false),
  consultationMinCredits: integer("consultation_min_credits").default(10),
  consultationMaxEligible: integer("consultation_max_eligible").default(3),
  // Demo Day presenter control
  currentPresentingProjectId: varchar("current_presenting_project_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const roleEnum = pgEnum("role", ["OWNER", "MEMBER", "MENTOR", "ADMIN", "JUDGE", "CLIENT", "CONSULTANT"]);

// Idea Management Enums
export const ideaStatusEnum = pgEnum('idea_status', [
  'BACKLOG',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'IN_INCUBATION',
  'ARCHIVED'
]);

export const reviewStatusEnum = pgEnum('review_status', ['PENDING', 'ACCEPTED', 'REVOKED']);
export const verdictEnum = pgEnum('verdict', ['APPROVE', 'REJECT']);
export const auditLogTypeEnum = pgEnum('audit_log_type', [
  'STATUS_CHANGED',
  'SCORED',
  'REVIEW_INVITE',
  'COMMENT_ADDED',
  'COMMENT_EDITED',
  'COMMENT_DELETED',
  'REVIEWER_ASSIGNED',
  'REVIEWER_REMOVED'
]);

export const organizationMembers = pgTable("organization_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: roleEnum("role").default("MEMBER"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectTypeEnum = pgEnum("project_type", ["RESEARCH", "DEVELOP", "LAUNCH"]);

export const projectStatusEnum = pgEnum("project_status", [
  "BACKLOG",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "IN_INCUBATION",
  "ARCHIVED"
]);

export const publishStatusEnum = pgEnum("publish_status", ["NONE", "FINALIST", "WINNER"]);

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  challengeId: varchar("challenge_id").references(() => challenges.id, { onDelete: "set null" }), // ✅ New field
  title: varchar("title").notNull(),
  description: text("description"),
  type: projectTypeEnum("type").default("RESEARCH"),
  status: projectStatusEnum("status").default("BACKLOG"),
  generatedFiles: jsonb("generated_files"), // Store Launch mode generated files
  deploymentUrl: varchar("deployment_url"), // Store Vercel deployment URL
  pitchDeckUrl: varchar("pitch_deck_url"), // URL of selected/uploaded pitch deck for this project
  submitted: boolean("submitted").default(false), // Track if project has been submitted to challenge
  publishStatus: publishStatusEnum("publish_status").default("NONE"),
  publishedAt: timestamp("published_at"),
  publishedById: varchar("published_by_id").references(() => users.id),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  verscale_chat_id: varchar("verscale_chat_id"),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  title: varchar("title"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system", "tool"]);

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => chats.id),
  role: messageRoleEnum("role").notNull(),
  text: text("text"),
  audioUrl: varchar("audio_url"),
  language: varchar("language").default("en"),
  toolRunId: varchar("tool_run_id"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assetKindEnum = pgEnum("asset_kind", [
  "SWOT",
  "LEAN_CANVAS", 
  "PERSONA",
  "JOURNEY_MAP",
  "MARKETING_PLAN",
  "USER_STORIES",
  "BRAND_WHEEL",
  "BRAND_IDENTITY",
  "INTERVIEW_QUESTIONS",
  "TEAM_ROLES",
  "ICP",
  "OKR",
  "PITCH_OUTLINE",
  "COMPETITOR_MAP",
  "TAM_SAM_SOM",
  "VALUE_PROP",
  "JTBD",
  "EXPERIMENT_PLAN",
  "BRAND_GUIDELINES",
  "LAUNCH_ROADMAP",
  "FINANCIAL_PROJECTIONS",
  "RISK_ASSESSMENT",
  "GTM_STRATEGY",
  "PRODUCT_ROADMAP",
  "TEAM_STRUCTURE",
  "FUNDING_STRATEGY",
  "OPERATIONS_PLAN",
  "TECHNOLOGY_STACK"
]);

export const pitchDeckStatusEnum = pgEnum("pitch_deck_status", [
  "GENERATING",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);

export const pitchDeckLifecycleEnum = pgEnum("pitch_deck_lifecycle", [
  "DRAFT",
  "PENDING_REVIEW",
  "REVIEWED",
  "SUBMITTED",
  "REJECTED",
]);

export const pitchDeckReviewStatusEnum = pgEnum("pitch_deck_review_status", [
  "APPROVED",
  "REJECTED",
  "NEEDS_REVISION",
]);

export const assetLanguageEnum = pgEnum("asset_language", ["en", "ar"]);

export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  kind: assetKindEnum("kind").notNull(),
  title: varchar("title").notNull(),
  data: jsonb("data").notNull(), // normalized schema
  markdown: text("markdown"),
  language: assetLanguageEnum("language").default("en"),
  html: text("html"),
  diagram: jsonb("diagram"), // nodes/edges for journey maps
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assetVersions = pgTable("asset_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),
  label: varchar("label", { length: 255 }).notNull(), // e.g. "Mar 15, 2026 · 2:34 PM"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pitchDeckGenerations = pgTable("pitch_deck_generations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  assetId: varchar("asset_id").references(() => assets.id), // Reference to the pitch outline asset
  taskId: varchar("task_id").notNull(), // SlideSpeak task ID
  status: pitchDeckStatusEnum("status").default("GENERATING"),
  template: varchar("template").default("Modern Business"),
  theme: varchar("theme").default("Professional"),
  colorScheme: varchar("color_scheme").default("Blue"),
  fontFamily: varchar("font_family").default("Inter"),
  downloadUrl: varchar("download_url"),
  errorMessage: text("error_message"),
  // Lifecycle
  lifecycleStatus: pitchDeckLifecycleEnum("lifecycle_status").default("DRAFT"),
  draftNotes: text("draft_notes"),
  lastAutoSavedAt: timestamp("last_auto_saved_at"),
  submittedAt: timestamp("submitted_at"),
  submittedById: varchar("submitted_by_id").references(() => users.id),
  isLocked: boolean("is_locked").default(false),
  lockedAt: timestamp("locked_at"),
  lockedReason: text("locked_reason"),
  lockedById: varchar("locked_by_id").references(() => users.id),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pitchDeckVersions = pgTable("pitch_deck_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pitchDeckId: varchar("pitch_deck_id").notNull().references(() => pitchDeckGenerations.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 255 }).notNull(), // e.g. "Auto-save · Mar 15, 2:34 PM"
  snapshotUrl: varchar("snapshot_url"),                // download URL at time of save
  notes: text("notes"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pitchDeckReviews = pgTable("pitch_deck_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pitchDeckId: varchar("pitch_deck_id").notNull().references(() => pitchDeckGenerations.id, { onDelete: "cascade" }),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  reviewStatus: pitchDeckReviewStatusEnum("review_status").notNull(),
  feedback: text("feedback"),
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Idea Management Tables
export const ideas = pgTable("ideas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
  status: ideaStatusEnum("status").default('BACKLOG').notNull(),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  details: jsonb("details").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiOutputs = pgTable("ai_outputs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ideaId: varchar("idea_id").notNull().references(() => ideas.id, { onDelete: 'cascade' }),
  kind: varchar("kind", { length: 100 }).notNull(), // e.g., 'BusinessModel', 'SWOT'
  content: jsonb("content").$type<Record<string, any>>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id").notNull().references(() => users.id),
  bodyMd: text("body_md").notNull(),
  mentions: jsonb("mentions").$type<string[]>().default(sql`'[]'::jsonb`),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ideaId: varchar("idea_id").notNull().references(() => ideas.id, { onDelete: 'cascade' }),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  status: reviewStatusEnum("status").default('PENDING').notNull(),
  verdict: verdictEnum("verdict"),
  rationale: text("rationale"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const metricsSets = pgTable("metrics_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  payload: jsonb("payload").$type<{metrics: Array<{metric: string, weight: number, description: string}>}>().notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ideaScores = pgTable("idea_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ideaId: varchar("idea_id").notNull().references(() => ideas.id, { onDelete: 'cascade' }),
  metricsId: varchar("metrics_id").notNull().references(() => metricsSets.id),
  breakdown: jsonb("breakdown").$type<Record<string, {score: number, rationale: string}>>().notNull(),
  total: integer("total").notNull(), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ideaId: varchar("idea_id").notNull().references(() => ideas.id, { onDelete: 'cascade' }),
  actorId: varchar("actor_id").references(() => users.id),
  type: auditLogTypeEnum("type").notNull(),
  data: jsonb("data").$type<Record<string, any>>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  kind: varchar("kind", { length: 50 }).notNull(), // MENTION, REVIEW_ASSIGNED, STATUS_CHANGED, SCORED
  payload: jsonb("payload").$type<Record<string, any>>().notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Challenge Management
export const challengeStatusEnum = pgEnum('challenge_status', ['draft', 'active', 'upcoming', 'ended']);

export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  shortDescription: varchar("short_description", { length: 500 }),
  slug: varchar("slug", { length: 100 }).notNull(),
  deadline: timestamp("deadline").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  submissionCount: integer("submission_count").default(0),
  maxSubmissions: integer("max_submissions").default(100),
  image: varchar("image"),
  emoji: varchar("emoji", { length: 10 }).default("🎯"),
  status: challengeStatusEnum("status").default("draft"),
  prize: varchar("prize"),
  evaluationCriteria: text("evaluation_criteria"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_challenges_org_id").on(table.orgId),
  index("idx_challenges_status").on(table.status),
  index("idx_challenges_slug").on(table.slug),
  index("idx_challenges_sort_order").on(table.sortOrder),
]);

export const challengeSubmissions = pgTable("challenge_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  ideaId: varchar("idea_id").references(() => ideas.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  submissionUrl: varchar("submission_url"),
  pitchDeckUrl: varchar("pitch_deck_url"),
  prototypeUrl: varchar("prototype_url"),
  attachments: jsonb("attachments").$type<any[]>().default([]),
  status: varchar("status", { length: 50 }).default("submitted"),
  score: integer("score"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_challenge_submissions_challenge_id").on(table.challengeId),
  index("idx_challenge_submissions_user_id").on(table.userId),
]);

// Events (platform-wide, no orgId)
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  shortDescription: text("short_description"),
  description: text("description"),
  location: varchar("location", { length: 500 }),
  websiteUrl: varchar("website_url", { length: 1000 }),
  imageUrl: varchar("image_url", { length: 1000 }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  organizationMembers: many(organizationMembers),
  createdProjects: many(projects),
  createdChats: many(chats),
  createdAssets: many(assets),
  ownedIdeas: many(ideas),
  comments: many(comments),
  reviews: many(reviews),
  notifications: many(notifications),
  createdChallenges: many(challenges),
  challengeSubmissions: many(challengeSubmissions),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  projects: many(projects),
  ideas: many(ideas),
  metricsSets: many(metricsSets),
  challenges: many(challenges),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [organizationMembers.orgId],
    references: [organizations.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.orgId],
    references: [organizations.id],
  }),
  challenge: one(challenges, { // ✅ New relation
    fields: [projects.challengeId],
    references: [challenges.id],
  }),
  createdBy: one(users, {
    fields: [projects.createdById],
    references: [users.id],
  }),
  chats: many(chats),
  assets: many(assets),
  pitchDeckGenerations: many(pitchDeckGenerations),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  project: one(projects, {
    fields: [chats.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [chats.createdById],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  project: one(projects, {
    fields: [assets.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [assets.createdById],
    references: [users.id],
  }),
  pitchDeckGenerations: many(pitchDeckGenerations),
}));

export const pitchDeckGenerationsRelations = relations(pitchDeckGenerations, ({ one }) => ({
  project: one(projects, {
    fields: [pitchDeckGenerations.projectId],
    references: [projects.id],
  }),
  asset: one(assets, {
    fields: [pitchDeckGenerations.assetId],
    references: [assets.id],
  }),
  createdBy: one(users, {
    fields: [pitchDeckGenerations.createdById],
    references: [users.id],
  }),
}));

// Idea Management Relations
export const ideasRelations = relations(ideas, ({ one, many }) => ({
  owner: one(users, {
    fields: [ideas.ownerId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [ideas.orgId],
    references: [organizations.id],
  }),
  aiOutputs: many(aiOutputs),
  comments: many(comments),
  reviews: many(reviews),
  scores: many(ideaScores),
  auditLogs: many(auditLogs),
}));

export const aiOutputsRelations = relations(aiOutputs, ({ one }) => ({
  idea: one(ideas, {
    fields: [aiOutputs.ideaId],
    references: [ideas.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  project: one(projects, {
    fields: [comments.projectId],
    references: [projects.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  idea: one(ideas, {
    fields: [reviews.ideaId],
    references: [ideas.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
  }),
}));

export const metricsSetsRelations = relations(metricsSets, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [metricsSets.orgId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [metricsSets.createdBy],
    references: [users.id],
  }),
  scores: many(ideaScores),
}));

export const ideaScoresRelations = relations(ideaScores, ({ one }) => ({
  idea: one(ideas, {
    fields: [ideaScores.ideaId],
    references: [ideas.id],
  }),
  metricsSet: one(metricsSets, {
    fields: [ideaScores.metricsId],
    references: [metricsSets.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  idea: one(ideas, {
    fields: [auditLogs.ideaId],
    references: [ideas.id],
  }),
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const projectEvaluationsRelations = relations(projectEvaluations, ({ one }) => ({
  project: one(projects, {
    fields: [projectEvaluations.projectId],
    references: [projects.id]
  }),
  organization: one(organizations, {
    fields: [projectEvaluations.orgId],
    references: [organizations.id]
  }),
  evaluator: one(users, {
    fields: [projectEvaluations.evaluatedBy],
    references: [users.id]
  })
}));

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [challenges.orgId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [challenges.createdBy],
    references: [users.id],
  }),
  submissions: many(challengeSubmissions),
  projects: many(projects), // ✅ New relation
}));

export const challengeSubmissionsRelations = relations(challengeSubmissions, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeSubmissions.challengeId],
    references: [challenges.id],
  }),
  user: one(users, {
    fields: [challengeSubmissions.userId],
    references: [users.id],
  }),
  idea: one(ideas, {
    fields: [challengeSubmissions.ideaId],
    references: [ideas.id],
  }),
}));

export const bookingStatusEnum = pgEnum("booking_status", ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]);

export const mentorProfiles = pgTable("mentor_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  title: varchar("title", { length: 200 }),
  bio: text("bio"),
  location: varchar("location", { length: 200 }),
  website: varchar("website", { length: 500 }),
  calendlyLink: varchar("calendly_link", { length: 500 }),
  calendlyEventTypeUri: varchar("calendly_event_type_uri", { length: 500 }),
  // Calendly OAuth — per-mentor tokens
  calendlyAccessToken: text("calendly_access_token"),
  calendlyRefreshToken: text("calendly_refresh_token"),
  calendlyTokenExpiry: timestamp("calendly_token_expiry"),
  calendlyUserUri: varchar("calendly_user_uri", { length: 500 }),
  expertise: jsonb("expertise").$type<string[]>().default(sql`'[]'::jsonb`),
  industries: jsonb("industries").$type<string[]>().default(sql`'[]'::jsonb`),
  sessionDurationMinutes: integer("session_duration_minutes").default(60),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mentorAvailability = pgTable("mentor_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mentorProfileId: varchar("mentor_profile_id").notNull().references(() => mentorProfiles.id, { onDelete: 'cascade' }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mentorBookings = pgTable("mentor_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mentorProfileId: varchar("mentor_profile_id").notNull().references(() => mentorProfiles.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  ideaId: varchar("idea_id").references(() => projects.id),
  pitchDeckId: varchar("pitch_deck_id").references(() => pitchDeckGenerations.id),
  bookedDate: varchar("booked_date", { length: 10 }).notNull(),
  bookedTime: varchar("booked_time", { length: 5 }).notNull(),
  durationMinutes: integer("duration_minutes").default(60),
  meetingProvider: varchar("meeting_provider", { length: 40 }).default("INTERNAL"),
  meetingLink: varchar("meeting_link", { length: 1000 }),
  calendlyEventUri: varchar("calendly_event_uri", { length: 500 }),
  calendlyInviteeUri: varchar("calendly_invitee_uri", { length: 500 }),
  status: bookingStatusEnum("status").default("PENDING"),
  notes: text("notes"),
  mentorFeedback: text("mentor_feedback"),
  mentorFeedbackUpdatedAt: timestamp("mentor_feedback_updated_at"),
  rating: integer("rating"),
  feedback: text("feedback"),
  // Member post-session survey (dynamic responses keyed by question id)
  surveyResponses: jsonb("survey_responses").$type<Record<string, string | number | boolean>>(),
  surveyCompletedAt: timestamp("survey_completed_at"),
  // Legacy hardcoded survey fields (kept for backwards compat with existing data)
  sessionGoalMet: boolean("session_goal_met"),
  wouldRecommend: boolean("would_recommend"),
  // Mentor post-session survey
  participantEngagement: integer("participant_engagement"),
  areasCoached: jsonb("areas_coached").$type<string[]>(),
  mentorSurveyCompletedAt: timestamp("mentor_survey_completed_at"),
  // Participant-uploaded PPTX supporting material
  pptxFileUrl: varchar("pptx_file_url", { length: 2000 }),
  pptxFileName: varchar("pptx_file_name", { length: 500 }),
  feedbackReminderSentAt: timestamp("feedback_reminder_sent_at"),
  adminAlertSentAt: timestamp("admin_alert_sent_at"),
  sessionReminderSentAt: timestamp("session_reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Post-session survey questions configured per workspace by PMO
export const mentorSurveyQuestions = pgTable("mentor_survey_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  // rating = 1-5 stars, boolean = Yes/No, text = open text, scale = 1-5 number
  questionType: varchar("question_type", { length: 20 }).notNull().default("text"),
  isRequired: boolean("is_required").default(false).notNull(),
  orderIndex: integer("order_index").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Academy course progress tracking
export const courseProgress = pgTable(
  "course_progress",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseSlug: varchar("course_slug", { length: 100 }).notNull(),
    videoSlug: varchar("video_slug", { length: 100 }).notNull(),
    watchedSeconds: integer("watched_seconds").default(0).notNull(),
    completed: boolean("completed").default(false).notNull(),
    lastWatchedAt: timestamp("last_watched_at").defaultNow(),
  },
  (t) => ({
    userVideoIdx: uniqueIndex("idx_course_progress_user_video").on(t.userId, t.courseSlug, t.videoSlug),
  })
);

export const memberApplications = pgTable("member_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  challengeId: varchar("challenge_id").references(() => challenges.id),
  // Step 2
  ideaName: varchar("idea_name", { length: 255 }),
  sector: varchar("sector", { length: 100 }),
  problemStatement: text("problem_statement"),
  // Step 3
  solutionDescription: text("solution_description"),
  differentiator: text("differentiator"),
  targetUser: text("target_user"),
  // Bonus (optional)
  relevantSkills: text("relevant_skills"),
  previousWinner: varchar("previous_winner", { length: 10 }),
  hasValidation: varchar("has_validation", { length: 10 }),
  validationDetails: text("validation_details"),
  // Extra demographic/profile data from CSV import
  metadata: jsonb("metadata"),
  // Screening result
  status: varchar("status", { length: 30 }).default("PENDING_REVIEW").notNull(),
  aiScore: integer("ai_score"),
  aiMetrics: jsonb("ai_metrics"),
  aiStrengths: jsonb("ai_strengths"),
  aiRecommendations: jsonb("ai_recommendations"),
  aiInsights: text("ai_insights"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  acceptanceEmailSentAt: timestamp("acceptance_email_sent_at"),
  rejectionEmailSentAt: timestamp("rejection_email_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Workspace Program Progress ───────────────────────────────────────────────
// Stores the 4-step program timeline per workspace, editable by ADMIN/OWNER/SuperAdmin
export interface ProgramStep {
  titleEn: string;
  titleAr: string;
}

export const workspaceProgramProgress = pgTable("workspace_program_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().unique().references(() => organizations.id, { onDelete: "cascade" }),
  currentStep: integer("current_step").notNull().default(1), // 1-based index
  steps: jsonb("steps").$type<ProgramStep[]>().notNull().default(sql`'[
    {"titleEn":"Ideation & Business Foundations","titleAr":"الريادة وأسس الأعمال"},
    {"titleEn":"Product Strategy & Validation","titleAr":"استراتيجية المنتج والتحقق"},
    {"titleEn":"Product Design & Insights","titleAr":"تصميم المنتج والرؤى"},
    {"titleEn":"Pitching & Presentation","titleAr":"العرض التقديمي"}
  ]'::jsonb`),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export type WorkspaceProgramProgress = typeof workspaceProgramProgress.$inferSelect;

// ── Mentor ↔ Member assignments (PMO assigns members to mentors) ─────────────
export const mentorAssignments = pgTable("mentor_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  mentorUserId: varchar("mentor_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  memberUserId: varchar("member_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniqAssignment: uniqueIndex("mentor_assignments_unique").on(t.orgId, t.mentorUserId, t.memberUserId),
}));

export type MentorAssignment = typeof mentorAssignments.$inferSelect;

// ── Platform Activity Events ─────────────────────────────────────────────────
export const platformEventTypeEnum = pgEnum('platform_event_type', [
  'ROLE_UPDATED',
  'MEMBER_ADDED',
  'MEMBER_REMOVED',
  'PROGRAM_PROGRESS_UPDATED',
  'IDEA_STATUS_CHANGED',
  'CHALLENGE_STATUS_CHANGED',
  'APPLICATION_STATUS_CHANGED',
  'CONSULTATION_BOOKED',
  'CONSULTATION_CONFIRMED',
  'CONSULTATION_CANCELLED',
]);

export const platformEvents = pgTable("platform_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  actorId: varchar("actor_id").references(() => users.id, { onDelete: 'set null' }),
  eventType: platformEventTypeEnum("event_type").notNull(),
  targetUserId: varchar("target_user_id").references(() => users.id, { onDelete: 'set null' }),
  targetEntityId: varchar("target_entity_id"),
  targetEntityLabel: varchar("target_entity_label"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PlatformEvent = typeof platformEvents.$inferSelect;

// ── PMO Idea Evaluations ─────────────────────────────────────────────────────
export const ideaEvaluations = pgTable("idea_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  evaluatedBy: varchar("evaluated_by").notNull().references(() => users.id),
  // Business Maturity (40%): b1=10%, b2=8%, b3=8%, b4=8%, b5=6%
  b1: integer("b1"), b2: integer("b2"), b3: integer("b3"), b4: integer("b4"), b5: integer("b5"),
  // Technical Maturity (30%): t1=10%, t2=8%, t3=6%, t4=6%
  t1: integer("t1"), t2: integer("t2"), t3: integer("t3"), t4: integer("t4"),
  // Strategic Alignment (30%): s1=12%, s2=10%, s3=8%
  s1: integer("s1"), s2: integer("s2"), s3: integer("s3"),
  totalScore: integer("total_score"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniqueProject: uniqueIndex("idx_idea_eval_project").on(t.projectId),
}));

export type IdeaEvaluation = typeof ideaEvaluations.$inferSelect;

export const judgeEvaluations = pgTable("judge_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  judgeId: varchar("judge_id").notNull().references(() => users.id),
  // Demo Deck Slides (40%): d1–d5 = 8% each
  d1: integer("d1"), d2: integer("d2"), d3: integer("d3"), d4: integer("d4"), d5: integer("d5"),
  // Pitching Quality (30%): p1–p3 = 8%, p4 = 6%
  p1: integer("p1"), p2: integer("p2"), p3: integer("p3"), p4: integer("p4"),
  // Project Evaluation (30%): e1–e3 = 10% each
  e1: integer("e1"), e2: integer("e2"), e3: integer("e3"),
  totalScore: integer("total_score"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniqueJudgeProject: uniqueIndex("idx_judge_eval_judge_project").on(t.judgeId, t.projectId),
}));

export type JudgeEvaluation = typeof judgeEvaluations.$inferSelect;

// ── Scoring Criteria Config (super-admin editable) ────────────────────────────
export interface ScoringQuestion {
  id: string;
  label: string;
  weight: number;
}
export interface ScoringCategory {
  id: string;
  name: string;
  weight: number;
  color: string;
  questions: ScoringQuestion[];
}
export interface ScoringConfig {
  categories: ScoringCategory[];
}

export const scoringCriteriaConfig = pgTable("scoring_criteria_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 20 }).notNull().unique(), // 'pmo' | 'judge'
  config: jsonb("config").$type<ScoringConfig>().notNull(),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ScoringCriteriaConfig = typeof scoringCriteriaConfig.$inferSelect;

// Event speakers
export const eventSpeakers = pgTable("event_speakers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  role: varchar("role", { length: 200 }),
  company: varchar("company", { length: 200 }),
  bio: text("bio"),
  imageUrl: varchar("image_url", { length: 1000 }),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type EventSpeaker = typeof eventSpeakers.$inferSelect;

// Attendance tracking
export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  bookingId: varchar("booking_id").references(() => mentorBookings.id, { onDelete: "set null" }),
  sessionType: varchar("session_type", { length: 50 }).default("MENTOR_SESSION"),
  scheduledDate: varchar("scheduled_date", { length: 10 }).notNull(),
  scheduledTime: varchar("scheduled_time", { length: 5 }),
  checkedInAt: timestamp("checked_in_at"),
  checkedOutAt: timestamp("checked_out_at"),
  status: varchar("status", { length: 20 }).default("SCHEDULED"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;

// Academy courses
export const academyCourses = pgTable("academy_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  thumbnailUrl: varchar("thumbnail_url", { length: 1000 }),
  isPublished: boolean("is_published").default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const academyVideos = pgTable("academy_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => academyCourses.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 100 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  videoUrl: varchar("video_url", { length: 1000 }).notNull(),
  durationSeconds: integer("duration_seconds").default(0),
  displayOrder: integer("display_order").default(0),
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AcademyCourse = typeof academyCourses.$inferSelect;
export type AcademyVideo = typeof academyVideos.$inferSelect;

export const insertMentorProfileSchema = createInsertSchema(mentorProfiles);
export const insertMentorBookingSchema = createInsertSchema(mentorBookings);
export const insertCourseProgressSchema = createInsertSchema(courseProgress).omit({ id: true, lastWatchedAt: true });

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPitchDeckGenerationSchema = createInsertSchema(pitchDeckGenerations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIdeaSchema = createInsertSchema(ideas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMetricsSetSchema = createInsertSchema(metricsSets).omit({
  id: true,
  createdAt: true,
});

export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChallengeSubmissionSchema = createInsertSchema(challengeSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ── PMO Program Roadmap ───────────────────────────────────────────────────────
// Unlock rules JSONB shape
export interface UnlockCondition {
  type: "requires_module" | "requires_score_gte" | "always_open";
  moduleId?: string;   // for requires_module
  scoreGte?: number;   // 0-100, for requires_score_gte
}

export interface ModuleUnlockRules {
  mode: "all" | "any";
  conditions: UnlockCondition[];
}

export const programModules = pgTable("program_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  stageIndex: integer("stage_index").notNull().default(1),  // which program step (1-4)
  order: integer("order").notNull().default(0),             // position within the stage
  status: text("status").notNull().default("draft"),        // draft | published | archived
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  location: text("location"),
  locationType: text("location_type").notNull().default("online"), // online | in_person | hybrid
  meetingLink: text("meeting_link"),
  unlockRules: jsonb("unlock_rules").$type<ModuleUnlockRules>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ProgramModule = typeof programModules.$inferSelect;

export const moduleResources = pgTable("module_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id").notNull().references(() => programModules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull().default("link"), // pdf | video | link | doc | slides
  url: text("url").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  hasAssignment: boolean("has_assignment").notNull().default(false),
  assignmentDescription: text("assignment_description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ModuleResource = typeof moduleResources.$inferSelect;

export const moduleMentors = pgTable("module_mentors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id").notNull().references(() => programModules.id, { onDelete: "cascade" }),
  mentorProfileId: varchar("mentor_profile_id").notNull().references(() => mentorProfiles.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("support"), // lead | support
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  uniqueIndex("module_mentors_unique").on(t.moduleId, t.mentorProfileId),
]);

export type ModuleMentor = typeof moduleMentors.$inferSelect;

export const moduleConsultations = pgTable("module_consultations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id").notNull().references(() => programModules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  mentorProfileId: varchar("mentor_profile_id").references(() => mentorProfiles.id, { onDelete: "set null" }),
  maxAttendees: integer("max_attendees"),
  location: text("location"),
  meetingLink: text("meeting_link"),
  notes: text("notes"),
  status: text("status").notNull().default("scheduled"), // scheduled | completed | cancelled
  sessionReminderSentAt: timestamp("session_reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ModuleConsultation = typeof moduleConsultations.$inferSelect;

export const moduleResourceSubmissions = pgTable("module_resource_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resourceId: varchar("resource_id").notNull().references(() => moduleResources.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  submissionUrl: text("submission_url").notNull(),
  fileName: text("file_name"),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (t) => [
  uniqueIndex("mrs_unique").on(t.resourceId, t.userId),
]);

export type ModuleResourceSubmission = typeof moduleResourceSubmissions.$inferSelect;

// ─── Consultation Feature ──────────────────────────────────────────────────

export const consultationSessionStatusEnum = pgEnum("consultation_session_status", [
  "ACTIVE", "CANCELLED", "COMPLETED",
]);

export const consultationBookingStatusEnum = pgEnum("consultation_booking_status", [
  "PENDING", "CONFIRMED", "CANCELLED",
]);

// Consultant profile (distinct from mentor) — one per user per org
export const consultantProfiles = pgTable("consultant_profiles", {
  id:           varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId:       varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId:        varchar("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  bio:          text("bio"),
  expertise:    varchar("expertise"),
  linkedinUrl:  varchar("linkedin_url"),
  active:       boolean("active").default(true),
  createdAt:    timestamp("created_at").defaultNow(),
  updatedAt:    timestamp("updated_at").defaultNow(),
});

// Credit audit log — PMO awards credits manually to participants
export const consultationCredits = pgTable("consultation_credits", {
  id:          varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId:       varchar("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  challengeId: varchar("challenge_id").references(() => challenges.id, { onDelete: "set null" }),
  userId:      varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),   // participant
  credits:     integer("credits").notNull(),
  awardedById: varchar("awarded_by_id").notNull().references(() => users.id),
  reason:      text("reason"),
  createdAt:   timestamp("created_at").defaultNow(),
});

// Consultation sessions created by PMO — one session can serve up to `capacity` participants
export const consultationSessions = pgTable("consultation_sessions", {
  id:                  varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId:               varchar("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  challengeId:         varchar("challenge_id").references(() => challenges.id, { onDelete: "set null" }),
  consultantUserId:    varchar("consultant_user_id").references(() => users.id, { onDelete: "set null" }),
  title:               varchar("title").notNull(),
  externalMeetingLink: varchar("external_meeting_link"),
  scheduledAt:         timestamp("scheduled_at"),
  capacity:            integer("capacity").notNull().default(3),
  filledSlots:         integer("filled_slots").notNull().default(0),
  status:              consultationSessionStatusEnum("status").default("ACTIVE"),
  notes:               text("notes"),
  createdAt:           timestamp("created_at").defaultNow(),
  updatedAt:           timestamp("updated_at").defaultNow(),
});

// Booking — one participant books one session
export const consultationBookings = pgTable("consultation_bookings", {
  id:                  varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId:           varchar("session_id").notNull().references(() => consultationSessions.id, { onDelete: "cascade" }),
  userId:              varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId:               varchar("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  status:              consultationBookingStatusEnum("status").default("PENDING"),
  calendarInviteSent:  boolean("calendar_invite_sent").default(false),
  sessionReminderSentAt: timestamp("session_reminder_sent_at"),
  bookedAt:            timestamp("booked_at").defaultNow(),
  cancelledAt:         timestamp("cancelled_at"),
});

// ── Support Ticket System ─────────────────────────────────────────────────────
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id", { length: 12 }).primaryKey(),
  orgId: varchar("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 50 }).notNull(),
  priority: varchar("priority", { length: 20 }).notNull().default("LOW"),
  subject: varchar("subject", { length: 300 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("OPEN"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const supportMessages = pgTable("support_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderRole: varchar("sender_role", { length: 20 }).notNull().default("MEMBER"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Legal Declarations ────────────────────────────────────────────────────────

export const declarationTypeEnum = pgEnum("declaration_type", [
  "MENTOR_NDA", "PARTICIPANT_CONSENT", "JUDGE_COI", "PMO_COI"
]);

export const declarationStatusEnum = pgEnum("declaration_status", [
  "DRAFT", "ACTIVE", "INACTIVE"
]);

export const legalDeclarations = pgTable("legal_declarations", {
  id:            varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId:         varchar("org_id").references(() => organizations.id, { onDelete: "cascade" }), // null = global
  type:          declarationTypeEnum("type").notNull(),
  title:         varchar("title", { length: 500 }).notNull(),
  content:       text("content").notNull(),
  version:       varchar("version", { length: 50 }).notNull(),
  status:        declarationStatusEnum("status").default("DRAFT").notNull(),
  effectiveDate: timestamp("effective_date"),
  expiryDate:    timestamp("expiry_date"),
  createdBy:     varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy:     varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:     timestamp("created_at").defaultNow(),
  updatedAt:     timestamp("updated_at").defaultNow(),
});

export const declarationAcceptances = pgTable("declaration_acceptances", {
  id:            varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  declarationId: varchar("declaration_id").notNull().references(() => legalDeclarations.id, { onDelete: "cascade" }),
  userId:        varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId:         varchar("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  acceptedAt:    timestamp("accepted_at").defaultNow(),
  metadata:      jsonb("metadata").$type<{ projectId?: string; ipAddress?: string; userAgent?: string }>(),
});

export type LegalDeclaration = typeof legalDeclarations.$inferSelect;
export type DeclarationAcceptance = typeof declarationAcceptances.$inferSelect;

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type PitchDeckGeneration = typeof pitchDeckGenerations.$inferSelect;
export type Idea = typeof ideas.$inferSelect;
export type AiOutput = typeof aiOutputs.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type MetricsSet = typeof metricsSets.$inferSelect;
export type IdeaScore = typeof ideaScores.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type CourseProgress = typeof courseProgress.$inferSelect;
export type ConsultantProfile = typeof consultantProfiles.$inferSelect;
export type ConsultationCredit = typeof consultationCredits.$inferSelect;
export type ConsultationSession = typeof consultationSessions.$inferSelect;
export type ConsultationBooking = typeof consultationBookings.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type SupportMessage = typeof supportMessages.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type InsertPitchDeckGeneration = z.infer<typeof insertPitchDeckGenerationSchema>;
export type InsertIdea = z.infer<typeof insertIdeaSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertMetricsSet = z.infer<typeof insertMetricsSetSchema>;
