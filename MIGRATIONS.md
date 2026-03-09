# Database Migration Guide for GCP Production

This file documents all database schema changes that need to be applied when deploying to GCP production.

## Migration History

### 1. Feature Flags for Organizations (Added: ~Jan 2026)

These columns enable/disable various features per workspace:

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS dashboard_enabled BOOLEAN DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_builder_enabled BOOLEAN DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS form_submission_enabled BOOLEAN DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS academy_enabled BOOLEAN DEFAULT true;
```

**Purpose:** Allow admins to toggle dashboard, AI builder, form submission, and academy features per workspace.

---

### 2. Challenge Submission Tracking (Added: ~Jan 2026)

Track whether a project has been submitted to a challenge:

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted BOOLEAN DEFAULT false;
```

**Purpose:** Hide submitted projects from "My Challenge Ideas" section while keeping them visible in admin boards.

---

### 3. Challenge Evaluation Criteria (Added: Feb 11, 2026)

Custom evaluation criteria per challenge:

```sql
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS evaluation_criteria TEXT;
```

**Purpose:** Allow challenges to have their own AI evaluation criteria, overriding organization-level defaults. Used for automatic evaluation when ideas are submitted.

**Related Feature:** Auto-evaluation on submission + challenge-specific idea boards.

---

### 4. Manual Build Toggle (Added: Feb 12, 2026)

Enable/disable manual idea creation option:

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS manual_build_enabled BOOLEAN DEFAULT true;
```

**Purpose:** Allow admins to toggle the "Build Manually" option for challenge idea creation alongside "Build with AI" and "Submit via Form" options.

**Related Feature:** Manual idea creation flow with 4-step form for challenges.

---

## How to Apply Migrations to GCP

### Option 1: Using psql (Recommended)

```bash
# Connect to GCP Cloud SQL
gcloud sql connect [INSTANCE_NAME] --user=postgres --database=railway

# Then run each ALTER TABLE command from the sections above
```

### Option 2: Using Cloud SQL Console

1. Go to Cloud SQL instance in GCP Console
2. Click "Connect using Cloud Shell"
3. Run psql commands

### Option 3: Using Railway CLI (if connected to GCP)

```bash
railway connect Postgres
# Then run the SQL commands
```

---

## Verification Queries

After applying migrations, verify the columns exist:

```sql
-- Check organizations table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name IN ('dashboard_enabled', 'ai_builder_enabled', 'form_submission_enabled', 'manual_build_enabled', 'academy_enabled');

-- Check projects table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name = 'submitted';

-- Check challenges table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'challenges'
  AND column_name = 'evaluation_criteria';
```

Expected output:
- organizations: 5 rows (dashboard_enabled, ai_builder_enabled, form_submission_enabled, manual_build_enabled, academy_enabled)
- projects: 1 row (submitted)
- challenges: 1 row (evaluation_criteria)

---

## Rollback Instructions

If you need to rollback any migration:

```sql
-- Remove feature flags from organizations
ALTER TABLE organizations DROP COLUMN IF EXISTS dashboard_enabled;
ALTER TABLE organizations DROP COLUMN IF EXISTS ai_builder_enabled;
ALTER TABLE organizations DROP COLUMN IF EXISTS form_submission_enabled;
ALTER TABLE organizations DROP COLUMN IF EXISTS academy_enabled;

-- Remove submitted flag from projects
ALTER TABLE projects DROP COLUMN IF EXISTS submitted;

-- Remove evaluation criteria from challenges
ALTER TABLE challenges DROP COLUMN IF EXISTS evaluation_criteria;
```

⚠️ **Warning:** Dropping columns will permanently delete data. Only rollback if absolutely necessary.

---

## Notes

- All migrations use `IF NOT EXISTS` / `IF EXISTS` clauses to be idempotent
- Default values are set for all new columns to ensure existing rows work correctly
- No data migration needed - all columns are nullable or have defaults
- Backend code is compatible with both old and new schema (graceful degradation)

---

## Last Updated

2026-02-12 - Added manual build toggle for challenge idea creation
