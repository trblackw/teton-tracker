import { type NotificationPreferences, type UserPreferences } from '../schema';
import { getDatabase, getOrCreateUser, handleDatabaseError } from './index';

export interface UpdatePreferencesData {
  email?: string;
  phoneNumber?: string;
  homeAirport?: string;
  theme?: 'light' | 'dark' | 'system';
  timezone?: string;
  notificationPreferences?: Partial<NotificationPreferences>;
}

// Get user preferences
export async function getUserPreferences(
  userId?: string
): Promise<UserPreferences | null> {
  try {
    const db = getDatabase();
    const currentUserId = userId || (await getOrCreateUser());

    const result = await db.execute({
      sql: `
        SELECT id, user_id, email, phone_number, home_airport, theme, timezone, 
               notification_preferences, created_at, updated_at
        FROM user_preferences 
        WHERE user_id = ?
      `,
      args: [currentUserId],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const notificationPreferences = JSON.parse(
      (row.notification_preferences as string) || '{}'
    );

    return {
      id: row.id as string,
      userId: row.user_id as string,
      email: row.email as string | undefined,
      phoneNumber: row.phone_number as string | undefined,
      homeAirport: row.home_airport as string | undefined,
      theme: (row.theme as 'light' | 'dark' | 'system') || 'system',
      timezone: (row.timezone as string) || 'UTC',
      notificationPreferences: {
        pushNotificationsEnabled:
          notificationPreferences.pushNotificationsEnabled ?? true,
        flightUpdates: notificationPreferences.flightUpdates ?? true,
        trafficAlerts: notificationPreferences.trafficAlerts ?? true,
        runReminders: notificationPreferences.runReminders ?? true,
      },
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  } catch (error) {
    handleDatabaseError(error, 'get user preferences');
    return null;
  }
}

// Create or update user preferences
export async function updateUserPreferences(
  data: UpdatePreferencesData,
  userId?: string
): Promise<UserPreferences> {
  try {
    const db = getDatabase();
    const currentUserId = userId || (await getOrCreateUser());
    const now = new Date().toISOString();

    // First, try to get existing preferences
    const existing = await getUserPreferences(currentUserId);

    if (existing) {
      // Update existing preferences
      const mergedNotificationPreferences = {
        ...existing.notificationPreferences,
        ...data.notificationPreferences,
      };

      await db.execute({
        sql: `
          UPDATE user_preferences 
          SET email = ?, phone_number = ?, home_airport = ?, theme = ?, timezone = ?, 
              notification_preferences = ?, updated_at = ?
          WHERE user_id = ?
        `,
        args: [
          data.email ?? existing.email ?? null,
          data.phoneNumber ?? existing.phoneNumber ?? null,
          data.homeAirport ?? existing.homeAirport ?? null,
          data.theme ?? existing.theme,
          data.timezone ?? existing.timezone,
          JSON.stringify(mergedNotificationPreferences),
          now,
          currentUserId,
        ],
      });

      console.log(`✅ Updated preferences for user: ${currentUserId}`);

      // Return updated preferences
      return {
        ...existing,
        email: data.email ?? existing.email,
        phoneNumber: data.phoneNumber ?? existing.phoneNumber,
        homeAirport: data.homeAirport ?? existing.homeAirport,
        theme: data.theme ?? existing.theme,
        timezone: data.timezone ?? existing.timezone,
        notificationPreferences: mergedNotificationPreferences,
        updatedAt: new Date(now),
      };
    } else {
      // User doesn't have preferences yet - create them
      const defaultNotificationPreferences = {
        pushNotificationsEnabled:
          data.notificationPreferences?.pushNotificationsEnabled ?? true,
        flightUpdates: data.notificationPreferences?.flightUpdates ?? true,
        trafficAlerts: data.notificationPreferences?.trafficAlerts ?? true,
        runReminders: data.notificationPreferences?.runReminders ?? true,
      };

      const preferencesId = crypto.randomUUID();

      await db.execute({
        sql: `
          INSERT INTO user_preferences 
          (id, user_id, email, phone_number, home_airport, theme, timezone, notification_preferences, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          preferencesId,
          currentUserId,
          data.email || null,
          data.phoneNumber || null,
          data.homeAirport || null,
          data.theme || 'system',
          data.timezone || 'UTC',
          JSON.stringify(defaultNotificationPreferences),
          now,
          now,
        ],
      });

      console.log(`✅ Created preferences for user: ${currentUserId}`);

      return {
        id: preferencesId,
        userId: currentUserId,
        email: data.email,
        phoneNumber: data.phoneNumber,
        homeAirport: data.homeAirport,
        theme: data.theme || 'system',
        timezone: data.timezone || 'UTC',
        notificationPreferences: defaultNotificationPreferences,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };
    }
  } catch (error) {
    handleDatabaseError(error, 'update user preferences');
    throw new Error('Failed to update user preferences');
  }
}

// Update home airport specifically
export async function updateHomeAirport(
  homeAirport: string,
  userId?: string
): Promise<boolean> {
  try {
    await updateUserPreferences({ homeAirport }, userId);
    return true;
  } catch (error) {
    handleDatabaseError(error, 'update home airport');
    return false;
  }
}

// Update theme specifically
export async function updateTheme(
  theme: 'light' | 'dark' | 'system',
  userId?: string
): Promise<boolean> {
  try {
    await updateUserPreferences({ theme }, userId);
    return true;
  } catch (error) {
    handleDatabaseError(error, 'update theme');
    return false;
  }
}

// Get home airport for user
export async function getHomeAirport(userId?: string): Promise<string | null> {
  try {
    const preferences = await getUserPreferences(userId);
    return preferences?.homeAirport || null;
  } catch (error) {
    handleDatabaseError(error, 'get home airport');
    return null;
  }
}

// Check if user has any preferences set
export async function hasUserPreferences(userId?: string): Promise<boolean> {
  try {
    const preferences = await getUserPreferences(userId);
    return preferences !== null;
  } catch (error) {
    handleDatabaseError(error, 'check user preferences');
    return false;
  }
}

// Delete user preferences (for cleanup/privacy)
export async function deleteUserPreferences(userId: string): Promise<boolean> {
  try {
    const db = getDatabase();

    const result = await db.execute({
      sql: 'DELETE FROM user_preferences WHERE user_id = ?',
      args: [userId],
    });

    const success = result.rowsAffected > 0;
    if (success) {
      console.log(`🗑️ Deleted preferences for user: ${userId}`);
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'delete user preferences');
    return false;
  }
}
