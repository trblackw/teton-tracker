import { type NotificationPreferences, type UserPreferences } from '../schema';
import { getDatabase, getOrCreateUser, handleDatabaseError } from './index';

// Type for updating user preferences
export type UpdatePreferencesData = Partial<UserPreferences>;

// Get user preferences
export async function getUserPreferences(
  userId: string
): Promise<UserPreferences | null> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const db = getDatabase();
    const currentUserId = await getOrCreateUser(userId);

    const result = await db.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [currentUserId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      homeAirport: row.home_airport || undefined,
      theme: row.theme,
      timezone: row.timezone,
      notificationPreferences: JSON.parse(row.notification_preferences || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    handleDatabaseError(error, 'get user preferences');
    return null;
  }
}

// Create or update user preferences
export async function saveUserPreferences(
  preferences: Partial<UserPreferences>,
  userId: string
): Promise<UserPreferences | null> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const db = getDatabase();
    const currentUserId = await getOrCreateUser(userId);
    const now = new Date().toISOString();

    // Check if preferences exist
    const existing = await getUserPreferences(currentUserId);

    if (existing) {
      // Update existing preferences
      const setFields: string[] = [];
      const args: any[] = [];

      if (preferences.homeAirport !== undefined) {
        setFields.push(`home_airport = $${args.length + 1}`);
        args.push(preferences.homeAirport);
      }

      if (preferences.theme !== undefined) {
        setFields.push(`theme = $${args.length + 1}`);
        args.push(preferences.theme);
      }

      if (preferences.timezone !== undefined) {
        setFields.push(`timezone = $${args.length + 1}`);
        args.push(preferences.timezone);
      }

      if (preferences.notificationPreferences !== undefined) {
        setFields.push(`notification_preferences = $${args.length + 1}`);
        args.push(JSON.stringify(preferences.notificationPreferences));
      }

      // Always update the updated_at timestamp
      setFields.push(`updated_at = $${args.length + 1}`);
      args.push(now);

      if (setFields.length > 1) {
        // More than just updated_at
        const sql = `
          UPDATE user_preferences 
          SET ${setFields.join(', ')}
          WHERE user_id = $${args.length + 1}
          RETURNING *
        `;
        args.push(currentUserId);

        const result = await db.query(sql, args);

        if (result.rows.length > 0) {
          const row = result.rows[0];
          const updated: UserPreferences = {
            id: row.id,
            userId: row.user_id,
            homeAirport: row.home_airport || undefined,
            theme: row.theme,
            timezone: row.timezone,
            notificationPreferences: JSON.parse(
              row.notification_preferences || '{}'
            ),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };

          console.log(`✅ Updated preferences for user: ${currentUserId}`);
          return updated;
        }
      }

      return existing;
    } else {
      // Create new preferences
      const preferencesId = crypto.randomUUID();
      const newPreferences: UserPreferences = {
        id: preferencesId,
        userId: currentUserId,
        homeAirport: preferences.homeAirport || undefined,
        theme: preferences.theme || 'system',
        timezone: preferences.timezone || 'UTC',
        notificationPreferences: preferences.notificationPreferences || {
          pushNotificationsEnabled: true,
          flightUpdates: true,
          trafficAlerts: true,
          runReminders: true,
          smsNotificationsEnabled: false,
        },
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };

      await db.query(
        `INSERT INTO user_preferences (
          id, user_id, home_airport, theme, timezone, 
          notification_preferences, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          newPreferences.id,
          newPreferences.userId,
          newPreferences.homeAirport || null,
          newPreferences.theme,
          newPreferences.timezone,
          JSON.stringify(newPreferences.notificationPreferences),
          now,
          now,
        ]
      );

      console.log(`✅ Created preferences for user: ${currentUserId}`);
      return newPreferences;
    }
  } catch (error) {
    handleDatabaseError(error, 'save user preferences');
    return null;
  }
}

// Update notification preferences
export async function updateNotificationPreferences(
  notificationPreferences: NotificationPreferences,
  userId: string
): Promise<boolean> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const db = getDatabase();
    const currentUserId = await getOrCreateUser(userId);
    const now = new Date().toISOString();

    const result = await db.query(
      `UPDATE user_preferences 
       SET notification_preferences = $1, updated_at = $2
       WHERE user_id = $3`,
      [JSON.stringify(notificationPreferences), now, currentUserId]
    );

    const success = result.rowCount != null && result.rowCount > 0;
    if (success) {
      console.log(
        `✅ Updated notification preferences for user: ${currentUserId}`
      );
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'update notification preferences');
    return false;
  }
}

// Delete user preferences
export async function deleteUserPreferences(userId: string): Promise<boolean> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const db = getDatabase();
    const currentUserId = await getOrCreateUser(userId);

    const result = await db.query(
      'DELETE FROM user_preferences WHERE user_id = $1',
      [currentUserId]
    );

    const success = result.rowCount != null && result.rowCount > 0;
    if (success) {
      console.log(`🗑️ Deleted preferences for user: ${currentUserId}`);
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'delete user preferences');
    return false;
  }
}
