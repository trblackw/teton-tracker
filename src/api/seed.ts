import { initJSONResponse } from '../lib/api/api-tools';
import { getDatabase } from '../lib/db/index';
import { notificationsDb } from '../lib/db/notifications-db';
import { preferencesDb } from '../lib/db/preferences-db';
import { reportTemplatesDb } from '../lib/db/report-templates-db';
import { runsDb } from '../lib/db/runs-db';
import type { ReportType, RunStatus, RunType } from '../lib/schema';

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

// Report template samples for seed data
const sampleReportTemplates = [
  {
    name: 'Standard Run Report',
    description: 'Complete report with all essential run information',
    reportType: 'run' as ReportType,
    isDefault: true,
    columnConfig: [
      {
        field: 'flightNumber',
        label: 'Flight Number',
        order: 0,
        required: true,
      },
      { field: 'airline', label: 'Airline', order: 1, required: true },
      {
        field: 'departure',
        label: 'Departure Airport',
        order: 2,
        required: true,
      },
      { field: 'arrival', label: 'Arrival Airport', order: 3, required: true },
      {
        field: 'pickupLocation',
        label: 'Pickup Location',
        order: 4,
        required: true,
      },
      {
        field: 'dropoffLocation',
        label: 'Dropoff Location',
        order: 5,
        required: false,
      },
      { field: 'price', label: 'Price', order: 6, required: false },
      { field: 'type', label: 'Run Type', order: 7, required: true },
    ],
  },
  {
    name: 'Quick Run Summary',
    description: 'Minimal report focusing on key operational details',
    reportType: 'run' as ReportType,
    isDefault: false,
    columnConfig: [
      { field: 'flightNumber', label: 'Flight #', order: 0, required: true },
      { field: 'airline', label: 'Airline', order: 1, required: true },
      { field: 'pickupLocation', label: 'Pickup', order: 2, required: true },
      { field: 'type', label: 'Type', order: 3, required: true },
    ],
  },
  {
    name: 'Financial Run Report',
    description: 'Focused on pricing and financial tracking',
    reportType: 'run' as ReportType,
    isDefault: false,
    columnConfig: [
      {
        field: 'flightNumber',
        label: 'Flight Number',
        order: 0,
        required: true,
      },
      { field: 'airline', label: 'Airline', order: 1, required: true },
      { field: 'price', label: 'Price ($)', order: 2, required: true },
      { field: 'type', label: 'Service Type', order: 3, required: true },
      { field: 'pickupLocation', label: 'Origin', order: 4, required: false },
      {
        field: 'dropoffLocation',
        label: 'Destination',
        order: 5,
        required: false,
      },
    ],
  },
  {
    name: 'Flight Operations Report',
    description: 'Detailed flight information for operations team',
    reportType: 'flight' as ReportType,
    isDefault: false,
    columnConfig: [
      {
        field: 'flightNumber',
        label: 'Flight Number',
        order: 0,
        required: true,
      },
      { field: 'airline', label: 'Carrier', order: 1, required: true },
      { field: 'departure', label: 'Origin Airport', order: 2, required: true },
      {
        field: 'arrival',
        label: 'Destination Airport',
        order: 3,
        required: true,
      },
    ],
  },
  {
    name: 'Driver Assignment Report',
    description: 'Simplified view for driver assignments and scheduling',
    reportType: 'run' as ReportType,
    isDefault: false,
    columnConfig: [
      {
        field: 'pickupLocation',
        label: 'Pickup Location',
        order: 0,
        required: true,
      },
      {
        field: 'dropoffLocation',
        label: 'Dropoff Location',
        order: 1,
        required: false,
      },
      { field: 'flightNumber', label: 'Flight', order: 2, required: true },
      { field: 'airline', label: 'Airline', order: 3, required: false },
      { field: 'type', label: 'Service', order: 4, required: true },
    ],
  },
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

export function generateReservationId(): string {
  return Math.floor(1000000 + Math.random() * 9000000).toString();
}

// Generate a 2-character bill-to code (sometimes null)
export function generateBillTo(): string | null {
  // 70% chance of having a bill-to code, 30% chance of null
  if (Math.random() > 0.7) {
    return null;
  }

  const codes = [
    'AA',
    'BB',
    'CC',
    'DD',
    'EE',
    'FF',
    'GG',
    'HH',
    'II',
    'JJ',
    'KK',
    'LL',
    'MM',
    'NN',
    'OO',
    'PP',
    'QQ',
    'RR',
    'SS',
    'TT',
    'UU',
    'VV',
    'WW',
    'XX',
    'YY',
    'ZZ',
  ];
  return randomItem(codes);
}

// Helper function to get organization ID for a user using BetterAuth database
async function getUserOrganizationId(userId: string): Promise<string | null> {
  try {
    const db = getDatabase();
    const result = await db.query(
      'SELECT organization_id FROM organization_memberships WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].organization_id;
  } catch (error) {
    console.error('Error fetching user organization:', error);
    return null;
  }
}

// Generate sample report templates for organization
async function generateReportTemplates(userId: string): Promise<number> {
  console.log('📋 Generating sample report templates...');

  try {
    const organizationId = await getUserOrganizationId(userId);

    if (!organizationId) {
      console.log(
        '⚠️ User not in organization, skipping report template generation'
      );
      return 0;
    }

    // Clear existing report templates for this organization
    const db = getDatabase();
    await db.query('DELETE FROM report_templates WHERE organization_id = $1', [
      organizationId,
    ]);
    console.log('🧹 Cleared existing report templates for organization');

    let templatesCreated = 0;
    let defaultTemplateCreated = false;

    for (const templateData of sampleReportTemplates) {
      try {
        // Ensure only one default template per organization
        const isDefaultTemplate =
          templateData.isDefault && !defaultTemplateCreated;

        await reportTemplatesDb.createReportTemplate({
          ...templateData,
          isDefault: isDefaultTemplate,
          organizationId,
          createdBy: userId,
        });

        if (isDefaultTemplate) {
          defaultTemplateCreated = true;
          console.log(`✅ Created DEFAULT template: ${templateData.name}`);
        } else {
          console.log(
            `✅ Created template: ${templateData.name}${templateData.isDefault ? ' (default flag removed - only one default allowed)' : ''}`
          );
        }

        templatesCreated++;
      } catch (error) {
        console.error(
          `❌ Failed to create template ${templateData.name}:`,
          error
        );
      }
    }

    console.log(`📋 Generated ${templatesCreated} report templates`);
    return templatesCreated;
  } catch (error) {
    console.error('❌ Error generating report templates:', error);
    return 0;
  }
}

// Helper function to get organization drivers
async function getOrganizationDrivers(
  userId: string
): Promise<Array<{ userId: string; name: string; email: string }>> {
  try {
    console.log(`🔍 Fetching organization members for user: ${userId}`);

    const db = getDatabase();

    // First get the user's organization ID
    const userOrgResult = await db.query(
      'SELECT organization_id FROM organization_memberships WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (userOrgResult.rows.length === 0) {
      console.log('ℹ️ User is not a member of any organization');
      return [];
    }

    const organizationId = userOrgResult.rows[0].organization_id;

    // Get all members of the organization with their user details
    const membersResult = await db.query(
      `
      SELECT u.id, u.name, u.email, om.role 
      FROM "user" u 
      JOIN organization_memberships om ON u.id = om.user_id 
      WHERE om.organization_id = $1 AND u.id != $2
    `,
      [organizationId, userId]
    );

    if (membersResult.rows.length === 0) {
      console.log('ℹ️ No other members found in organization');
      return [];
    }

    const memberDetails = membersResult.rows.map(row => ({
      userId: row.id,
      name: row.name || 'Unknown User',
      email: row.email || 'No email',
      role: row.role || 'driver',
    }));

    console.log(
      `✅ Found ${memberDetails.length} organization members to use as drivers:`
    );
    memberDetails.forEach(member => {
      console.log(`   - ${member.name} (${member.email}) - ${member.userId}`);
    });

    return memberDetails;
  } catch (error) {
    console.error('❌ Error fetching organization members:', error);
    return [];
  }
}

export async function seedDataForUser(userId: string): Promise<{
  runs: number;
  notifications: number;
  templates: number;
  message: string;
}> {
  console.log(`🌱 Starting data seeding for user: ${userId}`);

  try {
    // Set user's home airport to JAC (Jackson Hole Airport)
    console.log('🏠 Setting home airport to JAC (Jackson Hole Airport)...');
    try {
      await preferencesDb.saveUserPreferences(
        {
          homeAirport: 'JAC',
        },
        userId
      );
      console.log('✅ Home airport set to JAC');
    } catch (error) {
      console.warn('⚠️ Failed to set home airport:', error);
      // Continue with seeding even if this fails
    }

    // Get organization members to use as drivers
    const organizationMembers = await getOrganizationDrivers(userId);
    const allUserIds =
      organizationMembers.length > 0
        ? [userId, ...organizationMembers.map(m => m.userId)]
        : [userId];

    console.log(
      `👥 Will create enhanced dataset for ${allUserIds.length} users:`
    );
    console.log(`   🎯 Current user: 15-20 runs (substantial testing data)`);
    console.log(`   👨‍💼 Other admins: 12 runs each (3x increase)`);
    console.log(`   🚗 Drivers: 24-39 runs each (3x increase)`);
    console.log(`   📱 Notifications: 2-5 per run (enhanced variety)`);
    console.log(`   Total organization members: ${organizationMembers.length}`);

    // Clear existing data for clean seeding
    console.log('🧹 Clearing existing data for clean seeding...');
    const db = getDatabase();

    try {
      // Delete existing runs and notifications for all users in the organization
      for (const targetUserId of allUserIds) {
        await db.query(`DELETE FROM runs WHERE created_by_id = $1`, [
          targetUserId,
        ]);
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

    // Get organization ID and default report template
    console.log(
      '📋 Getting organization context and generating report templates...'
    );
    const organizationId = await getUserOrganizationId(userId);

    if (!organizationId) {
      throw new Error(
        'User must be in an organization to create runs with report templates'
      );
    }

    // Generate sample report templates for the organization FIRST
    console.log('📋 Generating report templates before creating runs...');
    const templatesCreated = await generateReportTemplates(userId);
    console.log(`✅ Created ${templatesCreated} report templates`);

    // Now get default report template for the organization
    const defaultTemplates = await reportTemplatesDb.getReportTemplates({
      organizationId,
      isDefault: true,
      limit: 1,
    });

    let defaultReportTemplateId: string;
    if (defaultTemplates.length === 0) {
      // If no default template exists, get any template for this organization
      const anyTemplates = await reportTemplatesDb.getReportTemplates({
        organizationId,
        limit: 1,
      });

      if (anyTemplates.length === 0) {
        throw new Error(
          'No report templates found for organization. Please create report templates first.'
        );
      }

      defaultReportTemplateId = anyTemplates[0].id;
      console.log(
        `⚠️ No default template found, using: ${anyTemplates[0].name}`
      );
    } else {
      defaultReportTemplateId = defaultTemplates[0].id;
      console.log(`✅ Using default template: ${defaultTemplates[0].name}`);
    }

    // Generate date range and runs with realistic distribution
    const now = new Date();
    const pastDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days future

    const allRuns: Array<{
      createdById: string;
      organizationId: string;
      reportTemplateId: string;
      reservationId: string;
      billTo: string | null;
      flightNumber: string;
      airline: string;
      departure: string;
      arrival: string;
      pickupLocation: string;
      dropoffLocation: string;
      scheduledTime: string;
      estimatedDuration: number;
      type: RunType;
      status: RunStatus;
      price: string;
      notes?: string;
      targetUserId: string;
      userName: string;
    }> = [];
    let totalNotificationCount = 0;

    // Create runs for each user (distribute across drivers)
    for (let userIndex = 0; userIndex < allUserIds.length; userIndex++) {
      const targetUserId = allUserIds[userIndex];
      const isAdmin = targetUserId === userId;
      const isCurrentUser = targetUserId === userId;
      const member = organizationMembers.find(m => m.userId === targetUserId);
      const userName =
        member?.name || (isCurrentUser ? 'Current User' : 'Unknown User');

      // 3x the data generation:
      // - Current user gets substantial runs regardless of role (15-20 runs)
      // - Other admins get moderate runs (12 runs)
      // - Drivers get lots of runs (24-39 runs)
      let runsPerUser: number;
      if (isCurrentUser) {
        runsPerUser = Math.floor(Math.random() * 6) + 15; // 15-20 runs for current user
        console.log(
          `🚗 Creating ${runsPerUser} runs for CURRENT USER: ${userName} (${targetUserId})`
        );
      } else if (isAdmin) {
        runsPerUser = 12; // 3x the original 4 runs for other admins
        console.log(
          `🚗 Creating ${runsPerUser} runs for admin: ${userName} (${targetUserId})`
        );
      } else {
        runsPerUser = Math.floor(Math.random() * 16) + 24; // 24-39 runs for drivers (3x 8-13)
        console.log(
          `🚗 Creating ${runsPerUser} runs for driver: ${userName} (${targetUserId})`
        );
      }

      for (let i = 0; i < runsPerUser; i++) {
        const airline = randomItem(airlines);
        const flightNumber = generateFlightNumber(airline.code);
        const runType: RunType = randomItem(runTypes);

        let scheduledTime: Date;
        let status: RunStatus;

        // Enhanced distribution with more variety for larger datasets:
        // - More future runs (first 15% scheduled)
        // - More recent runs (next 20% mix of active/completed)
        // - More current active runs (better for testing)
        // - Rest are historical

        if (i < Math.max(2, Math.floor(runsPerUser * 0.15))) {
          // Future runs - scheduled between tomorrow and 30 days from now
          const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          scheduledTime = randomDate(tomorrow, futureDate);
          status = 'scheduled';
        } else if (i < Math.max(4, Math.floor(runsPerUser * 0.35))) {
          // Recent runs - last 7 days, some might be active
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          scheduledTime = randomDate(weekAgo, now);

          // More active runs for better testing experience
          if (
            i < Math.max(3, Math.floor(runsPerUser * 0.25)) &&
            Math.random() > 0.3
          ) {
            status = 'active'; // More active runs per user
          } else {
            status = Math.random() > 0.8 ? 'cancelled' : 'completed';
          }
        } else {
          // Historical runs - older than 7 days
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          scheduledTime = randomDate(pastDate, weekAgo);

          // Historical runs are mostly completed, some cancelled
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
                'Extra luggage - trailer needed',
                'Corporate client - invoice required',
              ][Math.floor(Math.random() * 10)]
            : undefined;

        const runData = {
          createdById: targetUserId,
          organizationId: organizationId!,
          reportTemplateId: defaultReportTemplateId,
          reservationId: generateReservationId(),
          billTo: generateBillTo(),
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

        allRuns.push({ ...runData, targetUserId, userName });
      }
    }

    // Create runs in database
    for (const runData of allRuns) {
      const { targetUserId, userName, ...runCreateData } = runData;
      const run = await runsDb.createRun(
        runCreateData,
        targetUserId,
        organizationId!
      );
      console.log(
        `✅ Created run: ${run.flightNumber} (${run.status}) for ${userName}`
      );

      // Enhanced notification generation for richer data
      // Generate 2-5 notifications per run (increased from 1-3)
      const runNotificationCount = Math.floor(Math.random() * 4) + 2;
      for (let i = 0; i < runNotificationCount; i++) {
        const notificationTypes = [
          'flight_update',
          'traffic_alert',
          'run_reminder',
          'status_change',
          'system',
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
          case 'system':
            title = 'System Notification';
            message = `System update for flight ${run.flightNumber}: ${randomItem(['Vehicle assignment updated', 'Route optimization completed', 'Weather advisory issued', 'Payment processed successfully', 'Customer message received'])}.`;
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

        await notificationsDb.createNotification(
          notificationData,
          targetUserId
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
        message: `Successfully created runs for ${allUserIds.length} organization members: ${organizationMembers.map(m => m.name).join(', ')}.`,
        metadata: {
          category: 'organization',
          driverCount: organizationMembers.length,
        },
      },
      {
        type: 'system' as const,
        title: 'Driver Management Active',
        message:
          'Admin features enabled. You can now view driver details, request status updates, and generate reports.',
        metadata: {
          category: 'admin',
          features: ['drivers', 'reports', 'sms'],
        },
      },
    ];

    for (const notification of systemNotifications) {
      await notificationsDb.createNotification(notification, userId);
      console.log(`✅ Created system notification: ${notification.title}`);
      totalNotificationCount++;
    }

    console.log(
      `🎉 Successfully created ${allRuns.length} runs and ${totalNotificationCount} notifications!`
    );

    // Generate sample report templates for the organization
    // const templatesCreated = await generateReportTemplates(userId); // This line is now redundant as it's moved

    console.log(`👥 Data distributed across ${allUserIds.length} users:`);
    console.log(`   - Current user received substantial data for testing`);
    if (organizationMembers.length > 0) {
      console.log(
        `   - ${organizationMembers.length} organization members: ${organizationMembers.map(m => m.name).join(', ')}`
      );
    }

    return {
      runs: allRuns.length,
      notifications: totalNotificationCount,
      templates: templatesCreated,
      message: `🚀 Enhanced data seeding completed! Generated ${allRuns.length} runs, ${totalNotificationCount} notifications, and ${templatesCreated} report templates across ${allUserIds.length} users. Current user received 15-20 runs for optimal testing experience. Organization members: ${organizationMembers.map(m => m.name).join(', ')}.`,
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
      return initJSONResponse({ error: 'User ID is required' }, 400);
    }

    // Call the actual seed data generation function
    const result = await seedDataForUser(userId);

    return initJSONResponse(result);
  } catch (error) {
    console.error('Failed to generate seed data:', error);
    return initJSONResponse({ error: 'Failed to generate seed data' }, 500);
  }
}

// DELETE /api/seed/clear
export async function DELETE(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return initJSONResponse({ error: 'User ID is required' }, 400);
    }

    const db = getDatabase();
    let deletedRuns = 0;
    let deletedNotifications = 0;
    let deletedPreferences = 0;

    try {
      // Count existing data before deletion
      const runsResult = await db.query(
        'SELECT COUNT(*) as count FROM runs WHERE created_by_id = $1',
        [userId]
      );
      deletedRuns = parseInt(runsResult.rows[0].count);

      const notificationsResult = await db.query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1',
        [userId]
      );
      deletedNotifications = parseInt(notificationsResult.rows[0].count);

      // Delete all user data except the user record itself and preferences
      await db.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM runs WHERE created_by_id = $1', [userId]);

      console.log(`✅ Cleared all data for user ${userId}:`);
      console.log(`   - ${deletedRuns} runs`);
      console.log(`   - ${deletedNotifications} notifications`);
      console.log(`   - Preserved user preferences`);

      return initJSONResponse({
        success: true,
        message: `Cleared ${deletedRuns} runs and ${deletedNotifications} notifications (preferences preserved)`,
        deletedRuns,
        deletedNotifications,
        deletedPreferences: 0, // No preferences deleted
      });
    } catch (error) {
      console.error('❌ Error clearing user data:', error);
      return initJSONResponse(
        {
          success: false,
          error: 'Failed to clear user data',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  } catch (error) {
    console.error('Failed to clear user data:', error);
    return initJSONResponse(
      {
        success: false,
        error: 'Failed to process request',
      },
      500
    );
  }
}
