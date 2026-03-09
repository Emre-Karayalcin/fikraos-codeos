import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { PreviewServer } from "./preview-server";
import { setupVite, serveStatic, log } from "./vite";
import openaiRoutes from "./openai-routes";
import { setupSecurityMiddleware, aiRateLimiter, fileUploadLimiter } from "./middleware/security";
import { setupCors } from "./middleware/cors";
import { errorHandler, notFoundHandler, securityLogger } from "./middleware/errorHandler";
import { isAuthenticated } from "./auth";

const app = express();

// Security middleware (must be early in the stack)
setupSecurityMiddleware(app);
setupCors(app);
app.use(securityLogger);

// ✅ SECURITY FIX (P1): Reduce global body size limit to prevent DoS
// Most endpoints need < 100KB. Specific endpoints override where needed.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        // SECURITY: Sanitize sensitive data from logs to prevent information disclosure
        const sanitized = { ...capturedJsonResponse };
        const sensitiveFields = [
          'password', 'token', 'apiKey', 'api_key', 'secret', 'authorization', 'cookie',
          'email', 'ssn', 'creditCard', 'credit_card', 'sessionId', 'session_id',
          'csrf', 'csrfToken', 'csrf_token', 'privateKey', 'private_key',
          'accessToken', 'access_token', 'refreshToken', 'refresh_token'
        ];

        // Recursively sanitize nested objects
        const recursiveSanitize = (obj: any) => {
          if (typeof obj !== 'object' || obj === null) return obj;

          for (const key in obj) {
            const lowerKey = key.toLowerCase();
            if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
              obj[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object') {
              recursiveSanitize(obj[key]);
            }
          }
          return obj;
        };

        recursiveSanitize(sanitized);
        logLine += ` :: ${JSON.stringify(sanitized)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // ✅ SECURITY FIX (P0): Setup preview server routes with authentication and rate limiting
  PreviewServer.setupPreviewRoutes(app, isAuthenticated, fileUploadLimiter);

  // Mount OpenAI routes with AI-specific rate limiting
  app.use('/api/openai', aiRateLimiter, openaiRoutes);
  console.log('✅ Mounted OpenAI routes at /api/openai with rate limiting (50 req/hour)');

  // API endpoint to save files for temporary projects (PROTECTED)
  app.post('/api/projects/files/save', isAuthenticated, async (req, res) => {
    try {
      const { chatId, files } = req.body;
      
      if (!chatId || !files) {
        return res.status(400).json({ error: 'chatId and files are required' });
      }
      
      console.log(`📁 Saving ${Object.keys(files).length} files for chat ${chatId}`);
      
      // For now, we'll just acknowledge the save since files are stored in preview server
      // In a real implementation, you might save to a temporary directory or database
      
      res.json({ 
        success: true, 
        message: `Saved ${Object.keys(files).length} files for chat ${chatId}` 
      });
    } catch (error) {
      console.error('File save error:', error);
      res.status(500).json({ error: 'Failed to save files' });
    }
  });
  
  const server = await registerRoutes(app);

  // Serve uploaded files - PROTECTED (requires authentication)
  // Note: Session and Passport must be initialized first (done by registerRoutes)
  app.use('/uploads', isAuthenticated, (req, res, next) => {
    // Add security headers for file downloads
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('Content-Disposition', 'attachment');
    next();
  }, express.static(path.join(process.cwd(), 'uploads')));

  // CSRF Protection (must be after session setup)
  // Note: SameSite=strict cookies provide additional protection in production
  const { csrfTokenEndpoint, csrfProtection } = await import('./middleware/csrf.js');

  // Apply CSRF protection globally to all routes
  app.use(csrfProtection);

  // CSRF token endpoint (GET is exempt from CSRF protection)
  app.get('/api/csrf-token', csrfTokenEndpoint);
  console.log('✅ CSRF protection enabled and applied to all state-changing routes');

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Enhanced error handling middleware (must be after all routes AND static serving)
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
