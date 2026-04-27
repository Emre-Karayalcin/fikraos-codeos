import helmet from 'helmet';
import { Express } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Configure security middleware for the application
 */
export function setupSecurityMiddleware(app: Express) {
  // ✅ SECURITY FIX (P1): Conditional CSP based on environment
  const isProduction = process.env.NODE_ENV === 'production';

  // Helmet - Security headers
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          // ✅ SECURITY FIX (P1): Remove 'unsafe-eval' in production
          // Development needs it for Vite HMR, but production bundles don't execute eval()
          scriptSrc: isProduction
            ? ["'self'", "'unsafe-inline'"]  // Strict in production
            : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],  // Relaxed for Vite dev HMR
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          mediaSrc: ["'self'", "https:", "blob:"],
          connectSrc: ["'self'", "https:", "wss:"],
          frameSrc: ["'self'", "blob:", "https://www.youtube.com", "https://player.vimeo.com"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProduction ? [] : null,
        },
      },
      // Strict Transport Security (HSTS)
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      // X-Frame-Options (clickjacking protection)
      frameguard: {
        action: 'deny',
      },
      // X-Content-Type-Options (MIME sniffing protection)
      noSniff: true,
      // X-XSS-Protection
      xssFilter: true,
      // Referrer Policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      // Hide X-Powered-By header
      hidePoweredBy: true,
    })
  );

  // General API rate limiter
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased from 100 to 1000 to support complex workflows and prevent false positives
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
      // Skip rate limiting for authenticated workspace/org endpoints to prevent infinite loops
      return req.isAuthenticated?.() && (
        req.path.includes('/workspaces/') ||
        req.path.includes('/organizations')
      );
    },
  });

  // Apply general rate limiter to all API routes
  app.use('/api/', apiLimiter);
}

/**
 * Rate limiter for authentication endpoints (stricter)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100,
  message: { error: 'Too many authentication attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter for AI endpoints (OpenAI/Anthropic)
 * Stricter limits to prevent API cost abuse
 * ✅ SECURITY FIX (P2): Use default IP-based rate limiting with proper IPv6 support
 * Note: Rates are per-IP to prevent abuse. Authenticated endpoints ensure only
 * logged-in users can make requests.
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 AI requests per hour
  message: { error: 'Too many AI requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default key generator (req.ip) which handles IPv6 properly
});

/**
 * Rate limiter for password reset endpoints (very strict)
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: { error: 'Too many password reset attempts, please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for file upload endpoints
 */
export const fileUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: { error: 'Too many file uploads, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for organization creation (very strict)
 */
export const orgCreationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // Limit each IP to 3 org creations per day
  message: { error: 'Too many organization creation attempts, please try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * SECURITY FIX (P2): Rate limiter for data export endpoint
 * Prevents abuse of export functionality
 */
export const dataExportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 exports per hour
  message: { error: 'Too many data export requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
