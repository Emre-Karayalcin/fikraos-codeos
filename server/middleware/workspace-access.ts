import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { ideas, organizationMembers, organizations } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Middleware to verify user has access to a workspace/organization
 * Checks if the user is a member of the organization
 */
export async function verifyWorkspaceAccess(req: any, res: Response, next: NextFunction) {
  try {
    const orgId = req.body.orgId || req.query.orgId || req.params.orgId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is a member of this organization
    const [membership] = await db
      .select()
      .from(organizationMembers)
      .where(and(
        eq(organizationMembers.userId, req.user.id),
        eq(organizationMembers.orgId, orgId)
      ))
      .limit(1);

    if (!membership) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this workspace' });
    }

    // Attach membership info to request for downstream use
    req.workspaceMembership = membership;
    next();
  } catch (error) {
    console.error('Error verifying workspace access:', error);
    res.status(500).json({ error: 'Failed to verify workspace access' });
  }
}

/**
 * Middleware to verify user has access to an idea
 * Checks if the user is a member of the organization that owns the idea
 */
export async function verifyIdeaAccess(req: any, res: Response, next: NextFunction) {
  try {
    const ideaId = req.params.id || req.params.ideaId;

    if (!ideaId) {
      return res.status(400).json({ error: 'Idea ID is required' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get the idea with its organization
    const [idea] = await db
      .select({
        id: ideas.id,
        orgId: ideas.orgId
      })
      .from(ideas)
      .where(eq(ideas.id, ideaId))
      .limit(1);

    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    // Check if user is a member of the idea's organization
    const [membership] = await db
      .select()
      .from(organizationMembers)
      .where(and(
        eq(organizationMembers.userId, req.user.id),
        eq(organizationMembers.orgId, idea.orgId)
      ))
      .limit(1);

    if (!membership) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this workspace' });
    }

    // Attach idea and membership info to request
    req.idea = idea;
    req.workspaceMembership = membership;
    next();
  } catch (error) {
    console.error('Error verifying idea access:', error);
    res.status(500).json({ error: 'Failed to verify idea access' });
  }
}

/**
 * Middleware to verify user has access to the ideas in a query
 * Ensures orgId is provided and user is a member
 */
export async function requireOrgIdAndAccess(req: any, res: Response, next: NextFunction) {
  try {
    const orgId = req.query.orgId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID (orgId) is required' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is a member of this organization
    const [membership] = await db
      .select()
      .from(organizationMembers)
      .where(and(
        eq(organizationMembers.userId, req.user.id),
        eq(organizationMembers.orgId, orgId)
      ))
      .limit(1);

    if (!membership) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this workspace' });
    }

    req.workspaceMembership = membership;
    next();
  } catch (error) {
    console.error('Error verifying organization access:', error);
    res.status(500).json({ error: 'Failed to verify organization access' });
  }
}
