#!/usr/bin/env bun

import { getDatabase } from '../src/lib/db/index';

console.log('🔍 Verifying database structure and sample data...');

async function verifyDatabase() {
  const db = getDatabase();

  try {
    // Check if main tables exist and get row counts
    const tables = ['users', 'user_preferences', 'runs', 'notifications'];

    console.log('📊 Database table status:');
    for (const table of tables) {
      try {
        const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = result.rows[0].count;
        console.log(`   ${table}: ${count} rows`);
      } catch (error) {
        console.log(`   ${table}: ❌ Table not found or error`);
      }
    }

    // Check users table structure (PostgreSQL style)
    console.log('\n📋 Users table structure:');
    const usersSchema = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    for (const column of usersSchema.rows) {
      console.log(
        `   ${column.column_name}: ${column.data_type} (nullable: ${column.is_nullable})`
      );
    }

    // Check user_preferences table structure
    console.log('\n📋 User preferences table structure:');
    const preferencesSchema = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user_preferences' 
      ORDER BY ordinal_position
    `);
    for (const column of preferencesSchema.rows) {
      console.log(
        `   ${column.column_name}: ${column.data_type} (nullable: ${column.is_nullable})`
      );
    }

    // Sample some data
    console.log('\n👤 Sample users:');
    const existingUsers = await db.query(
      'SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 3'
    );

    if (existingUsers.rows.length === 0) {
      console.log('   No users found');
    } else {
      for (const user of existingUsers.rows) {
        console.log(`   ${user.email} (${user.id})`);

        // Count runs for this user
        const totalUsers = await db.query(
          'SELECT COUNT(*) as count FROM runs WHERE user_id = $1',
          [user.id]
        );
        const runCount = totalUsers.rows[0].count;
        console.log(`     - ${runCount} runs`);
      }
    }

    // Check indexes
    console.log('\n🔍 Database indexes:');
    const indexes = await db.query(`
      SELECT schemaname, tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname
    `);

    for (const index of indexes.rows) {
      console.log(`   ${index.tablename}.${index.indexname}`);
    }

    console.log('\n✅ Database verification completed');
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    throw error;
  }
}

verifyDatabase().catch(console.error);
