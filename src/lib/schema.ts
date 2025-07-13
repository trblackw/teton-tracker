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

// Main data model schemas
export const RunSchema = z.object({
  id: z
    .string()
    .uuid('Invalid UUID format')
    .or(z.string().min(1, 'ID is required')),
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
  scheduledTime: DateTimeSchema,
  type: RunTypeSchema,
  status: RunStatusSchema,
  price: PriceSchema,
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
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

// Validation helper functions
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

// Safe validation functions (returns result with error handling)
export const safeValidateRun = (data: unknown) => {
  return RunSchema.safeParse(data);
};

export const safeValidateNewRunForm = (data: unknown) => {
  return NewRunFormSchema.safeParse(data);
};

export const safeValidateFlightStatus = (data: unknown) => {
  return FlightStatusSchema.safeParse(data);
};

export const safeValidateTrafficData = (data: unknown) => {
  return TrafficDataSchema.safeParse(data);
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
