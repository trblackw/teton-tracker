#!/usr/bin/env bun

import {
  getDatabase,
  getOrCreateUser,
  initializeDatabase,
} from '../src/lib/db/index';
import type { NewRunForm } from '../src/lib/schema';

// Generate mock run data for development
async function generateMockRuns(): Promise<string[]> {
  const db = getDatabase();

  try {
    console.log('🔄 Generating realistic mock run data for Jackson Hole...\n');

    // Check if we already have runs to avoid duplicating data
    const existingRuns = await db.execute('SELECT COUNT(*) as count FROM runs');
    const runCount = existingRuns.rows[0].count as number;

    if (runCount > 0) {
      console.log(
        `📊 Found ${runCount} existing runs, skipping mock data generation`
      );
      // Return existing run IDs for notifications
      const existingRunsResult = await db.execute(
        'SELECT id FROM runs ORDER BY created_at DESC LIMIT 5'
      );
      return existingRunsResult.rows.map(row => row.id as string);
    }

    // Create or get a mock user
    const mockUserId = await getOrCreateUser();
    const createdRunIds: string[] = [];

    const now = new Date();
    const mockRuns: NewRunForm[] = [
      // Upcoming runs (scheduled)
      {
        flightNumber: 'UA2729',
        airline: 'United Airlines',
        departure: 'JAC',
        arrival: 'DEN',
        pickupLocation: 'Jackson Hole Mountain Resort - Teton Village',
        dropoffLocation: 'Jackson Hole Airport (JAC)',
        scheduledTime: new Date(
          now.getTime() + 2 * 60 * 60 * 1000
        ).toISOString(),
        type: 'dropoff',
        price: '85',
        notes: 'Guest has ski equipment - extra time needed for loading',
      },
      {
        flightNumber: 'AA1558',
        airline: 'American Airlines',
        departure: 'JAC',
        arrival: 'DFW',
        pickupLocation: 'Hotel Inn & Suites - Downtown Jackson',
        dropoffLocation: 'Jackson Hole Airport (JAC)',
        scheduledTime: new Date(
          now.getTime() + 4 * 60 * 60 * 1000
        ).toISOString(),
        type: 'dropoff',
        price: '65',
        notes: 'Early morning flight - confirm pickup time with guest',
      },
      {
        flightNumber: 'DL1234',
        airline: 'Delta Air Lines',
        departure: 'MSP',
        arrival: 'JAC',
        pickupLocation: 'Jackson Hole Airport (JAC)',
        dropoffLocation: 'Four Seasons Resort - Teton Village',
        scheduledTime: new Date(
          now.getTime() + 6 * 60 * 60 * 1000
        ).toISOString(),
        type: 'pickup',
        price: '95',
        notes: 'VIP guest - luxury vehicle requested',
      },
      {
        flightNumber: 'WN1847',
        airline: 'Southwest Airlines',
        departure: 'DEN',
        arrival: 'JAC',
        pickupLocation: 'Jackson Hole Airport (JAC)',
        dropoffLocation: 'Snow King Resort - Jackson',
        scheduledTime: new Date(
          now.getTime() + 8 * 60 * 60 * 1000
        ).toISOString(),
        type: 'pickup',
        price: '55',
        notes: 'Family with 2 children - car seats available on request',
      },

      // Active runs (happening soon)
      {
        flightNumber: 'F9321',
        airline: 'Frontier Airlines',
        departure: 'JAC',
        arrival: 'PHX',
        pickupLocation: 'Rusty Parrot Lodge - Jackson',
        dropoffLocation: 'Jackson Hole Airport (JAC)',
        scheduledTime: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        type: 'dropoff',
        price: '75',
        notes: 'Guest requested early pickup due to weather concerns',
      },

      // Recent completed runs
      {
        flightNumber: 'AS987',
        airline: 'Alaska Airlines',
        departure: 'SEA',
        arrival: 'JAC',
        pickupLocation: 'Jackson Hole Airport (JAC)',
        dropoffLocation: 'Teton Mountain Lodge - Teton Village',
        scheduledTime: new Date(
          now.getTime() - 3 * 60 * 60 * 1000
        ).toISOString(),
        type: 'pickup',
        price: '90',
        notes: 'Completed successfully - guest very satisfied',
      },
      {
        flightNumber: 'NK654',
        airline: 'Spirit Airlines',
        departure: 'JAC',
        arrival: 'LAS',
        pickupLocation: 'Wyoming Inn - Jackson',
        dropoffLocation: 'Jackson Hole Airport (JAC)',
        scheduledTime: new Date(
          now.getTime() - 5 * 60 * 60 * 1000
        ).toISOString(),
        type: 'dropoff',
        price: '60',
      },
    ];

    for (const run of mockRuns) {
      const runId = crypto.randomUUID();
      const currentTime = new Date().toISOString();

      // Determine status based on scheduled time
      const scheduledTime = new Date(run.scheduledTime);
      const timeDiff = now.getTime() - scheduledTime.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      let status = 'scheduled';
      if (hoursDiff > 1) {
        status = 'completed';
      } else if (hoursDiff > -0.5 && hoursDiff < 1) {
        status = 'active';
      }

      await db.execute({
        sql: `
          INSERT INTO runs (
            id, user_id, flight_number, airline, departure_airport, arrival_airport,
            pickup_location, dropoff_location, scheduled_time, status, type,
            price, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          runId,
          mockUserId,
          run.flightNumber,
          run.airline || '',
          run.departure,
          run.arrival,
          run.pickupLocation,
          run.dropoffLocation,
          run.scheduledTime,
          status,
          run.type,
          run.price,
          run.notes || null,
          currentTime,
          currentTime,
        ],
      });

      createdRunIds.push(runId);
      console.log(`✅ Added mock run: ${run.flightNumber} (${status})`);
    }

    console.log(
      `\n✅ Generated ${mockRuns.length} realistic mock runs for Jackson Hole`
    );
    return createdRunIds;
  } catch (error) {
    console.error('❌ Failed to generate mock run data:', error);
    throw error;
  }
}

// Generate mock notification data
async function generateMockNotifications(runIds: string[]): Promise<void> {
  const db = getDatabase();

  try {
    console.log('🔄 Generating realistic mock notification data...\n');

    // Check if we already have notifications to avoid duplicating data
    const existingNotifications = await db.execute(
      'SELECT COUNT(*) as count FROM notifications'
    );
    const notificationCount = existingNotifications.rows[0].count as number;

    if (notificationCount > 0) {
      console.log(
        `📊 Found ${notificationCount} existing notifications, skipping mock data generation`
      );
      return;
    }

    const now = new Date();
    const userId = await getOrCreateUser();

    // Use actual run IDs for more realistic notifications
    const upcomingRunId = runIds[0]; // UA2729 - upcoming flight
    const activeRunId = runIds[4]; // F9321 - active run
    const completedRunId = runIds[5]; // AS987 - completed run

    const mockNotifications = [
      // Recent notifications
      {
        id: crypto.randomUUID(),
        userId,
        type: 'flight_update',
        title: 'Flight Status Update',
        message:
          'Flight UA2729 to Denver has been delayed by 30 minutes due to weather conditions.',
        flightNumber: 'UA2729',
        pickupLocation: 'Jackson Hole Mountain Resort - Teton Village',
        dropoffLocation: 'Jackson Hole Airport (JAC)',
        runId: upcomingRunId,
        isRead: false,
        metadata: JSON.stringify({
          originalType: 'flight-status-change',
          delay: 30,
          reason: 'weather',
        }),
        createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        userId,
        type: 'run_reminder',
        title: 'Pickup Reminder',
        message:
          'Reminder: You have a pickup scheduled in 30 minutes at Rusty Parrot Lodge.',
        flightNumber: 'F9321',
        pickupLocation: 'Rusty Parrot Lodge - Jackson',
        dropoffLocation: 'Jackson Hole Airport (JAC)',
        runId: activeRunId,
        isRead: false,
        metadata: JSON.stringify({
          originalType: 'run-reminder',
          passengerCount: 1,
        }),
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        userId,
        type: 'traffic_alert',
        title: 'Traffic Alert',
        message:
          'Heavy traffic reported on Highway 22 towards Jackson Hole Airport. Consider alternative route.',
        metadata: JSON.stringify({
          originalType: 'traffic-alert',
          severity: 'heavy',
          estimatedDelay: 15,
        }),
        isRead: true,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        userId,
        type: 'status_change',
        title: 'Run Completed',
        message:
          'Your pickup from Jackson Hole Airport has been completed successfully. Guest was very satisfied with the service.',
        flightNumber: 'AS987',
        pickupLocation: 'Jackson Hole Airport (JAC)',
        dropoffLocation: 'Teton Mountain Lodge - Teton Village',
        runId: completedRunId,
        isRead: true,
        metadata: JSON.stringify({
          originalType: 'run-completion',
          rating: 5,
          completedAt: new Date(
            now.getTime() - 3 * 60 * 60 * 1000
          ).toISOString(),
        }),
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        userId,
        type: 'system',
        title: 'System Update',
        message:
          'Teton Tracker has been updated with new features for better flight tracking.',
        isRead: false,
        metadata: JSON.stringify({
          originalType: 'system-update',
          version: '1.2.0',
        }),
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      },
    ];

    for (const notification of mockNotifications) {
      await db.execute({
        sql: `
          INSERT INTO notifications (
            id, user_id, type, title, message, flight_number, pickup_location, 
            dropoff_location, run_id, is_read, metadata, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          notification.id,
          notification.userId,
          notification.type,
          notification.title,
          notification.message,
          notification.flightNumber || null,
          notification.pickupLocation || null,
          notification.dropoffLocation || null,
          notification.runId || null,
          notification.isRead,
          notification.metadata,
          notification.createdAt,
          notification.updatedAt,
        ],
      });

      console.log(`✅ Added mock notification: ${notification.title}`);
    }

    console.log(
      `\n✅ Generated ${mockNotifications.length} realistic mock notifications`
    );
  } catch (error) {
    console.error('❌ Failed to generate mock notification data:', error);
    throw error;
  }
}

// Main function
async function generateMockData() {
  try {
    initializeDatabase();
    const runIds = await generateMockRuns();
    await generateMockNotifications(runIds);

    console.log('\n🎉 Mock data generation completed successfully!');
    console.log(
      '📋 Created realistic foreign key relationships between runs and notifications'
    );
  } catch (error) {
    console.error('❌ Mock data generation failed:', error);
    process.exit(1);
  }
}

// Run the script
generateMockData().catch(console.error);
