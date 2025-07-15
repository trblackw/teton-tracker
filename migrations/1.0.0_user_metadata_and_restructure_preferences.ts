/**
 * Migration: user_metadata_and_restructure_preferences
 * Version: 1.0.0 (major)
 * Created: 2025-07-15T16:33:15.730Z
 */

import { getDatabase } from '../src/lib/db';

export async function up(): Promise<void> {
  const db = getDatabase();

  console.log(
    '⏭️  Running migration: user_metadata_and_restructure_preferences'
  );

  // Step 1: Create the new user_metadata table
  await db.query(`
    CREATE TABLE user_metadata (
      user_id TEXT PRIMARY KEY,
      device_type TEXT,
      browser TEXT,
      browser_version TEXT,
      operating_system TEXT,
      screen_resolution TEXT,
      user_agent TEXT,
      timezone_detected TEXT,
      last_login_at TIMESTAMP,
      login_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ Created user_metadata table');

  // Step 2: Create indexes for user_metadata
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_metadata_last_login 
    ON user_metadata(last_login_at)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_metadata_device_type 
    ON user_metadata(device_type)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_metadata_browser 
    ON user_metadata(browser)
  `);

  console.log('✅ Created user_metadata indexes');

  // Step 3: Restructure user_preferences to use user_id as primary key
  // First, create a backup table with old structure
  await db.query(`
    CREATE TABLE user_preferences_backup AS 
    SELECT * FROM user_preferences
  `);

  console.log('✅ Created backup of user_preferences');

  // Step 4: Create new user_preferences table with correct schema
  await db.query(`
    CREATE TABLE user_preferences_new (
      user_id TEXT PRIMARY KEY,
      home_airport TEXT,
      theme TEXT DEFAULT 'system',
      timezone TEXT DEFAULT 'UTC',
      notification_preferences TEXT DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ Created new user_preferences table structure');

  // Step 5: Migrate data from old table to new table (handling duplicates)
  await db.query(`
    INSERT INTO user_preferences_new (
      user_id, home_airport, theme, timezone, 
      notification_preferences, created_at, updated_at
    )
    SELECT DISTINCT ON (user_id)
      user_id, home_airport, theme, timezone,
      notification_preferences, created_at, updated_at
    FROM user_preferences_backup
    WHERE user_id IS NOT NULL
    ORDER BY user_id, created_at DESC
  `);

  console.log('✅ Migrated data to new user_preferences structure');

  // Step 6: Drop old table and rename new one
  await db.query(`DROP TABLE user_preferences`);
  await db.query(`ALTER TABLE user_preferences_new RENAME TO user_preferences`);

  console.log('✅ Renamed new table to user_preferences');

  // Step 7: Recreate indexes for user_preferences
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
    ON user_preferences(user_id)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_preferences_theme 
    ON user_preferences(theme)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_preferences_timezone 
    ON user_preferences(timezone)
  `);

  console.log('✅ Created user_preferences indexes');

  // Step 8: Clean up backup table
  await db.query(`DROP TABLE user_preferences_backup`);

  console.log('✅ Cleaned up backup table');
  console.log(
    '✅ Migration completed: user_metadata_and_restructure_preferences'
  );
}

export async function down(): Promise<void> {
  const db = getDatabase();

  console.log(
    '⏪ Rolling back migration: user_metadata_and_restructure_preferences'
  );

  // Step 1: Create backup of current user_preferences data
  await db.query(`
    CREATE TABLE user_preferences_rollback_backup AS 
    SELECT * FROM user_preferences
  `);

  console.log('✅ Created rollback backup of user_preferences');

  // Step 2: Recreate old user_preferences structure with id column
  await db.query(`DROP TABLE user_preferences`);

  await db.query(`
    CREATE TABLE user_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      home_airport TEXT,
      theme TEXT DEFAULT 'system',
      timezone TEXT DEFAULT 'UTC',
      notification_preferences TEXT DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ Recreated old user_preferences structure');

  // Step 3: Migrate data back with generated UUIDs
  await db.query(`
    INSERT INTO user_preferences (
      id, user_id, home_airport, theme, timezone,
      notification_preferences, created_at, updated_at
    )
    SELECT 
      uuid_generate_v4()::text, user_id, home_airport, theme, timezone,
      notification_preferences, created_at, updated_at
    FROM user_preferences_rollback_backup
  `);

  console.log('✅ Migrated data back to old structure');

  // Step 4: Recreate old indexes
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
    ON user_preferences(user_id)
  `);

  console.log('✅ Recreated old indexes');

  // Step 5: Drop user_metadata table
  await db.query(`DROP TABLE IF EXISTS user_metadata`);

  console.log('✅ Dropped user_metadata table');

  // Step 6: Clean up backup
  await db.query(`DROP TABLE user_preferences_rollback_backup`);

  console.log('✅ Cleaned up rollback backup');
  console.log(
    '✅ Rollback completed: user_metadata_and_restructure_preferences'
  );
}
