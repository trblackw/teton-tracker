import {
  type FlightStatus,
  transformOpenSkyToFlightStatus,
  validateFlightStatus,
} from '../schema';

// OpenSky Network API configuration
const OPENSKY_BASE_URL = 'https://opensky-network.org/api';

export interface FlightRequest {
  flightNumber: string;
  timeframe?: {
    begin: number; // Unix timestamp
    end: number; // Unix timestamp
  };
}

export interface UpcomingFlightsRequest {
  airport: string; // ICAO airport code
  airline?: string; // Optional airline filter (ICAO airline code)
  limit?: number; // Number of flights to return (default 5)
}

export interface OpenSkyFlightData {
  icao24: string;
  firstSeen: number;
  estDepartureAirport: string | null;
  lastSeen: number;
  estArrivalAirport: string | null;
  callsign: string | null;
  estDepartureAirportHorizDistance: number | null;
  estDepartureAirportVertDistance: number | null;
  estArrivalAirportHorizDistance: number | null;
  estArrivalAirportVertDistance: number | null;
  departureAirportCandidatesCount: number;
  arrivalAirportCandidatesCount: number;
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
}

export class OpenSkyFlightService {
  private timeout: number = 15000; // 15 seconds (OpenSky can be slower)

  constructor(timeout?: number) {
    this.timeout = timeout || 15000;
  }

