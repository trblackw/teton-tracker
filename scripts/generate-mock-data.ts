#!/usr/bin/env bun

import { getDatabase } from '../src/lib/db/index';
import { createNotification as createNotificationDb } from '../src/lib/db/notifications';
import { createRun } from '../src/lib/db/runs';

console.log('🎭 Starting mock data generation...');

const db = getDatabase();

// Generate mock runs data
const mockRuns = [
  {
    flightNumber: 'UA2729',
    airline: 'United Airlines',
    departure: 'SFO',
    arrival: 'DEN',
    pickupLocation: 'Jackson Hole Airport (JAC)',
    dropoffLocation: 'Hotel Jackson - 470 W Broadway, Jackson, WY 83001',
    scheduledTime: '2024-01-15T14:30:00Z',
    type: 'dropoff' as const,
    estimatedDuration: 45,
    price: '85',
    notes: 'Guest has ski equipment - extra time needed for loading',
  },
  {
    flightNumber: 'AA1558',
    airline: 'American Airlines',
    departure: 'DFW',
    arrival: 'JAC',
    pickupLocation: 'Hotel Jackson - 470 W Broadway, Jackson, WY 83001',
    dropoffLocation: 'Jackson Hole Airport (JAC)',
    scheduledTime: '2024-01-16T06:45:00Z',
    type: 'dropoff' as const,
    estimatedDuration: 35,
    price: '75',
    notes: 'Early morning flight - confirm pickup time with guest',
  },
  {
    flightNumber: 'DL1234',
    airline: 'Delta Air Lines',
    departure: 'ATL',
    arrival: 'JAC',
    pickupLocation: 'Jackson Hole Airport (JAC)',
    dropoffLocation:
      'Four Seasons Resort Jackson Hole - 7680 Granite Loop Rd, Teton Village, WY 83025',
    scheduledTime: '2024-01-17T16:20:00Z',
    type: 'pickup' as const,
    estimatedDuration: 60,
    price: '120',
    notes: 'VIP guest - luxury vehicle requested',
  },
  {
    flightNumber: 'WN1847',
    airline: 'Southwest Airlines',
    departure: 'LAS',
    arrival: 'JAC',
    pickupLocation: 'Jackson Hole Airport (JAC)',
    dropoffLocation:
      'Snake River Lodge & Spa - 7710 Granite Loop Rd, Teton Village, WY 83025',
    scheduledTime: '2024-01-18T12:15:00Z',
    type: 'pickup' as const,
    estimatedDuration: 55,
    price: '95',
    notes: 'Family with 2 children - car seats available on request',
  },
  {
    flightNumber: 'F9321',
    airline: 'Frontier Airlines',
    departure: 'DEN',
    arrival: 'JAC',
    pickupLocation:
      'Teton Mountain Lodge & Spa - 3385 Cody Ln, Teton Village, WY 83025',
    dropoffLocation: 'Jackson Hole Airport (JAC)',
    scheduledTime: '2024-01-19T08:30:00Z',
    type: 'dropoff' as const,
    estimatedDuration: 50,
    price: '90',
    notes: 'Guest requested early pickup due to weather concerns',
  },
  {
    flightNumber: 'AS987',
    airline: 'Alaska Airlines',
    departure: 'SEA',
    arrival: 'JAC',
    pickupLocation: 'Jackson Hole Airport (JAC)',
    dropoffLocation: 'Amangani - 1535 Northeast Butte Road, Jackson, WY 83001',
    scheduledTime: '2024-01-20T19:45:00Z',
    type: 'pickup' as const,
    estimatedDuration: 40,
    price: '110',
    notes: 'Completed successfully - guest very satisfied',
  },
  {
    flightNumber: 'NK654',
    airline: 'Spirit Airlines',
    departure: 'LAX',
    arrival: 'JAC',
    pickupLocation: 'Jackson Hole Airport (JAC)',
    dropoffLocation: 'Hotel Jackson - 470 W Broadway, Jackson, WY 83001',
    scheduledTime: '2024-01-21T11:20:00Z',
    type: 'dropoff' as const,
    estimatedDuration: 45,
    price: '60',
  },
];

