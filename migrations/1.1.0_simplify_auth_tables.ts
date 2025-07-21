import { getDatabase } from '../src/lib/db/index';

/**
 * Migration: Simplify Auth Tables
 * Version: 1.1.0
 *
 * This migration:
 * 1. Removes verification table (not needed)
 * 2. Updates users table: email_verified as TIMESTAMP instead of BOOLEAN
 * 3. Simplifies accounts table (removes OAuth-specific fields)
 * 4. Simplifies organizations table (keeps only essential fields)
 * 5. Updates organization_memberships to reference simplified organizations
 */

export async function up(): Promise<void> {
  const db = getDatabase();
  console.log('🔄 Simplifying auth tables...');

  try {
    // Step 1: Drop verification table (not needed)
    await db.query('DROP TABLE IF EXISTS verification CASCADE');
    console.log('✅ Dropped verification table');

    // Step 2: Update users table - change email_verified to email_verified_at TIMESTAMP
    await db.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS email_verified
    `);
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE
    `);
    console.log('✅ Updated users table - email_verified_at is now TIMESTAMP');

    // Step 3: Simplify accounts table - remove OAuth fields
    await db.query(`
      ALTER TABLE accounts 
      DROP COLUMN IF EXISTS access_token,
      DROP COLUMN IF EXISTS refresh_token,
      DROP COLUMN IF EXISTS id_token,
      DROP COLUMN IF EXISTS expires_at,
      DROP COLUMN IF EXISTS updated_at
    `);

    // Also remove the account_id column since we're only doing credential auth
    await db.query(`
      ALTER TABLE accounts 
      DROP COLUMN IF EXISTS account_id
    `);

    // Update the unique constraint to just be on user_id + provider_id
    await db.query(`
      DROP INDEX IF EXISTS accounts_provider_id_account_id_key
    `);
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_user_provider 
      ON accounts(user_id, provider_id)
    `);
    console.log('✅ Simplified accounts table - removed OAuth fields');

    // Step 4: Simplify organizations table
    // First, create a backup of any existing organizations if needed
    await db.query(`
      CREATE TEMPORARY TABLE temp_orgs AS 
      SELECT id, name, image_url, created_by, created_at 
      FROM organizations
    `);

    // Drop and recreate organizations table with simplified structure
    await db.query('DROP TABLE IF EXISTS organizations CASCADE');
    await db.query(`
      CREATE TABLE organizations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        image_url TEXT,
        created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Restore any existing data
    await db.query(`
      INSERT INTO organizations (id, name, image_url, created_by, created_at)
      SELECT id, name, image_url, created_by, created_at 
      FROM temp_orgs
    `);

    await db.query('DROP TABLE temp_orgs');
    console.log('✅ Simplified organizations table');

    // Step 5: Recreate organization_memberships table with foreign key to new organizations
    await db.query('DROP TABLE IF EXISTS organization_memberships CASCADE');
    await db.query(`
      CREATE TABLE organization_memberships (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'driver' CHECK (role IN ('admin', 'driver')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(organization_id, user_id)
      )
    `);
    console.log('✅ Recreated organization_memberships table');

    // Step 6: Update indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
      CREATE INDEX IF NOT EXISTS idx_organization_memberships_org_id ON organization_memberships(organization_id);
      CREATE INDEX IF NOT EXISTS idx_organization_memberships_user_id ON organization_memberships(user_id);
    `);
    console.log('✅ Updated database indexes');

    console.log('🎉 Auth tables simplification completed successfully!');
  } catch (error) {
    console.error('❌ Error simplifying auth tables:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  const db = getDatabase();
  console.log('🔄 Rolling back auth tables simplification...');

  try {
    // This rollback restores the original 1.0.9 structure

    // Restore verification table
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

    // Restore users table email_verified as BOOLEAN
    await db.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS email_verified_at
    `);
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN email_verified BOOLEAN DEFAULT FALSE
    `);

    // Restore full accounts table structure
    await db.query(`
      ALTER TABLE accounts 
      ADD COLUMN IF NOT EXISTS account_id VARCHAR(255) NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS access_token TEXT,
      ADD COLUMN IF NOT EXISTS refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS id_token TEXT,
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    `);

    // Restore full organizations table structure
    await db.query('DROP TABLE IF EXISTS organizations CASCADE');
    await db.query(`
      CREATE TABLE organizations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        image_url TEXT,
        created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        members_count INTEGER DEFAULT 0,
        max_members INTEGER DEFAULT 5,
        can_delete BOOLEAN DEFAULT TRUE,
        public_metadata JSONB DEFAULT '{}',
        private_metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log('🎉 Auth tables simplification rollback completed!');
  } catch (error) {
    console.error('❌ Error rolling back auth tables simplification:', error);
    throw error;
  }
}
