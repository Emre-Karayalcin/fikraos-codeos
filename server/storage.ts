import {
  users,
  organizations,
  organizationMembers,
  projects,
  chats,
  messages,
  assets,
  assetVersions,
  pitchDeckGenerations,
  passwordResetTokens,
  comments,
  ideas,
  courseProgress,
  workspaceProgramProgress,
  mentorAssignments,
  type CourseProgress,
  type WorkspaceProgramProgress,
  type ProgramStep,
  type MentorAssignment,
  type User,
  type UpsertUser,
  type InsertUser,
  type Organization,
  type Project,
  type Chat,
  type Message,
  type Asset,
  type PitchDeckGeneration,
  type InsertOrganization,
  type InsertProject,
  type InsertChat,
  type InsertMessage,
  type InsertAsset,
  type InsertPitchDeckGeneration,
  type Idea,
  projectEvaluations,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByEmailOrganization(email: string, orgId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User>;
  getUserData(userId: string): Promise<{
    projects: Project[];
    chats: Chat[];
    messages: Message[];
    assets: Asset[];
  }>;
  deleteUser(id: string): Promise<void>;
  createPasswordResetToken(token: string, userId: string, orgId: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string, userId: string, orgId: string): Promise<any | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  
  // Organization operations
  getUserOrganizations(userId: string): Promise<Organization[]>;
  createOrganization(org: InsertOrganization, ownerId: string): Promise<Organization>;
  updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization>;
  getUserRole(userId: string, orgId: string): Promise<string | undefined>;
  getOrganizationMembers(orgId: string): Promise<Array<{ user: User; role: string; joinedAt: Date }>>;
  hasOrganizationMember(orgId: string, userId: string): Promise<boolean>;
  addOrganizationMember(orgId: string, userId: string, role: string): Promise<void>;
  updateMemberRole(orgId: string, userId: string, role: string): Promise<void>;
  removeMemberFromOrganization(orgId: string, userId: string): Promise<void>;
  getOrganizationStats(orgId: string): Promise<{
    totalIdeas: number;
    totalChats: number;
    totalAssets: number;
    totalMembers: number;
    totalMentors: number;
    totalPitchDecks: number;
    ideaStatusBreakdown: {
      BACKLOG: number;
      UNDER_REVIEW: number;
      SHORTLISTED: number;
      IN_INCUBATION: number;
      ARCHIVED: number;
    };
  }>;
  
  // Course progress operations
  getCourseProgress(userId: string, courseSlug: string): Promise<CourseProgress[]>;
  upsertVideoProgress(userId: string, courseSlug: string, videoSlug: string, watchedSeconds: number, completed: boolean): Promise<CourseProgress>;

  // Program progress operations
  getProgramProgress(orgId: string): Promise<WorkspaceProgramProgress | undefined>;
  upsertProgramProgress(orgId: string, currentStep: number, steps: ProgramStep[], updatedBy: string): Promise<WorkspaceProgramProgress>;

  // Mentor assignment operations
  getMentorAssignments(orgId: string): Promise<MentorAssignment[]>;
  getMentorAssignmentsWithDetails(orgId: string): Promise<any[]>;
  assignMemberToMentor(orgId: string, mentorUserId: string, memberUserId: string): Promise<MentorAssignment>;
  removeMentorAssignment(id: string, orgId: string): Promise<void>;
  getMentorParticipantIds(mentorUserId: string, orgId: string): Promise<string[]>;

  // Project operations
  getProjectsByOrg(orgId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  // Chat operations
  getChatsByProject(projectId: string): Promise<Chat[]>;
  getChat(id: string): Promise<Chat | undefined>;
  createChat(chat: InsertChat): Promise<Chat>;
  
  // Message operations
  getMessagesByChat(chatId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, data: Partial<InsertMessage>): Promise<Message>;
  
  // Asset operations
  getAssetsByProject(projectId: string): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: string, data: Partial<InsertAsset>): Promise<Asset>;
  // Asset version operations
  getAssetVersions(assetId: string): Promise<{ id: string; label: string; createdAt: Date; data: any }[]>;
  getAssetVersion(versionId: string): Promise<{ id: string; assetId: string; label: string; createdAt: Date; data: any } | undefined>;
  createAssetVersion(assetId: string, data: any, label: string): Promise<void>;
  
  // Pitch deck generation operations
  getPitchDeckGenerationsByProject(projectId: string): Promise<PitchDeckGeneration[]>;
  getPitchDeckGeneration(id: string): Promise<PitchDeckGeneration | undefined>;
  getPitchDeckGenerationById(id: string): Promise<PitchDeckGeneration | undefined>;
  getPitchDeckGenerationsByUser(userId: string): Promise<(PitchDeckGeneration & { projectTitle?: string })[]>;
  getPitchDeckGenerationByTaskId(taskId: string): Promise<PitchDeckGeneration | undefined>;
  createPitchDeckGeneration(generation: InsertPitchDeckGeneration): Promise<PitchDeckGeneration>;
  updatePitchDeckGeneration(id: string, data: Partial<InsertPitchDeckGeneration>): Promise<PitchDeckGeneration>;
  deletePitchDeckGeneration(id: string): Promise<void>;

  // SECURITY FIX (P0): Idea operations
  getIdea(id: string): Promise<Idea | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createPasswordResetToken(token: string, userId: string, orgId: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({
      token,
      userId,
      orgId,
      expiresAt,
      used: false
    }).returning();
  }


  async createProjectEvaluation(data: {
    projectId: string;
    orgId: string;
    overallScore: number;
    metrics: any[];
    strengths: string[];
    recommendations: string[];
    insights: string;
    evaluatedBy: string;
    criteriaSnapshot?: any;
  }) {
    const [evaluation] = await db
      .insert(projectEvaluations)
      .values({
        ...data,
        evaluatedAt: new Date()
      })
      .returning();
    return evaluation;
  }

  async getLatestProjectEvaluation(projectId: string) {
    const [evaluation] = await db
      .select()
      .from(projectEvaluations)
      .where(eq(projectEvaluations.projectId, projectId))
      .orderBy(desc(projectEvaluations.evaluatedAt))
      .limit(1);
    return evaluation;
  }

  async getProjectEvaluations(projectId: string) {
    return db
      .select()
      .from(projectEvaluations)
      .where(eq(projectEvaluations.projectId, projectId))
      .orderBy(desc(projectEvaluations.evaluatedAt));
  }

  async deleteProjectEvaluation(evaluationId: string) {
    await db
      .delete(projectEvaluations)
      .where(eq(projectEvaluations.id, evaluationId));
  }

  async getPasswordResetToken(token: string, userId: string, orgId: string): Promise<any | undefined> {
    const rows = await db.select().from(passwordResetTokens).where(and(
      eq(passwordResetTokens.token, token),
      eq(passwordResetTokens.userId, userId),
      eq(passwordResetTokens.orgId, orgId),
      eq(passwordResetTokens.used, false)
    )).limit(1);
    return rows[0];
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens).set({
      used: true,
      usedAt: new Date()
    }).where(eq(passwordResetTokens.token, token)).returning();
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByEmailOrganization(email: string, orgId: string): Promise<User | undefined> {
    const usersWithEmail = await db.select().from(users).where(eq(users.email, email));
    if (!usersWithEmail || usersWithEmail.length === 0) return undefined;

    for (const u of usersWithEmail) {
      try {
        if (await this.hasOrganizationMember(orgId, u.id)) {
          return u;
        }
      } catch (e) {
        console.warn('Error checking org membership for user', u.id, e);
      }
    }
  
    return undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<Omit<User, 'password'>> {
    const [updatedUser] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();

    // SECURITY FIX: Remove password before returning to client
    const { password, ...safeUser } = updatedUser;
    return safeUser;
  }

  async getUserData(userId: string): Promise<{
    projects: Project[];
    chats: Chat[];
    messages: Message[];
    assets: Asset[];
  }> {
    // Get user's projects
    const userProjects = await db.select()
      .from(projects)
      .where(eq(projects.createdById, userId));

    const projectIds = userProjects.map(p => p.id);

    // Get user's chats (from their projects)
    let userChats: Chat[] = [];
    if (projectIds.length > 0) {
      for (const projectId of projectIds) {
        const projectChats = await db.select()
          .from(chats)
          .where(eq(chats.projectId, projectId));
        userChats = userChats.concat(projectChats);
      }
    }

    const chatIds = userChats.map(c => c.id);

    // Get user's messages (from their chats)
    let userMessages: Message[] = [];
    if (chatIds.length > 0) {
      for (const chatId of chatIds) {
        const chatMessages = await db.select()
          .from(messages)
          .where(eq(messages.chatId, chatId));
        userMessages = userMessages.concat(chatMessages);
      }
    }

    // Get user's assets (from their projects)
    let userAssets: Asset[] = [];
    if (projectIds.length > 0) {
      for (const projectId of projectIds) {
        const projectAssets = await db.select()
          .from(assets)
          .where(eq(assets.projectId, projectId));
        userAssets = userAssets.concat(projectAssets);
      }
    }

    return {
      projects: userProjects,
      chats: userChats,
      messages: userMessages,
      assets: userAssets
    };
  }

  async deleteUser(id: string): Promise<void> {
    // First get all user's projects
    const userProjects = await db.select()
      .from(projects)
      .where(eq(projects.createdById, id));

    // Delete all related data for each project
    for (const project of userProjects) {
      await this.deleteProject(project.id);
    }

    // Delete organization memberships
    await db.delete(organizationMembers).where(eq(organizationMembers.userId, id));

    // Finally delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  // Organization operations
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const result = await db
      .select({ organization: organizations })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.orgId, organizations.id))
      .where(eq(organizationMembers.userId, userId));
    
    return result.map(row => row.organization);
  }

  // Organization operations
  async getOrganization(orgId: string): Promise<Organization | undefined> {
    const rows = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    return rows[0];
  }

  async createOrganization(org: InsertOrganization, ownerId: string): Promise<Organization> {
    const [organization] = await db.insert(organizations).values(org).returning();
    
    // Add owner as member
    await db.insert(organizationMembers).values({
      orgId: organization.id,
      userId: ownerId,
      role: "OWNER",
    });
    
    return organization;
  }

  async updateOrganization(orgId: string, data: Partial<Organization>) {
    const [updated] = await db
      .update(organizations)
      .set({ 
        ...data, 
        updatedAt: new Date() 
      })
      .where(eq(organizations.id, orgId))
      .returning();
    return updated;
  }

  async getUserRole(userId: string, orgId: string): Promise<string | undefined> {
    const [member] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.orgId, orgId)
      ));
    return member?.role || undefined;
  }

  async hasOrganizationMember(orgId: string, userId: string): Promise<boolean> {
    const rows = await db
      .select()
      .from(organizationMembers)
      .where(and(
        eq(organizationMembers.orgId, orgId),
        eq(organizationMembers.userId, userId)
      ))
      .limit(1);
    console.log(`Check if user ${userId} is member of org ${orgId}:`, rows.length > 0);
    return rows.length > 0;
  }

  async getOrganizationMembers(orgId: string): Promise<Array<{ user: Omit<User, 'password'>; role: string; joinedAt: Date }>> {
    const result = await db
      .select({
        // SECURITY FIX: Explicitly select only safe user fields - password excluded
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          status: users.status,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          // password field is intentionally excluded
        },
        role: organizationMembers.role,
        joinedAt: organizationMembers.createdAt
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.orgId, orgId));

    return result.map(row => ({
      user: row.user as Omit<User, 'password'>,
      role: row.role || "MEMBER",
      joinedAt: row.joinedAt || new Date()
    }));
  }

  async addOrganizationMember(orgId: string, userId: string, role: string): Promise<void> {
    await db.insert(organizationMembers).values({
      orgId,
      userId,
      role: role as any,
    });
  }

  async updateMemberRole(orgId: string, userId: string, role: string): Promise<void> {
    await db
      .update(organizationMembers)
      .set({ role: role as any })
      .where(and(
        eq(organizationMembers.orgId, orgId),
        eq(organizationMembers.userId, userId)
      ));
  }

  async removeMemberFromOrganization(orgId: string, userId: string): Promise<void> {
    await db
      .delete(organizationMembers)
      .where(and(
        eq(organizationMembers.orgId, orgId),
        eq(organizationMembers.userId, userId)
      ));
  }

  async getOrganizationStats(orgId: string): Promise<{
    totalIdeas: number;
    totalChats: number;
    totalAssets: number;
    totalMembers: number;
    totalMentors: number;
    totalPitchDecks: number;
    ideaStatusBreakdown: {
      BACKLOG: number;
      UNDER_REVIEW: number;
      SHORTLISTED: number;
      IN_INCUBATION: number;
      ARCHIVED: number;
    };
  }> {
    // Get total projects (ideas) for this org
    const orgProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.orgId, orgId));
    
    // Get total chats across all projects
    const projectIds = orgProjects.map(p => p.id);
    let totalChats = 0;
    if (projectIds.length > 0) {
      for (const projectId of projectIds) {
        const projectChats = await db
          .select()
          .from(chats)
          .where(eq(chats.projectId, projectId));
        totalChats += projectChats.length;
      }
    }

    // Get total assets across all projects
    let totalAssets = 0;
    if (projectIds.length > 0) {
      for (const projectId of projectIds) {
        const projectAssets = await db
          .select()
          .from(assets)
          .where(eq(assets.projectId, projectId));
        totalAssets += projectAssets.length;
      }
    }

    // Get total members
    const members = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.orgId, orgId));

    // Get mentor count (members with MENTOR role)
    const mentors = members.filter(m => m.role === 'MENTOR');

    // Get total pitch decks generated for this org's ideas
    let totalPitchDecks = 0;
    if (projectIds.length > 0) {
      const pitchDecks = await db
        .select()
        .from(pitchDeckGenerations)
        .where(inArray(pitchDeckGenerations.projectId, projectIds));
      totalPitchDecks = pitchDecks.length;
    }

    // Idea status breakdown
    const ideaStatusBreakdown = { BACKLOG: 0, UNDER_REVIEW: 0, SHORTLISTED: 0, IN_INCUBATION: 0, ARCHIVED: 0 };
    for (const p of orgProjects) {
      const status = p.status as keyof typeof ideaStatusBreakdown;
      if (status in ideaStatusBreakdown) ideaStatusBreakdown[status]++;
    }

    return {
      totalIdeas: orgProjects.length,
      totalChats,
      totalAssets,
      totalMembers: members.length,
      totalMentors: mentors.length,
      totalPitchDecks,
      ideaStatusBreakdown,
    };
  }

  // Project operations
  async getProjectsByOrg(orgId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.orgId, orgId))
      .orderBy(desc(projects.updatedAt));
  }

  // Project operations
  async getProjectsByUser(userId: string): Promise<Project[]> {
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.createdById, userId))
      .orderBy(desc(projects.updatedAt));

    // attach commentsCount and assetsCount for each project
    for (const project of userProjects) {
      try {
        const commentRows = await db
          .select()
          .from(comments)
          .where(eq(comments.projectId, project.id));
        (project as any).commentsCount = commentRows.length;
      } catch (e) {
        (project as any).commentsCount = 0;
      }
      try {
        const assetRows = await db
          .select()
          .from(assets)
          .where(eq(assets.projectId, project.id));
        (project as any).assetsCount = assetRows.length;
      } catch (e) {
        (project as any).assetsCount = 0;
      }
    }

    return userProjects;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, data: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set(data)
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    // Delete in correct order to handle foreign key constraints
    // 1. Delete messages first
    const projectChats = await db.select().from(chats).where(eq(chats.projectId, id));
    
    for (const chat of projectChats) {
      await db.delete(messages).where(eq(messages.chatId, chat.id));
    }
    
    // 2. Delete chats
    await db.delete(chats).where(eq(chats.projectId, id));
    
    // 3. Delete pitch deck generations first (they reference assets)
    await db.delete(pitchDeckGenerations).where(eq(pitchDeckGenerations.projectId, id));
    
    // 4. Now safe to delete assets
    await db.delete(assets).where(eq(assets.projectId, id));
    
    // 5. Finally delete the project
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Chat operations
  async getChatsByProject(projectId: string): Promise<Chat[]> {
    return await db
      .select()
      .from(chats)
      .where(eq(chats.projectId, projectId))
      .orderBy(desc(chats.updatedAt));
  }

  async getChat(id: string): Promise<Chat | undefined> {
    const [chat] = await db.select().from(chats).where(eq(chats.id, id));
    return chat;
  }

  async createChat(chat: InsertChat): Promise<Chat> {
    const [newChat] = await db.insert(chats).values(chat).returning();
    return newChat;
  }

  // Message operations
  async getMessagesByChat(chatId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async updateMessage(id: string, data: Partial<InsertMessage>): Promise<Message> {
    const [updatedMessage] = await db
      .update(messages)
      .set(data)
      .where(eq(messages.id, id))
      .returning();
    return updatedMessage;
  }

  // Asset operations
  async getAssetsByProject(projectId: string): Promise<Asset[]> {
    return await db
      .select()
      .from(assets)
      .where(eq(assets.projectId, projectId))
      .orderBy(desc(assets.updatedAt));
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset;
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [newAsset] = await db.insert(assets).values(asset).returning();
    return newAsset;
  }

  async updateAsset(id: string, data: Partial<InsertAsset>): Promise<Asset> {
    // Snapshot current data as a version before overwriting (only when data changes)
    if (data.data !== undefined) {
      const current = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
      if (current[0]?.data) {
        const now = new Date();
        const label = now.toLocaleString("en-US", {
          month: "short", day: "numeric", year: "numeric",
          hour: "numeric", minute: "2-digit", hour12: true,
        });
        await db.insert(assetVersions).values({ assetId: id, data: current[0].data, label });
        // Keep only the latest 50 versions per asset
        const all = await db.select({ id: assetVersions.id })
          .from(assetVersions).where(eq(assetVersions.assetId, id))
          .orderBy(assetVersions.createdAt);
        if (all.length > 50) {
          const toDelete = all.slice(0, all.length - 50).map((v) => v.id);
          await db.delete(assetVersions).where(inArray(assetVersions.id, toDelete));
        }
      }
    }
    const [updatedAsset] = await db
      .update(assets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();
    return updatedAsset;
  }

  async getAssetVersions(assetId: string) {
    return db.select({ id: assetVersions.id, label: assetVersions.label, createdAt: assetVersions.createdAt, data: assetVersions.data })
      .from(assetVersions)
      .where(eq(assetVersions.assetId, assetId))
      .orderBy(desc(assetVersions.createdAt));
  }

  async getAssetVersion(versionId: string) {
    const [v] = await db.select().from(assetVersions).where(eq(assetVersions.id, versionId)).limit(1);
    return v;
  }

  async createAssetVersion(assetId: string, data: any, label: string): Promise<void> {
    await db.insert(assetVersions).values({ assetId, data, label });
  }

  // Pitch deck generation operations
  async getPitchDeckGenerationsByProject(projectId: string): Promise<PitchDeckGeneration[]> {
    return await db
      .select()
      .from(pitchDeckGenerations)
      .where(eq(pitchDeckGenerations.projectId, projectId))
      .orderBy(desc(pitchDeckGenerations.createdAt));
  }

  async getPitchDeckGenerationsByUser(userId: string): Promise<(PitchDeckGeneration & { projectTitle?: string })[]> {
    const rows = await db
      .select({
        id: pitchDeckGenerations.id,
        projectId: pitchDeckGenerations.projectId,
        assetId: pitchDeckGenerations.assetId,
        taskId: pitchDeckGenerations.taskId,
        status: pitchDeckGenerations.status,
        template: pitchDeckGenerations.template,
        theme: pitchDeckGenerations.theme,
        colorScheme: pitchDeckGenerations.colorScheme,
        fontFamily: pitchDeckGenerations.fontFamily,
        downloadUrl: pitchDeckGenerations.downloadUrl,
        errorMessage: pitchDeckGenerations.errorMessage,
        createdById: pitchDeckGenerations.createdById,
        createdAt: pitchDeckGenerations.createdAt,
        updatedAt: pitchDeckGenerations.updatedAt,
        projectTitle: projects.title,
      })
      .from(pitchDeckGenerations)
      .leftJoin(projects, eq(pitchDeckGenerations.projectId, projects.id))
      .where(eq(pitchDeckGenerations.createdById, userId))
      .orderBy(desc(pitchDeckGenerations.createdAt));
    return rows as (PitchDeckGeneration & { projectTitle?: string })[];
  }

  async getPitchDeckGeneration(id: string): Promise<PitchDeckGeneration | undefined> {
    const [generation] = await db.select().from(pitchDeckGenerations).where(eq(pitchDeckGenerations.id, id));
    return generation;
  }

  async getPitchDeckGenerationByTaskId(taskId: string): Promise<PitchDeckGeneration | undefined> {
    const [generation] = await db.select().from(pitchDeckGenerations).where(eq(pitchDeckGenerations.taskId, taskId));
    return generation;
  }

  async createPitchDeckGeneration(generation: InsertPitchDeckGeneration): Promise<PitchDeckGeneration> {
    const [newGeneration] = await db.insert(pitchDeckGenerations).values(generation).returning();
    return newGeneration;
  }

  async updatePitchDeckGeneration(id: string, data: Partial<InsertPitchDeckGeneration>): Promise<PitchDeckGeneration> {
    const [updatedGeneration] = await db
      .update(pitchDeckGenerations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pitchDeckGenerations.id, id))
      .returning();
    return updatedGeneration;
  }

  async getPitchDeckGenerationById(id: string): Promise<PitchDeckGeneration | undefined> {
    const [generation] = await db.select().from(pitchDeckGenerations).where(eq(pitchDeckGenerations.id, id));
    return generation;
  }

  async deletePitchDeckGeneration(id: string): Promise<void> {
    await db.delete(pitchDeckGenerations).where(eq(pitchDeckGenerations.id, id));
  }

  // SECURITY FIX (P0): Get idea by ID for authorization checks
  async getIdea(id: string): Promise<Idea | undefined> {
    const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));
    return idea;
  }

  async getCourseProgress(userId: string, courseSlug: string): Promise<CourseProgress[]> {
    return db
      .select()
      .from(courseProgress)
      .where(and(eq(courseProgress.userId, userId), eq(courseProgress.courseSlug, courseSlug)));
  }

  async upsertVideoProgress(
    userId: string,
    courseSlug: string,
    videoSlug: string,
    watchedSeconds: number,
    completed: boolean
  ): Promise<CourseProgress> {
    const existing = await db
      .select()
      .from(courseProgress)
      .where(
        and(
          eq(courseProgress.userId, userId),
          eq(courseProgress.courseSlug, courseSlug),
          eq(courseProgress.videoSlug, videoSlug)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(courseProgress)
        .set({
          watchedSeconds: Math.max(existing[0].watchedSeconds, watchedSeconds),
          completed: existing[0].completed || completed,
          lastWatchedAt: new Date(),
        })
        .where(eq(courseProgress.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(courseProgress)
      .values({ userId, courseSlug, videoSlug, watchedSeconds, completed, lastWatchedAt: new Date() })
      .returning();
    return created;
  }

  async getProgramProgress(orgId: string): Promise<WorkspaceProgramProgress | undefined> {
    const rows = await db
      .select()
      .from(workspaceProgramProgress)
      .where(eq(workspaceProgramProgress.orgId, orgId))
      .limit(1);
    return rows[0];
  }

  async upsertProgramProgress(
    orgId: string,
    currentStep: number,
    steps: ProgramStep[],
    updatedBy: string,
  ): Promise<WorkspaceProgramProgress> {
    const [row] = await db
      .insert(workspaceProgramProgress)
      .values({ orgId, currentStep, steps, updatedBy, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: workspaceProgramProgress.orgId,
        set: { currentStep, steps, updatedBy, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  // ── Mentor assignments ───────────────────────────────────────────────────
  async getMentorAssignments(orgId: string): Promise<MentorAssignment[]> {
    return db.select().from(mentorAssignments).where(eq(mentorAssignments.orgId, orgId));
  }

  async getMentorAssignmentsWithDetails(orgId: string): Promise<any[]> {
    const rows = await db
      .select({
        id: mentorAssignments.id,
        orgId: mentorAssignments.orgId,
        mentorUserId: mentorAssignments.mentorUserId,
        memberUserId: mentorAssignments.memberUserId,
        createdAt: mentorAssignments.createdAt,
        mentorFirstName: users.firstName,
        mentorLastName: users.lastName,
        mentorEmail: users.email,
        mentorProfileImageUrl: users.profileImageUrl,
      })
      .from(mentorAssignments)
      .innerJoin(users, eq(mentorAssignments.mentorUserId, users.id))
      .where(eq(mentorAssignments.orgId, orgId));
    return rows;
  }

  async assignMemberToMentor(orgId: string, mentorUserId: string, memberUserId: string): Promise<MentorAssignment> {
    const [row] = await db
      .insert(mentorAssignments)
      .values({ orgId, mentorUserId, memberUserId })
      .onConflictDoNothing()
      .returning();
    // If duplicate (onConflictDoNothing returned nothing), fetch existing
    if (!row) {
      const [existing] = await db
        .select()
        .from(mentorAssignments)
        .where(
          and(
            eq(mentorAssignments.orgId, orgId),
            eq(mentorAssignments.mentorUserId, mentorUserId),
            eq(mentorAssignments.memberUserId, memberUserId),
          )
        )
        .limit(1);
      return existing;
    }
    return row;
  }

  async removeMentorAssignment(id: string, orgId: string): Promise<void> {
    await db
      .delete(mentorAssignments)
      .where(and(eq(mentorAssignments.id, id), eq(mentorAssignments.orgId, orgId)));
  }

  async getMentorParticipantIds(mentorUserId: string, orgId: string): Promise<string[]> {
    const rows = await db
      .select({ memberUserId: mentorAssignments.memberUserId })
      .from(mentorAssignments)
      .where(and(eq(mentorAssignments.mentorUserId, mentorUserId), eq(mentorAssignments.orgId, orgId)));
    return rows.map((r) => r.memberUserId);
  }
}

export const storage = new DatabaseStorage();
