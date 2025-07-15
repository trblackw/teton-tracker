#!/usr/bin/env bun

/**
 * Database Migration Runner
 * Tracks schema versions using semantic versioning (0.0.1, 0.0.2, 0.1.0, etc.)
 */

import { readdirSync } from 'fs';
import { join } from 'path';
import { getDatabase } from '../db';

interface Migration {
  version: string;
  name: string;
  filename: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

// Semantic version comparison utility
function parseVersion(version: string): [number, number, number] {
  const parts = version.split('.').map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function compareVersions(a: string, b: string): number {
  const [aMajor, aMinor, aPatch] = parseVersion(a);
  const [bMajor, bMinor, bPatch] = parseVersion(b);

  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}

function getNextVersion(
  currentVersion: string,
  type: 'patch' | 'minor' | 'major' = 'patch'
): string {
  const [major, minor, patch] = parseVersion(currentVersion);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

export class MigrationRunner {
  private db = getDatabase();
  private migrationsDir = join(process.cwd(), 'migrations');

  async initialize() {
    // Create schema_migrations table if it doesn't exist
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('📋 Migration tracking table initialized');
  }

  async getCurrentVersion(): Promise<string> {
    const result = await this.db.query(`
      SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1
    `);
    return result.rows[0]?.version || '0.0.0';
  }

  async getAppliedMigrations(): Promise<string[]> {
    const result = await this.db.query(`
      SELECT version FROM schema_migrations ORDER BY applied_at
    `);
    return result.rows.map(row => row.version);
  }

  async loadMigrations(): Promise<Migration[]> {
    const files = readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
      .sort();

    const migrations: Migration[] = [];

    for (const file of files) {
      const match = file.match(/^(\d+\.\d+\.\d+)_(.+)\.(ts|js)$/);
      if (!match) {
        console.warn(`⚠️ Skipping invalid migration filename: ${file}`);
        console.warn(`   Expected format: 0.0.1_migration_name.ts`);
        continue;
      }

      const version = match[1];
      const name = match[2];
      const fullPath = join(this.migrationsDir, file);

      try {
        const migration = await import(fullPath);
        migrations.push({
          version,
          name,
          filename: file,
          up: migration.up,
          down: migration.down,
        });
      } catch (error) {
        console.error(`❌ Failed to load migration ${file}:`, error);
        throw error;
      }
    }

    return migrations.sort((a, b) => compareVersions(a.version, b.version));
  }

  async runMigrations(): Promise<void> {
    console.log('🔄 Starting database migrations...\n');

    await this.initialize();

    const currentVersion = await this.getCurrentVersion();
    const appliedMigrations = await this.getAppliedMigrations();
    const allMigrations = await this.loadMigrations();

    const pendingMigrations = allMigrations.filter(
      migration => !appliedMigrations.includes(migration.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      console.log(`📊 Current schema version: v${currentVersion}`);
      return;
    }

    console.log(`📊 Current schema version: v${currentVersion}`);
    console.log(`🔄 Found ${pendingMigrations.length} pending migrations:\n`);

    for (const migration of pendingMigrations) {
      console.log(
        `⏭️  Running migration v${migration.version}: ${migration.name}`
      );

      try {
        await migration.up();

        // Record the migration as applied
        await this.db.query(
          `
          INSERT INTO schema_migrations (version, name)
          VALUES ($1, $2)
        `,
          [migration.version, migration.name]
        );

        console.log(
          `✅ Migration v${migration.version} completed successfully`
        );
      } catch (error) {
        console.error(`❌ Migration v${migration.version} failed:`, error);
        throw error;
      }
    }

    const finalVersion = await this.getCurrentVersion();
    console.log(`\n🎉 All migrations completed!`);
    console.log(`📊 Schema version: v${currentVersion} → v${finalVersion}`);
  }

  async rollbackMigration(targetVersion?: string): Promise<void> {
    console.log('🔄 Starting migration rollback...\n');

    await this.initialize();

    const currentVersion = await this.getCurrentVersion();
    const appliedMigrations = await this.getAppliedMigrations();
    const allMigrations = await this.loadMigrations();

    // If no target specified, rollback one version
    const target =
      targetVersion ||
      this.getPreviousVersion(appliedMigrations, currentVersion);

    if (!target || compareVersions(target, currentVersion) >= 0) {
      console.log('⚠️ Target version is not lower than current version');
      return;
    }

    const migrationsToRollback = allMigrations
      .filter(
        migration =>
          compareVersions(migration.version, target) > 0 &&
          appliedMigrations.includes(migration.version)
      )
      .sort((a, b) => compareVersions(b.version, a.version)); // Reverse order for rollback

    if (migrationsToRollback.length === 0) {
      console.log('✅ No migrations to rollback');
      return;
    }

    console.log(`📊 Current schema version: v${currentVersion}`);
    console.log(`🔄 Rolling back ${migrationsToRollback.length} migrations:\n`);

    for (const migration of migrationsToRollback) {
      console.log(
        `⏪ Rolling back migration v${migration.version}: ${migration.name}`
      );

      try {
        await migration.down();

        // Remove the migration record
        await this.db.query(
          `
          DELETE FROM schema_migrations WHERE version = $1
        `,
          [migration.version]
        );

        console.log(
          `✅ Migration v${migration.version} rolled back successfully`
        );
      } catch (error) {
        console.error(
          `❌ Rollback of migration v${migration.version} failed:`,
          error
        );
        throw error;
      }
    }

    const finalVersion = await this.getCurrentVersion();
    console.log(`\n🎉 Rollback completed!`);
    console.log(`📊 Schema version: v${currentVersion} → v${finalVersion}`);
  }

  private getPreviousVersion(
    appliedMigrations: string[],
    currentVersion: string
  ): string | null {
    const sortedMigrations = appliedMigrations.sort((a, b) =>
      compareVersions(a, b)
    );
    const currentIndex = sortedMigrations.indexOf(currentVersion);
    return currentIndex > 0 ? sortedMigrations[currentIndex - 1] : null;
  }

  async getMigrationStatus(): Promise<void> {
    await this.initialize();

    const currentVersion = await this.getCurrentVersion();
    const appliedMigrations = await this.getAppliedMigrations();
    const allMigrations = await this.loadMigrations();

    console.log(`📊 Current schema version: v${currentVersion}\n`);

    console.log('Migration Status:');
    console.log('=================');

    for (const migration of allMigrations) {
      const status = appliedMigrations.includes(migration.version)
        ? '✅ Applied'
        : '⏳ Pending';
      console.log(`v${migration.version}: ${migration.name} - ${status}`);
    }

    const pendingCount = allMigrations.filter(
      m => !appliedMigrations.includes(m.version)
    ).length;

    console.log(`\n📈 Applied: ${appliedMigrations.length}`);
    console.log(`⏳ Pending: ${pendingCount}`);
    console.log(`📁 Total: ${allMigrations.length}`);
  }

  // Helper method to get next version for CLI
  getNextVersionSuggestion(
    type: 'patch' | 'minor' | 'major' = 'patch'
  ): Promise<string> {
    return this.getCurrentVersion().then(current =>
      getNextVersion(current, type)
    );
  }
}

// Helper function for external use
export async function getCurrentVersion(): Promise<string> {
  const runner = new MigrationRunner();
  await runner.initialize();
  return runner.getCurrentVersion();
}
