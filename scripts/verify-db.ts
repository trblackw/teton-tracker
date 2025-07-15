#!/usr/bin/env bun

import { getDatabase } from '../src/lib/db/index';

async function verifyDatabase() {
  const db = getDatabase();

  console.log('🔍 Verifying database state for Clerk authentication...\n');

  try {
    // Check table counts
    const tables = [
      'users',
      'user_preferences',
      'runs',
      'notifications',
      'flight_cache',
    ];

    for (const table of tables) {
      const result = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
      const count = result.rows[0].count;
      console.log(`📊 ${table}: ${count} records`);
    }

    // Check users table structure
    console.log('\n📋 Users table structure:');
    const usersSchema = await db.execute(`PRAGMA table_info(users)`);
    usersSchema.rows.forEach((row: any) => {
      console.log(`   ${row.name} (${row.type})`);
    });

    // Check user_preferences table structure
    console.log('\n📋 User preferences table structure:');
    const preferencesSchema = await db.execute(
      `PRAGMA table_info(user_preferences)`
    );
    preferencesSchema.rows.forEach((row: any) => {
      console.log(`   ${row.name} (${row.type})`);
    });

    // Check for any existing users
    console.log('\n👥 Existing users:');
    const existingUsers = await db.execute(
      `SELECT id, created_at FROM users LIMIT 5`
    );
    if (existingUsers.rows.length > 0) {
      existingUsers.rows.forEach((user: any) => {
        console.log(`   ${user.id} (created: ${user.created_at})`);
      });
      if (existingUsers.rows.length === 5) {
        const totalUsers = await db.execute(
          `SELECT COUNT(*) as count FROM users`
        );
        console.log(`   ... and ${Number(totalUsers.rows[0].count) - 5} more`);
      }
    } else {
      console.log('   No users found');
    }

    // Check indexes
    console.log('\n🔍 Database indexes:');
    const indexes = await db.execute(
      `SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'`
    );
    indexes.rows.forEach((index: any) => {
      console.log(`   ${index.name} on ${index.tbl_name}`);
    });

    console.log('\n✅ Database verification completed!');
    console.log('\n🎯 Status: Ready for Clerk authentication');
    console.log('💡 Next steps:');
    console.log('   1. Start your development server: bun run dev');
    console.log(
      '   2. Sign in with Clerk to create your first authenticated user'
    );
    console.log('   3. Your user data will be automatically managed by Clerk');
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    process.exit(1);
  }
}

// Run the verification
verifyDatabase().catch(console.error);
