import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, RequestHandler } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { users } from "@shared/schema";
import { authRateLimiter, passwordResetLimiter } from "./middleware/security";
import {
  registrationValidation,
  loginValidation,
  handleValidationErrors,
} from "./middleware/validation";

type UserType = typeof users.$inferSelect;

declare global {
  namespace Express {
    interface User extends UserType {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  // Detect password format
  // Bcrypt hashes start with $2a$, $2b$, or $2y$
  // Scrypt hashes contain a dot separator

  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    // Legacy bcrypt password
    return bcrypt.compare(supplied, stored);
  } else if (stored.includes('.')) {
    // Modern scrypt password
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } else {
    // Unknown format
    console.error('⚠️ Unknown password format:', stored.substring(0, 10));
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const PostgresSessionStore = connectPg(session);
  
  const sessionStore = new PostgresSessionStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false, // Use existing sessions table
    ttl: sessionTtl,
    tableName: "sessions", // Use existing sessions table
  });

  // Validate and generate session secret
  let sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET environment variable is required in production. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
      );
    } else {
      // SECURITY: Generate cryptographically secure random secret for development
      console.warn("⚠️  SESSION_SECRET not set - generating random secret for development");
      sessionSecret = randomBytes(32).toString('hex');
    }
  }

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: sessionTtl,
      // SECURITY FIX (P2): Set explicit domain for production cookie security
      domain: process.env.COOKIE_DOMAIN || undefined,
    },
    // Rolling session: extends session expiry on each request (prevents timeout during active use)
    rolling: true,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local authentication strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Try username first, then fall back to email (for admin-created accounts)
        let user = await storage.getUserByUsername(username);
        if (!user) {
          user = await storage.getUserByEmail(username);
        }
        if (!user || !user.password || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);

      if (!user) {
        return done(null, false);
      }

      // SECURITY FIX: Remove password before storing in session
      // This prevents password hashes from being exposed in req.user
      const { password, ...safeUser } = user;
      done(null, safeUser);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint (with rate limiting and validation)
  app.post(
    "/api/register",
    authRateLimiter,
    registrationValidation(),
    handleValidationErrors,
    async (req, res, next) => {
    try {
      const { username, email, password, firstName, lastName, orgId } = req.body;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingEmail = await storage.getUserByEmailOrganization(email, orgId);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
      });

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  }
  );

  // GET /api/login redirects to frontend auth page
  app.get("/api/login", (req, res) => {
    res.redirect("/auth");
  });

  // Login endpoint (with rate limiting and validation)
  app.post(
    "/api/login",
    authRateLimiter,
    loginValidation(),
    handleValidationErrors,
    (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) return next(regenerateErr);

        req.login(user, (err) => {
          if (err) return next(err);
          res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          });
        });
      });
    })(req, res, next);
  }
  );

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out successfully" });
    });
  });
}

// Authentication middleware
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
};

export { hashPassword, comparePasswords };