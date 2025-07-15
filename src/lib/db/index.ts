import { Pool } from 'pg';
import { type User } from '../schema';

// Database client instance
let db: Pool | null = null;

// Get or create user in database
export async function getOrCreateUser(userId: string): Promise<string> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const db = getDatabase();

  try {
    // Check if user exists
    const existingUser = await db.query('SELECT id FROM users WHERE id = $1', [
      userId,
    ]);

    if (existingUser.rows.length === 0) {
      // Create new user
      const now = new Date().toISOString();
      await db.query(
        `INSERT INTO users (id, created_at, updated_at) VALUES ($1, $2, $3)`,
        [userId, now, now]
      );
      console.log(`✅ Created new user: ${userId}`);

      // Automatically create default user preferences
      await createDefaultUserPreferences(userId, now);
    }

    return userId;
  } catch (error) {
    handleDatabaseError(error, 'get or create user');
    throw error;
  }
}

// Create default user preferences for new user
async function createDefaultUserPreferences(
  userId: string,
  createdAt: string
): Promise<void> {
  try {
    const db = getDatabase();

    // Use UTC as default timezone (client will update with detected timezone)
    const defaultTimezone = 'UTC';

    // Default notification preferences
    const defaultNotificationPreferences = {
      pushNotificationsEnabled: true,
      flightUpdates: true,
      trafficAlerts: true,
      runReminders: true,
      smsNotificationsEnabled: false,
    };

    await db.query(
      `INSERT INTO user_preferences (
        user_id, home_airport, theme, timezone, 
        notification_preferences, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        null, // home_airport - let user set this
        'system', // default theme
        defaultTimezone, // client will update with detected timezone
        JSON.stringify(defaultNotificationPreferences),
        createdAt,
        createdAt,
      ]
    );

    console.log(
      `✅ Created default preferences for user: ${userId} with timezone: ${defaultTimezone}`
    );
  } catch (error) {
    handleDatabaseError(error, 'create default user preferences');
    // Don't throw - we don't want user creation to fail if preferences creation fails
  }
}

// Get user information
export async function getUser(userId: string): Promise<User | null> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const db = getDatabase();

    const result = await db.query('SELECT * FROM users WHERE id = $1', [
      userId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name || undefined,
      email: row.email || undefined,
      phoneNumber: row.phone_number || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    handleDatabaseError(error, 'get user');
    return null;
  }
}

// Update user information
export async function updateUser(
  userId: string,
  userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<User | null> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Ensure user exists
    await getOrCreateUser(userId);

    const setFields: string[] = [];
    const args: any[] = [];

    if (userData.name !== undefined) {
      setFields.push(`name = $${args.length + 1}`);
      args.push(userData.name);
    }

    if (userData.email !== undefined) {
      setFields.push(`email = $${args.length + 1}`);
      args.push(userData.email);
    }

    if (userData.phoneNumber !== undefined) {
      setFields.push(`phone_number = $${args.length + 1}`);
      args.push(userData.phoneNumber);
    }

    // Always update the updated_at timestamp
    setFields.push(`updated_at = $${args.length + 1}`);
    args.push(now);

    if (setFields.length === 1) {
      // Only updated_at was set, nothing to update
      return await getUser(userId);
    }

    const sql = `
      UPDATE users 
      SET ${setFields.join(', ')}
      WHERE id = $${args.length + 1}
      RETURNING *
    `;
    args.push(userId);

    const result = await db.query(sql, args);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const updatedUser: User = {
      id: row.id,
      name: row.name || undefined,
      email: row.email || undefined,
      phoneNumber: row.phone_number || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    console.log(`✅ Updated user: ${userId}`);
    return updatedUser;
  } catch (error) {
    handleDatabaseError(error, 'update user');
    return null;
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
