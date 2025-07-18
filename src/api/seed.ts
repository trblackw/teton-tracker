import { createClerkClient } from '@clerk/clerk-sdk-node';
import { getDatabase } from '../lib/db/index';
import { createNotification } from '../lib/db/notifications';
import { createRun } from '../lib/db/runs';
import type { RunStatus, RunType } from '../lib/schema';

// Initialize Clerk client for fetching organization data
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

// Mock data arrays
const airlines = [
  { code: 'AA', name: 'American Airlines' },
  { code: 'UA', name: 'United Airlines' },
  { code: 'DL', name: 'Delta Air Lines' },
  { code: 'WN', name: 'Southwest Airlines' },
  { code: 'AS', name: 'Alaska Airlines' },
  { code: 'JB', name: 'JetBlue Airways' },
  { code: 'F9', name: 'Frontier Airlines' },
  { code: 'NK', name: 'Spirit Airlines' },
];

const airports = [
  { code: 'JAC', name: 'Jackson Hole Airport' },
  { code: 'DEN', name: 'Denver International Airport' },
  { code: 'SLC', name: 'Salt Lake City International Airport' },
  { code: 'LAX', name: 'Los Angeles International Airport' },
  { code: 'JFK', name: 'John F. Kennedy International Airport' },
  { code: 'ORD', name: "Chicago O'Hare International Airport" },
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport' },
  { code: 'PHX', name: 'Phoenix Sky Harbor International Airport' },
];

const jacksonHoleLocations = [
  'Hotel Jackson',
  'Four Seasons Resort Jackson Hole',
  'Hotel Yellowstone',
  'The Lodge at Jackson Hole',
  'Teton Mountain Lodge',
  'Spring Creek Ranch',
  'Jackson Lake Lodge',
  'Hotel Virginian',
  'The Wort Hotel',
  'Rusty Parrot Lodge',
  'Private Residence - Wilson',
  'Private Residence - Teton Village',
  'Jackson Hole Mountain Resort',
  'Snow King Resort',
  'Jackson Town Square',
  'Jackson Hole Airport (JAC)',
];

const statuses: RunStatus[] = ['scheduled', 'active', 'completed', 'cancelled'];
const runTypes: RunType[] = ['pickup', 'dropoff'];

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function randomItem<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateFlightNumber(airlineCode: string): string {
  const number = Math.floor(Math.random() * 9999) + 1;
  return `${airlineCode}${number}`;
}

function generatePrice(): string {
  const price = Math.floor(Math.random() * 400) + 100; // $100-$500
  return price.toString();
}

// Helper function to get organization drivers
async function getOrganizationDrivers(userId: string): Promise<string[]> {
  try {
    console.log(`🔍 Fetching organization drivers for user: ${userId}`);

    // Get user's organization memberships
    const organizationMemberships =
      await clerk.users.getOrganizationMembershipList({
        userId,
      });

    if (organizationMemberships.data.length === 0) {
      console.log('ℹ️ User is not a member of any organization');
      return [];
    }

    // For single organization model, get the first (and only) organization
    const userOrg = organizationMemberships.data[0];
    const orgId = userOrg.organization.id;

    console.log(
      `✅ Found user organization: ${userOrg.organization.name} (${orgId})`
    );

    // Get all organization members
    const orgMemberships =
      await clerk.organizations.getOrganizationMembershipList({
        organizationId: orgId,
      });

    // Filter for driver role and extract user IDs
    const driverIds = orgMemberships.data
      .filter((membership: any) => membership.role === 'org:driver')
      .map((membership: any) => membership.publicUserData.userId);

    console.log(`✅ Found ${driverIds.length} drivers in organization`);
    return driverIds;
  } catch (error) {
    console.error('❌ Error fetching organization drivers:', error);
    return [];
  }
}

