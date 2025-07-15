import { type UserMetadata } from '../schema';
import { getDatabase, getOrCreateUser, handleDatabaseError } from './index';

// Type for updating user metadata
export type UpdateUserMetadataData = Partial<UserMetadata>;

// Get user metadata
export async function getUserMetadata(
  userId: string
): Promise<UserMetadata | null> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const db = getDatabase();
    const currentUserId = await getOrCreateUser(userId);

    const result = await db.query(
      'SELECT * FROM user_metadata WHERE user_id = $1',
      [currentUserId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      userId: row.user_id,
      deviceType: row.device_type || undefined,
      browser: row.browser || undefined,
      browserVersion: row.browser_version || undefined,
      operatingSystem: row.operating_system || undefined,
      screenResolution: row.screen_resolution || undefined,
      userAgent: row.user_agent || undefined,
      timezoneDetected: row.timezone_detected || undefined,
      lastLoginAt: row.last_login_at,
      loginCount: row.login_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    handleDatabaseError(error, 'get user metadata');
    return null;
  }
}

// Create or update user metadata
export async function saveUserMetadata(
  metadata: Partial<UserMetadata>,
  userId: string
): Promise<UserMetadata | null> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const db = getDatabase();
    const currentUserId = await getOrCreateUser(userId);
    const now = new Date().toISOString();

    // Use UPSERT (INSERT ... ON CONFLICT) since user_id is the primary key
    const result = await db.query(
      `INSERT INTO user_metadata (
        user_id, device_type, browser, browser_version, operating_system,
        screen_resolution, user_agent, timezone_detected, last_login_at,
        login_count, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        device_type = COALESCE($2, user_metadata.device_type),
        browser = COALESCE($3, user_metadata.browser),
        browser_version = COALESCE($4, user_metadata.browser_version),
        operating_system = COALESCE($5, user_metadata.operating_system),
        screen_resolution = COALESCE($6, user_metadata.screen_resolution),
        user_agent = COALESCE($7, user_metadata.user_agent),
        timezone_detected = COALESCE($8, user_metadata.timezone_detected),
        last_login_at = COALESCE($9, user_metadata.last_login_at),
        login_count = CASE 
          WHEN $10 IS NOT NULL THEN $10 
          ELSE user_metadata.login_count + 1 
        END,
        updated_at = $12
      RETURNING *`,
      [
        currentUserId,
        metadata.deviceType || null,
        metadata.browser || null,
        metadata.browserVersion || null,
        metadata.operatingSystem || null,
        metadata.screenResolution || null,
        metadata.userAgent || null,
        metadata.timezoneDetected || null,
        metadata.lastLoginAt || null,
        metadata.loginCount || null,
        now, // created_at
        now, // updated_at
      ]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const savedMetadata: UserMetadata = {
        userId: row.user_id,
        deviceType: row.device_type || undefined,
        browser: row.browser || undefined,
        browserVersion: row.browser_version || undefined,
        operatingSystem: row.operating_system || undefined,
        screenResolution: row.screen_resolution || undefined,
        userAgent: row.user_agent || undefined,
        timezoneDetected: row.timezone_detected || undefined,
        lastLoginAt: row.last_login_at,
        loginCount: row.login_count || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      console.log(`✅ Saved metadata for user: ${currentUserId}`);
      return savedMetadata;
    }

    return null;
  } catch (error) {
    handleDatabaseError(error, 'save user metadata');
    return null;
  }
}

// Update login tracking
export async function updateLoginTracking(
  userId: string,
  loginData?: {
    deviceType?: string;
    browser?: string;
    browserVersion?: string;
    operatingSystem?: string;
    screenResolution?: string;
    userAgent?: string;
    timezoneDetected?: string;
  }
): Promise<boolean> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const db = getDatabase();
    const currentUserId = await getOrCreateUser(userId);
    const now = new Date().toISOString();

    const metadata: Partial<UserMetadata> = {
      lastLoginAt: new Date(now),
      ...loginData,
    };

    const result = await saveUserMetadata(metadata, currentUserId);
    return result !== null;
  } catch (error) {
    handleDatabaseError(error, 'update login tracking');
    return false;
  }
}

// Delete user metadata
export async function deleteUserMetadata(userId: string): Promise<boolean> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const db = getDatabase();
    const currentUserId = await getOrCreateUser(userId);

    const result = await db.query(
      'DELETE FROM user_metadata WHERE user_id = $1',
      [currentUserId]
    );

    const success = result.rowCount != null && result.rowCount > 0;
    if (success) {
      console.log(`🗑️ Deleted metadata for user: ${currentUserId}`);
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'delete user metadata');
    return false;
  }
}

// Get user metadata analytics (for admin/debug purposes)
export async function getUserMetadataAnalytics(): Promise<{
  totalUsers: number;
  deviceTypes: Record<string, number>;
  browsers: Record<string, number>;
  operatingSystems: Record<string, number>;
} | null> {
  try {
    const db = getDatabase();

    // Get total users with metadata
    const totalResult = await db.query(
      'SELECT COUNT(*) as count FROM user_metadata'
    );
    const totalUsers = parseInt(totalResult.rows[0].count, 10);

    // Get device type distribution
    const deviceResult = await db.query(`
      SELECT device_type, COUNT(*) as count 
      FROM user_metadata 
      WHERE device_type IS NOT NULL 
      GROUP BY device_type
    `);
    const deviceTypes = deviceResult.rows.reduce(
      (acc, row) => {
        acc[row.device_type] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>
    );

    // Get browser distribution
    const browserResult = await db.query(`
      SELECT browser, COUNT(*) as count 
      FROM user_metadata 
      WHERE browser IS NOT NULL 
      GROUP BY browser
    `);
    const browsers = browserResult.rows.reduce(
      (acc, row) => {
        acc[row.browser] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>
    );

    // Get OS distribution
    const osResult = await db.query(`
      SELECT operating_system, COUNT(*) as count 
      FROM user_metadata 
      WHERE operating_system IS NOT NULL 
      GROUP BY operating_system
    `);
    const operatingSystems = osResult.rows.reduce(
      (acc, row) => {
        acc[row.operating_system] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalUsers,
      deviceTypes,
      browsers,
      operatingSystems,
    };
  } catch (error) {
    handleDatabaseError(error, 'get user metadata analytics');
    return null;
  }
}
