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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const roleEnum = pgEnum("role", ["OWNER", "MEMBER", "MENTOR", "ADMIN"]);

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
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  status: bookingStatusEnum("status").default("PENDING"),
  notes: text("notes"),
  rating: integer("rating"),
  feedback: text("feedback"),
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
  // Screening result
  status: varchar("status", { length: 30 }).default("PENDING_REVIEW").notNull(),
  aiScore: integer("ai_score"),
  aiMetrics: jsonb("ai_metrics"),
  aiStrengths: jsonb("ai_strengths"),
  aiRecommendations: jsonb("ai_recommendations"),
  aiInsights: text("ai_insights"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
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