export async function seedDataForUser(userId: string): Promise<{
  runs: number;
  notifications: number;
  message: string;
}> {
  console.log(`🌱 Starting data seeding for user: ${userId}`);

  try {
    // Get organization drivers
    const driverIds = await getOrganizationDrivers(userId);
    const allUserIds = driverIds.length > 0 ? [userId, ...driverIds] : [userId];

    console.log(
      `👥 Will create runs for ${allUserIds.length} users (including drivers)`
    );

    // Clear existing data for clean seeding
    console.log('🧹 Clearing existing data for clean seeding...');
    const db = getDatabase();

    try {
      // Delete existing runs and notifications for all users in the organization
      for (const targetUserId of allUserIds) {
        await db.query(`DELETE FROM runs WHERE user_id = $1`, [targetUserId]);
        await db.query(`DELETE FROM notifications WHERE user_id = $1`, [
          targetUserId,
        ]);
      }
      console.log(
        '✅ Cleared existing runs and notifications for all organization users'
      );
    } catch (error) {
      console.warn('⚠️ Error clearing existing data:', error);
      // Continue anyway - might be first run
    }

    // Generate date range and runs with realistic distribution
    const now = new Date();
    const pastDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days future

    const allRuns = [];
    let totalNotificationCount = 0;

    // Create runs for each user (distribute across drivers)
    for (const targetUserId of allUserIds) {
      const isDriver = driverIds.includes(targetUserId);
      const runsPerUser = isDriver ? 8 : 5; // Drivers get more runs

      console.log(
        `🚗 Creating ${runsPerUser} runs for ${isDriver ? 'driver' : 'admin'}: ${targetUserId}`
      );

      for (let i = 0; i < runsPerUser; i++) {
        const airline = randomItem(airlines);
        const flightNumber = generateFlightNumber(airline.code);
        const runType: RunType = randomItem(runTypes);

        let scheduledTime: Date;
        let status: RunStatus;

        // First 2 runs per user are current/future (realistic current runs)
        if (i < 2) {
          // Current/future runs - scheduled between now and 30 days from now
          scheduledTime = randomDate(now, futureDate);
          status = Math.random() > 0.7 ? 'active' : 'scheduled'; // Mostly scheduled, some active
        } else {
          // Past runs - scheduled between 90 days ago and now
          scheduledTime = randomDate(pastDate, now);

          // Past runs should be completed or cancelled
          if (Math.random() > 0.85) {
            status = 'cancelled'; // 15% cancelled
          } else {
            status = 'completed'; // 85% completed
          }
        }

        // Generate locations
        const pickupLocation = randomItem(jacksonHoleLocations);
        const dropoffLocation =
          runType === 'pickup'
            ? 'Jackson Hole Airport (JAC)'
            : randomItem(jacksonHoleLocations);

        // Generate departure/arrival airports (JAC is always one of them)
        const otherAirport = randomItem(airports.filter(a => a.code !== 'JAC'));
        const departure = runType === 'pickup' ? 'JAC' : otherAirport.code;
        const arrival = runType === 'pickup' ? otherAirport.code : 'JAC';

        // Create notes occasionally (more likely for VIP/special runs)
        const notes =
          Math.random() > 0.8
            ? [
                'Client requested early arrival',
                'Large group - 6 passengers',
                'Vehicle preference: SUV',
                'Flight might be delayed',
                'VIP client',
                'Ski equipment transport needed',
                'Pet-friendly vehicle required',
                'Client has mobility assistance needs',
              ][Math.floor(Math.random() * 8)]
            : undefined;

        const runData = {
          userId: targetUserId,
          flightNumber,
          airline: airline.name,
          departure,
          arrival,
          pickupLocation,
          dropoffLocation,
          scheduledTime: scheduledTime.toISOString(),
          estimatedDuration: Math.floor(Math.random() * 60) + 30, // 30-90 minutes
          type: runType,
          status,
          price: generatePrice(),
          notes,
        };

        allRuns.push({ ...runData, targetUserId });
      }
    }

    // Create runs in database
    for (const runData of allRuns) {
      const { targetUserId, ...runCreateData } = runData;
      const run = await createRun(runCreateData, targetUserId);
      console.log(
        `✅ Created run: ${run.flightNumber} (${run.status}) for user ${targetUserId}`
      );

      // Generate 1-3 notifications per run
      const runNotificationCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < runNotificationCount; i++) {
        const notificationTypes = [
          'flight_update',
          'traffic_alert',
          'run_reminder',
          'status_change',
        ];
        const type = randomItem(notificationTypes);

        let title: string = '';
        let message: string = '';

        switch (type) {
          case 'flight_update':
            title = `Flight ${run.flightNumber} Status Update`;
            message = `Your flight ${run.flightNumber} status has been updated. Please check for any changes.`;
            break;
          case 'traffic_alert':
            title = 'Traffic Alert';
            message = `Traffic conditions have changed for your route to ${run.dropoffLocation}. Current delay: ${Math.floor(Math.random() * 20) + 5} minutes.`;
            break;
          case 'run_reminder':
            title =
              run.type === 'pickup' ? 'Pickup Reminder' : 'Dropoff Reminder';
            message = `Your ${run.type} for flight ${run.flightNumber} is scheduled for ${new Date(run.scheduledTime).toLocaleString()}.`;
            break;
          case 'status_change':
            title = 'Run Status Changed';
            message = `Your run for flight ${run.flightNumber} status has been updated to ${run.status}.`;
            break;
        }

        const notificationData = {
          type: type as any,
          title,
          message,
          flightNumber: run.flightNumber,
          pickupLocation: run.pickupLocation,
          dropoffLocation: run.dropoffLocation,
          runId: run.id,
          metadata: {},
        };

        await createNotification(notificationData, targetUserId);
        console.log(
          `✅ Created notification: ${notificationData.title} for user ${targetUserId}`
        );
        totalNotificationCount++;
      }
    }

    // Create some additional system notifications for the requesting user
    console.log('📬 Creating additional system notifications...');
    const systemNotifications = [
      {
        type: 'system' as const,
        title: 'Welcome to Teton Tracker!',
        message:
          'Your account has been set up successfully. You can now track your airport runs and get real-time updates.',
        metadata: { category: 'welcome' },
      },
      {
        type: 'system' as const,
        title: 'Organization Data Synced',
        message: `Successfully created runs for ${allUserIds.length} organization members including drivers.`,
        metadata: { category: 'organization', driverCount: driverIds.length },
      },
      {
        type: 'system' as const,
        title: 'Weather Alert',
        message:
          'Snow conditions expected this weekend. Plan extra time for your airport runs.',
        metadata: { category: 'weather', severity: 'info' },
      },
    ];

    for (const notification of systemNotifications) {
      await createNotification(notification, userId);
      console.log(`✅ Created system notification: ${notification.title}`);
      totalNotificationCount++;
    }

    console.log('🎉 Data seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(
      `  • Created ${allRuns.length} runs across ${allUserIds.length} users`
    );
    console.log(`  • Created ${totalNotificationCount} notifications`);
    console.log(`  • Organization drivers: ${driverIds.length}`);
    console.log(`  • Admin user: ${userId}`);

    return {
      runs: allRuns.length,
      notifications: totalNotificationCount,
      message: `Data seeding completed! Created runs for ${allUserIds.length} organization members (${driverIds.length} drivers).`,
    };
  } catch (error) {
    console.error('❌ Error during data seeding:', error);
    throw error;
  }
}

