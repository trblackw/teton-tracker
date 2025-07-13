import { getAirportDisplayName } from '../airport-codes';
import { type FlightStatus } from '../schema';

// AviationStack API configuration
const AVIATIONSTACK_BASE_URL = 'https://api.aviationstack.com/v1';

// Development mode configuration - use build-time constants
const DEV_MODE = {
  // Set to true to force mock data in development (easy toggle)
  FORCE_MOCK_DATA: false, // Only enable via constructor parameter
  // Set to true to enable debug logging
  DEBUG_LOGGING: false, // Only enable via constructor parameter
  // Set to true to test API key loading
  TEST_API_KEY_LOADING: false, // Only enable via constructor parameter
};

// Development mode is now controlled via constructor parameters
// No runtime environment checks needed in browser code

export interface FlightRequest {
  flightNumber: string;
  timeframe?: {
    begin: number; // Unix timestamp
    end: number; // Unix timestamp
  };
}

export interface UpcomingFlightsRequest {
  airport: string; // IATA airport code (AviationStack prefers IATA)
  airline?: string; // Optional airline filter (IATA airline code)
  flightNumber?: string; // Optional flight number filter
  limit?: number; // Number of flights to return (default 5)
}

// AviationStack API response structures
export interface AviationStackFlight {
  flight_date: string;
  flight_status: string;
  departure: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal?: string;
    gate?: string;
    delay?: number;
    scheduled: string;
    estimated?: string;
    actual?: string;
  };
  arrival: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal?: string;
    gate?: string;
    baggage?: string;
    delay?: number;
    scheduled: string;
    estimated?: string;
    actual?: string;
  };
  airline: {
    name: string;
    iata: string;
    icao: string;
  };
  flight: {
    number: string;
    iata: string;
    icao: string;
    codeshared?: any;
  };
  aircraft?: {
    registration?: string;
    iata?: string;
    icao?: string;
    icao24?: string;
  };
  live?: {
    updated: string;
    latitude: number;
    longitude: number;
    altitude: number;
    direction: number;
    speed_horizontal: number;
    speed_vertical: number;
    is_ground: boolean;
  };
}

export interface AviationStackResponse {
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
  data: AviationStackFlight[];
}

export interface UpcomingFlight {
  flightNumber: string;
  airline: string;
  destination: string;
  scheduledDeparture: string; // ISO datetime string
  estimatedDeparture?: string; // ISO datetime string
  status: string;
  aircraft?: string;
  gate?: string;
  terminal?: string;
}

export class FlightService {
  private timeout: number = 15000;
  private apiKey: string | null = null;
  private forceMockData: boolean = false;

