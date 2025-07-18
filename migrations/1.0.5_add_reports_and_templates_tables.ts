import { getDatabase } from '../src/lib/db/index';

/**
 * Migration: Add reports and report_templates tables
 * Version: 1.0.5
 *
 * This migration creates the reports and report_templates tables to support
 * the admin report template management feature. Templates define which columns
 * should be included in generated reports, and reports track the actual
 * generated report instances.
 */

export async function up(): Promise<void> {
  const db = getDatabase();
  console.log('🔄 Creating reports and report_templates tables...');

  try {
    // Create report_templates table
    await db.query(`
      CREATE TABLE IF NOT EXISTS report_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        organization_id VARCHAR(255) NOT NULL,
        report_type VARCHAR(50) NOT NULL DEFAULT 'run',
        column_config JSONB NOT NULL DEFAULT '[]',
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Constraints
        CONSTRAINT chk_report_type CHECK (report_type IN ('flight', 'traffic', 'run')),
        CONSTRAINT chk_name_not_empty CHECK (name != ''),
        CONSTRAINT chk_organization_id_not_empty CHECK (organization_id != ''),
        CONSTRAINT chk_created_by_not_empty CHECK (created_by != '')
      );
    `);

    // Create reports table
    await db.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        organization_id VARCHAR(255) NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        template_id UUID NOT NULL,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE NOT NULL,
        report_type VARCHAR(50) NOT NULL DEFAULT 'run',
        status VARCHAR(50) NOT NULL DEFAULT 'generating',
        generated_at TIMESTAMP WITH TIME ZONE,
        download_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Foreign key to report_templates
        CONSTRAINT fk_reports_template_id 
          FOREIGN KEY (template_id) 
          REFERENCES report_templates(id) 
          ON DELETE CASCADE,
        
        -- Constraints
        CONSTRAINT chk_reports_status CHECK (status IN ('generating', 'completed', 'failed')),
        CONSTRAINT chk_reports_type CHECK (report_type IN ('flight', 'traffic', 'run')),
        CONSTRAINT chk_reports_name_not_empty CHECK (name != ''),
        CONSTRAINT chk_reports_organization_id_not_empty CHECK (organization_id != ''),
        CONSTRAINT chk_reports_created_by_not_empty CHECK (created_by != ''),
        CONSTRAINT chk_date_range CHECK (end_date >= start_date)
      );
    `);

    // Create indexes for better performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_report_templates_organization_id 
        ON report_templates(organization_id);
      CREATE INDEX IF NOT EXISTS idx_report_templates_created_by 
        ON report_templates(created_by);
      CREATE INDEX IF NOT EXISTS idx_report_templates_report_type 
        ON report_templates(report_type);
      CREATE INDEX IF NOT EXISTS idx_report_templates_is_default 
        ON report_templates(is_default);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_organization_id 
        ON reports(organization_id);
      CREATE INDEX IF NOT EXISTS idx_reports_created_by 
        ON reports(created_by);
      CREATE INDEX IF NOT EXISTS idx_reports_template_id 
        ON reports(template_id);
      CREATE INDEX IF NOT EXISTS idx_reports_status 
        ON reports(status);
      CREATE INDEX IF NOT EXISTS idx_reports_created_at 
        ON reports(created_at);
    `);

    // Create updated_at trigger function (if it doesn't exist)
    await db.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers to auto-update updated_at columns
    await db.query(`
      DROP TRIGGER IF EXISTS update_report_templates_updated_at ON report_templates;
      CREATE TRIGGER update_report_templates_updated_at 
        BEFORE UPDATE ON report_templates 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
      DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
      CREATE TRIGGER update_reports_updated_at 
        BEFORE UPDATE ON reports 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Successfully created reports and report_templates tables');
  } catch (error) {
    console.error('❌ Migration 1.0.5 failed:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  const db = getDatabase();
  console.log('🔄 Dropping reports and report_templates tables...');

  try {
    // Drop triggers first
    await db.query(`
      DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
      DROP TRIGGER IF EXISTS update_report_templates_updated_at ON report_templates;
    `);

    // Drop tables (reports first due to foreign key constraint)
    await db.query('DROP TABLE IF EXISTS reports CASCADE;');
    await db.query('DROP TABLE IF EXISTS report_templates CASCADE;');

    // Note: We don't drop the trigger function as it might be used by other tables

    console.log('✅ Successfully dropped reports and report_templates tables');
  } catch (error) {
    console.error('❌ Migration 1.0.5 rollback failed:', error);
    throw error;
  }
}
