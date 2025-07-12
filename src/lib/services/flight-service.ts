import { getAirportDisplayName } from '../airport-codes';
import { type FlightStatus } from '../schema';

// AviationStack API configuration
const AVIATIONSTACK_BASE_URL = 'https://api.aviationstack.com/v1';

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
  scheduledDeparture: string;
  estimatedDeparture?: string;
  status: string;
  aircraft?: string;
  gate?: string;
  terminal?: string;
}

export class FlightService {
  private timeout: number = 15000;
  private apiKey: string | null = null;

  constructor(apiKey?: string, timeout?: number) {
    this.apiKey = apiKey || null;
    this.timeout = timeout || 15000;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
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

    // Format departure time (convert from ISO string to HH:MM)
    const scheduledDeparture = this.formatTime(flight.departure.scheduled);
    const estimatedDeparture = flight.departure.estimated
      ? this.formatTime(flight.departure.estimated)
      : undefined;

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
   * Format ISO time string to HH:MM format
   */
  private formatTime(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toTimeString().substring(0, 5);
    } catch (error) {
      return 'Unknown';
    }
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
        scheduledDeparture: departureTime.toTimeString().substring(0, 5),
        estimatedDeparture: departureTime.toTimeString().substring(0, 5),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        gate: `${Math.floor(Math.random() * 20 + 1)}${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}`,
      });
    }

    console.log(`🎭 Generated ${mockFlights.length} mock departures`);
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
   * Get flight status for a specific flight number (simplified for now)
   */
  async getFlightStatus(request: FlightRequest): Promise<FlightStatus> {
    // For now, return a basic implementation
    // This could be expanded to use AviationStack's flight tracking features
    return {
      flightNumber: request.flightNumber,
      status: 'Unknown',
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
    if (!this.apiKey) {
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

export function getFlightService(apiKey?: string): FlightService {
  if (!flightService) {
    // Try to get API key from environment variables if not provided
    const envApiKey =
      apiKey ||
      (typeof process !== 'undefined' && process.env?.AVIATIONSTACK_API_KEY) ||
      (typeof globalThis !== 'undefined' &&
        (globalThis as any).AVIATIONSTACK_API_KEY);

    flightService = new FlightService(envApiKey);

    if (!envApiKey) {
      console.warn(
        '⚠️ No AviationStack API key found. Set AVIATIONSTACK_API_KEY environment variable or pass apiKey parameter. Using mock data.'
      );
    }
  } else if (apiKey && !flightService.isConfigured()) {
    flightService.setApiKey(apiKey);
  }
  return flightService;
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
