/**
 * Migration: Add name column to users table
 * Version: 0.0.1 (patch)
 * Created: 2025-07-15T12:58:00.000Z
 */

import { getDatabase } from '../src/lib/db';

export async function up(): Promise<void> {
  const db = getDatabase();

  console.log('⏭️  Running migration: Add name column to users table');

  // Check if column already exists (for existing databases)
  const columnCheck = await db.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'name'
  `);

  if (columnCheck.rows.length > 0) {
    console.log('⏩ Name column already exists, skipping');
    return;
  }

  // Add the name column
  await db.query(`
    ALTER TABLE users 
    ADD COLUMN name VARCHAR(255)
  `);

  console.log('✅ Migration completed: Added name column to users table');
}

export async function down(): Promise<void> {
  const db = getDatabase();

  console.log('⏪ Rolling back migration: Remove name column from users table');

  // Remove the name column
  await db.query(`
    ALTER TABLE users 
    DROP COLUMN IF EXISTS name
  `);

  console.log('✅ Rollback completed: Removed name column from users table');
}
