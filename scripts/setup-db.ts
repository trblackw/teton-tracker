#!/usr/bin/env bun

import { getDatabase, initializeDatabase } from '../src/lib/db/index';

// Development mode configuration
const DEV_MODE = {
  // Set to true to force mock data in development
  FORCE_MOCK_RUNS:
    process.env.NODE_ENV === 'development' &&
    process.env.FORCE_MOCK_RUNS === 'true',
  // Set to true to enable debug logging
  DEBUG_LOGGING:
    process.env.NODE_ENV === 'development' &&
    process.env.DEBUG_LOGGING === 'true',
};

// Log development mode status only in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Database Development Mode:', DEV_MODE);
}

// Initialize database schema
async function setupDatabaseSchema(): Promise<void> {
  const db = getDatabase();

  try {
    console.log('🚀 Setting up database schema...\n');

    // Users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User preferences table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        home_airport TEXT,
        theme TEXT DEFAULT 'system',
        timezone TEXT DEFAULT 'UTC',
        notification_preferences TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Historical runs table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        flight_number TEXT NOT NULL,
        airline TEXT,
        departure_airport TEXT,
        arrival_airport TEXT,
        pickup_location TEXT NOT NULL,
        dropoff_location TEXT NOT NULL,
        scheduled_time DATETIME NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        type TEXT NOT NULL CHECK (type IN ('pickup', 'dropoff')),
        price TEXT NOT NULL DEFAULT '0',
        notes TEXT,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Flight data cache table (optional - for reducing API calls)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS flight_cache (
        flight_number TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
      )
    `);

    // Notifications table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('flight_update', 'traffic_alert', 'run_reminder', 'status_change', 'system')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        flight_number TEXT,
        pickup_location TEXT,
        dropoff_location TEXT,
        run_id TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE SET NULL
      )
    `);

    // Create indexes for better performance
    // Users table indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)
    `);

    // User preferences table indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)
    `);

    // Runs table indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_runs_scheduled_time ON runs(scheduled_time)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_runs_flight_number ON runs(flight_number)
    `);

    // Flight cache table indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_flight_cache_expires ON flight_cache(expires_at)
    `);

    // Notifications table indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_notifications_flight_number ON notifications(flight_number)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_notifications_run_id ON notifications(run_id)
    `);

    console.log('✅ Database schema created successfully\n');
  } catch (error) {
    console.error('❌ Failed to create database schema:', error);
    throw error;
  }
}

// Run migrations
async function runMigrations(): Promise<void> {
  const db = getDatabase();

  try {
    console.log('🔄 Running database migrations...\n');

    // Migration: Add price column to existing runs table
    try {
      await db.execute(`
        ALTER TABLE runs ADD COLUMN price TEXT NOT NULL DEFAULT '0'
      `);
      console.log('✅ Added price column to runs table');
    } catch (error) {
      console.log('💡 Price column already exists or could not be added');
    }

    // Migration: Add timezone column to existing user_preferences table
    try {
      await db.execute(`
        ALTER TABLE user_preferences ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC'
      `);
      console.log('✅ Added timezone column to user_preferences table');
    } catch (error) {
      console.log('💡 Timezone column already exists or could not be added');
    }

    // Migration: Remove fingerprint column from users table (UUID-based approach)
    try {
      // SQLite doesn't support dropping columns directly, so we need to recreate the table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users_new (
          id TEXT PRIMARY KEY,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Copy existing data (without fingerprint)
      await db.execute(`
        INSERT OR IGNORE INTO users_new (id, created_at, updated_at)
        SELECT id, created_at, updated_at FROM users
      `);

      // Drop old table and rename new one
      await db.execute(`DROP TABLE IF EXISTS users`);
      await db.execute(`ALTER TABLE users_new RENAME TO users`);

      console.log('✅ Migrated users table to remove fingerprint column');
    } catch (error) {
      console.log('💡 Users table migration skipped or already completed');
    }

    console.log('✅ Database migrations completed successfully\n');
  } catch (error) {
    console.error('❌ Failed to run database migrations:', error);
    throw error;
  }
}

// Main setup function
async function setupDatabase() {
  try {
    initializeDatabase();
    await setupDatabaseSchema();
    await runMigrations();

    console.log('🎉 Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupDatabase().catch(console.error);
