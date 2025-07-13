import { createClient, type Client } from '@libsql/client';

// Utility function to generate user IDs
export function generateUserId(): string {
  if (typeof window !== 'undefined') {
    // Try to get existing user ID from localStorage
    let userId = window.localStorage.getItem('user-id');
    if (!userId) {
      // Generate UUID-based user ID with localStorage + cookie persistence
      const LS_KEY = 'user_fingerprint';
      const COOKIE_KEY = 'user_fingerprint';

      const getFromCookie = (): string | null => {
        const match = document.cookie.match(
          new RegExp(`(^| )${COOKIE_KEY}=([^;]+)`)
        );
        return match ? match[2] : null;
      };

      const setCookie = (value: string) => {
        document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=31536000`; // 1 year
      };

      let uuid = localStorage.getItem(LS_KEY) || getFromCookie();

      if (!uuid) {
        uuid = crypto.randomUUID();
        localStorage.setItem(LS_KEY, uuid);
        setCookie(uuid);
      } else {
        // Sync cookie and localStorage if one is missing
        if (!localStorage.getItem(LS_KEY)) localStorage.setItem(LS_KEY, uuid);
        if (!getFromCookie()) setCookie(uuid);
      }

      userId = `user_${uuid}`;
      window.localStorage.setItem('user-id', userId);
    }
    return userId;
  }
  // Server-side fallback
  return `user_${crypto.randomUUID()}`;
}

// Get or create user in database
export async function getOrCreateUser(userId?: string): Promise<string> {
  const db = getDatabase();
  const currentUserId = userId || generateUserId();

  try {
    // Check if user exists
    const existingUser = await db.execute({
      sql: 'SELECT id FROM users WHERE id = ?',
      args: [currentUserId],
    });

    if (existingUser.rows.length === 0) {
      // Create new user
      const now = new Date().toISOString();
      await db.execute({
        sql: `
          INSERT INTO users (id, created_at, updated_at)
          VALUES (?, ?, ?)
        `,
        args: [currentUserId, now, now],
      });
      console.log(`✅ Created new user: ${currentUserId}`);
    }

    return currentUserId;
  } catch (error) {
    handleDatabaseError(error, 'get or create user');
    return currentUserId;
  }
}

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
