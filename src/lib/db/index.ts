import { createClient, type Client } from '@libsql/client';

// Database client instance
let db: Client | null = null;

// Initialize database connection
export function initializeDatabase(): Client {
  if (db) return db;

  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    // Fallback to local SQLite for development
    console.log('🗄️ Using local SQLite database');
    db = createClient({
      url: 'file:local.db',
    });
  } else if (url.startsWith('libsql://') && authToken) {
    // Production Turso setup
    console.log('🌐 Connecting to Turso database');
    db = createClient({
      url,
      authToken,
    });
  } else if (url.startsWith('file:')) {
    // Local file database
    console.log('📁 Using local file database');
    db = createClient({ url });
  } else {
    throw new Error(
      'Invalid database configuration. Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN or DATABASE_URL.'
    );
  }

  return db;
}

// Get database instance
export function getDatabase(): Client {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

// Initialize database schema
export async function initializeSchema(): Promise<void> {
  const db = getDatabase();

  try {
    // User preferences table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY,
        home_airport TEXT,
        theme TEXT DEFAULT 'system',
        timezone TEXT DEFAULT 'UTC',
        notification_preferences TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Historical runs table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        flight_number TEXT NOT NULL,
        airline TEXT,
        departure_airport TEXT,
        arrival_airport TEXT,
        pickup_location TEXT NOT NULL,
        dropoff_location TEXT NOT NULL,
        scheduled_time DATETIME NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        type TEXT NOT NULL CHECK (type IN ('pickup', 'dropoff')),
        price TEXT NOT NULL DEFAULT '0',
        notes TEXT,
        user_id TEXT,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `);

    // Flight data cache table (optional - for reducing API calls)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS flight_cache (
        flight_number TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
      )
    `);

    // Create indexes for better performance
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_runs_scheduled_time ON runs(scheduled_time)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_flight_cache_expires ON flight_cache(expires_at)
    `);

    // Migration: Add price column to existing runs table
    try {
      await db.execute(`
        ALTER TABLE runs ADD COLUMN price TEXT NOT NULL DEFAULT '0'
      `);
      console.log('✅ Added price column to runs table');
    } catch (error) {
      // Column might already exist, which is fine
      console.log('💡 Price column already exists or could not be added');
    }

    // Migration: Add timezone column to existing user_preferences table
    try {
      await db.execute(`
        ALTER TABLE user_preferences ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC'
      `);
      console.log('✅ Added timezone column to user_preferences table');
    } catch (error) {
      // Column might already exist, which is fine
      console.log('💡 Timezone column already exists or could not be added');
    }

    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error);
    throw error;
  }
}

// Helper function to generate user ID (for anonymous users)
export function generateUserId(): string {
  if (typeof window !== 'undefined') {
    // Try to get existing user ID from localStorage
    let userId = window.localStorage.getItem('user-id');
    if (!userId) {
      // Generate new user ID
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      window.localStorage.setItem('user-id', userId);
    }
    return userId;
  }
  // Server-side fallback
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    const result = await db.execute({
      sql: 'DELETE FROM flight_cache WHERE expires_at < datetime("now")',
      args: [],
    });

    if (result.rowsAffected > 0) {
      console.log(`🧹 Cleaned up ${result.rowsAffected} expired cache entries`);
    }
  } catch (error) {
    handleDatabaseError(error, 'cache cleanup');
  }
}
