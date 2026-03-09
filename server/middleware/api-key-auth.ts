import { RequestHandler } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';

/**
 * API Key Authentication Middleware
 *
 * For public endpoints that need programmatic access (webhooks, integrations, etc.)
 * Uses API keys instead of session-based auth.
 *
 * Setup:
 * 1. Generate API key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * 2. Set PUBLIC_API_KEY environment variable
 * 3. Share API key securely with authorized clients
 *
 * Usage:
 * Client includes API key in request header:
 * X-API-Key: your-api-key-here
 */

/**
 * Validate API key using constant-time comparison to prevent timing attacks
 */
function validateApiKey(providedKey: string): boolean {
  const validKey = process.env.PUBLIC_API_KEY;

  if (!validKey) {
    console.error('⚠️  PUBLIC_API_KEY not configured - API key auth disabled');
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  if (providedKey.length !== validKey.length) {
    return false;
  }

  const providedBuf = Buffer.from(providedKey, 'utf-8');
  const validBuf = Buffer.from(validKey, 'utf-8');

  return timingSafeEqual(providedBuf, validBuf);
}

/**
 * Middleware to require API key authentication
 */
export const requireApiKey: RequestHandler = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      message: 'Please include X-API-Key header'
    });
  }

  if (!validateApiKey(apiKey)) {
    console.warn(`⚠️  Invalid API key attempt from ${req.ip} for ${req.method} ${req.path}`);
    return res.status(403).json({
      error: 'Invalid API key',
      message: 'The provided API key is invalid'
    });
  }

  next();
};

/**
 * Optional: Middleware that accepts either session auth OR API key
 */
export const requireAuthOrApiKey: RequestHandler = (req: any, res, next) => {
  // Check if user is authenticated via session
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // Otherwise, require API key
  requireApiKey(req, res, next);
};

/**
 * Generate a new API key (for admin use)
 */
export function generateApiKey(): string {
  return randomBytes(32).toString('hex');
}
