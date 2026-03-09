import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Cloud Run optimized connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,                        // Lower for Cloud Run's stateless containers
  idleTimeoutMillis: 30000,      // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Fail fast on connection issues
  statement_timeout: 60000,       // Kill queries running > 60s
  // SSL is handled by Cloud SQL Proxy (Unix socket), don't configure it here
});

export const db = drizzle(pool, { schema });

// Graceful shutdown - close pool when app terminates
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database pool...');
  await pool.end();
});