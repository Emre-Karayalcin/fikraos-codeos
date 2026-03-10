import { randomBytes } from 'crypto';
import { RequestHandler } from 'express';

/**
 * Modern CSRF protection middleware
 *
 * Uses the Double Submit Cookie pattern:
 * 1. Server generates a random token and stores it in session
 * 2. Client receives token and must include it in requests
 * 3. Server validates that session token matches request token
 *
 * Note: This application also uses SameSite=strict cookies in production
 * which provides additional CSRF protection at the browser level.
 */

declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
  }
}

/**
 * Generate or retrieve CSRF token for the current session
 */
export function getCsrfToken(req: any): string {
  // Ensure session exists
  if (!req.session) {
    throw new Error('Session not initialized. Session middleware must be configured.');
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

/**
 * Middleware to validate CSRF token on state-changing requests
 *
 * Exempt methods: GET, HEAD, OPTIONS (safe methods per HTTP spec)
 * Protected methods: POST, PUT, PATCH, DELETE, CONNECT, TRACE
 * Exempt endpoints: Authentication endpoints (login, register) since users don't have sessions yet
 */
export const csrfProtection: RequestHandler = (req, res, next) => {
  // Skip CSRF for safe HTTP methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF for authentication endpoints (users don't have sessions yet)
  const authEndpoints = [
    '/api/login',
    '/api/register',
    '/api/complete-invite',
    '/api/reset-password',
    '/api/forgot-password',
    '/api/super-admin/login'
  ];

  // Check for exact match or workspace login/signup pattern
  const isAuthEndpoint = authEndpoints.some(endpoint => req.path === endpoint) ||
                         /^\/api\/workspaces\/[^/]+\/(login|signup)$/.test(req.path);

  if (isAuthEndpoint) {
    return next();
  }

  // Skip CSRF for API key authenticated endpoints
  if (req.headers['x-api-key']) {
    return next();
  }

  // Get token from request (header or body)
  const token = req.headers['x-csrf-token'] as string || req.body._csrf;

  // Validate token
  if (!token || !req.session.csrfToken || token !== req.session.csrfToken) {
    console.warn(`⚠️  CSRF validation failed for ${req.method} ${req.path}`);
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'CSRF token validation failed. Please refresh the page and try again.'
    });
  }

  next();
};

/**
 * Endpoint to get CSRF token (call this on app load)
 */
export const csrfTokenEndpoint: RequestHandler = (req, res) => {
  try {
    // With saveUninitialized: true, req.session always exists
    const token = getCsrfToken(req);
    res.json({ csrfToken: token });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    res.status(500).json({
      error: 'Failed to generate CSRF token',
      message: 'Please refresh the page and try again.'
    });
  }
};
