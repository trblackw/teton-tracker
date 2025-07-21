import { Pool } from 'pg';
import { notificationsDb } from './notifications-db';
import { preferencesDb } from './preferences-db';
import { reportTemplatesDb } from './report-templates-db';
import { reportsDb } from './reports-db';
import { runsDb } from './runs-db';

// Database client instance
let postgres: Pool | null = null;

// Initialize database connection
export function initializeDatabase(): Pool {
  if (postgres) return postgres;

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (
    !databaseUrl.startsWith('postgres://') &&
    !databaseUrl.startsWith('postgresql://')
  ) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string');
  }

  console.log('🐘 Connecting to PostgreSQL database');

  postgres = new Pool({
    connectionString: databaseUrl,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  });

  return postgres;
}

// Get database instance
export function getDatabase(): Pool {
  if (!postgres) {
    return initializeDatabase();
  }
  return postgres;
}

// Helper function to handle database errors gracefully
export function handleDatabaseError(error: any, operation: string): void {
  console.error(`❌ Database error during ${operation}:`, error);

  // You could add error reporting here (e.g., Sentry)
  // For now, we'll just log and continue
}

// Clean up expired cache entries
export async function cleanupExpiredCache(): Promise<void> {
  try {
    const db = getDatabase();
    const result = await db.query(
      'DELETE FROM flight_cache WHERE expires_at < NOW()'
    );

    if (result.rowCount && result.rowCount > 0) {
      console.log(`🧹 Cleaned up ${result.rowCount} expired cache entries`);
    }
  } catch (error) {
    handleDatabaseError(error, 'cache cleanup');
  }
}

export const db = {
  notifications: notificationsDb,
  preferences: preferencesDb,
  reports: reportsDb,
  runs: runsDb,
  reportTemplates: reportTemplatesDb,
} as const;
