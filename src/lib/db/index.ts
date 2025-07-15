import { Pool } from 'pg';
import { generateBrowserUserId } from '../user-utils';

// Fixed development user ID for consistent seeding
const DEVELOPMENT_USER_ID = 'user_dev_seed_12345';

// Database client instance
let db: Pool | null = null;

// Utility function for getting the appropriate user ID (for database operations)
export function generateUserId(): string {
  // In development mode, use the fixed development user ID for consistency with seed data
  if (
    process.env.NODE_ENV === 'development' ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ) {
    return DEVELOPMENT_USER_ID;
  }

  // In production, use browser-based generation
  return generateBrowserUserId();
}

// Get or create user in database
export async function getOrCreateUser(userId?: string): Promise<string> {
  const db = getDatabase();
  const currentUserId = userId || generateUserId();

  try {
    // Check if user exists
    const existingUser = await db.query('SELECT id FROM users WHERE id = $1', [
      currentUserId,
    ]);

    if (existingUser.rows.length === 0) {
      // Create new user
      const now = new Date().toISOString();
      await db.query(
        `INSERT INTO users (id, created_at, updated_at) VALUES ($1, $2, $3)`,
        [currentUserId, now, now]
      );
      console.log(`✅ Created new user: ${currentUserId}`);
    }

    return currentUserId;
  } catch (error) {
    handleDatabaseError(error, 'get or create user');
    return currentUserId;
  }
}

// Initialize database connection
export function initializeDatabase(): Pool {
  if (db) return db;

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

  db = new Pool({
    connectionString: databaseUrl,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  });

  return db;
}

// Get database instance
export function getDatabase(): Pool {
  if (!db) {
    return initializeDatabase();
  }
  return db;
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
