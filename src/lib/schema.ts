import { z } from 'zod';

// Base schemas for reusable types
export const AirportCodeSchema = z
  .string()
  .min(3, 'Airport code must be at least 3 characters')
  .max(4, 'Airport code must be at most 4 characters')
  .regex(/^[A-Z]{3,4}$/, 'Airport code must be uppercase letters only');

export const FlightNumberSchema = z
  .string()
  .min(2, 'Flight number must be at least 2 characters')
  .max(10, 'Flight number must be at most 10 characters')
  .regex(
    /^[A-Z]{1,3}[0-9]{1,4}[A-Z]?$/,
    'Flight number format invalid (e.g., AA1234, UA123A)'
  );

export const LocationSchema = z
  .string()
  .min(1, 'Location is required')
  .max(200, 'Location must be at most 200 characters')
  .trim();

export const PriceSchema = z
  .string()
  .min(1, 'Price is required')
  .regex(/^\$?\d+$/, 'Price must be in format like "$500" or "500"')
  .transform(val => {
    // Remove dollar sign if present and return as whole number string
    const cleanValue = val.replace('$', '');
    const numValue = parseInt(cleanValue, 10);
    return numValue.toString();
  })
  .refine(val => parseInt(val, 10) > 0, {
    message: 'Price must be greater than 0',
  });

export const DateTimeSchema = z
  .string()
  .datetime({ message: 'Invalid datetime format' })
  .or(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Invalid datetime format')
  );

export const DurationSchema = z
  .number()
  .int('Duration must be a whole number')
  .min(1, 'Duration must be at least 1 minute')
  .max(1440, 'Duration cannot exceed 24 hours (1440 minutes)');

// Enums
export const RunTypeSchema = z.enum(['pickup', 'dropoff'], {
  errorMap: () => ({
    message: 'Run type must be either "pickup" or "dropoff"',
  }),
});

export const RunStatusSchema = z.enum(
  ['scheduled', 'active', 'completed', 'cancelled'],
  {
    errorMap: () => ({ message: 'Invalid run status' }),
  }
);

export const FlightStatusTypeSchema = z.enum(
  [
    'On Time',
    'Delayed',
    'Cancelled',
    'Departed',
    'Arrived',
    'Boarding',
    'Unknown',
  ],
  {
    errorMap: () => ({ message: 'Invalid flight status type' }),
  }
);

export const TrafficStatusSchema = z.enum(['good', 'moderate', 'heavy'], {
  errorMap: () => ({
    message: 'Traffic status must be good, moderate, or heavy',
  }),
});

export const NotificationTypeSchema = z.enum(
  ['flight_update', 'traffic_alert', 'run_reminder', 'status_change', 'system'],
  {
    errorMap: () => ({ message: 'Invalid notification type' }),
  }
);

export const ThemeSchema = z.enum(['light', 'dark', 'system'], {
  errorMap: () => ({ message: 'Theme must be light, dark, or system' }),
});

// User schema
export const ClerkUserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  phoneNumber: z.string().min(1, 'Phone number is required').optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  imageUrl: z.string().optional(),
});

export type ClerkUserRole = 'admin' | 'driver';

export enum ReportType {
  flight = 'flight',
  traffic = 'traffic',
  run = 'run',
}

export type DefaultReportConfigFields =
  | 'flightNumber'
  | 'airline'
  | 'departure'
  | 'arrival'
  | 'pickupLocation'
  | 'type'
  | 'dropoffLocation'
  | 'price';

export const defaultReportTemplateFields: DefaultReportConfigFields[] = [
  'flightNumber',
  'airline',
  'departure',
  'arrival',
  'pickupLocation',
  'type',
  'dropoffLocation',
  'price',
];

