# FikraHub Infrastructure Components

## Core Technology Stack

### Backend Framework
- **Express.js** with TypeScript
- **Node.js** runtime (v22.x)
- RESTful API architecture
- WebSocket support for real-time features
- Session-based authentication with Passport.js

### Frontend Framework
- **React 18** with TypeScript
- **Vite** as build tool and dev server
- **Tailwind CSS** for styling
- **shadcn/ui** + Radix UI components
- **Wouter** for client-side routing
- **TanStack Query** for data fetching

### Database & ORM
- **PostgreSQL 15+**
- **Drizzle ORM** for type-safe queries
- Database-backed session storage
- Comprehensive schema with relations

---

## Infrastructure Components

### 1. Application Hosting - Railway

**Service:** Railway App Platform
**Configuration:**
- Auto-scaling based on demand
- Zero-downtime deployments
- Built-in CI/CD from Git
- Environment variable management
- Automatic HTTPS with custom domains

**Application Specifications:**
```
Runtime: Node.js 22.x
Entry Point: npm run start
Build Command: npm run build
Port: Dynamic (via $PORT env variable)
```

**Resource Allocation:**
- CPU: Shared vCPU (burst capacity)
- Memory: 512MB - 8GB (auto-scaling)
- Storage: Ephemeral (for temporary files)
- Network: Automatic IPv4/IPv6

**Health Monitoring:**
- Application logs streaming
- Crash detection & auto-restart
- Deployment rollback capability

---

### 2. Database - Railway PostgreSQL

**Service:** Managed PostgreSQL on Railway
**Configuration:**
```
Version: PostgreSQL 15+
Instance: Shared/Dedicated based on plan
Connection: Private network within Railway
Storage: 1GB - 100GB (based on plan)
Backups: Automated daily backups
High Availability: Optional with Pro plan
```

**Connection Details:**
- Private internal URL for app-to-db communication
- SSL/TLS encryption enforced
- Connection pooling via node-postgres
- Schema migrations via Drizzle Kit

**Database Tables:**
- `sessions` - Session storage for authentication
- `users` - User accounts and profiles
- `organizations` - Multi-tenant workspaces
- `organization_members` - User-organization relationships
- `projects` - Innovation projects/ideas
- `chats` - AI conversation threads
- `messages` - Chat messages with AI
- `assets` - Generated business artifacts (SWOT, Lean Canvas, etc.)
- `ideas` - Idea management system
- `reviews` - Peer review workflow
- `comments` - Collaboration comments
- `notifications` - User notifications
- `challenges` - Innovation challenges
- `audit_logs` - Activity tracking
- `metrics_sets` - Evaluation criteria
- `idea_scores` - AI-powered scoring
- `pitch_deck_generations` - Presentation generation tracking
- `password_reset_tokens` - Secure password reset

---

### 3. File Storage - Local Filesystem

**Location:** `/uploads` directory (ephemeral)
**Configuration:**
- Protected by authentication middleware
- Temporary storage for user uploads
- File size limits enforced (via multer)
- Security headers: X-Content-Type-Options, X-Download-Options

**Supported File Types:**
- Documents: PDF, DOCX, TXT
- Images: JPG, PNG, GIF, SVG
- Data: CSV, JSON, XLSX
- Presentations: PPTX

**Storage Limitations:**
- Ephemeral storage (cleared on redeploy)
- Recommended for temporary files only
- For production, consider migrating to:
  - AWS S3
  - Google Cloud Storage
  - Cloudflare R2

---

### 4. Session Management - PostgreSQL-backed

**Library:** `connect-pg-simple`
**Configuration:**
```javascript
Store: PostgreSQL sessions table
TTL: 7 days (604,800 seconds)
Rolling: true (extends session on activity)
Cookie Settings:
  - httpOnly: true
  - secure: true (production)
  - sameSite: 'strict' (production)
  - maxAge: 7 days
```

**Session Security:**
- CSRF token validation
- Session regeneration on login
- Secure cookie transmission (HTTPS only in production)
- Session fixation attack prevention

---

### 5. External Service Integrations

#### AI Services
**Anthropic Claude API**
- Purpose: Primary AI chat and content generation
- Rate Limiting: 50 requests/hour per IP
- Models: Claude 3 Sonnet, Opus

**OpenAI API**
- Purpose: Additional AI capabilities
- Rate Limiting: 50 requests/hour per IP
- Models: GPT-4, GPT-3.5-turbo

**Perplexity API**
- Purpose: Research and information retrieval
- Integration: On-demand queries

#### Deployment Services
**Vercel API**
- Purpose: Deploy generated applications
- Integration: Programmatic deployments via REST API
- Features: Automatic builds, preview URLs, production domains

#### Document Services
**Google Drive API**
- Purpose: PPTX to PDF conversion
- Authentication: Service account with private key
- Scope: Drive file management

**SlideSpeak API**
- Purpose: AI-powered presentation generation
- Integration: Async task-based generation

#### Communication Services
**Resend API**
- Purpose: Transactional email (optional)
- Use Cases: Password resets, notifications

**ElevenLabs API**
- Purpose: Text-to-speech for presentations (optional)

**NewsData API**
- Purpose: News and media content for research

