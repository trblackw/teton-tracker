import { getDatabase } from '../src/lib/db/index';

/**
 * Migration: Enforce single default template per organization
 * Version: 1.0.6
 *
 * This migration adds a unique partial index to ensure that only one report template
 * per organization can be marked as the default template. This prevents data integrity
 * issues where multiple default templates could exist for the same organization.
 */

export async function up(): Promise<void> {
  const db = getDatabase();
  console.log(
    '🔄 Adding unique constraint for default templates per organization...'
  );

  try {
    // First, clean up any existing duplicate defaults
    console.log('🧹 Cleaning up duplicate default templates...');

    // For each organization, keep only the first default template and set others to false
    await db.query(`
      UPDATE report_templates 
      SET is_default = FALSE 
      WHERE id NOT IN (
        SELECT DISTINCT ON (organization_id) id 
        FROM report_templates 
        WHERE is_default = TRUE 
        ORDER BY organization_id, created_at ASC
      ) 
      AND is_default = TRUE;
    `);

    // Create a unique partial index to enforce the constraint
    // This index only applies when is_default = TRUE, allowing multiple non-default templates
    await db.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_unique_default_template_per_org 
      ON report_templates (organization_id) 
      WHERE is_default = TRUE;
    `);

    console.log(
      '✅ Successfully added unique constraint for default templates'
    );
    console.log('   - Cleaned up any duplicate default templates');
    console.log(
      '   - Created partial unique index on (organization_id) WHERE is_default = TRUE'
    );
  } catch (error) {
    console.error('❌ Error adding default template constraint:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  const db = getDatabase();
  console.log('🔄 Removing unique constraint for default templates...');

  try {
    // Drop the unique index
    await db.query(`
      DROP INDEX IF EXISTS idx_unique_default_template_per_org;
    `);

    console.log(
      '✅ Successfully removed unique constraint for default templates'
    );
  } catch (error) {
    console.error('❌ Error removing default template constraint:', error);
    throw error;
  }
}

// Migration metadata
export const version = '1.0.6';
export const description = 'Enforce single default template per organization';
export const dependencies = ['1.0.5_add_reports_and_templates_tables'];
