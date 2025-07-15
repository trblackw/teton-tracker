#!/usr/bin/env bun

/**
 * Database Migration CLI
 * Commands: migrate, rollback, status, create
 * Uses semantic versioning (0.0.1, 0.0.2, 0.1.0, etc.)
 */

import { MigrationRunner } from '../src/lib/migrations/migration-runner';

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  const runner = new MigrationRunner();

  switch (command) {
    case 'migrate':
    case 'up':
      await runner.runMigrations();
      break;

    case 'rollback':
    case 'down':
      const targetVersion = args[0];
      await runner.rollbackMigration(targetVersion);
      break;

    case 'status':
      await runner.getMigrationStatus();
      break;

    case 'create':
      const migrationName = args[0];
      const versionType = (args[1] as 'patch' | 'minor' | 'major') || 'patch';

      if (!migrationName) {
        console.error('❌ Error: Migration name is required');
        console.log(
          'Usage: bun run migrate-db create <migration_name> [patch|minor|major]'
        );
        console.log('Examples:');
        console.log(
          '  bun run migrate-db create add_user_profile_table        # patch (default)'
        );
        console.log(
          '  bun run migrate-db create add_user_profile_table patch  # patch increment'
        );
        console.log(
          '  bun run migrate-db create new_feature minor             # minor increment'
        );
        console.log(
          '  bun run migrate-db create breaking_change major         # major increment'
        );
        process.exit(1);
      }

      if (versionType && !['patch', 'minor', 'major'].includes(versionType)) {
        console.error('❌ Error: Version type must be patch, minor, or major');
        process.exit(1);
      }

      await createMigration(migrationName, versionType);
      break;

    default:
      console.log('🗄️  Database Migration CLI (Semantic Versioning)\n');
      console.log('Available commands:');
      console.log('  migrate   - Run pending migrations');
      console.log(
        '  rollback  - Rollback last migration (or to specific version)'
      );
      console.log('  status    - Show migration status');
      console.log('  create    - Create a new migration file');
      console.log('');
      console.log('Examples:');
      console.log('  bun run migrate-db migrate');
      console.log('  bun run migrate-db rollback');
      console.log('  bun run migrate-db rollback 0.1.0');
      console.log('  bun run migrate-db status');
      console.log('  bun run migrate-db create add_user_avatar');
      console.log('  bun run migrate-db create new_feature minor');
      console.log('  bun run migrate-db create breaking_change major');
      console.log('');
      console.log('Version Types:');
      console.log('  patch - Bug fixes, small changes (0.0.1 → 0.0.2)');
      console.log('  minor - New features, non-breaking (0.0.1 → 0.1.0)');
      console.log('  major - Breaking changes (0.1.0 → 1.0.0)');
      process.exit(1);
  }
}

async function createMigration(
  name: string,
  versionType: 'patch' | 'minor' | 'major' = 'patch'
) {
  const fs = await import('fs');
  const path = await import('path');

  const migrationsDir = path.join(process.cwd(), 'migrations');

  // Create migrations directory if it doesn't exist
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    console.log('📁 Created migrations directory');
  }

  // Get next version based on type
  const runner = new MigrationRunner();
  await runner.initialize();
  const nextVersion = await runner.getNextVersionSuggestion(versionType);

  const filename = `${nextVersion}_${name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}.ts`;
  const filepath = path.join(migrationsDir, filename);

  // Check if file already exists
  if (fs.existsSync(filepath)) {
    console.error(`❌ Migration file already exists: ${filename}`);
    process.exit(1);
  }

  // Migration template
  const template = `/**
 * Migration: ${name}
 * Version: ${nextVersion} (${versionType})
 * Created: ${new Date().toISOString()}
 */

import { getDatabase } from '../src/lib/db';

export async function up(): Promise<void> {
  const db = getDatabase();
  
  console.log('⏭️  Running migration: ${name}');
  
  // TODO: Add your migration logic here
  // Examples:
  // 
  // Add a column:
  // await db.query(\`
  //   ALTER TABLE users 
  //   ADD COLUMN avatar_url TEXT
  // \`);
  //
  // Create a table:
  // await db.query(\`
  //   CREATE TABLE user_sessions (
  //     id TEXT PRIMARY KEY,
  //     user_id TEXT NOT NULL,
  //     expires_at TIMESTAMP NOT NULL,
  //     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  //   )
  // \`);
  //
  // Add an index:
  // await db.query(\`
  //   CREATE INDEX IF NOT EXISTS idx_users_email 
  //   ON users(email)
  // \`);
  
  console.log('✅ Migration completed: ${name}');
}

export async function down(): Promise<void> {
  const db = getDatabase();
  
  console.log('⏪ Rolling back migration: ${name}');
  
  // TODO: Add your rollback logic here
  // Examples:
  //
  // Remove a column:
  // await db.query(\`
  //   ALTER TABLE users 
  //   DROP COLUMN avatar_url
  // \`);
  //
  // Drop a table:
  // await db.query(\`DROP TABLE user_sessions\`);
  //
  // Remove an index:
  // await db.query(\`
  //   DROP INDEX IF EXISTS idx_users_email
  // \`);
  
  console.log('✅ Rollback completed: ${name}');
}
`;

  fs.writeFileSync(filepath, template);

  console.log(`✅ Created migration: ${filename}`);
  console.log(`📁 Location: ${filepath}`);
  console.log(`🏷️  Version: v${nextVersion} (${versionType} increment)`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Edit the migration file to add your changes');
  console.log('2. Run: bun run migrate-db migrate');
  console.log('');
  console.log('Version increment types:');
  console.log('• patch: Small fixes, tweaks (0.0.1 → 0.0.2)');
  console.log('• minor: New features, additions (0.0.1 → 0.1.0)');
  console.log('• major: Breaking changes (0.1.0 → 1.0.0)');
}

main().catch(error => {
  console.error('❌ Migration command failed:', error);
  process.exit(1);
});
