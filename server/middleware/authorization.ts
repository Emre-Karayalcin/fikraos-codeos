import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

/**
 * Middleware to check if user has access to a specific project
 * Checks if user is the project owner or has access through organization membership
 */
export async function canAccessProject(req: any, res: Response, next: NextFunction) {
  try {
    const projectId = req.params.id || req.params.projectId;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    // Get the project
    const project = await storage.getProject(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is the project owner
    if (project.createdById === userId) {
      req.project = project; // Attach project to request for later use
      return next();
    }

    // Check if user has access through organization membership
    if (project.orgId) {
      const userRole = await storage.getUserRole(userId, project.orgId);
      if (userRole) {
        req.project = project;
        req.userRole = userRole;
        return next();
      }
    }

    return res.status(403).json({
      message: 'You do not have permission to access this project'
    });

  } catch (error) {
    console.error('Authorization check error:', error);
    return res.status(500).json({ message: 'Authorization check failed' });
  }
}

/**
 * Middleware to check if user can modify a specific project
 * Only project owner or org admin can modify
 */
export async function canModifyProject(req: any, res: Response, next: NextFunction) {
  try {
    const projectId = req.params.id || req.params.projectId;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    // Get the project
    const project = await storage.getProject(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is the project owner
    if (project.createdById === userId) {
      req.project = project;
      return next();
    }

    // Check if user is an admin of the organization
    if (project.orgId) {
      const userRole = await storage.getUserRole(userId, project.orgId);
      if (userRole === 'ADMIN' || userRole === 'OWNER') {
        req.project = project;
        req.userRole = userRole;
        return next();
      }
    }

    return res.status(403).json({
      message: 'You do not have permission to modify this project'
    });

  } catch (error) {
    console.error('Authorization check error:', error);
    return res.status(500).json({ message: 'Authorization check failed' });
  }
}

/**
 * Middleware to check if user can access a specific chat
 */
export async function canAccessChat(req: any, res: Response, next: NextFunction) {
  try {
    const chatId = req.params.id || req.params.chatId;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const chat = await storage.getChat(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Get the project that owns this chat
    const project = await storage.getProject(chat.projectId);

    if (!project) {
      return res.status(404).json({ message: 'Associated project not found' });
    }

    // Check if user can access the project
    if (project.createdById === userId) {
      req.chat = chat;
      req.project = project;
      return next();
    }

    // Check organization membership
    if (project.orgId) {
      const userRole = await storage.getUserRole(userId, project.orgId);
      if (userRole) {
        req.chat = chat;
        req.project = project;
        req.userRole = userRole;
        return next();
      }
    }

    return res.status(403).json({
      message: 'You do not have permission to access this chat'
    });

  } catch (error) {
    console.error('Authorization check error:', error);
    return res.status(500).json({ message: 'Authorization check failed' });
  }
}

/**
 * Middleware to check if user can access assets for a project
 */
export async function canAccessAssets(req: any, res: Response, next: NextFunction) {
  try {
    const projectId = req.params.projectId;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const project = await storage.getProject(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user can access the project
    if (project.createdById === userId) {
      req.project = project;
      return next();
    }

    // Check organization membership
    if (project.orgId) {
      const userRole = await storage.getUserRole(userId, project.orgId);
      if (userRole) {
        req.project = project;
        req.userRole = userRole;
        return next();
      }
    }

    return res.status(403).json({
      message: 'You do not have permission to access these assets'
    });

  } catch (error) {
    console.error('Authorization check error:', error);
    return res.status(500).json({ message: 'Authorization check failed' });
  }
}

/**
 * SECURITY FIX (P0): Middleware to check if user can access a specific idea
 * Verifies the user is a member of the organization that owns the idea
 */
export async function canAccessIdea(req: any, res: Response, next: NextFunction) {
  try {
    const ideaId = req.params.id || req.params.ideaId;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!ideaId) {
      return res.status(400).json({ message: 'Idea ID is required' });
    }

    // Get the idea
    const idea = await storage.getIdea(ideaId);

    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    // Check if user is a member of the idea's organization
    const userRole = await storage.getUserRole(userId, idea.orgId);
    if (!userRole) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    req.idea = idea;
    req.userRole = userRole;
    return next();

  } catch (error) {
    console.error('Authorization check error:', error);
    return res.status(500).json({ message: 'Authorization check failed' });
  }
}

/**
 * SECURITY FIX (P1): Middleware to check if user can modify a specific idea
 * Only idea owner or org admin/owner can modify
 */
export async function canModifyIdea(req: any, res: Response, next: NextFunction) {
  try {
    const ideaId = req.params.id || req.params.ideaId;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!ideaId) {
      return res.status(400).json({ message: 'Idea ID is required' });
    }

    // Get the idea
    const idea = await storage.getIdea(ideaId);

    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    // Check if user is the idea owner
    if (idea.ownerId === userId) {
      req.idea = idea;
      return next();
    }

    // Check if user is an admin/owner of the organization
    const userRole = await storage.getUserRole(userId, idea.orgId);
    if (userRole === 'ADMIN' || userRole === 'OWNER') {
      req.idea = idea;
      req.userRole = userRole;
      return next();
    }

    return res.status(403).json({
      message: 'Not authorized'
    });

  } catch (error) {
    console.error('Authorization check error:', error);
    return res.status(500).json({ message: 'Authorization check failed' });
  }
}

/**
 * SECURITY FIX (P0): Middleware to verify organization membership
 * Used for endpoints that require org membership but don't need a specific resource
 */
export async function requireOrgMembership(req: any, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    // Check if user is a member of the organization
    const userRole = await storage.getUserRole(userId, orgId);
    if (!userRole) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    req.userRole = userRole;
    return next();

  } catch (error) {
    console.error('Authorization check error:', error);
    return res.status(500).json({ message: 'Authorization check failed' });
  }
}
