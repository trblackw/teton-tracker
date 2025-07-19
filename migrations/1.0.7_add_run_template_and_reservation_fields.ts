import { getDatabase } from '../src/lib/db/index';

/**
 * Migration: Add report template reference and reservation fields to runs table
 * Version: 1.0.7
 *
 * This migration adds three new fields to the runs table:
 * - report_template_id: Foreign key reference to report_templates.id (non-nullable)
 * - reservation_id: 7-digit reservation number (non-nullable)
 * - bill_to: 2-character billing code (nullable)
 */

export async function up(): Promise<void> {
  const db = getDatabase();
  console.log(
    '🔄 Adding report template and reservation fields to runs table...'
  );

  try {
    // Add the new columns to the runs table
    await db.query(`
      ALTER TABLE runs 
      ADD COLUMN report_template_id UUID,
      ADD COLUMN reservation_id VARCHAR(7),
      ADD COLUMN bill_to VARCHAR(2)
    `);

    console.log('✅ Added new columns to runs table');

    // Add constraints after adding columns
    await db.query(`
      ALTER TABLE runs 
      ADD CONSTRAINT fk_runs_report_template_id 
        FOREIGN KEY (report_template_id) 
        REFERENCES report_templates(id) 
        ON DELETE RESTRICT,
      ADD CONSTRAINT chk_reservation_id_format 
        CHECK (reservation_id ~ '^[0-9]{7}$'),
      ADD CONSTRAINT chk_bill_to_format 
        CHECK (bill_to IS NULL OR LENGTH(bill_to) = 2)
    `);

    console.log('✅ Added foreign key and check constraints');

    // Now make the required fields non-nullable
    // First, we need to set default values for existing records

    // Get the first (or default) report template for each organization
    console.log('🔄 Setting default values for existing runs...');

    const result = await db.query(`
      WITH default_templates AS (
        SELECT DISTINCT ON (organization_id) 
          id, organization_id 
        FROM report_templates 
        WHERE is_default = true
        ORDER BY organization_id, created_at ASC
      ),
      user_orgs AS (
        SELECT DISTINCT 
          r.user_id,
          COALESCE(dt.id, (
            SELECT id FROM report_templates 
            LIMIT 1
          )) as template_id
        FROM runs r
        LEFT JOIN default_templates dt ON true  -- We'll handle org lookup in application code
      )
      UPDATE runs 
      SET 
        report_template_id = uo.template_id,
        reservation_id = LPAD((EXTRACT(EPOCH FROM created_at)::BIGINT % 10000000)::TEXT, 7, '0')
      FROM user_orgs uo
      WHERE runs.user_id = uo.user_id
      AND runs.report_template_id IS NULL
    `);

    console.log('✅ Set default values for existing runs');

    // Now make the required fields non-nullable
    await db.query(`
      ALTER TABLE runs 
      ALTER COLUMN report_template_id SET NOT NULL,
      ALTER COLUMN reservation_id SET NOT NULL
    `);

    console.log('✅ Set NOT NULL constraints on required fields');

    console.log('🎉 Migration 1.0.7 completed successfully!');
  } catch (error) {
    console.error('❌ Migration 1.0.7 failed:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  const db = getDatabase();
  console.log('🔄 Rolling back run template and reservation fields...');

  try {
    // Drop constraints first
    await db.query(`
      ALTER TABLE runs 
      DROP CONSTRAINT IF EXISTS fk_runs_report_template_id,
      DROP CONSTRAINT IF EXISTS chk_reservation_id_format,
      DROP CONSTRAINT IF EXISTS chk_bill_to_format
    `);

    console.log('✅ Dropped constraints');

    // Drop the columns
    await db.query(`
      ALTER TABLE runs 
      DROP COLUMN IF EXISTS report_template_id,
      DROP COLUMN IF EXISTS reservation_id,
      DROP COLUMN IF EXISTS bill_to
    `);

    console.log('✅ Dropped columns from runs table');
    console.log('🎉 Migration 1.0.7 rollback completed successfully!');
  } catch (error) {
    console.error('❌ Migration 1.0.7 rollback failed:', error);
    throw error;
  }
}
