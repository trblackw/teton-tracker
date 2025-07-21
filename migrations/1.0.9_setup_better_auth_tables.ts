import { getDatabase } from '../src/lib/db/index';

/**
 * Migration: Setup Better Auth tables
 * Version: 1.0.9
 *
 * This migration:
 * 1. Creates the users table for better-auth
 * 2. Creates the sessions table for better-auth
 * 3. Creates the organizations table
 * 4. Creates the organization_memberships table
 * 5. Creates the accounts table for social providers (if needed)
 * 6. Creates the verification table for email verification
 *
 * This replaces the Clerk authentication system with better-auth.
 */

export async function up(): Promise<void> {
  const db = getDatabase();
  console.log('🔄 Setting up Better Auth tables...');

  try {
    // Create users table
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
    console.log('✅ Created users table');

    // Create sessions table
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
    console.log('✅ Created sessions table');

    // Create accounts table for social providers
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
        password VARCHAR(255), -- for email/password accounts
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(provider_id, account_id)
      )
    `);
    console.log('✅ Created accounts table');

    // Create verification table for email verification
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
    console.log('✅ Created verification table');

    // Create organizations table
    await db.query(`
      CREATE TABLE IF NOT EXISTS organizations (
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
    console.log('✅ Created organizations table');

    // Create organization_memberships table
    await db.query(`
      CREATE TABLE IF NOT EXISTS organization_memberships (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'driver' CHECK (role IN ('admin', 'driver')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(organization_id, user_id)
      )
    `);
    console.log('✅ Created organization_memberships table');

    // Create indexes for better performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_accounts_provider ON accounts(provider_id, account_id);
      CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);
      CREATE INDEX IF NOT EXISTS idx_organization_memberships_org_id ON organization_memberships(organization_id);
      CREATE INDEX IF NOT EXISTS idx_organization_memberships_user_id ON organization_memberships(user_id);
      CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
    `);
    console.log('✅ Created database indexes');

    console.log('🎉 Better Auth tables setup completed successfully!');
  } catch (error) {
    console.error('❌ Error setting up Better Auth tables:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  const db = getDatabase();
  console.log('🔄 Rolling back Better Auth tables...');

  try {
    // Drop tables in reverse order to handle foreign key constraints
    await db.query('DROP TABLE IF EXISTS organization_memberships CASCADE');
    await db.query('DROP TABLE IF EXISTS organizations CASCADE');
    await db.query('DROP TABLE IF EXISTS verification CASCADE');
    await db.query('DROP TABLE IF EXISTS accounts CASCADE');
    await db.query('DROP TABLE IF EXISTS sessions CASCADE');
    await db.query('DROP TABLE IF EXISTS users CASCADE');

    console.log('🎉 Better Auth tables rollback completed successfully!');
  } catch (error) {
    console.error('❌ Error rolling back Better Auth tables:', error);
    throw error;
  }
}
