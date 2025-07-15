#!/usr/bin/env bun

import { getDatabase } from '../src/lib/db/index';

async function cleanupDatabase() {
  const db = getDatabase();

  console.log('🧹 Starting database cleanup for Clerk authentication...\n');

  try {
    // Get counts before cleanup
    const userCountResult = await db.execute(
      'SELECT COUNT(*) as count FROM users'
    );
    const userCount = userCountResult.rows[0].count;

    const preferencesCountResult = await db.execute(
      'SELECT COUNT(*) as count FROM user_preferences'
    );
    const preferencesCount = preferencesCountResult.rows[0].count;

    const runsCountResult = await db.execute(
      'SELECT COUNT(*) as count FROM runs'
    );
    const runsCount = runsCountResult.rows[0].count;

    const notificationsCountResult = await db.execute(
      'SELECT COUNT(*) as count FROM notifications'
    );
    const notificationsCount = notificationsCountResult.rows[0].count;

    console.log('📊 Current database state:');
    console.log(`   Users: ${userCount}`);
    console.log(`   User Preferences: ${preferencesCount}`);
    console.log(`   Runs: ${runsCount}`);
    console.log(`   Notifications: ${notificationsCount}\n`);

    // Clean up old development data
    console.log('🗑️  Cleaning up old development data...');

    // Delete all notifications first (foreign key constraints)
    await db.execute('DELETE FROM notifications');
    console.log('✅ Cleared notifications table');

    // Delete all runs
    await db.execute('DELETE FROM runs');
    console.log('✅ Cleared runs table');

    // Delete all user preferences
    await db.execute('DELETE FROM user_preferences');
    console.log('✅ Cleared user_preferences table');

    // Delete all users (except any that might be real Clerk users)
    // We'll keep users that have Clerk-style IDs (start with 'user_' and are proper Clerk format)
    const deleteResult = await db.execute(`
      DELETE FROM users 
      WHERE id NOT LIKE 'user_%' 
      OR id LIKE 'user_dev_%' 
      OR id LIKE 'user_seed_%'
      OR LENGTH(id) < 20
    `);

    console.log(`✅ Cleaned up ${deleteResult.rowsAffected} old user records`);

    // Clean up flight cache
    await db.execute(
      'DELETE FROM flight_cache WHERE expires_at < datetime("now")'
    );
    console.log('✅ Cleaned up expired flight cache');

    // Get counts after cleanup
    const finalUserCountResult = await db.execute(
      'SELECT COUNT(*) as count FROM users'
    );
    const finalUserCount = finalUserCountResult.rows[0].count;

    console.log(`\n📊 Final database state:`);
    console.log(`   Users: ${finalUserCount}`);
    console.log(`   User Preferences: 0`);
    console.log(`   Runs: 0`);
    console.log(`   Notifications: 0`);

    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('💡 The database is now ready for Clerk authentication.');
    console.log('📝 Next steps:');
    console.log('   1. Sign in with Clerk to create your first user');
    console.log('   2. Set up your preferences in the Settings page');
    console.log('   3. Start adding runs and flights');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupDatabase().catch(console.error);