  constructor(apiKey?: string, timeout?: number, forceMockData?: boolean) {
    this.apiKey = apiKey || null;
    this.timeout = timeout || 15000;
    this.forceMockData = forceMockData || DEV_MODE.FORCE_MOCK_DATA;

    if (DEV_MODE.DEBUG_LOGGING) {
      console.log('🔧 FlightService initialized:', {
        hasApiKey: !!this.apiKey,
        forceMockData: this.forceMockData,
        apiKeyLength: this.apiKey?.length || 0,
      });
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    if (DEV_MODE.DEBUG_LOGGING) {
      console.log('🔧 API key set, length:', apiKey?.length || 0);
    }
  }

  /**
   * Get upcoming departures from a specific airport using AviationStack API
   */
  async getUpcomingDepartures(
    request: UpcomingFlightsRequest
  ): Promise<UpcomingFlight[]> {
    try {
      console.log(
        `🛫 Fetching upcoming departures from ${request.airport}${request.airline ? ` for airline ${request.airline}` : ''}${request.flightNumber ? ` with flight number ${request.flightNumber}` : ''}`
      );

      // Check if we should use mock data
      if (this.forceMockData) {
        console.log(
          '🎭 Development mode: Using mock data (DEV_MODE.FORCE_MOCK_DATA = true)'
        );
        return this.getMockUpcomingFlights(request);
      }

      if (!this.apiKey) {
        console.warn('⚠️ No AviationStack API key provided, using mock data');
        return this.getMockUpcomingFlights(request);
      }

      // Build API request parameters
      const params = new URLSearchParams({
        access_key: this.apiKey,
        dep_iata: request.airport,
        flight_status: 'scheduled', // Get upcoming flights (scheduled is most relevant)
        limit: String(request.limit || 10),
      });

      // Add airline filter if specified
      if (request.airline && request.airline.trim()) {
        params.append('airline_iata', request.airline.toUpperCase());
      }

      // Add flight number filter if specified
      if (request.flightNumber && request.flightNumber.trim()) {
        params.append('flight_iata', request.flightNumber.toUpperCase());
      }

      const url = `${AVIATIONSTACK_BASE_URL}/flights?${params.toString()}`;
      console.log(
        `🔍 Fetching from AviationStack: ${url.replace(this.apiKey, '[API_KEY]')}`
      );

      const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      };

      if (typeof AbortController !== 'undefined') {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), this.timeout);
        fetchOptions.signal = controller.signal;
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid AviationStack API key');
        } else if (response.status === 429) {
          throw new Error('AviationStack API rate limit exceeded');
        } else {
          throw new Error(`AviationStack API error: ${response.status}`);
        }
      }

      const data: AviationStackResponse = await response.json();
      console.log(
        `📊 AviationStack returned ${data.data?.length || 0} flights`
      );

      if (!data.data || data.data.length === 0) {
        console.log('📭 No flights found from AviationStack');
        return [];
      }

      // Convert AviationStack flights to our format
      const upcomingFlights = data.data
        .slice(0, request.limit || 5)
        .map(flight => this.convertToUpcomingFlight(flight));

      console.log(`✅ Found ${upcomingFlights.length} upcoming departures`);
      return upcomingFlights;
    } catch (error) {
      console.error('❌ Failed to fetch upcoming departures:', error);
      // Return mock data as fallback
      return this.getMockUpcomingFlights(request);
    }
  }

  /**
   * Convert AviationStack flight to our UpcomingFlight format
   */
  private convertToUpcomingFlight(flight: AviationStackFlight): UpcomingFlight {
    const flightNumber =
      flight.flight.iata || flight.flight.number || 'Unknown';
    const airline = flight.airline.name || flight.airline.iata || 'Unknown';

    // Preserve full ISO datetime strings for timezone-aware formatting
    const scheduledDeparture =
      flight.departure.scheduled || new Date().toISOString();
    const estimatedDeparture = flight.departure.estimated;

    // Get destination with proper formatting
    const destination =
      getAirportDisplayName(flight.arrival.iata) ||
      flight.arrival.airport ||
      flight.arrival.iata;

    // Convert flight status to readable format
    const status = this.convertFlightStatus(flight.flight_status);

    return {
      flightNumber,
      airline,
      destination,
      scheduledDeparture,
      estimatedDeparture,
      status,
      aircraft: flight.aircraft?.iata || flight.aircraft?.registration,
      gate: flight.departure.gate,
      terminal: flight.departure.terminal,
    };
  }

  /**
   * Convert AviationStack flight status to readable format
   */
  private convertFlightStatus(status: string): string {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'Scheduled';
      case 'active':
        return 'Departed';
      case 'landed':
        return 'Landed';
      case 'cancelled':
        return 'Cancelled';
      case 'incident':
        return 'Delayed';
      case 'diverted':
        return 'Diverted';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  /**
   * Generate mock upcoming flights as fallback
   */
  private getMockUpcomingFlights(
    request: UpcomingFlightsRequest
  ): UpcomingFlight[] {
    const mockFlights: UpcomingFlight[] = [];
    const airlines = request.airline
      ? [request.airline]
      : ['UA', 'AA', 'DL', 'WN', 'B6'];
    const destinations = [
      'LAX',
      'JFK',
      'ORD',
      'DEN',
      'SEA',
      'BOS',
      'MIA',
      'LAS',
    ];
    const statuses = ['Scheduled', 'Boarding', 'Delayed', 'On Time'];

    const now = new Date();
    const limit = request.limit || 5;

    for (let i = 0; i < limit; i++) {
      const airline = airlines[i % airlines.length];
      const flightNum = Math.floor(Math.random() * 9000) + 1000;
      const departureTime = new Date(
        now.getTime() + (i * 30 + Math.random() * 60) * 60 * 1000
      );

      const generatedFlightNumber = `${airline}${flightNum}`;

      // If searching for a specific flight number, only include it if it matches
      if (request.flightNumber && request.flightNumber.trim()) {
        if (
          !generatedFlightNumber
            .toLowerCase()
            .includes(request.flightNumber.toLowerCase())
        ) {
          continue;
        }
      }

      mockFlights.push({
        flightNumber: generatedFlightNumber,
        airline: this.getAirlineName(airline),
        destination: getAirportDisplayName(
          destinations[Math.floor(Math.random() * destinations.length)]
        ),
        scheduledDeparture: departureTime.toISOString(),
        estimatedDeparture: departureTime.toISOString(),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        gate: `${Math.floor(Math.random() * 20 + 1)}${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}`,
      });
    }

    const mockDataLabel = this.forceMockData ? '🎭 [DEV MODE]' : '🎭';
    console.log(
      `${mockDataLabel} Generated ${mockFlights.length} mock departures`
    );
    return mockFlights;
  }

  /**
   * Get airline name from code (simplified mapping)
   */
  private getAirlineName(code: string): string {
    const airlineMap: Record<string, string> = {
      UA: 'United Airlines',
      AA: 'American Airlines',
      DL: 'Delta Air Lines',
      WN: 'Southwest Airlines',
      B6: 'JetBlue Airways',
      AS: 'Alaska Airlines',
      F9: 'Frontier Airlines',
      NK: 'Spirit Airlines',
    };
    return airlineMap[code] || code;
  }

  /**
   * Get flight status for a specific flight number (enhanced with mock data)
   */
  async getFlightStatus(request: FlightRequest): Promise<FlightStatus> {
    try {
      if (this.forceMockData) {
        console.log('🎭 Development mode: Using mock flight status data');
        return this.getMockFlightStatus(request.flightNumber);
      }

      if (!this.apiKey) {
        console.warn(
          '⚠️ No AviationStack API key provided, using mock flight status'
        );
        return this.getMockFlightStatus(request.flightNumber);
      }

      // Build API request for specific flight
      const params = new URLSearchParams({
        access_key: this.apiKey,
        flight_iata: request.flightNumber,
        limit: '1',
      });

      const url = `${AVIATIONSTACK_BASE_URL}/flights?${params.toString()}`;
      console.log(
        `🔍 Fetching flight status from AviationStack: ${url.replace(this.apiKey, '[API_KEY]')}`
      );

      const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      };

      if (typeof AbortController !== 'undefined') {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), this.timeout);
        fetchOptions.signal = controller.signal;
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid AviationStack API key');
        } else if (response.status === 429) {
          throw new Error('AviationStack API rate limit exceeded');
        } else {
          throw new Error(`AviationStack API error: ${response.status}`);
        }
      }

      const data: AviationStackResponse = await response.json();

      if (!data.data || data.data.length === 0) {
        console.log('📭 No flight found, returning default status');
        return {
          flightNumber: request.flightNumber,
          status: 'Unknown',
          lastUpdated: new Date(),
        };
      }

      // Convert AviationStack flight to our FlightStatus format
      const flight = data.data[0];
      return {
        flightNumber: request.flightNumber,
        status: this.convertToFlightStatusType(flight.flight_status),
        scheduledDeparture: flight.departure.scheduled,
        actualDeparture: flight.departure.actual,
        scheduledArrival: flight.arrival.scheduled,
        actualArrival: flight.arrival.actual,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('❌ Failed to fetch flight status:', error);
      // Return mock data as fallback
      return this.getMockFlightStatus(request.flightNumber);
    }
  }

  /**
   * Convert AviationStack flight status to our FlightStatus type
   */
  private convertToFlightStatusType(status: string): FlightStatus['status'] {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'On Time';
      case 'active':
        return 'Departed';
      case 'landed':
        return 'Arrived';
      case 'cancelled':
        return 'Cancelled';
      case 'incident':
      case 'delayed':
        return 'Delayed';
      case 'diverted':
        return 'Delayed';
      default:
        return 'Unknown';
    }
  }

  /**
   * Generate mock flight status data
   */
  private getMockFlightStatus(flightNumber: string): FlightStatus {
    // Create deterministic mock data based on flight number
    const seed = flightNumber
      .split('')
      .reduce((a, b) => a + b.charCodeAt(0), 0);
    const random = ((seed * 9301 + 49297) % 233280) / 233280;

    const statuses: FlightStatus['status'][] = [
      'On Time',
      'Delayed',
      'Cancelled',
      'Departed',
      'Arrived',
      'Boarding',
    ];
    const status = statuses[Math.floor(random * statuses.length)];

    // Generate realistic timestamps
    const now = new Date();
    const hoursOffset = Math.floor(random * 48) - 24; // -24 to +24 hours
    const scheduledTime = new Date(
      now.getTime() + hoursOffset * 60 * 60 * 1000
    );

    let actualTime: string | undefined;

    if (status === 'Departed' || status === 'Arrived') {
      const delayMinutes = Math.floor(random * 120) - 30; // -30 to +90 minutes delay
      actualTime = new Date(
        scheduledTime.getTime() + delayMinutes * 60 * 1000
      ).toISOString();
    }

    const mockDataLabel = this.forceMockData ? '🎭 [DEV MODE]' : '🎭';
    console.log(
      `${mockDataLabel} Generated mock flight status for ${flightNumber}: ${status}`
    );

    return {
      flightNumber,
      status,
      scheduledDeparture: scheduledTime.toISOString(),
      actualDeparture: actualTime,
      scheduledArrival: new Date(
        scheduledTime.getTime() + 2 * 60 * 60 * 1000
      ).toISOString(), // 2 hours later
      lastUpdated: new Date(),
    };
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    if (!this.apiKey || this.forceMockData) {
      return false;
    }

    try {
      const params = new URLSearchParams({
        access_key: this.apiKey,
        limit: '1',
      });

      const response = await fetch(
        `${AVIATIONSTACK_BASE_URL}/flights?${params.toString()}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('AviationStack connection test failed:', error);
      return false;
    }
  }
}

// Default service instance
let flightService: FlightService | null = null;
let configPromise: Promise<any> | null = null;

// Fetch configuration from server
async function fetchConfig(): Promise<{
  hasApiKey: boolean;
  apiKey: string | null;
  environment: string;
}> {
  try {
    if (DEV_MODE.DEBUG_LOGGING) {
      console.log('🔧 Fetching config from server...');
    }

    const response = await fetch('http://localhost:3001/api/config');

    if (DEV_MODE.DEBUG_LOGGING) {
      console.log('🔧 Config response status:', response.status);
    }

    if (!response.ok) {
      throw new Error(
        `Config fetch failed: ${response.status} ${response.statusText}`
      );
    }

    const config = await response.json();

    if (DEV_MODE.DEBUG_LOGGING) {
      console.log('🔧 Config fetched from server:', {
        hasApiKey: config.hasApiKey,
        environment: config.environment,
        apiKeyLength: config.apiKey?.length || 0,
        first4: config.apiKey?.substring(0, 4) || 'none',
      });
    }

    return config;
  } catch (error) {
    console.warn('⚠️ Failed to fetch config from server:', error);
    if (DEV_MODE.DEBUG_LOGGING) {
      console.log('🔧 Falling back to no API key configuration');
    }
    return { hasApiKey: false, apiKey: null, environment: 'development' };
  }
}

export function getFlightService(apiKey?: string): FlightService {
  if (!flightService) {
    // Get API key from multiple sources with better error handling
    let envApiKey = apiKey;

    // Try to get from environment in different contexts
    if (!envApiKey) {
      try {
        // In Node.js/Bun server context
        if (typeof process !== 'undefined' && process.env) {
          envApiKey = process.env.AVIATIONSTACK_API_KEY;
          if (DEV_MODE.DEBUG_LOGGING) {
            console.log('🔧 Server context - API key from process.env:', {
              hasApiKey: !!envApiKey,
              length: envApiKey?.length || 0,
              first4: envApiKey?.substring(0, 4) || 'none',
            });
          }
        }

        // In browser context, we'll need to fetch from server
        if (!envApiKey && typeof window !== 'undefined') {
          // For browser context, we'll handle this asynchronously
          if (DEV_MODE.DEBUG_LOGGING) {
            console.log(
              '🔧 Browser context detected, will fetch API key from server'
            );
          }
        }
      } catch (error) {
        console.warn('⚠️ Error accessing environment variables:', error);
      }
    }

    flightService = new FlightService(envApiKey);

    if (!envApiKey && !DEV_MODE.FORCE_MOCK_DATA) {
      console.warn(
        '⚠️ No AviationStack API key found. Set AVIATIONSTACK_API_KEY environment variable or pass apiKey parameter. Using mock data.'
      );
    }

    if (DEV_MODE.DEBUG_LOGGING) {
      console.log('🔧 FlightService instance created:', {
        hasApiKey: !!envApiKey,
        forceMockData: DEV_MODE.FORCE_MOCK_DATA,
        isConfigured: flightService.isConfigured(),
      });
    }
  } else if (apiKey && !flightService.isConfigured()) {
    flightService.setApiKey(apiKey);
  }
  return flightService;
}

// Enhanced function to get flight service with server config
export async function getFlightServiceWithConfig(
  apiKey?: string
): Promise<FlightService> {
  // If we already have a configured service, return it
  if (flightService && flightService.isConfigured()) {
    return flightService;
  }

  // If an API key is provided, use it directly
  if (apiKey) {
    if (!flightService) {
      flightService = new FlightService(apiKey);
    } else {
      flightService.setApiKey(apiKey);
    }
    return flightService;
  }

  // Try to get API key from server config (for browser context)
  if (
    typeof window !== 'undefined' &&
    (!flightService || !flightService.isConfigured())
  ) {
    try {
      if (!configPromise) {
        configPromise = fetchConfig();
      }
      const config = await configPromise;

      if (config.apiKey) {
        if (!flightService) {
          flightService = new FlightService(config.apiKey);
        } else {
          flightService.setApiKey(config.apiKey);
        }
        return flightService;
      }
    } catch (error) {
      console.warn('⚠️ Failed to get API key from server config:', error);
    }
  }

  // Fallback to regular initialization
  return getFlightService();
}

// Legacy compatibility functions
export async function getFlightStatus(
  flightNumber: string
): Promise<FlightStatus> {
  const service = getFlightService();
  return service.getFlightStatus({ flightNumber });
}

export async function getUpcomingDepartures(
  airport: string,
  airline?: string,
  limit?: number
): Promise<UpcomingFlight[]> {
  const service = getFlightService();
  return service.getUpcomingDepartures({
    airport,
    airline,
    limit,
  });
}