---

## Security Architecture

### 1. Network Security

**HTTPS/TLS:**
- Automatic SSL/TLS certificates
- TLS 1.2+ enforced
- HSTS headers enabled (max-age: 1 year)

**Firewall Rules:**
- Only ports 80/443 exposed to public
- Internal Railway network for DB connections
- No direct database access from public internet

### 2. Application Security

**Security Headers (Helmet.js):**
```javascript
Content-Security-Policy: Strict policy
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: enabled
Referrer-Policy: strict-origin-when-cross-origin
HSTS: max-age=31536000; includeSubDomains; preload
```

**Rate Limiting:**
- API General: 100 requests / 15 minutes per IP
- Authentication: 5 attempts / 15 minutes per IP
- AI Endpoints: 50 requests / hour per IP
- File Uploads: 10 uploads / hour per IP
- Password Reset: 3 attempts / hour per IP
- Organization Creation: 3 creations / 24 hours per IP
- Data Export: 5 exports / hour per IP

**CSRF Protection:**
- Token-based CSRF validation
- Exempt routes: GET, HEAD, OPTIONS
- Applied to all state-changing API endpoints

**Input Validation:**
- express-validator for all user inputs
- SQL injection prevention via parameterized queries (Drizzle ORM)
- XSS prevention via input sanitization
- File upload validation (type, size, content)

**Authentication & Authorization:**
- Bcrypt password hashing (scrypt-based)
- Session-based auth with secure cookies
- Role-based access control (OWNER, ADMIN, MEMBER, MENTOR)
- Multi-tenant isolation via organization boundaries
- Authorization middleware on protected routes

### 3. Data Security

**Sensitive Data Handling:**
- Passwords hashed with scrypt (salt + 64-byte derived key)
- API keys stored in environment variables
- Session secrets cryptographically generated
- Sensitive fields redacted from logs

**Database Security:**
- Encrypted connections (SSL/TLS)
- No raw SQL queries (ORM-based)
- Foreign key constraints enforced
- Cascade deletes for data integrity

**Recent Security Fixes (v4):**
- Fixed IDOR vulnerabilities on 5 endpoints
- Exempt static assets from CSRF protection
- Updated dependencies to patch vulnerabilities
- Enhanced authorization checks on all API routes

---

## Monitoring & Operations

### Logging

**Application Logs:**
- Request/response logging for all API calls
- Sensitive data redaction (passwords, tokens, emails, SSN, etc.)
- Error stack traces with sanitization
- Performance metrics (request duration)

**Log Levels:**
- INFO: Standard application events
- WARN: Non-critical issues
- ERROR: Application errors with stack traces
- DEBUG: Development debugging (excluded in production)

**Log Retention:**
- Railway: 7-30 days based on plan
- Recommendation: Export to external service for long-term retention
  - Consider: Datadog, Logtail, Better Stack, or AWS CloudWatch

### Error Handling

**Global Error Handler:**
- Catch-all middleware for unhandled errors
- Custom error messages (avoid leaking internals)
- 404 handler for undefined routes
- Security logger for suspicious activity

**Error Responses:**
```json
{
  "message": "User-friendly error message",
  "error": "Technical details (dev mode only)"
}
```

### Performance Monitoring

**Metrics to Track:**
- API response times (P50, P95, P99)
- Database query performance
- Memory usage and CPU utilization
- Request throughput (requests/minute)
- Error rates by endpoint

**Recommended Tools:**
- Application: New Relic, Datadog APM, or Railway built-in metrics
- Database: Railway PostgreSQL metrics
- Uptime: UptimeRobot, Pingdom, or Railway health checks

---

## Deployment Pipeline

### CI/CD Workflow

**Git Integration:**
- Automatic deployments on push to main branch
- Preview deployments for pull requests (optional)
- Rollback capability to previous deployments

**Build Process:**
```bash
1. npm install (dependencies)
2. npm run build (compile TypeScript + build frontend)
   - Backend: esbuild → dist/index.js
   - Frontend: vite build → dist/public
3. npm run start (production server)
```

**Environment Promotion:**
```
Development → Staging → Production
```

**Zero-Downtime Deployment:**
- Railway handles graceful shutdowns
- Health checks before traffic routing
- Automatic rollback on deployment failure

### Database Migrations

**Tool:** Drizzle Kit
**Commands:**
```bash
# Push schema changes to database
npx drizzle-kit push

# Generate migration files
npx drizzle-kit generate

# View database in GUI
npx drizzle-kit studio
```

**Migration Strategy:**
- Schema changes committed to Git
- Migrations run automatically or manually before deploy
- Backward-compatible migrations preferred

---

## Summary

FikraHub leverages modern PaaS solutions for cost-effective hosting while maintaining enterprise-grade security and scalability. The architecture is designed for:

- **Rapid Development:** TypeScript full-stack with hot reload
- **Security:** Multi-layer protection (HTTPS, CSRF, rate limiting, input validation)
- **Scalability:** Easy migration path to enterprise infrastructure
- **Developer Experience:** Simple deployment, comprehensive logging, type safety

---

**Document Version:** 2.0
**Last Updated:** December 2025
**Architecture Review:** Quarterly
