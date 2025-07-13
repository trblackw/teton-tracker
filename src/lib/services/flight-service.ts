import { getAirportDisplayName } from '../airport-codes';
import { type FlightStatus } from '../schema';

// AviationStack API configuration
const AVIATIONSTACK_BASE_URL = 'https://api.aviationstack.com/v1';

/**
 * Development Mode Configuration
 *
 * In development (localhost), the FlightService automatically uses mock data
 * unless explicitly overridden. This prevents unnecessary API calls during development.
 *
 * To use real API in development:
 * 1. Add ?realapi=true to your URL (e.g., http://localhost:3000/flights?realapi=true)
 * 2. Set ENABLE_REAL_API=true environment variable
 * 3. Pass forceMockData=false to FlightService constructor
 *
 * In production, real API is always used (if API key is available).
 */
const DEV_MODE = {
  // Default to mock data in development (override with ENABLE_REAL_API=true)
  USE_MOCK_DATA_BY_DEFAULT: true,
  // Set to true to enable debug logging
  DEBUG_LOGGING: true,
  // Set to true to test API key loading
  TEST_API_KEY_LOADING: true,
};

// Check if we're in development mode
function isDevelopmentMode(): boolean {
  // Check various indicators that we're in development
  return (
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.port === '3000')) ||
    // Also check for explicit environment variable if available
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')
  );
}

// Check if real API is explicitly enabled
function isRealApiEnabled(): boolean {
  // Check for explicit override via environment variable or URL parameter
  if (typeof window !== 'undefined') {
    // Check URL parameter: ?realapi=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('realapi') === 'true') {
      return true;
    }
  }

  // Check environment variable if available
  if (
    typeof process !== 'undefined' &&
    process.env?.ENABLE_REAL_API === 'true'
  ) {
    return true;
  }

  return false;
}

// Determine if we should use mock data
function shouldUseMockData(): boolean {
  if (isDevelopmentMode() && DEV_MODE.USE_MOCK_DATA_BY_DEFAULT) {
    // In development, use mock data by default unless explicitly enabled
    return !isRealApiEnabled();
  }

  // In production, always use real API
  return false;
}

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
  timeFrame?: {
    time?: string; // HH:MM format (24-hour)
    timezone?: string; // User's timezone (e.g., 'America/New_York')
    isAfter?: boolean; // true = at/after specified time, false = before specified time
  };
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

export interface UpcomingFlightsResponse {
  flights: UpcomingFlight[];
  temporalStatus: {
    hasStaleData: boolean;
    totalFlights: number;
    staleFlights: number;
    oldestFlight?: string;
    staleDates: string[];
    currentLocalTime: string;
    message?: string;
  };
}

export class FlightService {
  private timeout: number = 15000;
  private apiKey: string | null = null;
  private forceMockData: boolean = false;

  // Cache for API responses
  private cache = new Map<
    string,
    { data: UpcomingFlightsResponse; timestamp: number }
  >();
  private cacheTimeout = 2 * 60 * 1000; // 2 minutes TTL

  constructor(
    apiKey?: string,
    timeout?: number,
    forceMockData?: boolean,
    cacheTimeout?: number
  ) {
    this.apiKey = apiKey || null;
    this.timeout = timeout || 15000;
    this.forceMockData = forceMockData || false;
    this.cacheTimeout = cacheTimeout || 2 * 60 * 1000; // Default 2 minutes

    // Determine if we should use mock data
    const useMockData = this.forceMockData || shouldUseMockData();

    if (DEV_MODE.DEBUG_LOGGING) {
      console.log('🛫 FlightService initialized', {
        hasApiKey: !!this.apiKey,
        timeout: this.timeout,
        isDevelopmentMode: isDevelopmentMode(),
        isRealApiEnabled: isRealApiEnabled(),
        useMockData,
        cacheTimeout: this.cacheTimeout / 1000 + 's',
      });

      if (useMockData) {
        console.log(
          '🎭 Using mock data in development mode. To use real API, add ?realapi=true to URL or set ENABLE_REAL_API=true'
        );
      }
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    if (DEV_MODE.DEBUG_LOGGING) {
      console.log('🔑 API key updated');
    }
  }

  // Generate cache key from request parameters
  private generateCacheKey(request: UpcomingFlightsRequest): string {
    const key = [
      request.airport,
      request.airline || '',
      request.flightNumber || '',
      request.limit || 50,
      request.timeFrame?.time || '',
      request.timeFrame?.timezone || '',
      request.timeFrame?.isAfter || true,
    ].join('|');

    return `flights:${key}`;
  }

  // Check if cache entry is still valid
  private isCacheValid(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;

    const now = Date.now();
    const isValid = now - cached.timestamp < this.cacheTimeout;

    if (!isValid) {
      this.cache.delete(cacheKey);
    }

    return isValid;
  }

  // Get cached response if valid
  private getCachedResponse(cacheKey: string): UpcomingFlightsResponse | null {
    if (!this.isCacheValid(cacheKey)) return null;

    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('📦 Using cached flight data');
      return cached.data;
    }

    return null;
  }

