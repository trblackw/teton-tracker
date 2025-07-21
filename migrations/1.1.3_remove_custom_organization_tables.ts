/**
 * Migration: Remove Custom Organization Tables
 * Version: 1.1.3
 *
 * This migration removes our custom organization tables and lets BetterAuth
 * organization plugin create its own standardized tables.
 *
 * Removes:
 * - organizations table (BetterAuth creates 'organization')
 * - organization_memberships table (BetterAuth creates 'member')
 *
 * BetterAuth will auto-create:
 * - organization table (with id, name, slug, metadata)
 * - member table (with organization_id, user_id, role)
 * - invitation table (for member invitations)
 */

import { getDatabase } from '../src/lib/db/index';

export async function up(): Promise<void> {
  const db = getDatabase();
  console.log('🔄 Removing custom organization tables...');

  try {
    // Drop our custom organization tables
    // BetterAuth organization plugin will create its own standardized tables

    await db.query('DROP TABLE IF EXISTS organization_memberships CASCADE');
    console.log('✅ Dropped custom organization_memberships table');

    await db.query('DROP TABLE IF EXISTS organizations CASCADE');
    console.log('✅ Dropped custom organizations table');

    console.log('🎉 Successfully removed custom organization tables!');
    console.log(
      '📝 BetterAuth will auto-create: organization, member, invitation tables'
    );
  } catch (error) {
    console.error('❌ Error removing custom organization tables:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  const db = getDatabase();
  console.log('🔄 Recreating custom organization tables...');

  try {
    // Recreate the original custom organization tables if needed
    await db.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        image_url TEXT,
        created_by VARCHAR(255) NOT NULL,
        members_count INTEGER DEFAULT 0,
        max_members INTEGER DEFAULT 5,
        can_delete BOOLEAN DEFAULT TRUE,
        public_metadata JSONB DEFAULT '{}',
        private_metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS organization_memberships (
        id VARCHAR(255) PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'driver' CHECK (role IN ('admin', 'driver')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(organization_id, user_id)
      )
    `);

    // Recreate indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_organization_memberships_org_id ON organization_memberships(organization_id);
      CREATE INDEX IF NOT EXISTS idx_organization_memberships_user_id ON organization_memberships(user_id);
      CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
    `);

    console.log('🎉 Recreated custom organization tables');
  } catch (error) {
    console.error('❌ Error recreating custom organization tables:', error);
    throw error;
  }
}
