import { createClient, type Client } from '@libsql/client';
import type { NewRunForm } from '../schema';

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

// Utility function to generate user IDs
export function generateUserId(): string {
  if (typeof window !== 'undefined') {
    // Try to get existing user ID from localStorage
    let userId = window.localStorage.getItem('user-id');
    if (!userId) {
      // Generate new user ID
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      window.localStorage.setItem('user-id', userId);
    }
    return userId;
  }
  // Server-side fallback
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Database client instance
let db: Client | null = null;

// Initialize database connection
export function initializeDatabase(): Client {
  if (db) return db;

  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    // Fallback to local SQLite for development
    console.log('🗄️ Using local SQLite database');
    db = createClient({
      url: 'file:local.db',
    });
  } else if (url.startsWith('libsql://') && authToken) {
    // Production Turso setup
    console.log('🌐 Connecting to Turso database');
    db = createClient({
      url,
      authToken,
    });
  } else if (url.startsWith('file:')) {
    // Local file database
    console.log('📁 Using local file database');
    db = createClient({ url });
  } else {
    throw new Error(
      'Invalid database configuration. Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN or DATABASE_URL.'
    );
  }

  return db;
}

// Get database instance
export function getDatabase(): Client {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

// Initialize database schema
export async function initializeSchema(): Promise<void> {
  const db = getDatabase();

  try {
    // User preferences table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY,
        home_airport TEXT,
        theme TEXT DEFAULT 'system',
        timezone TEXT DEFAULT 'UTC',
        notification_preferences TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Historical runs table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        flight_number TEXT NOT NULL,
        airline TEXT,
        departure_airport TEXT,
        arrival_airport TEXT,
        pickup_location TEXT NOT NULL,
        dropoff_location TEXT NOT NULL,
        scheduled_time DATETIME NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        type TEXT NOT NULL CHECK (type IN ('pickup', 'dropoff')),
        price TEXT NOT NULL DEFAULT '0',
        notes TEXT,
        user_id TEXT,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `);

    // Flight data cache table (optional - for reducing API calls)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS flight_cache (
        flight_number TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
      )
    `);

    // Notifications table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('flight_update', 'traffic_alert', 'run_reminder', 'status_change', 'system')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        flight_number TEXT,
        pickup_location TEXT,
        dropoff_location TEXT,
        run_id TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_runs_scheduled_time ON runs(scheduled_time)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_flight_cache_expires ON flight_cache(expires_at)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_notifications_flight_number ON notifications(flight_number)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)
    `);

    // Migration: Add price column to existing runs table
    try {
      await db.execute(`
        ALTER TABLE runs ADD COLUMN price TEXT NOT NULL DEFAULT '0'
      `);
      console.log('✅ Added price column to runs table');
    } catch (error) {
      // Column might already exist, which is fine
      console.log('💡 Price column already exists or could not be added');
    }

    // Migration: Add timezone column to existing user_preferences table
    try {
      await db.execute(`
        ALTER TABLE user_preferences ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC'
      `);
      console.log('✅ Added timezone column to user_preferences table');
    } catch (error) {
      // Column might already exist, which is fine
      console.log('💡 Timezone column already exists or could not be added');
    }

    // Mock run data generation (if in development mode)
    if (DEV_MODE.FORCE_MOCK_RUNS) {
      // Check if we already have runs to avoid duplicating data
      const existingRuns = await db.execute(
        'SELECT COUNT(*) as count FROM runs'
      );
      const runCount = existingRuns.rows[0].count as number;

      if (runCount === 0) {
        console.log(
          '🔄 Generating realistic mock run data for Jackson Hole...'
        );

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
            scheduledTime: new Date(
              now.getTime() + 30 * 60 * 1000
            ).toISOString(),
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
                id, flight_number, airline, departure_airport, arrival_airport,
                pickup_location, dropoff_location, scheduled_time, status, type,
                price, notes, user_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
              runId,
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
              generateUserId(),
              currentTime,
              currentTime,
            ],
          });

          if (DEV_MODE.DEBUG_LOGGING) {
            console.log(`✅ Added mock run: ${run.flightNumber} (${status})`);
          }
        }

        console.log(
          `✅ Generated ${mockRuns.length} realistic mock runs for Jackson Hole`
        );
        console.log(
          '📋 Mock runs include scheduled, active, and completed statuses'
        );
      } else {
        if (DEV_MODE.DEBUG_LOGGING) {
          console.log(
            `📊 Found ${runCount} existing runs, skipping mock data generation`
          );
        }
      }
    }

    // Mock notification data generation (if in development mode)
    if (DEV_MODE.FORCE_MOCK_RUNS) {
      // Check if we already have notifications to avoid duplicating data
      const existingNotifications = await db.execute(
        'SELECT COUNT(*) as count FROM notifications'
      );
      const notificationCount = existingNotifications.rows[0].count as number;

      if (notificationCount === 0) {
        console.log('🔄 Generating realistic mock notification data...');

        const now = new Date();
        const userId = generateUserId();

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
              'Reminder: You have a pickup scheduled in 2 hours at Four Seasons Resort.',
            pickupLocation: 'Four Seasons Resort - Teton Village',
            dropoffLocation: 'Jackson Hole Airport (JAC)',
            runId: crypto.randomUUID(),
            isRead: false,
            metadata: JSON.stringify({
              originalType: 'run-reminder',
              passengerCount: 2,
            }),
            createdAt: new Date(
              now.getTime() - 1 * 60 * 60 * 1000
            ).toISOString(),
            updatedAt: new Date(
              now.getTime() - 1 * 60 * 60 * 1000
            ).toISOString(),
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
            createdAt: new Date(
              now.getTime() - 2 * 60 * 60 * 1000
            ).toISOString(),
            updatedAt: new Date(
              now.getTime() - 2 * 60 * 60 * 1000
            ).toISOString(),
          },
          {
            id: crypto.randomUUID(),
            userId,
            type: 'flight_update',
            title: 'Flight Arrival Update',
            message:
              'Flight DL1234 from Minneapolis has landed early at Jackson Hole Airport.',
            flightNumber: 'DL1234',
            pickupLocation: 'Jackson Hole Airport (JAC)',
            dropoffLocation: 'Four Seasons Resort - Teton Village',
            isRead: true,
            metadata: JSON.stringify({
              originalType: 'flight-arrival-reminder',
              gate: 'A3',
              terminal: 'Main',
            }),
            createdAt: new Date(
              now.getTime() - 3 * 60 * 60 * 1000
            ).toISOString(),
            updatedAt: new Date(
              now.getTime() - 3 * 60 * 60 * 1000
            ).toISOString(),
          },
          {
            id: crypto.randomUUID(),
            userId,
            type: 'status_change',
            title: 'Run Status Update',
            message:
              'Your run to Jackson Hole Airport has been completed successfully.',
            flightNumber: 'AA1558',
            pickupLocation: 'Hotel Inn & Suites - Downtown Jackson',
            dropoffLocation: 'Jackson Hole Airport (JAC)',
            runId: crypto.randomUUID(),
            isRead: true,
            metadata: JSON.stringify({
              originalType: 'system-update',
              completedAt: new Date(
                now.getTime() - 4 * 60 * 60 * 1000
              ).toISOString(),
            }),
            createdAt: new Date(
              now.getTime() - 4 * 60 * 60 * 1000
            ).toISOString(),
            updatedAt: new Date(
              now.getTime() - 4 * 60 * 60 * 1000
            ).toISOString(),
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
            createdAt: new Date(
              now.getTime() - 6 * 60 * 60 * 1000
            ).toISOString(),
            updatedAt: new Date(
              now.getTime() - 6 * 60 * 60 * 1000
            ).toISOString(),
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

          if (DEV_MODE.DEBUG_LOGGING) {
            console.log(`✅ Added mock notification: ${notification.title}`);
          }
        }

        console.log(
          `✅ Generated ${mockNotifications.length} realistic mock notifications`
        );
        console.log(
          '📋 Mock notifications include various types and read statuses'
        );
      } else {
        if (DEV_MODE.DEBUG_LOGGING) {
          console.log(
            `📊 Found ${notificationCount} existing notifications, skipping mock data generation`
          );
        }
      }
    }

    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error);
    throw error;
  }
}

// Helper function to handle database errors gracefully
export function handleDatabaseError(error: any, operation: string): void {
  console.error(`❌ Database error during ${operation}:`, error);

  // You could add error reporting here (e.g., Sentry)
  // For now, we'll just log and continue
}

// Clean up expired cache entries
export async function cleanupExpiredCache(): Promise<void> {
  try {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'DELETE FROM flight_cache WHERE expires_at < datetime("now")',
      args: [],
    });

    if (result.rowsAffected > 0) {
      console.log(`🧹 Cleaned up ${result.rowsAffected} expired cache entries`);
    }
  } catch (error) {
    handleDatabaseError(error, 'cache cleanup');
  }
}
