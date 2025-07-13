#!/usr/bin/env bun

import { getDatabase, getOrCreateUser } from '../src/lib/db/index';
import { createNotification } from '../src/lib/db/notifications';
import { createRun } from '../src/lib/db/runs';
import type { RunStatus, RunType } from '../src/lib/schema';

// Fixed development user ID - this should match what the app would generate
// for a consistent development experience
const DEVELOPMENT_USER_ID = 'user_dev_seed_12345';

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

async function seedData() {
  console.log('🌱 Starting data seeding...');

  try {
    // Use a consistent development user ID
    const userId = DEVELOPMENT_USER_ID;

    // Ensure the user exists in the database
    await getOrCreateUser(userId);
    console.log(`👤 Using development user ID: ${userId}`);

    // Clear existing data for clean seeding
    console.log('🧹 Clearing existing data for clean seeding...');
    const db = getDatabase();

    try {
      // Delete existing runs and notifications for this user
      await db.execute({
        sql: 'DELETE FROM runs WHERE user_id = ?',
        args: [userId],
      });

      await db.execute({
        sql: 'DELETE FROM notifications WHERE user_id = ?',
        args: [userId],
      });

      console.log('✅ Cleared existing runs and notifications');
    } catch (error) {
      console.warn('⚠️ Error clearing existing data:', error);
      // Continue anyway - might be first run
    }

    // Generate date range and runs with realistic distribution
    const now = new Date();
    const pastDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days future

    const runs = [];

    // Generate 20 total runs with realistic distribution:
    // - 15-17 past runs (completed/cancelled)
    // - 2-3 current/future runs (scheduled/active)

    for (let i = 0; i < 20; i++) {
      const airline = randomItem(airlines);
      const flightNumber = generateFlightNumber(airline.code);
      const runType: RunType = randomItem(runTypes);

      let scheduledTime: Date;
      let status: RunStatus;

      // First 2-3 runs are current/future (realistic current runs)
      if (i < 3) {
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
        userId,
        flightNumber,
        airline: airline.name,
        departure,
        arrival,
        pickupLocation,
        dropoffLocation,
        scheduledTime: scheduledTime.toISOString(),
        type: runType,
        status,
        price: generatePrice(),
        notes,
      };

      runs.push(runData);
    }

    // Create runs in database
    for (const runData of runs) {
      const run = await createRun(runData, userId);
      console.log(`✅ Created run: ${run.id}`);
      console.log(`✅ Created run: ${run.flightNumber} (${run.status})`);

      // Generate 1-4 notifications per run
      const notificationCount = Math.floor(Math.random() * 4) + 1;
      for (let i = 0; i < notificationCount; i++) {
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

        await createNotification(notificationData, userId);
        console.log(`✅ Created notification: ${notificationData.title}`);
      }
    }

    // Create some additional system notifications
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
        title: 'Weather Alert',
        message:
          'Snow conditions expected this weekend. Plan extra time for your airport runs.',
        metadata: { category: 'weather', severity: 'info' },
      },
      {
        type: 'system' as const,
        title: 'Airport Traffic Update',
        message:
          'Heavy traffic reported on Highway 22. Consider alternate routes to Jackson Hole Airport.',
        metadata: { category: 'traffic', severity: 'warning' },
      },
    ];

    for (const notification of systemNotifications) {
      await createNotification(notification, userId);
      console.log(`✅ Created system notification: ${notification.title}`);
    }

    console.log('🎉 Data seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`  • Created ${runs.length} runs`);

    // Calculate realistic breakdown
    const currentRuns = runs.filter(
      r => r.status === 'scheduled' || r.status === 'active'
    ).length;
    const pastRuns = runs.filter(
      r => r.status === 'completed' || r.status === 'cancelled'
    ).length;
    const completedRuns = runs.filter(r => r.status === 'completed').length;
    const cancelledRuns = runs.filter(r => r.status === 'cancelled').length;

    console.log(`    - Current runs (scheduled/active): ${currentRuns}`);
    console.log(`    - Past runs (completed/cancelled): ${pastRuns}`);
    console.log(`      → Completed: ${completedRuns}`);
    console.log(`      → Cancelled: ${cancelledRuns}`);
    console.log(
      `  • Created ${runs.length * 2 + systemNotifications.length} notifications`
    );
    console.log(`  • User ID: ${userId}`);
    console.log('');
    console.log(
      '💡 Tip: Refresh your application to see the new realistic data!'
    );
  } catch (error) {
    console.error('❌ Error during data seeding:', error);
    process.exit(1);
  }
}

// Safety check: only run in development
if (process.env.NODE_ENV === 'production') {
  console.error('🚫 Seed script cannot be run in production environment!');
  process.exit(1);
}

// Run the seeding
seedData().catch(error => {
  console.error('💥 Unhandled error during seeding:', error);
  process.exit(1);
});