  /**
   * Get upcoming departures from a specific airport
   */
  async getUpcomingDepartures(
    request: UpcomingFlightsRequest
  ): Promise<UpcomingFlight[]> {
    try {
      console.log(
        `🛫 Fetching upcoming departures from ${request.airport}${request.airline ? ` for airline ${request.airline}` : ''}`
      );

      // Get current time and set timeframe for next few hours
      const now = Math.floor(Date.now() / 1000);
      const nextHours = now + 6 * 60 * 60; // Next 6 hours

      // Try to get departures from OpenSky
      const departures = await this.getDeparturesFromAirport(
        request.airport,
        now,
        nextHours
      );

      // Filter by airline if specified
      let filteredDepartures = departures;
      if (request.airline && request.airline.trim()) {
        filteredDepartures = departures.filter(
          flight =>
            this.extractAirlineFromCallsign(flight.callsign) ===
            request.airline!.toUpperCase()
        );
      }

      // Sort by departure time and limit results
      const upcomingFlights = filteredDepartures
        .sort((a, b) => a.firstSeen - b.firstSeen)
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
   * Get departures from a specific airport using OpenSky API
   */
  private async getDeparturesFromAirport(
    airport: string,
    begin: number,
    end: number
  ): Promise<OpenSkyFlightData[]> {
    try {
      const url = `${OPENSKY_BASE_URL}/flights/departure?airport=${airport.toUpperCase()}&begin=${begin}&end=${end}`;
      console.log(`🔍 Fetching departures from: ${url}`);

      const fetchOptions: any = {};
      if (typeof (globalThis as any).AbortController !== 'undefined') {
        const controller = new (globalThis as any).AbortController();
        (globalThis as any).setTimeout(() => controller.abort(), this.timeout);
        fetchOptions.signal = controller.signal;
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        console.warn(
          `⚠️ OpenSky departures API returned ${response.status}, falling back to current states`
        );
        return await this.getDeparturesFromCurrentStates(airport);
      }

      const flights = await response.json();
      console.log(
        `📊 OpenSky returned ${flights?.length || 0} departure flights`
      );

      return Array.isArray(flights) ? flights : [];
    } catch (error) {
      console.warn('⚠️ Departures API failed, trying current states:', error);
      return await this.getDeparturesFromCurrentStates(airport);
    }
  }

  /**
   * Fallback: Get departures by filtering current aircraft states
   */
  private async getDeparturesFromCurrentStates(
    airport: string
  ): Promise<OpenSkyFlightData[]> {
    try {
      const statesUrl = `${OPENSKY_BASE_URL}/states/all`;

      const fetchOptions: any = {};
      if (typeof (globalThis as any).AbortController !== 'undefined') {
        const controller = new (globalThis as any).AbortController();
        (globalThis as any).setTimeout(() => controller.abort(), this.timeout);
        fetchOptions.signal = controller.signal;
      }

      const response = await fetch(statesUrl, fetchOptions);

      if (!response.ok) {
        throw new Error(`OpenSky states API error: ${response.status}`);
      }

      const data = await response.json();
      const departures: OpenSkyFlightData[] = [];

      if (data.states && Array.isArray(data.states)) {
        // Filter states for aircraft that might be departing from our airport
        // This is a simplified approach since we don't have real departure info
        for (const state of data.states.slice(0, 50)) {
          // Limit to first 50 for performance
          const callsign = state[1]?.trim();
          if (callsign && callsign.length >= 2) {
            departures.push(this.convertStateToFlightData(state));
          }
        }
      }

      console.log(
        `📊 Converted ${departures.length} current states to potential departures`
      );
      return departures;
    } catch (error) {
      console.error('❌ Current states fallback failed:', error);
      return [];
    }
  }

  /**
   * Extract airline code from callsign
   */
  private extractAirlineFromCallsign(callsign: string | null): string {
    if (!callsign) return '';

    // Remove whitespace and get first 2-3 characters (typical airline code pattern)
    const clean = callsign.trim().toUpperCase();

    // Common airline code patterns:
    // - 2 letters + numbers (e.g., "UA123" -> "UA")
    // - 3 letters + numbers (e.g., "UAL123" -> "UAL")
    const match = clean.match(/^([A-Z]{2,3})/);
    return match ? match[1] : '';
  }

  /**
   * Convert OpenSkyFlightData to UpcomingFlight format
   */
  private convertToUpcomingFlight(flight: OpenSkyFlightData): UpcomingFlight {
    const flightNumber = flight.callsign?.trim() || 'Unknown';
    const airline = this.extractAirlineFromCallsign(flight.callsign);
    const departureTime = new Date(flight.firstSeen * 1000);

    // Try to get destination, with fallback logic
    let destination = 'Unknown';
    if (flight.estArrivalAirport) {
      destination = flight.estArrivalAirport;
    } else {
      // Generate a reasonable destination based on airline
      destination = this.generateLikelyDestination(airline, flight.callsign);
    }

    return {
      flightNumber,
      airline,
      destination,
      scheduledDeparture: departureTime.toTimeString().substring(0, 5),
      estimatedDeparture: departureTime.toTimeString().substring(0, 5),
      status: 'Scheduled',
      aircraft: flight.icao24,
    };
  }

  /**
   * Generate a likely destination based on airline and flight pattern
   */
  private generateLikelyDestination(
    airline: string,
    callsign: string | null
  ): string {
    // Common destinations for major airlines from Jackson Hole
    const destinationMap: Record<string, string[]> = {
      UA: ['KDEN', 'KORD', 'KSFO', 'KLAX'],
      AA: ['KDFW', 'KPHX', 'KLAX', 'KORD'],
      DL: ['KSLC', 'KMSN', 'KLAX', 'KDEN'],
      WN: ['KDEN', 'KLAS', 'KPHX', 'KSLC'],
      B6: ['KJFK', 'KLAX', 'KBOS', 'KSLC'],
      TVF: ['KSLC', 'KBZN', 'KDEN', 'KMSN'], // Jet Suite/private jets
    };

    const destinations = destinationMap[airline] || [
      'KDEN',
      'KSLC',
      'KLAX',
      'KBZN',
    ];

    // Use flight number to create some consistency
    const flightNum = callsign?.replace(/[^0-9]/g, '') || '0';
    const index = parseInt(flightNum) % destinations.length;

    return destinations[index];
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
      'KLAX',
      'KJFK',
      'KORD',
      'KDEN',
      'KSEA',
      'KBOS',
      'KMIA',
      'KLAS',
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

      mockFlights.push({
        flightNumber: `${airline}${flightNum}`,
        airline,
        destination:
          destinations[Math.floor(Math.random() * destinations.length)],
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
   * Get flight status for a specific flight number
   */
  async getFlightStatus(request: FlightRequest): Promise<FlightStatus> {
    try {
      console.log(`✈️ Fetching flight status: ${request.flightNumber}`);

      // Try to find flight data for the given flight number
      const flightData = await this.searchFlightByCallsign(
        request.flightNumber
      );

      if (flightData) {
        const flightStatus = transformOpenSkyToFlightStatus(
          flightData,
          request.flightNumber
        );
        return validateFlightStatus(flightStatus);
      } else {
        // Return a "not found" status
        return this.createNotFoundStatus(request.flightNumber);
      }
    } catch (error) {
      console.error('❌ OpenSky API failed:', error);
      throw new Error(
        `Failed to fetch flight status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get flight status with fallback to mock data if API is unavailable
   */
  async getFlightStatusWithFallback(
    request: FlightRequest
  ): Promise<FlightStatus> {
    try {
      return await this.getFlightStatus(request);
    } catch (error) {
      console.warn('⚠️ OpenSky API failed, falling back to mock data:', error);
      return this.getMockFlightStatus(request.flightNumber);
    }
  }

  /**
   * Search for flights by callsign (flight number)
   */
  private async searchFlightByCallsign(
    flightNumber: string
  ): Promise<OpenSkyFlightData | null> {
    // Clean the flight number for search
    const cleanFlightNumber = flightNumber.replace(/\s+/g, '').toUpperCase();
    console.log(`🔍 Searching OpenSky for flight: ${cleanFlightNumber}`);

    // OpenSky Network API endpoint for flight search
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400; // 24 hours ago

    try {
      // First, try to get current states for all flights
      const statesUrl = `${OPENSKY_BASE_URL}/states/all`;

      const fetchOptions: any = {};
      if (typeof (globalThis as any).AbortController !== 'undefined') {
        const controller = new (globalThis as any).AbortController();
        (globalThis as any).setTimeout(() => controller.abort(), this.timeout);
        fetchOptions.signal = controller.signal;
      }

      const response = await fetch(statesUrl, fetchOptions);

      if (!response.ok) {
        console.error(
          `❌ OpenSky API error: ${response.status} ${response.statusText}`
        );
        throw new Error(
          `OpenSky API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log(
        `📊 OpenSky returned ${data.states?.length || 0} current flights`
      );

      // Search through current states for matching callsign
      if (data.states && Array.isArray(data.states)) {
        let checkedCount = 0;
        for (const state of data.states) {
          const callsign = state[1]?.trim()?.toUpperCase();
          if (callsign) {
            checkedCount++;
            if (this.matchesFlightNumber(callsign, cleanFlightNumber)) {
              console.log(`✅ Found matching flight: ${callsign}`);
              return this.convertStateToFlightData(state);
            }
          }
        }
        console.log(
          `🔍 Checked ${checkedCount} flights, no match found for ${cleanFlightNumber}`
        );
      }

      // If not found in current states, try historical data
      console.log(`🕐 Searching historical data for ${cleanFlightNumber}`);
      return await this.searchHistoricalFlights(
        cleanFlightNumber,
        oneDayAgo,
        now
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(
          `⏱️ OpenSky API request timed out for ${cleanFlightNumber}`
        );
        throw new Error('OpenSky API request timed out');
      }
      console.error(
        `❌ OpenSky search failed for ${cleanFlightNumber}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Search historical flights (fallback when not found in current states)
   */
  private async searchHistoricalFlights(
    flightNumber: string,
    begin: number,
    end: number
  ): Promise<OpenSkyFlightData | null> {
    try {
      // Note: Historical data requires authentication for full access
      // This is a simplified approach that may have limited results
      const url = `${OPENSKY_BASE_URL}/flights/departure?airport=KJAC&begin=${begin}&end=${end}`;

      const fetchOptions: any = {};
      if (typeof (globalThis as any).AbortController !== 'undefined') {
        const controller = new (globalThis as any).AbortController();
        (globalThis as any).setTimeout(() => controller.abort(), this.timeout);
        fetchOptions.signal = controller.signal;
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        return null; // Historical data might not be available
      }

      const flights = await response.json();

      if (Array.isArray(flights)) {
        for (const flight of flights) {
          const callsign = flight.callsign?.trim()?.toUpperCase();
          if (callsign && this.matchesFlightNumber(callsign, flightNumber)) {
            return flight;
          }
        }
      }

      return null;
    } catch (error) {
      console.warn('Historical flight search failed:', error);
      return null;
    }
  }

  /**
   * Convert OpenSky state array to flight data object
   */
  private convertStateToFlightData(state: any[]): OpenSkyFlightData {
    const callsign = state[1]?.trim() || '';
    const airline = this.extractAirlineFromCallsign(callsign);

    return {
      icao24: state[0] || '',
      firstSeen: Math.floor(Date.now() / 1000), // Current time as approximation
      estDepartureAirport: 'KJAC', // Assuming Jackson Hole since that's what we're querying
      lastSeen: Math.floor(Date.now() / 1000),
      estArrivalAirport: this.generateLikelyDestination(airline, callsign),
      callsign: callsign,
      estDepartureAirportHorizDistance: null,
      estDepartureAirportVertDistance: null,
      estArrivalAirportHorizDistance: null,
      estArrivalAirportVertDistance: null,
      departureAirportCandidatesCount: 0,
      arrivalAirportCandidatesCount: 0,
    };
  }

  /**
   * Check if a callsign matches our flight number
   */
  private matchesFlightNumber(callsign: string, flightNumber: string): boolean {
    // Remove whitespace and convert to uppercase
    const cleanCallsign = callsign.replace(/\s+/g, '').toUpperCase();
    const cleanFlight = flightNumber.replace(/\s+/g, '').toUpperCase();

    // Direct match
    if (cleanCallsign === cleanFlight) {
      return true;
    }

    // Try with common variations
    // Flight numbers might have spaces or different formatting
    return (
      cleanCallsign.includes(cleanFlight) ||
      cleanFlight.includes(cleanCallsign) ||
      cleanCallsign.replace(/[^A-Z0-9]/g, '') ===
        cleanFlight.replace(/[^A-Z0-9]/g, '')
    );
  }

  /**
   * Create a "not found" flight status
   */
  private createNotFoundStatus(flightNumber: string): FlightStatus {
    console.log(`❌ Flight ${flightNumber} not found in OpenSky database`);
    return {
      flightNumber,
      status: 'Unknown',
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate mock flight status as fallback
   */
  private getMockFlightStatus(flightNumber: string): FlightStatus {
    const statuses = ['On Time', 'Delayed', 'Boarding', 'Departed'] as const;
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    const now = new Date();
    const scheduled = new Date(
      now.getTime() + Math.random() * 4 * 60 * 60 * 1000
    ); // 0-4 hours from now
    const actual = new Date(
      scheduled.getTime() + (Math.random() - 0.5) * 60 * 60 * 1000
    ); // ±30 min variance

    return {
      flightNumber,
      status: randomStatus,
      scheduledDeparture: scheduled.toTimeString().substring(0, 5),
      actualDeparture: actual.toTimeString().substring(0, 5),
      scheduledArrival: new Date(scheduled.getTime() + 2 * 60 * 60 * 1000)
        .toTimeString()
        .substring(0, 5),
      actualArrival: new Date(actual.getTime() + 2 * 60 * 60 * 1000)
        .toTimeString()
        .substring(0, 5),
      delay: randomStatus === 'Delayed' ? Math.floor(Math.random() * 60) : 0,
      gate: `${Math.floor(Math.random() * 20 + 1)}${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}`,
      lastUpdated: new Date(),
    };
  }
}

// Default service instance
export const openskyService = new OpenSkyFlightService();

// Utility function for easy access
export async function getFlightStatus(
  flightNumber: string
): Promise<FlightStatus> {
  return openskyService.getFlightStatusWithFallback({
    flightNumber,
  });
}

// Utility function for upcoming departures
export async function getUpcomingDepartures(
  airport: string,
  airline?: string,
  limit?: number
): Promise<UpcomingFlight[]> {
  return openskyService.getUpcomingDepartures({
    airport,
    airline,
    limit,
  });
}

// Rate limiting helper for OpenSky (free tier has limits)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 10000; // 10 seconds between requests

export async function getFlightStatusWithRateLimit(
  flightNumber: string
): Promise<FlightStatus> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(
      `⏳ Rate limiting: waiting ${waitTime}ms before next OpenSky request`
    );
    await new Promise(resolve =>
      (globalThis as any).setTimeout(resolve, waitTime)
    );
  }

  lastRequestTime = Date.now();
  return getFlightStatus(flightNumber);
}