// Report Template schema
export const ReportTemplateSchema = z.object({
  id: z.string().uuid('Invalid report template ID format'),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  organizationId: z.string().min(1, 'Organization ID is required'),
  reportType: z.nativeEnum(ReportType).default(ReportType.run),
  columnConfig: z
    .array(
      z.object({
        field: z.string().min(1, 'Field name is required'),
        label: z.string().min(1, 'Column label is required'),
        order: z.number().int().min(0),
        required: z.boolean().default(false),
      })
    )
    .default(
      defaultReportTemplateFields.map((field, index) => ({
        field,
        label:
          field.charAt(0).toUpperCase() +
          field.slice(1).replace(/([A-Z])/g, ' $1'),
        order: index,
        required: false,
      }))
    ),
  isDefault: z.boolean().default(false),
  createdBy: z.string().min(1, 'User ID is required'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Form schema for client-side template creation/editing
export const ReportTemplateFormSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  organizationId: z.string().min(1, 'Organization ID is required'),
  reportType: z.nativeEnum(ReportType).default(ReportType.run),
  columnConfig: z
    .array(
      z.object({
        field: z.string().min(1, 'Field name is required'),
        label: z.string().min(1, 'Column label is required'),
        order: z.number().int().min(0),
        required: z.boolean().default(false),
      })
    )
    .min(2, 'Template must have at least 2 columns')
    .refine(columns => columns.every(col => col.label.trim().length > 0), {
      message: 'All columns must have labels',
    }),
  isDefault: z.boolean().default(false),
  createdBy: z.string().min(1, 'User ID is required'),
});

// Report schema
export const ReportSchema = z.object({
  id: z.string().uuid('Invalid report ID format'),
  name: z.string().min(1, 'Report name is required'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  createdBy: z.string().min(1, 'User ID is required'),
  templateId: z.string().uuid('Invalid template ID format'),
  startDate: z.date(),
  endDate: z.date(),
  reportType: z.nativeEnum(ReportType).default(ReportType.run),
  status: z.enum(['generating', 'completed', 'failed']).default('generating'),
  generatedAt: z.date().optional(),
  downloadUrl: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Phone number validation schema
export const PhoneNumberSchema = z
  .string()
  .optional()
  .refine(
    value => {
      if (!value || value.trim().length === 0) return true; // Optional field
      // Basic phone number validation - will be validated more thoroughly by SMS service
      return /^\+?[\d\s\-\(\)]{10,15}$/.test(value.replace(/\s/g, ''));
    },
    { message: 'Invalid phone number format' }
  );

// Notification preferences schema
export const NotificationPreferencesSchema = z.object({
  pushNotificationsEnabled: z.boolean().default(true),
  flightUpdates: z.boolean().default(true),
  trafficAlerts: z.boolean().default(true),
  runReminders: z.boolean().default(true),
  smsNotificationsEnabled: z.boolean().default(false),
  smsFlightUpdates: z.boolean().default(true),
  smsTrafficAlerts: z.boolean().default(true),
  smsRunReminders: z.boolean().default(true),
});

// User preferences schema (updated to use userId as primary key)
export const UserPreferencesSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  homeAirport: AirportCodeSchema.optional(),
  phoneNumber: PhoneNumberSchema,
  theme: ThemeSchema.default('system'),
  timezone: z.string().min(1, 'Timezone is required').default('UTC'),
  notificationPreferences: NotificationPreferencesSchema.default({}),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Client-side only user metadata interface (stored in localStorage)
export interface UserMetadata {
  userId: string;
  deviceType?: string;
  browser?: string;
  browserVersion?: string;
  operatingSystem?: string;
  screenResolution?: string;
  userAgent?: string;
  timezoneDetected?: string;
  lastSeen?: Date;
  sessionCount?: number;
  firstSeen?: Date;
}

// Notification schema
export const NotificationSchema = z.object({
  id: z.string().uuid('Invalid notification ID format'),
  userId: z.string().min(1, 'User ID is required'),
  type: NotificationTypeSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(1000, 'Message too long'),
  flightNumber: FlightNumberSchema.optional(),
  pickupLocation: LocationSchema.optional(),
  dropoffLocation: LocationSchema.optional(),
  runId: z.string().uuid('Invalid run ID format').optional(),
  isRead: z.boolean().default(false),
  metadata: z.record(z.any()).default({}),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Main data model schemas
export const RunSchema = z.object({
  id: z.string().uuid('Invalid run ID format'),
  userId: z.string().min(1, 'User ID is required'),
  flightNumber: FlightNumberSchema,
  airline: z
    .string()
    .min(2, 'Airline name must be at least 2 characters')
    .max(100, 'Airline name must be at most 100 characters')
    .trim(),
  departure: AirportCodeSchema,
  arrival: AirportCodeSchema,
  pickupLocation: LocationSchema,
  dropoffLocation: LocationSchema,
  estimatedDuration: DurationSchema,
  actualDuration: DurationSchema.optional(),
  scheduledTime: DateTimeSchema,
  type: RunTypeSchema,
  status: RunStatusSchema,
  price: PriceSchema,
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  completedAt: z.date().optional(),
  activatedAt: z.date().optional().nullable(),
  notes: z.string().max(500, 'Notes must be at most 500 characters').optional(),
});

export const FlightStatusSchema = z.object({
  flightNumber: FlightNumberSchema,
  status: FlightStatusTypeSchema,
  scheduledDeparture: z.string().optional(),
  actualDeparture: z.string().optional(),
  scheduledArrival: z.string().optional(),
  actualArrival: z.string().optional(),
  delay: z
    .number()
    .int('Delay must be a whole number')
    .min(0, 'Delay cannot be negative')
    .max(1440, 'Delay cannot exceed 24 hours')
    .optional(),
  gate: z.string().max(10, 'Gate must be at most 10 characters').optional(),
  terminal: z
    .string()
    .max(10, 'Terminal must be at most 10 characters')
    .optional(),
  aircraft: z
    .string()
    .max(50, 'Aircraft type must be at most 50 characters')
    .optional(),
  lastUpdated: z.date().optional(),
});

export const TrafficDataSchema = z.object({
  route: z.string().min(1, 'Route is required'),
  duration: z
    .number()
    .int('Duration must be a whole number')
    .min(0, 'Duration cannot be negative')
    .max(1440, 'Duration cannot exceed 24 hours'), // in minutes
  durationInTraffic: z
    .number()
    .int('Duration in traffic must be a whole number')
    .min(0, 'Duration in traffic cannot be negative')
    .max(1440, 'Duration in traffic cannot exceed 24 hours'), // in minutes
  distance: z
    .string()
    .regex(
      /^\d+(\.\d+)?\s?(miles|km|mi)$/,
      'Distance must be in format "X.X miles" or "X.X km"'
    ),
  status: TrafficStatusSchema,
  lastUpdated: z.date().optional(),
  incidents: z
    .array(
      z.object({
        type: z.enum(['accident', 'construction', 'closure', 'congestion']),
        description: z.string().max(200, 'Incident description too long'),
        severity: z.enum(['minor', 'moderate', 'major']),
      })
    )
    .optional(),
});

// Form schemas (for input validation)
export const NewRunFormSchema = z.object({
  userId: z.string().min(1, 'User ID is required').optional(), // Optional for forms, will be auto-generated
  flightNumber: FlightNumberSchema,
  airline: z
    .string()
    .min(2, 'Airline name must be at least 2 characters')
    .max(100, 'Airline name must be at most 100 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  departure: AirportCodeSchema,
  arrival: AirportCodeSchema,
  pickupLocation: LocationSchema,
  dropoffLocation: LocationSchema,
  estimatedDuration: DurationSchema,
  scheduledTime: DateTimeSchema,
  type: RunTypeSchema,
  price: PriceSchema,
  notes: z.string().max(500, 'Notes must be at most 500 characters').optional(),
});

// API response schemas
export const OpenSkyFlightResponseSchema = z.object({
  icao24: z.string(),
  firstSeen: z.number(),
  estDepartureAirport: z.string().nullable(),
  lastSeen: z.number(),
  estArrivalAirport: z.string().nullable(),
  callsign: z.string().nullable(),
  estDepartureAirportHorizDistance: z.number().nullable(),
  estDepartureAirportVertDistance: z.number().nullable(),
  estArrivalAirportHorizDistance: z.number().nullable(),
  estArrivalAirportVertDistance: z.number().nullable(),
  departureAirportCandidatesCount: z.number(),
  arrivalAirportCandidatesCount: z.number(),
});

export const TomTomRouteResponseSchema = z.object({
  routes: z.array(
    z.object({
      summary: z.object({
        lengthInMeters: z.number(),
        travelTimeInSeconds: z.number(),
        trafficDelayInSeconds: z.number(),
        trafficLengthInMeters: z.number(),
        departureTime: z.string(),
        arrivalTime: z.string(),
      }),
      legs: z.array(
        z.object({
          summary: z.object({
            lengthInMeters: z.number(),
            travelTimeInSeconds: z.number(),
            trafficDelayInSeconds: z.number(),
            trafficLengthInMeters: z.number(),
            departureTime: z.string(),
            arrivalTime: z.string(),
          }),
        })
      ),
    })
  ),
});

// Utility types (inferred from schemas)
export type ClerkUser = z.infer<typeof ClerkUserSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type NotificationPreferences = z.infer<
  typeof NotificationPreferencesSchema
>;
export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type Run = z.infer<typeof RunSchema>;
export type FlightStatus = z.infer<typeof FlightStatusSchema>;
export type TrafficData = z.infer<typeof TrafficDataSchema>;
export type NewRunForm = z.infer<typeof NewRunFormSchema>;
export type RunType = z.infer<typeof RunTypeSchema>;
export type RunStatus = z.infer<typeof RunStatusSchema>;
export type FlightStatusType = z.infer<typeof FlightStatusTypeSchema>;
export type TrafficStatus = z.infer<typeof TrafficStatusSchema>;
export type OpenSkyFlightResponse = z.infer<typeof OpenSkyFlightResponseSchema>;
export type TomTomRouteResponse = z.infer<typeof TomTomRouteResponseSchema>;
export type ReportTemplate = z.infer<typeof ReportTemplateSchema>;
export type ReportTemplateForm = z.infer<typeof ReportTemplateFormSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type ReportColumnConfig = ReportTemplate['columnConfig'][0];

// Validation helper functions
export const validateUser = (data: unknown): ClerkUser => {
  return ClerkUserSchema.parse(data);
};

export const validateUserPreferences = (data: unknown): UserPreferences => {
  return UserPreferencesSchema.parse(data);
};

export const validateNotification = (data: unknown): Notification => {
  return NotificationSchema.parse(data);
};

export const validateRun = (data: unknown): Run => {
  return RunSchema.parse(data);
};

export const validateNewRunForm = (data: unknown): NewRunForm => {
  return NewRunFormSchema.parse(data);
};

export const validateFlightStatus = (data: unknown): FlightStatus => {
  return FlightStatusSchema.parse(data);
};

export const validateTrafficData = (data: unknown): TrafficData => {
  return TrafficDataSchema.parse(data);
};

export const validateReportTemplateForm = (
  data: unknown
): ReportTemplateForm => {
  return ReportTemplateFormSchema.parse(data);
};

// Safe validation functions (return results instead of throwing)
export const safeValidateUser = (data: unknown) => {
  return ClerkUserSchema.safeParse(data);
};

export const safeValidateUserPreferences = (data: unknown) => {
  return UserPreferencesSchema.safeParse(data);
};

export const safeValidateNotification = (data: unknown) => {
  return NotificationSchema.safeParse(data);
};

export const safeValidateRun = (data: unknown) => {
  return RunSchema.safeParse(data);
};

export const safeValidateNewRunForm = (data: unknown) => {
  return NewRunFormSchema.safeParse(data);
};

export const safeValidateReportTemplateForm = (data: unknown) => {
  return ReportTemplateFormSchema.safeParse(data);
};

// Transform functions for external API data
export const transformOpenSkyToFlightStatus = (
  openSkyData: OpenSkyFlightResponse,
  flightNumber: string
): FlightStatus => {
  // Determine flight status based on OpenSky data
  let status: FlightStatusType = 'Unknown';

  if (openSkyData.firstSeen && openSkyData.lastSeen) {
    const currentTime = Math.floor(Date.now() / 1000);
    const timeSinceLastSeen = currentTime - openSkyData.lastSeen;

    if (timeSinceLastSeen < 300) {
      // Less than 5 minutes ago
      status = 'Departed'; // Flight is currently active
    } else if (openSkyData.estArrivalAirport) {
      status = 'Arrived'; // Flight has landed
    } else {
      status = 'Departed'; // Flight has taken off
    }
  } else if (openSkyData.firstSeen) {
    status = 'Boarding'; // Flight is preparing to depart
  }

  return FlightStatusSchema.parse({
    flightNumber,
    status,
    scheduledDeparture: undefined,
    actualDeparture: openSkyData.firstSeen
      ? new Date(openSkyData.firstSeen * 1000).toTimeString().substring(0, 5)
      : undefined,
    scheduledArrival: undefined,
    actualArrival: openSkyData.lastSeen
      ? new Date(openSkyData.lastSeen * 1000).toTimeString().substring(0, 5)
      : undefined,
    delay: undefined,
    gate: undefined,
    terminal: undefined,
    aircraft: undefined,
    lastUpdated: new Date(),
  });
};

export const transformTomTomToTrafficData = (
  tomTomData: TomTomRouteResponse,
  route: string
): TrafficData => {
  const routeData = tomTomData.routes[0];
  const summary = routeData.summary;

  const durationMinutes = Math.floor(summary.travelTimeInSeconds / 60);
  const trafficDelayMinutes = Math.floor(summary.trafficDelayInSeconds / 60);
  const durationInTrafficMinutes = durationMinutes + trafficDelayMinutes;

  const distanceKm = summary.lengthInMeters / 1000;
  const distanceMiles = distanceKm * 0.621371;

  let status: TrafficStatus;
  if (trafficDelayMinutes > 20) {
    status = 'heavy';
  } else if (trafficDelayMinutes > 10) {
    status = 'moderate';
  } else {
    status = 'good';
  }

  return TrafficDataSchema.parse({
    route,
    duration: durationMinutes,
    durationInTraffic: durationInTrafficMinutes,
    distance: `${distanceMiles.toFixed(1)} miles`,
    status,
    lastUpdated: new Date(),
  });
};
