/**
 * Migration: drop_user_metadata_table
 * Version: 1.0.1 (patch)
 * Created: 2025-07-15T22:31:37.223Z
 *
 * Description: Drop user_metadata table as we're moving to localStorage-only solution
 * for browser/device metadata collection. This data is now handled client-side only.
 */

import { getDatabase } from '../src/lib/db';

export async function up(): Promise<void> {
  const db = getDatabase();

  console.log('⏭️  Running migration: drop_user_metadata_table');

  // Drop user_metadata indexes first
  await db.query(`DROP INDEX IF EXISTS idx_user_metadata_last_login`);
  await db.query(`DROP INDEX IF EXISTS idx_user_metadata_device_type`);
  await db.query(`DROP INDEX IF EXISTS idx_user_metadata_browser`);

  console.log('✅ Dropped user_metadata indexes');

  // Drop user_metadata table
  await db.query(`DROP TABLE IF EXISTS user_metadata`);

  console.log('✅ Dropped user_metadata table');
  console.log('📝 User metadata is now handled client-side in localStorage');

  console.log('✅ Migration completed: drop_user_metadata_table');
}

export async function down(): Promise<void> {
  const db = getDatabase();

  console.log('⏪ Rolling back migration: drop_user_metadata_table');

  // Recreate user_metadata table
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

  console.log('✅ Recreated user_metadata table');

  // Recreate indexes
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

  console.log('✅ Recreated user_metadata indexes');

  console.log('✅ Rollback completed: drop_user_metadata_table');
}
