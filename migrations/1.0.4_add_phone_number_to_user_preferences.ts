import { getDatabase } from '../src/lib/db/index';

/**
 * Migration: Add phone number to user preferences (Fix)
 * Version: 1.0.4
 *
 * This migration ensures the phone_number column exists in user_preferences table
 * to support SMS notifications. This is a safety migration in case the column
 * was not properly added in a previous migration.
 */

export async function up(): Promise<void> {
  const db = getDatabase();
  console.log('🔄 Adding phone_number column to user_preferences table...');

  try {
    // Add phone_number column if it doesn't exist
    await db.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'user_preferences' 
          AND column_name = 'phone_number'
        ) THEN
          ALTER TABLE user_preferences 
          ADD COLUMN phone_number VARCHAR(20);
          
          RAISE NOTICE 'Added phone_number column to user_preferences table';
        ELSE
          RAISE NOTICE 'phone_number column already exists in user_preferences table';
        END IF;
      END $$;
    `);

    console.log(
      '✅ Successfully verified phone_number column in user_preferences table'
    );
  } catch (error) {
    console.error('❌ Migration 1.0.4 failed:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  const db = getDatabase();
  console.log('🔄 Removing phone_number column from user_preferences table...');

  try {
    await db.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'user_preferences' 
          AND column_name = 'phone_number'
        ) THEN
          ALTER TABLE user_preferences 
          DROP COLUMN phone_number;
          
          RAISE NOTICE 'Removed phone_number column from user_preferences table';
        ELSE
          RAISE NOTICE 'phone_number column does not exist in user_preferences table';
        END IF;
      END $$;
    `);

    console.log(
      '✅ Successfully removed phone_number column from user_preferences table'
    );
  } catch (error) {
    console.error('❌ Migration 1.0.4 rollback failed:', error);
    throw error;
  }
}
