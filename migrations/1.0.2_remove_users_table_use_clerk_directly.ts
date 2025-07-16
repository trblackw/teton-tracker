#!/usr/bin/env bun

/**
 * Migration: Remove users table and use Clerk user IDs directly
 * Version: 1.0.2
 *
 * This migration simplifies the authentication system by:
 * 1. Removing the custom users table entirely
 * 2. Using Clerk user IDs directly in all related tables
 * 3. Dropping foreign key constraints that referenced the users table
 *
 * This eliminates the need for user synchronization and webhooks.
 */

import { getDatabase } from '../src/lib/db';

export async function up(): Promise<void> {
  const db = getDatabase();
  console.log('🚀 Starting migration: Remove users table, use Clerk directly');

  try {
    // Step 1: Drop foreign key constraints from user_preferences
    console.log('📋 Dropping foreign key constraint from user_preferences...');
    await db.query(`
      ALTER TABLE user_preferences 
      DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey
    `);

    // Step 2: Drop foreign key constraints from runs
    console.log('📋 Dropping foreign key constraint from runs...');
    await db.query(`
      ALTER TABLE runs 
      DROP CONSTRAINT IF EXISTS runs_user_id_fkey
    `);

    // Step 3: Drop foreign key constraints from notifications
    console.log('📋 Dropping foreign key constraint from notifications...');
    await db.query(`
      ALTER TABLE notifications 
      DROP CONSTRAINT IF EXISTS notifications_user_id_fkey
    `);

    // Step 4: Drop users table entirely
    console.log('🗑️  Dropping users table...');
    await db.query(`DROP TABLE IF EXISTS users CASCADE`);

    // Step 5: Add comments to tables to document the new approach
    await db.query(`
      COMMENT ON COLUMN user_preferences.user_id IS 'Clerk user ID - no longer references users table'
    `);

    await db.query(`
      COMMENT ON COLUMN runs.user_id IS 'Clerk user ID - no longer references users table'
    `);

    await db.query(`
      COMMENT ON COLUMN notifications.user_id IS 'Clerk user ID - no longer references users table'
    `);

    // Step 6: Remove user-related indexes that are no longer needed
    console.log('🗑️  Removing obsolete user table indexes...');
    await db.query(`DROP INDEX IF EXISTS idx_users_created_at`);

    console.log('✅ Migration completed successfully');
    console.log('🎉 Users table removed - now using Clerk user IDs directly!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  const db = getDatabase();
  console.log('🔄 Rolling back migration: Recreating users table');

  try {
    // Step 1: Recreate users table
    console.log('📋 Recreating users table...');
    await db.query(`
      CREATE TABLE users (
        id text PRIMARY KEY,
        name text,
        email text,
        phone_number text,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Step 2: Recreate users table index
    await db.query(`
      CREATE INDEX idx_users_created_at ON users(created_at)
    `);

    // Step 3: Add foreign key constraints back
    console.log('📋 Recreating foreign key constraints...');
    await db.query(`
      ALTER TABLE user_preferences 
      ADD CONSTRAINT user_preferences_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    await db.query(`
      ALTER TABLE runs 
      ADD CONSTRAINT runs_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    await db.query(`
      ALTER TABLE notifications 
      ADD CONSTRAINT notifications_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    // Step 4: Remove comments
    await db.query(`COMMENT ON COLUMN user_preferences.user_id IS NULL`);
    await db.query(`COMMENT ON COLUMN runs.user_id IS NULL`);
    await db.query(`COMMENT ON COLUMN notifications.user_id IS NULL`);

    console.log('✅ Rollback completed successfully');
    console.log(
      '⚠️  Note: You will need to repopulate the users table with data'
    );
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}
