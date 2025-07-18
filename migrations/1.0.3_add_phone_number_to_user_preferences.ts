import { getDatabase } from '../src/lib/db/index';

/**
 * Migration: Add phone number to user preferences
 * Version: 1.0.3
 *
 * This migration adds phone_number column to user_preferences table
 * to support SMS notifications.
 */

export async function up(): Promise<void> {
  const db = getDatabase();
  console.log(
    '🔄 Running migration 1.0.3: Add phone number to user preferences...'
  );

  try {
    // Add phone_number column to user_preferences table
    await db.query(`
      ALTER TABLE user_preferences 
      ADD COLUMN phone_number VARCHAR(20)
    `);

    console.log('✅ Added phone_number column to user_preferences table');

    // Update notification_preferences column to include SMS preferences for existing users
    const result = await db.query(
      'SELECT user_id, notification_preferences FROM user_preferences'
    );

    for (const user of result.rows) {
      const currentPrefs = JSON.parse(user.notification_preferences || '{}');

      // Add new SMS-specific preferences with sensible defaults
      const updatedPrefs = {
        ...currentPrefs,
        smsFlightUpdates: currentPrefs.smsFlightUpdates ?? true,
        smsTrafficAlerts: currentPrefs.smsTrafficAlerts ?? true,
        smsRunReminders: currentPrefs.smsRunReminders ?? true,
      };

      await db.query(
        'UPDATE user_preferences SET notification_preferences = $1 WHERE user_id = $2',
        [JSON.stringify(updatedPrefs), user.user_id]
      );
    }

    console.log('✅ Updated notification preferences for existing users');
    console.log('✅ Migration 1.0.3 completed successfully');
  } catch (error) {
    console.error('❌ Migration 1.0.3 failed:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  const db = getDatabase();
  console.log(
    '🔄 Rolling back migration 1.0.3: Remove phone number from user preferences...'
  );

  try {
    // PostgreSQL supports DROP COLUMN directly
    await db.query(`
      ALTER TABLE user_preferences 
      DROP COLUMN IF EXISTS phone_number
    `);

    console.log('✅ Removed phone_number column from user_preferences table');

    // Remove SMS-specific preferences from existing users
    const result = await db.query(
      'SELECT user_id, notification_preferences FROM user_preferences'
    );

    for (const user of result.rows) {
      const currentPrefs = JSON.parse(user.notification_preferences || '{}');

      // Remove SMS-specific preferences
      const {
        smsFlightUpdates,
        smsTrafficAlerts,
        smsRunReminders,
        ...cleanedPrefs
      } = currentPrefs;

      await db.query(
        'UPDATE user_preferences SET notification_preferences = $1 WHERE user_id = $2',
        [JSON.stringify(cleanedPrefs), user.user_id]
      );
    }

    console.log('✅ Removed SMS preferences from existing users');
    console.log('✅ Migration 1.0.3 rollback completed successfully');
  } catch (error) {
    console.error('❌ Migration 1.0.3 rollback failed:', error);
    throw error;
  }
}