async function generateMockData() {
  try {
    console.log('📊 Checking existing data...');

    // Check if we already have runs
    const existingRuns = await db.query('SELECT COUNT(*) as count FROM runs');
    const runCount = existingRuns.rows[0].count;

    console.log(`📈 Found ${runCount} existing runs`);

    if (runCount > 0) {
      console.log('📋 Getting existing run IDs...');
      const existingRunsResult = await db.query(
        'SELECT id FROM runs ORDER BY created_at DESC LIMIT 10'
      );
      return existingRunsResult.rows.map(row => row.id as string);
    }

    console.log('🏃 Creating mock runs...');

    const createdRunIds: string[] = [];

    for (const runData of mockRuns) {
      try {
        const newRun = await createRun(runData);
        createdRunIds.push(newRun.id);
        console.log(
          `✅ Created run: ${runData.flightNumber} (${runData.type})`
        );
      } catch (error) {
        console.error(
          `❌ Failed to create run for ${runData.flightNumber}:`,
          error
        );
      }
    }

    console.log(`\n🎯 Created ${createdRunIds.length} runs successfully`);
    return createdRunIds;
  } catch (error) {
    console.error('❌ Error generating mock runs:', error);
    throw error;
  }
}

async function generateMockNotifications(runIds: string[]) {
  try {
    console.log('\n📬 Generating mock notifications...');

    // Check if we already have notifications
    const existingNotifications = await db.query(
      'SELECT COUNT(*) as count FROM notifications'
    );
    const notificationCount = existingNotifications.rows[0].count;

    if (notificationCount > 0) {
      console.log(
        `📮 Found ${notificationCount} existing notifications - skipping generation`
      );
      return;
    }

    const mockNotifications = [
      {
        type: 'flight_update' as const,
        title: 'Flight Delay Update',
        message:
          'Flight UA2729 has been delayed by 30 minutes due to weather conditions.',
        flightNumber: 'UA2729',
        runId: runIds[0],
        metadata: {
          originalTime: '2024-01-15T14:30:00Z',
          newTime: '2024-01-15T15:00:00Z',
          reason: 'Weather conditions',
        },
      },
      {
        type: 'traffic_alert' as const,
        title: 'Traffic Alert',
        message:
          'Heavy traffic reported on Highway 22. Consider departing 15 minutes early.',
        flightNumber: 'AA1558',
        runId: runIds[1],
        metadata: {
          route: 'Highway 22',
          delayMinutes: 15,
          recommendation: 'Depart 15 minutes early',
        },
      },
      {
        type: 'run_reminder' as const,
        title: 'Upcoming Run Reminder',
        message:
          'Reminder: Pickup for DL1234 at Four Seasons Resort in 2 hours.',
        flightNumber: 'DL1234',
        runId: runIds[2],
        metadata: {
          timeUntilRun: 120,
          location: 'Four Seasons Resort Jackson Hole',
        },
      },
      {
        type: 'status_change' as const,
        title: 'Run Status Update',
        message: 'Run for WN1847 has been marked as completed successfully.',
        flightNumber: 'WN1847',
        runId: runIds[3],
        metadata: {
          previousStatus: 'active',
          newStatus: 'completed',
        },
      },
      {
        type: 'system' as const,
        title: 'System Maintenance',
        message:
          'Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM MST.',
        metadata: {
          maintenanceStart: '2024-01-22T09:00:00Z',
          maintenanceEnd: '2024-01-22T11:00:00Z',
        },
      },
      {
        type: 'flight_update' as const,
        title: 'Gate Change',
        message: 'Flight F9321 gate has changed from A12 to B8.',
        flightNumber: 'F9321',
        runId: runIds[4],
        metadata: {
          originalGate: 'A12',
          newGate: 'B8',
        },
      },
      {
        type: 'traffic_alert' as const,
        title: 'Road Construction',
        message: 'Road construction on Granite Loop Road may cause delays.',
        flightNumber: 'AS987',
        runId: runIds[5],
        metadata: {
          route: 'Granite Loop Road',
          expectedDelay: 10,
        },
      },
    ];

    let createdCount = 0;

    for (const notificationData of mockNotifications) {
      try {
        await createNotificationDb(notificationData);
        createdCount++;
        console.log(`✅ Created notification: ${notificationData.title}`);
      } catch (error) {
        console.error(
          `❌ Failed to create notification: ${notificationData.title}`,
          error
        );
      }
    }

    console.log(`\n📮 Created ${createdCount} notifications successfully`);
  } catch (error) {
    console.error('❌ Error generating mock notifications:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting mock data generation...\n');

    const runIds = await generateMockData();
    await generateMockNotifications(runIds);

    console.log('\n🎉 Mock data generation completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - ${runIds.length} runs created/found`);
    console.log('   - Mock notifications generated');
    console.log('\n💡 You can now view the mock data in the application');
  } catch (error) {
    console.error('❌ Mock data generation failed:', error);
    process.exit(1);
  }
}

main();
