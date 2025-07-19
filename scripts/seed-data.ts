#!/usr/bin/env bun
import { generateBillTo, generateReservationId } from '../src/api/seed';
import { initializeDatabase } from '../src/lib/db';
import {
  createNotification,
  type NotificationForm,
} from '../src/lib/db/notifications';
import { createReportTemplate } from '../src/lib/db/report-templates';
import { createRunsBatch } from '../src/lib/db/runs';
import {
  type NewRunForm,
  type ReportTemplateForm,
  ReportType,
} from '../src/lib/schema';

// Get user ID from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Error: User ID is required');
  console.error('Usage: bun run seed-data.ts <user-id>');
  console.error('Example: bun run seed-data.ts user_2abc123def456');
  process.exit(1);
}

// Validate user ID format (basic check for Clerk user ID format)
if (!userId.startsWith('user_')) {
  console.error(
    '❌ Error: User ID must be a valid Clerk user ID (starts with "user_")'
  );
  console.error('Example: user_2abc123def456');
  process.exit(1);
}

async function seedDatabase() {
  try {
    // Initialize database
    console.log('🌱 Starting database seeding...');
    initializeDatabase();

    // Create a sample report template first (required for runs)
    console.log('📋 Creating sample report template...');
    const sampleTemplate: ReportTemplateForm = {
      name: 'Basic Run Report',
      description: 'Simple report template for basic run tracking',
      organizationId: 'sample_org', // You may need to replace this with a real org ID
      reportType: ReportType.run,
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
          field: 'pickupLocation',
          label: 'Pickup Location',
          order: 2,
          required: true,
        },
        {
          field: 'dropoffLocation',
          label: 'Dropoff Location',
          order: 3,
          required: true,
        },
        { field: 'type', label: 'Type', order: 4, required: true },
        { field: 'price', label: 'Price', order: 5, required: false },
      ],
      createdBy: userId,
    };

    const reportTemplate = await createReportTemplate(sampleTemplate);
    console.log(`✅ Created report template: ${reportTemplate.id}`);

    // Create sample runs
    console.log('🏃 Creating sample runs...');
    const sampleRuns: NewRunForm[] = [
      {
        reportTemplateId: reportTemplate.id,
        reservation_id: generateReservationId(),
        billTo: generateBillTo(),
        flightNumber: 'UA1234',
        airline: 'United Airlines',
        departure: 'JAC',
        arrival: 'DEN',
        pickupLocation: 'Jackson Hole Airport',
        dropoffLocation: 'Denver International Airport',
        scheduledTime: new Date('2024-01-15T10:30:00Z').toISOString(),
        estimatedDuration: 90,
        type: 'pickup',
        price: '150',
        notes: 'Sample pickup run',
      },
      {
        reportTemplateId: reportTemplate.id,
        reservation_id: generateReservationId(),
        billTo: null, // Testing nullable field
        flightNumber: 'DL5678',
        airline: 'Delta Air Lines',
        departure: 'DEN',
        arrival: 'JAC',
        pickupLocation: 'Denver International Airport',
        dropoffLocation: 'Jackson Hole Airport',
        scheduledTime: new Date('2024-01-16T14:45:00Z').toISOString(),
        estimatedDuration: 85,
        type: 'dropoff',
        price: '145',
        notes: 'Sample dropoff run',
      },
    ];

    const runs = await createRunsBatch(sampleRuns, userId);

    // Create sample notifications
    console.log('📢 Creating sample notifications...');
    const sampleNotifications: NotificationForm[] = [
      {
        type: 'flight_update',
        title: 'Flight Delayed',
        message: 'Flight UA1234 has been delayed by 30 minutes',
        flightNumber: 'UA1234',
        runId: runs[0].id,
        metadata: {
          delay: 30,
          reason: 'Weather conditions',
        },
      },
      {
        type: 'traffic_alert',
        title: 'Traffic Alert',
        message: 'Heavy traffic reported on route to airport',
        runId: runs[1].id,
        metadata: {
          severity: 'moderate',
          estimatedDelay: 15,
        },
      },
    ];

    for (const notificationData of sampleNotifications) {
      await createNotification(notificationData, userId);
    }

    console.log('✅ Database seeding completed successfully!');
    console.log(`👤 User ID: ${userId}`);
    console.log(`📋 Created 1 report template`);
    console.log(`🏃 Created ${runs.length} runs`);
    console.log(`📢 Created ${sampleNotifications.length} notifications`);
    console.log('✅ User preferences configured');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seedDatabase();