  // Cache response
  private setCachedResponse(
    cacheKey: string,
    data: UpcomingFlightsResponse
  ): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    console.log(`💾 Cached flight data (TTL: ${this.cacheTimeout / 1000}s)`);
  }

  /**
   * Get upcoming departures from a specific airport using AviationStack API
   */
  async getUpcomingDepartures(
    request: UpcomingFlightsRequest
  ): Promise<UpcomingFlightsResponse> {
    try {
      console.log(
        `🛫 Fetching upcoming departures from ${request.airport}${request.airline ? ` for airline ${request.airline}` : ''}${request.flightNumber ? ` with flight number ${request.flightNumber}` : ''}`
      );

      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Determine if we should use mock data
      const useMockData = this.forceMockData || shouldUseMockData();

      // Check if we should use mock data
      if (useMockData) {
        console.log(
          '🎭 Development mode: Using mock data. To use real API, add ?realapi=true to URL or set ENABLE_REAL_API=true'
        );
        const mockFlights = this.getMockUpcomingFlights(request);
        const mockResponse = {
          flights: mockFlights,
          temporalStatus: {
            hasStaleData: false,
            totalFlights: mockFlights.length,
            staleFlights: 0,
            staleDates: [],
            currentLocalTime: new Date().toLocaleString(),
            message: 'Using mock data in development mode',
          },
        };

        // Cache mock response too
        this.setCachedResponse(cacheKey, mockResponse);
        return mockResponse;
      }

      if (!this.apiKey) {
        console.warn(
          '⚠️ No AviationStack API key provided, falling back to mock data'
        );
        const mockFlights = this.getMockUpcomingFlights(request);
        const mockResponse = {
          flights: mockFlights,
          temporalStatus: {
            hasStaleData: false,
            totalFlights: mockFlights.length,
            staleFlights: 0,
            staleDates: [],
            currentLocalTime: new Date().toLocaleString(),
            message: 'No API key available - using mock data',
          },
        };

        // Cache mock response too
        this.setCachedResponse(cacheKey, mockResponse);
        return mockResponse;
      }

      // Fetch flights with multiple statuses to get comprehensive real-time data
      // Try optimized single API call first, fall back to multiple calls if needed
      let allFlights: AviationStackFlight[] = [];
      let rateLimitedStatuses: string[] = [];
      let successfulApiCalls = 0;

      try {
        // First try: Single API call without status filter to get all flights
        console.log('🚀 Attempting optimized single API call...');
        const singleCallFlights = await this.fetchAllFlights(request);

        if (singleCallFlights.length > 0) {
          allFlights = singleCallFlights;
          successfulApiCalls = 1;
          console.log(
            `✅ Single API call succeeded: ${allFlights.length} flights`
          );
        } else {
          throw new Error('Single API call returned no results');
        }
      } catch (singleCallError) {
        console.warn(
          '⚠️ Single API call failed, falling back to multiple calls:',
          singleCallError
        );

        // Fallback: Multiple API calls with different statuses
        const statuses = ['scheduled', 'active', 'delayed'];

        for (const status of statuses) {
          try {
            const flights = await this.fetchFlightsByStatus(request, status);
            allFlights.push(...flights);

            if (flights.length === 0) {
              console.log(
                `📭 No ${status} flights returned (may be rate limited)`
              );
            } else {
              successfulApiCalls++;
            }
          } catch (error) {
            console.warn(
              `⚠️ Failed to fetch flights with status ${status}:`,
              error
            );

            if (
              error instanceof Error &&
              error.message.includes('rate limit')
            ) {
              rateLimitedStatuses.push(status);
            }
          }
        }
      }

      // If all API calls failed due to rate limiting, fall back to mock data
      if (successfulApiCalls === 0 && rateLimitedStatuses.length > 0) {
        console.warn(
          '🚫 All API calls rate limited. Falling back to mock data...'
        );
        const mockFlights = this.getMockUpcomingFlights(request);
        const mockResponse = {
          flights: mockFlights,
          temporalStatus: {
            hasStaleData: false,
            totalFlights: mockFlights.length,
            staleFlights: 0,
            staleDates: [],
            currentLocalTime: new Date().toLocaleString(),
            message:
              '⚠️ API rate limit exceeded. Showing sample data. Please try again later.',
          },
        };
        this.setCachedResponse(cacheKey, mockResponse);
        return mockResponse;
      }

      // Log API call results
      if (rateLimitedStatuses.length > 0) {
        console.warn(
          `⚠️ Some API calls were rate limited: ${rateLimitedStatuses.join(', ')}`
        );
      }

      // Calculate total possible API calls (1 for single call, 3 for multi-call)
      const totalPossibleCalls = successfulApiCalls === 1 ? 1 : 3;

      console.log(
        `📊 API Results: ${successfulApiCalls}/${totalPossibleCalls} successful calls, ${allFlights.length} total flights fetched`
      );

      if (allFlights.length === 0) {
        console.log('📭 No flights found from AviationStack');
        const noFlightsResponse: UpcomingFlightsResponse = {
          flights: [],
          temporalStatus: {
            hasStaleData: false,
            totalFlights: 0,
            staleFlights: 0,
            staleDates: [],
            currentLocalTime: new Date().toLocaleString(),
            message: 'No flights found from API',
          },
        };
        this.setCachedResponse(cacheKey, noFlightsResponse);
        return noFlightsResponse;
      }

      // Remove duplicates based on flight IATA code and date
      const uniqueFlights = this.removeDuplicateFlights(allFlights);

      // Apply temporal filtering to detect and handle stale data
      const { filteredFlights, staleDataDetected } =
        this.filterStaleFlights(uniqueFlights);

      // Sort by scheduled departure time
      filteredFlights.sort(
        (a: AviationStackFlight, b: AviationStackFlight) =>
          new Date(a.departure.scheduled).getTime() -
          new Date(b.departure.scheduled).getTime()
      );

      // Convert AviationStack flights to our format
      const upcomingFlights = filteredFlights
        .slice(0, request.limit || 5)
        .map((flight: AviationStackFlight) =>
          this.convertToUpcomingFlight(flight)
        );

      console.log(`✅ Found ${upcomingFlights.length} upcoming departures`);

      // Create response message based on temporal status
      let message = 'Real-time data retrieved successfully';
      if (staleDataDetected.hasStaleData) {
        console.warn('⚠️ TEMPORAL MISMATCH DETECTED:', staleDataDetected);
        message = `Found ${staleDataDetected.staleFlights} outdated flights that were filtered out. Showing only current flights.`;
      }

      const response: UpcomingFlightsResponse = {
        flights: upcomingFlights,
        temporalStatus: {
          ...staleDataDetected,
          message,
        },
      };
      this.setCachedResponse(cacheKey, response);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch upcoming departures:', error);
      // Return mock data as fallback
      const fallbackFlights = this.getMockUpcomingFlights(request);
      const fallbackResponse: UpcomingFlightsResponse = {
        flights: fallbackFlights,
        temporalStatus: {
          hasStaleData: false,
          totalFlights: fallbackFlights.length,
          staleFlights: 0,
          staleDates: [],
          currentLocalTime: new Date().toLocaleString(),
          message: 'Using fallback mock data due to API error',
        },
      };
      this.setCachedResponse(this.generateCacheKey(request), fallbackResponse);
      return fallbackResponse;
    }
  }

  // Fetch all flights in a single API call (no status filter)
  private async fetchAllFlights(
    request: UpcomingFlightsRequest
  ): Promise<AviationStackFlight[]> {
    const baseUrl = `${AVIATIONSTACK_BASE_URL}/flights`;
    const params = new URLSearchParams({
      access_key: this.apiKey!,
      dep_iata: request.airport,
      limit: (request.limit || 50).toString(),
    });

    if (request.airline) {
      params.append('airline_iata', request.airline);
    }

    if (request.flightNumber) {
      params.append('flight_iata', request.flightNumber);
    }

    // Add time filtering if specified
    if (request.timeFrame?.time) {
      const { time, timezone = 'UTC', isAfter = true } = request.timeFrame;
      const [hours, minutes] = time.split(':');
      const userDate = new Date();
      userDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      const utcTime = userDate.toISOString().substring(11, 16);

      if (isAfter) {
        params.append('dep_time_from', utcTime);
      } else {
        params.append('dep_time_to', utcTime);
      }
    }

    const url = `${baseUrl}?${params.toString()}`;
    console.log(
      `🔍 Fetching all flights from AviationStack: ${url.replace(this.apiKey!, '[API_KEY]')}`
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
    return data.data || [];
  }

  private async fetchFlightsByStatus(
    request: UpcomingFlightsRequest,
    status: string
  ): Promise<AviationStackFlight[]> {
    const baseUrl = `${AVIATIONSTACK_BASE_URL}/flights`;
    const params = new URLSearchParams({
      access_key: this.apiKey!,
      dep_iata: request.airport,
      flight_status: status,
      limit: (request.limit || 50).toString(),
    });

    if (request.airline) {
      params.append('airline_iata', request.airline);
    }

    if (request.flightNumber) {
      params.append('flight_iata', request.flightNumber);
    }

    // Add time filtering if specified
    if (request.timeFrame?.time) {
      const { time, timezone = 'UTC', isAfter = true } = request.timeFrame;

      // Convert user's local time to UTC for the API
      const [hours, minutes] = time.split(':');
      const userDate = new Date();
      userDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Convert to UTC
      const utcTime = userDate.toISOString().substring(11, 16); // Extract HH:MM from ISO string

      if (isAfter) {
        params.append('dep_time_from', utcTime);
      } else {
        params.append('dep_time_to', utcTime);
      }
    }

    const url = `${baseUrl}?${params.toString()}`;

    console.log(
      `🔍 Fetching ${status} flights from AviationStack: ${url.replace(this.apiKey!, '[API_KEY]')}`
    );

    // Exponential backoff retry logic
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
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
            console.warn(
              `⚠️ Rate limit exceeded (attempt ${retryCount + 1}/${maxRetries + 1})`
            );

            if (retryCount < maxRetries) {
              // Exponential backoff: wait 1s, 2s, 4s
              const delay = Math.pow(2, retryCount) * 1000;
              console.log(`⏰ Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              retryCount++;
              continue;
            } else {
              // Max retries reached, return empty array instead of throwing
              console.warn(
                '🚫 Max retries reached for rate limit. Returning empty results.'
              );
              return [];
            }
          } else {
            throw new Error(`AviationStack API error: ${response.status}`);
          }
        }

        const data: AviationStackResponse = await response.json();
        return data.data || [];
      } catch (error) {
        if (
          retryCount < maxRetries &&
          error instanceof Error &&
          error.message.includes('rate limit')
        ) {
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`⏰ Retrying in ${delay}ms due to error...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }

        // If not a rate limit error or max retries reached, throw the error
        throw error;
      }
    }

    // This shouldn't be reached, but just in case
    return [];
  }

  /**
   * Remove duplicate flights based on flight IATA code and date
   */
  private removeDuplicateFlights(
    flights: AviationStackFlight[]
  ): AviationStackFlight[] {
    const seen = new Set<string>();
    return flights.filter(flight => {
      const key = `${flight.flight.iata}-${flight.flight_date}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Filter out stale flights and detect temporal mismatches
   */
  private filterStaleFlights(flights: AviationStackFlight[]): {
    filteredFlights: AviationStackFlight[];
    staleDataDetected: {
      hasStaleData: boolean;
      totalFlights: number;
      staleFlights: number;
      oldestFlight?: string;
      staleDates: string[];
      currentLocalTime: string;
    };
  } {
    const now = new Date();
    const currentLocalDate = now.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    const currentLocalTime = now.toLocaleString();

    // Consider flights "stale" if they're more than 4 hours in the past
    const staleThreshold = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    const staleFlights: AviationStackFlight[] = [];
    const validFlights: AviationStackFlight[] = [];
    const staleDates = new Set<string>();
    let oldestFlight: string | undefined;

    for (const flight of flights) {
      const flightDate = new Date(flight.departure.scheduled);
      const flightDateString = flight.flight_date;

      // Check if flight is significantly in the past
      const isStale = flightDate < staleThreshold;

      if (isStale) {
        staleFlights.push(flight);
        staleDates.add(flightDateString);

        if (!oldestFlight || flightDate < new Date(oldestFlight)) {
          oldestFlight = flight.departure.scheduled;
        }
      } else {
        validFlights.push(flight);
      }
    }

    const staleDataDetected = {
      hasStaleData: staleFlights.length > 0,
      totalFlights: flights.length,
      staleFlights: staleFlights.length,
      oldestFlight,
      staleDates: Array.from(staleDates),
      currentLocalTime,
    };

    // Log detailed information about what was filtered
    if (staleDataDetected.hasStaleData) {
      console.warn('🕐 Temporal filtering applied:', {
        message: `Found ${staleFlights.length} stale flights from ${staleDates.size} different dates`,
        staleFlightDates: Array.from(staleDates),
        oldestFlightTime: oldestFlight,
        currentTime: currentLocalTime,
        validFlightsRemaining: validFlights.length,
      });

      // Log specific stale flights for debugging
      staleFlights.forEach(flight => {
        console.warn(
          `  📅 Stale: ${flight.flight.iata} scheduled for ${flight.departure.scheduled} (${flight.flight_date})`
        );
      });
    }

    return {
      filteredFlights: validFlights,
      staleDataDetected,
    };
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
        return 'En Route';
      case 'landed':
        return 'Landed';
      case 'cancelled':
        return 'Cancelled';
      case 'incident':
        return 'Delayed';
      case 'diverted':
        return 'Diverted';
      case 'delayed':
        return 'Delayed';
      case 'departed':
        return 'Departed';
      case 'boarding':
        return 'Boarding';
      case 'on_time':
        return 'On Time';
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
      // Determine if we should use mock data
      const useMockData = this.forceMockData || shouldUseMockData();

      if (useMockData) {
        console.log(
          '🎭 Development mode: Using mock flight status data. To use real API, add ?realapi=true to URL or set ENABLE_REAL_API=true'
        );
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
    // Determine if we should use mock data
    const useMockData = this.forceMockData || shouldUseMockData();

    if (!this.apiKey || useMockData) {
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

  /**
   * Get timezone offset in minutes
   */
  private getTimezoneOffset(timezone: string): number {
    try {
      const date = new Date();
      const utcDate = new Date(
        date.toLocaleString('en-US', { timeZone: 'UTC' })
      );
      const tzDate = new Date(
        date.toLocaleString('en-US', { timeZone: timezone })
      );
      return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
    } catch (error) {
      console.warn('⚠️ Invalid timezone, defaulting to UTC:', timezone);
      return 0; // Default to UTC offset
    }
  }
}

// Cache for configuration promise to avoid multiple fetches
let configPromise: Promise<{
  hasApiKey: boolean;
  apiKey: string | null;
  environment: string;
}> | null = null;

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
  // Use intelligent development mode detection
  const useMockData = shouldUseMockData();

  if (DEV_MODE.DEBUG_LOGGING) {
    console.log('🔧 Creating FlightService instance:', {
      hasApiKey: !!apiKey,
      isDevelopmentMode: isDevelopmentMode(),
      isRealApiEnabled: isRealApiEnabled(),
      useMockData,
    });
  }

  // Create service instance - it will automatically handle mock data based on environment
  return new FlightService(apiKey);
}

// Enhanced function to get flight service with server config
export async function getFlightServiceWithConfig(
  apiKey?: string
): Promise<FlightService> {
  try {
    // Get configuration from server
    const config = await fetchConfig();

    // Use provided API key or fallback to server config
    const finalApiKey = apiKey || config.apiKey || undefined;

    // Use intelligent development mode detection
    const useMockData = shouldUseMockData();

    if (DEV_MODE.DEBUG_LOGGING) {
      console.log('🔧 Creating FlightService with config:', {
        hasProvidedApiKey: !!apiKey,
        hasConfigApiKey: !!config.apiKey,
        hasFinalApiKey: !!finalApiKey,
        isDevelopmentMode: isDevelopmentMode(),
        isRealApiEnabled: isRealApiEnabled(),
        useMockData,
        environment: config.environment,
      });
    }

    // Create service instance
    const service = new FlightService(finalApiKey);

    if (!finalApiKey && !useMockData) {
      console.warn(
        '⚠️ No AviationStack API key found. Set AVIATIONSTACK_API_KEY environment variable or pass apiKey parameter. Using mock data.'
      );
    }

    return service;
  } catch (error) {
    console.warn('⚠️ Failed to fetch API configuration:', error);

    // Fallback to basic service
    return new FlightService(apiKey);
  }
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
  limit?: number,
  timeFrame?: { time?: string; timezone?: string; isAfter?: boolean }
): Promise<UpcomingFlight[]> {
  const service = getFlightService();
  const response = await service.getUpcomingDepartures({
    airport,
    airline,
    limit,
    timeFrame,
  });
  return response.flights;
}
