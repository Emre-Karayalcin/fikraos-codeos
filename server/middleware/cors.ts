import cors from 'cors';
import { Express } from 'express';

/**
 * Configure CORS middleware with security best practices
 */
export function setupCors(app: Express) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:8080',
    'https://os.fikrahub.com',
    process.env.APP_URL,
    process.env.FRONTEND_URL,
  ].filter(Boolean); // Remove undefined values

  // Add production domains if configured
  if (process.env.NODE_ENV === 'production' && process.env.PRODUCTION_URL) {
    allowedOrigins.push(process.env.PRODUCTION_URL);
  }

  // Localhost whitelist for development (only allow localhost, not any origin!)
  const devLocalhost = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:5000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:5173',
  ];

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // ✅ SECURITY FIX (P2): Log requests without origin header in production
      // These include: same-origin requests, server-to-server, health checks, mobile apps
      if (!origin) {
        if (process.env.NODE_ENV === 'production') {
          console.warn('⚠️  CORS: Request received without Origin header');
        }
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        if (process.env.NODE_ENV === 'production') {
          console.log(`✅ CORS: Allowed origin: ${origin}`);
        }
        return callback(null, true);
      }

      // In development, allow localhost with any port
      if (process.env.NODE_ENV === 'development' && devLocalhost.some(host => origin.startsWith(host))) {
        return callback(null, true);
      }

      // Reject all other origins
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(null, false);
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-CSRF-Token',  // ✅ SECURITY FIX (P2): Add CSRF token header for cross-origin requests
    ],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: 86400, // 24 hours - how long browser should cache preflight results
    optionsSuccessStatus: 200,
  };

  app.use(cors(corsOptions));

  // Handle preflight requests
  app.options('*', cors(corsOptions));
}