// POST /api/seed
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call the actual seed data generation function
    const result = await seedDataForUser(userId);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to generate seed data:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate seed data' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// DELETE /api/seed/clear
export async function DELETE(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDatabase();
    let deletedRuns = 0;
    let deletedNotifications = 0;
    let deletedPreferences = 0;

    try {
      // Count existing data before deletion
      const runsResult = await db.query(
        'SELECT COUNT(*) as count FROM runs WHERE user_id = $1',
        [userId]
      );
      deletedRuns = parseInt(runsResult.rows[0].count);

      const notificationsResult = await db.query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1',
        [userId]
      );
      deletedNotifications = parseInt(notificationsResult.rows[0].count);

      const preferencesResult = await db.query(
        'SELECT COUNT(*) as count FROM user_preferences WHERE user_id = $1',
        [userId]
      );
      deletedPreferences = parseInt(preferencesResult.rows[0].count);

      // Delete all user data except the user record itself
      await db.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM runs WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM user_preferences WHERE user_id = $1', [
        userId,
      ]);

      console.log(`✅ Cleared all data for user ${userId}:`);
      console.log(`   - ${deletedRuns} runs`);
      console.log(`   - ${deletedNotifications} notifications`);
      console.log(`   - ${deletedPreferences} preferences`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Cleared ${deletedRuns} runs, ${deletedNotifications} notifications, and ${deletedPreferences} preferences`,
          deletedRuns,
          deletedNotifications,
          deletedPreferences,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('❌ Error clearing user data:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to clear user data',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Failed to clear user data:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to process request',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
