#!/usr/bin/env bun

import { getDatabase } from '../src/lib/db/index';

console.log('🧹 Starting database cleanup...');

const db = getDatabase();

async function getTableCounts() {
  try {
    const userCountResult = await db.query(
      'SELECT COUNT(*) as count FROM users'
    );
    const userCount = userCountResult.rows[0].count;

    const preferencesCountResult = await db.query(
      'SELECT COUNT(*) as count FROM user_preferences'
    );
    const preferencesCount = preferencesCountResult.rows[0].count;

    const runsCountResult = await db.query(
      'SELECT COUNT(*) as count FROM runs'
    );
    const runsCount = runsCountResult.rows[0].count;

    const notificationsCountResult = await db.query(
      'SELECT COUNT(*) as count FROM notifications'
    );
    const notificationsCount = notificationsCountResult.rows[0].count;

    console.log(`📊 Current counts:`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Preferences: ${preferencesCount}`);
    console.log(`   Runs: ${runsCount}`);
    console.log(`   Notifications: ${notificationsCount}`);

    return { userCount, preferencesCount, runsCount, notificationsCount };
  } catch (error) {
    console.error('❌ Error getting table counts:', error);
    throw error;
  }
}

async function cleanupTables() {
  console.log('\n🗑️  Cleaning up tables...');

  try {
    // Delete all notifications
    await db.query('DELETE FROM notifications');
    console.log('✅ Notifications table cleaned');

    // Delete all runs
    await db.query('DELETE FROM runs');
    console.log('✅ Runs table cleaned');

    // Delete all user preferences
    await db.query('DELETE FROM user_preferences');
    console.log('✅ User preferences table cleaned');

    // Delete all users except the first one (to preserve at least one user)
    const deleteResult = await db.query(`
      DELETE FROM users 
      WHERE id NOT IN (
        SELECT id FROM users 
        ORDER BY created_at ASC 
        LIMIT 1
      )
    `);
    console.log('✅ Users table cleaned (kept 1 user)');

    // Reset sequences for PostgreSQL
    await db.query(`
      ALTER SEQUENCE users_id_seq RESTART WITH 2;
      ALTER SEQUENCE runs_id_seq RESTART WITH 1;
      ALTER SEQUENCE user_preferences_id_seq RESTART WITH 1;
      ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
    `);

    const finalUserCountResult = await db.query(
      'SELECT COUNT(*) as count FROM users'
    );
    const finalUserCount = finalUserCountResult.rows[0].count;

    console.log(`\n📊 Final counts:`);
    console.log(`   Users: ${finalUserCount}`);
    console.log(`   Preferences: 0`);
    console.log(`   Runs: 0`);
    console.log(`   Notifications: 0`);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

async function main() {
  try {
    await getTableCounts();
    await cleanupTables();
    console.log('\n🎉 Database cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  }
}

main();
