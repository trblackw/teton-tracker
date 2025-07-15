#!/usr/bin/env bun
import { getDatabase, initializeDatabase } from '../src/lib/db';

async function migrateSchema() {
  console.log('🔄 Starting schema migration...\n');

  try {
    initializeDatabase();
    const db = getDatabase();

    console.log('⚠️  This will drop all existing data!');
    console.log('📋 Dropping existing tables...');

    // Drop tables in reverse order of dependencies
    await db.query('DROP TABLE IF EXISTS notifications CASCADE');
    await db.query('DROP TABLE IF EXISTS runs CASCADE');
    await db.query('DROP TABLE IF EXISTS user_preferences CASCADE');
    await db.query('DROP TABLE IF EXISTS users CASCADE');

    console.log('✅ Tables dropped successfully');

    console.log('\n🔧 Creating new schema...');

    // Enable UUID extension for PostgreSQL
    await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Users table with email and phone_number
    await db.query(`
      CREATE TABLE users (
        id text PRIMARY KEY,
        email text,
        phone_number text,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created users table');

    // User preferences table without email and phone_number
    await db.query(`
      CREATE TABLE user_preferences (
        id text PRIMARY KEY,
        user_id text NOT NULL,
        home_airport text,
        theme text DEFAULT 'system',
        timezone text DEFAULT 'UTC',
        notification_preferences text DEFAULT '{}',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created user_preferences table');

    // Runs table
    await db.query(`
      CREATE TABLE runs (
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
    console.log('✅ Created runs table');

    // Notifications table
    await db.query(`
      CREATE TABLE notifications (
        id text PRIMARY KEY,
        user_id text NOT NULL,
        type text NOT NULL,
        title text NOT NULL,
        message text NOT NULL,
        flight_number text,
        pickup_location text,
        dropoff_location text,
        run_id text,
        is_read boolean DEFAULT false,
        metadata text DEFAULT '{}',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created notifications table');

    // Create indices for better performance
    await db.query(
      'CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)'
    );
    await db.query(
      'CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id)'
    );
    await db.query(
      'CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status)'
    );
    await db.query(
      'CREATE INDEX IF NOT EXISTS idx_runs_scheduled_time ON runs(scheduled_time)'
    );
    await db.query(
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)'
    );
    await db.query(
      'CREATE INDEX IF NOT EXISTS idx_notifications_run_id ON notifications(run_id)'
    );
    await db.query(
      'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)'
    );
    console.log('✅ Created database indices');

    console.log('\n🎉 Schema migration completed successfully!');
    console.log('\n📋 New Schema Summary:');
    console.log('  📊 users: id, email, phone_number, created_at, updated_at');
    console.log(
      '  ⚙️  user_preferences: id, user_id, home_airport, theme, timezone, notification_preferences'
    );
    console.log('  🏃 runs: (unchanged structure)');
    console.log('  📬 notifications: (unchanged structure)');
    console.log(
      '\n✅ Email and phoneNumber are now in users table, not preferences'
    );
  } catch (error) {
    console.error('❌ Schema migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the migration
migrateSchema();
