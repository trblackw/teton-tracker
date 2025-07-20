import { getDatabase } from '../src/lib/db/index';

/**
 * Migration: Rename user_id to created_by_id and add organization_id in runs table
 * Version: 1.0.8
 *
 * This migration:
 * 1. Renames the user_id column to created_by_id in the runs table
 * 2. Adds organization_id column to associate runs with organizations
 * 3. Populates organization_id based on the admin user's organization
 *
 * The created_by_id should reference a Clerk user with admin role.
 * The organization_id should reference the organization that the admin belongs to.
 *
 * Changes:
 * - Rename runs.user_id to runs.created_by_id
 * - Add runs.organization_id column
 * - Update column comments to reflect admin role and organization requirements
 */

export async function up(): Promise<void> {
  const db = getDatabase();
  console.log(
    '🔄 Renaming user_id to created_by_id and adding organization_id in runs table...'
  );

  try {
    // Step 1: Rename the column from user_id to created_by_id
    await db.query(`
      ALTER TABLE runs 
      RENAME COLUMN user_id TO created_by_id
    `);

    console.log('✅ Renamed user_id column to created_by_id');

    // Step 2: Add organization_id column (nullable initially)
    await db.query(`
      ALTER TABLE runs 
      ADD COLUMN organization_id VARCHAR(255)
    `);

    console.log('✅ Added organization_id column to runs table');

    // Step 3: Populate organization_id for existing runs
    // Since we don't have direct access to Clerk API in migrations,
    // we'll use the first available organization from report_templates
    // This should be updated to proper organization logic in production
    const result = await db.query(`
      UPDATE runs 
      SET organization_id = (
        SELECT DISTINCT organization_id 
        FROM report_templates 
        LIMIT 1
      )
      WHERE organization_id IS NULL
    `);

    console.log(
      `✅ Populated organization_id for ${result.rowCount || 0} existing runs`
    );

    // Step 4: Make organization_id NOT NULL and add constraints
    await db.query(`
      ALTER TABLE runs 
      ALTER COLUMN organization_id SET NOT NULL,
      ADD CONSTRAINT chk_runs_organization_id_not_empty 
        CHECK (organization_id != '')
    `);

    console.log('✅ Set NOT NULL constraint on organization_id');

    // Step 5: Add comments to document the requirements
    await db.query(`
      COMMENT ON COLUMN runs.created_by_id IS 'Clerk user ID of admin who created this run - must have admin role'
    `);

    await db.query(`
      COMMENT ON COLUMN runs.organization_id IS 'Organization ID that this run belongs to - derived from admin user organization'
    `);

    console.log('✅ Added documentation comments for both columns');

    // Step 6: Create index for better query performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_runs_organization_id 
        ON runs(organization_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_runs_created_by_id 
        ON runs(created_by_id)
    `);

    console.log('✅ Created indexes for organization_id and created_by_id');

    console.log('🎉 Migration 1.0.8 completed successfully');
  } catch (error) {
    console.error('❌ Migration 1.0.8 failed:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  const db = getDatabase();
  console.log(
    '🔄 Rolling back: Removing organization_id and renaming created_by_id back to user_id in runs table...'
  );

  try {
    // Step 1: Drop indexes
    await db.query(`
      DROP INDEX IF EXISTS idx_runs_organization_id
    `);

    await db.query(`
      DROP INDEX IF EXISTS idx_runs_created_by_id
    `);

    console.log('✅ Dropped indexes for organization_id and created_by_id');

    // Step 2: Remove column comments
    await db.query(`
      COMMENT ON COLUMN runs.created_by_id IS NULL
    `);

    console.log('✅ Removed column comments');

    // Step 3: Drop organization_id column (this will also drop constraints)
    await db.query(`
      ALTER TABLE runs 
      DROP COLUMN IF EXISTS organization_id
    `);

    console.log('✅ Dropped organization_id column');

    // Step 4: Rename the column back from created_by_id to user_id
    await db.query(`
      ALTER TABLE runs 
      RENAME COLUMN created_by_id TO user_id
    `);

    console.log('✅ Renamed created_by_id column back to user_id');

    // Step 5: Restore the original comment
    await db.query(`
      COMMENT ON COLUMN runs.user_id IS 'Clerk user ID - no longer references users table'
    `);

    console.log('✅ Restored original user_id column comment');

    console.log('🎉 Migration 1.0.8 rollback completed successfully');
  } catch (error) {
    console.error('❌ Migration 1.0.8 rollback failed:', error);
    throw error;
  }
}
