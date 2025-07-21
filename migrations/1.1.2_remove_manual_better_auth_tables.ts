/**
 * Migration: Remove Manual Better Auth Tables
 * Version: 1.1.2
 *
 * This migration removes the manually created BetterAuth tables that are
 * redundant with BetterAuth's auto-created tables.
 *
 * Removes:
 * - users table (BetterAuth creates 'user')
 * - sessions table (BetterAuth creates 'session')
 * - accounts table (BetterAuth creates 'account')
 * - verification table (BetterAuth creates 'verification')
 *
 * Note: The manual tables are empty (0 users) so this is safe.
 * BetterAuth auto-creates its own tables with singular names.
 */

import { getDatabase } from '../src/lib/db/index';

export async function up(): Promise<void> {
  const db = getDatabase();
  console.log('🔄 Removing redundant manual BetterAuth tables...');

  try {
    // Drop manual BetterAuth tables (they conflict with BetterAuth's auto-created tables)
    // These are safe to drop since they're empty and BetterAuth creates its own

    await db.query('DROP TABLE IF EXISTS sessions CASCADE');
    console.log('✅ Dropped manual sessions table');

    await db.query('DROP TABLE IF EXISTS accounts CASCADE');
    console.log('✅ Dropped manual accounts table');

    await db.query('DROP TABLE IF EXISTS verification CASCADE');
    console.log('✅ Dropped manual verification table');

    await db.query('DROP TABLE IF EXISTS users CASCADE');
    console.log('✅ Dropped manual users table');

    console.log('🎉 Successfully removed redundant BetterAuth tables!');
    console.log(
      '📝 BetterAuth will auto-create its own tables: user, session, account, verification'
    );
  } catch (error) {
    console.error('❌ Error removing manual BetterAuth tables:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  const db = getDatabase();
  console.log('🔄 Recreating manual BetterAuth tables...');

  try {
    // Recreate the original manual tables if needed
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone_number VARCHAR(50),
        image_url TEXT,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ip_address VARCHAR(45),
        user_agent TEXT
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id VARCHAR(255) NOT NULL,
        provider_id VARCHAR(255) NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        id_token TEXT,
        expires_at TIMESTAMP WITH TIME ZONE,
        password VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(provider_id, account_id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS verification (
        id VARCHAR(255) PRIMARY KEY,
        identifier VARCHAR(255) NOT NULL,
        value VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log('🎉 Recreated manual BetterAuth tables');
  } catch (error) {
    console.error('❌ Error recreating manual BetterAuth tables:', error);
    throw error;
  }
}
