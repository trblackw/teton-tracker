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
    console.log('🚀 Setting up PostgreSQL database schema...\n');

    // Enable UUID extension for PostgreSQL
    await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        name text,
        email text,
        phone_number text,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User preferences table (restructured to use user_id as primary key)
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id text PRIMARY KEY,
        home_airport text,
        theme text DEFAULT 'system',
        timezone text DEFAULT 'UTC',
        notification_preferences text DEFAULT '{}',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Historical runs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS runs (
        id text PRIMARY KEY,
        user_id text NOT NULL,
        flight_number text NOT NULL,
        airline text,
        departure_airport text,
        arrival_airport text,
        pickup_location text NOT NULL,
        dropoff_location text NOT NULL,
        scheduled_time timestamp NOT NULL,
        estimated_duration integer NOT NULL,
        actual_duration integer,
        status text NOT NULL DEFAULT 'scheduled',
        type text NOT NULL CHECK (type IN ('pickup', 'dropoff')),
        price text NOT NULL DEFAULT '0',
        notes text,
        metadata text DEFAULT '{}',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
        completed_at timestamp,
        activated_at timestamp,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await db.query(`
      ALTER TABLE runs ADD COLUMN IF NOT EXISTS activated_at timestamp
    `);

    // Flight data cache table
    await db.query(`
      CREATE TABLE IF NOT EXISTS flight_cache (
        flight_number text PRIMARY KEY,
        data text NOT NULL,
        cached_at timestamp DEFAULT CURRENT_TIMESTAMP,
        expires_at timestamp
      )
    `);

    // Notifications table
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id text PRIMARY KEY,
        user_id text NOT NULL,
        type text NOT NULL CHECK (type IN ('flight_update', 'traffic_alert', 'run_reminder', 'status_change', 'system')),
        title text NOT NULL,
        message text NOT NULL,
        flight_number text,
        pickup_location text,
        dropoff_location text,
        run_id text,
        is_read boolean DEFAULT FALSE,
        metadata text DEFAULT '{}',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE SET NULL
      )
    `);

    // Create indexes for better performance
    const indexQueries = [
      // Users table indexes
      'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)',
      // User preferences table indexes
      'CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_preferences_theme ON user_preferences(theme)',
      'CREATE INDEX IF NOT EXISTS idx_user_preferences_timezone ON user_preferences(timezone)',
      // Runs table indexes
      'CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_runs_scheduled_time ON runs(scheduled_time)',
      'CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status)',
      'CREATE INDEX IF NOT EXISTS idx_runs_flight_number ON runs(flight_number)',
      // Flight cache table indexes
      'CREATE INDEX IF NOT EXISTS idx_flight_cache_expires ON flight_cache(expires_at)',
      // Notifications table indexes
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_flight_number ON notifications(flight_number)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_run_id ON notifications(run_id)',
    ];

    for (const indexQuery of indexQueries) {
      await db.query(indexQuery);
    }

    console.log('✅ Database schema created successfully\n');
  } catch (error) {
    console.error('❌ Failed to create database schema:', error);
    throw error;
  }
}

// Main setup function
async function setupDatabase() {
  try {
    initializeDatabase();
    await setupDatabaseSchema();

    console.log('🎉 Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupDatabase().catch(console.error);
