import {
  type TrafficData,
  transformTomTomToTrafficData,
  validateTrafficData,
} from '../schema';

// TomTom API configuration
const TOMTOM_BASE_URL = 'https://api.tomtom.com';
const ROUTING_VERSION = 'v1';
const TRAFFIC_VERSION = 'v1';

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
  if (isDevelopmentMode()) {
    // In development, use mock data by default unless explicitly enabled
    return !isRealApiEnabled();
  }

  // In production, always use real API
  return false;
}

export interface TomTomConfig {
  apiKey?: string;
  timeout?: number;
}

export interface RouteRequest {
  origin: string;
  destination: string;
  travelMode?: 'car' | 'truck' | 'taxi' | 'bus' | 'van' | 'motorcycle';
  traffic?: boolean;
  departAt?: string; // ISO 8601 format
}

// Enhanced interfaces for shuttle service
export interface ShuttleRouteRequest {
  currentLocation: string; // Driver's current location
  pickupLocation: string; // Where to pick up passenger
  dropoffLocation: string; // Where to drop off passenger
  departureTime?: string; // When the trip starts (ISO 8601)
  vehicleType?: 'van' | 'car' | 'bus'; // Shuttle vehicle type
}

export interface ShuttleRouteResponse {
  toPickup: RouteSegment;
  toDropoff: RouteSegment;
  totalDuration: number; // Total time in seconds
  totalDistance: number; // Total distance in meters
  estimatedArrival: string; // ISO 8601 timestamp
  trafficSummary: TrafficSummary;
}

export interface RouteSegment {
  duration: number; // Time in seconds
  durationWithTraffic: number; // Time with current traffic
  distance: number; // Distance in meters
  trafficDelay: number; // Additional time due to traffic (seconds)
  route: {
    points: Array<{ lat: number; lon: number }>;
    instructions: string[];
  };
}

export interface TrafficSummary {
  currentConditions: 'light' | 'moderate' | 'heavy' | 'severe';
  delayMinutes: number;
  incidents: TrafficIncident[];
}

export interface TrafficIncident {
  type: 'accident' | 'construction' | 'closure' | 'congestion';
  description: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
}

export class TomTomTrafficService {
  private apiKey: string | null = null;
  private timeout: number = 10000; // 10 seconds

  constructor(config?: TomTomConfig) {
    this.apiKey = config?.apiKey || null;
    this.timeout = config?.timeout || 10000;
  }

  /**
   * Set the API key for TomTom requests
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Check if the service has a valid API key
   */
  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * Plan a complete shuttle route with traffic analysis
   * This is the main method for shuttle service route planning
   */
  async planShuttleRoute(
    request: ShuttleRouteRequest
  ): Promise<ShuttleRouteResponse> {
    if (!this.apiKey) {
      throw new Error('TomTom API key is required for shuttle route planning.');
    }

    try {
      // Calculate route from current location to pickup
      const toPickupRoute = await this.calculateRoute({
        origin: request.currentLocation,
        destination: request.pickupLocation,
        travelMode: request.vehicleType || 'van',
        traffic: true,
        departAt: request.departureTime,
      });

      // Calculate route from pickup to dropoff
      const toDropoffRoute = await this.calculateRoute({
        origin: request.pickupLocation,
        destination: request.dropoffLocation,
        travelMode: request.vehicleType || 'van',
        traffic: true,
        departAt: this.calculatePickupArrivalTime(
          request.departureTime,
          toPickupRoute.summary.travelTimeInSeconds
        ),
      });

      // Get traffic incidents for the entire route
      const trafficSummary = await this.getTrafficSummary([
        {
          origin: request.currentLocation,
          destination: request.pickupLocation,
        },
        {
          origin: request.pickupLocation,
          destination: request.dropoffLocation,
        },
      ]);

      const totalDuration =
        toPickupRoute.summary.travelTimeInSeconds +
        toDropoffRoute.summary.travelTimeInSeconds;
      const totalDistance =
        toPickupRoute.summary.lengthInMeters +
        toDropoffRoute.summary.lengthInMeters;

      return {
        toPickup: this.transformToRouteSegment(toPickupRoute),
        toDropoff: this.transformToRouteSegment(toDropoffRoute),
        totalDuration,
        totalDistance,
        estimatedArrival: this.calculateArrivalTime(
          request.departureTime,
          totalDuration
        ),
        trafficSummary,
      };
    } catch (error) {
      console.error('❌ TomTom shuttle route planning failed:', error);
      throw new Error(
        `Failed to plan shuttle route: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate a single route using TomTom Routing API
   */
  private async calculateRoute(request: RouteRequest): Promise<any> {
    const url = this.buildRoutingUrl(request);

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
      throw new Error(
        `TomTom Routing API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Get traffic summary for multiple route segments
   */
  private async getTrafficSummary(
    routes: Array<{ origin: string; destination: string }>
  ): Promise<TrafficSummary> {
    // For now, return mock traffic summary
    // In production, this would call TomTom Traffic API
    return {
      currentConditions: 'moderate',
      delayMinutes: 5,
      incidents: [
        {
          type: 'congestion',
          description: 'Heavy traffic on I-80 near downtown',
          severity: 'medium',
          impact: 'Adds 3-5 minutes to travel time',
        },
      ],
    };
  }

  /**
   * Build URL for TomTom Routing API with enhanced parameters
   */
  private buildRoutingUrl(request: RouteRequest): string {
    const params = new URLSearchParams({
      key: this.apiKey!,
      traffic: (request.traffic !== false).toString(),
      travelMode: request.travelMode || 'car',
      routeType: 'fastest', // Optimize for time
      avoid: 'unpavedRoads', // Suitable for shuttle service
      instructionsType: 'text',
      language: 'en-US',
      computeBestOrder: 'false',
      maxAlternatives: '0', // Single best route
      alternativeType: 'anyRoute',
    });

    if (request.departAt) {
      params.set('departAt', request.departAt);
    }

    // For shuttle service, we want detailed route information
    params.set('sectionType', 'traffic,travelMode,carpool');
    params.set('report', 'effectiveSettings');

    const origin = encodeURIComponent(request.origin);
    const destination = encodeURIComponent(request.destination);

    return `${TOMTOM_BASE_URL}/routing/${ROUTING_VERSION}/calculateRoute/${origin}:${destination}/json?${params.toString()}`;
  }

  /**
   * Transform TomTom route response to our RouteSegment format
   */
  private transformToRouteSegment(tomtomRoute: any): RouteSegment {
    const summary = tomtomRoute.routes[0].summary;
    const legs = tomtomRoute.routes[0].legs[0];

    return {
      duration: summary.travelTimeInSeconds,
      durationWithTraffic: summary.trafficDelayInSeconds
        ? summary.travelTimeInSeconds + summary.trafficDelayInSeconds
        : summary.travelTimeInSeconds,
      distance: summary.lengthInMeters,
      trafficDelay: summary.trafficDelayInSeconds || 0,
      route: {
        points:
          legs.points?.map((point: any) => ({
            lat: point.latitude,
            lon: point.longitude,
          })) || [],
        instructions:
          legs.guidance?.instructions?.map(
            (instruction: any) => instruction.message
          ) || [],
      },
    };
  }

  /**
   * Calculate pickup arrival time based on departure time and travel duration
   */
  private calculatePickupArrivalTime(
    departureTime: string | undefined,
    durationSeconds: number
  ): string {
    const departure = departureTime ? new Date(departureTime) : new Date();
    const arrival = new Date(departure.getTime() + durationSeconds * 1000);
    return arrival.toISOString();
  }

  /**
   * Calculate final arrival time
   */
  private calculateArrivalTime(
    departureTime: string | undefined,
    totalDurationSeconds: number
  ): string {
    const departure = departureTime ? new Date(departureTime) : new Date();
    const arrival = new Date(departure.getTime() + totalDurationSeconds * 1000);
    return arrival.toISOString();
  }

  /**
   * Get traffic data for a route between two locations (legacy method)
   */
  async getTrafficData(request: RouteRequest): Promise<TrafficData> {
    if (!this.apiKey) {
      throw new Error(
        'TomTom API key is required. Please set it in the service configuration.'
      );
    }

    try {
      const route = await this.calculateRoute(request);

      // Transform TomTom response to our TrafficData format
      const routeKey = `${request.origin}-${request.destination}`;
      const trafficData = transformTomTomToTrafficData(route, routeKey);

      // Validate the result
      return validateTrafficData(trafficData);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('TomTom API request timed out. Please try again.');
        }
        throw new Error(`Failed to fetch traffic data: ${error.message}`);
      }
      throw new Error('Unknown error occurred while fetching traffic data');
    }
  }

  /**
   * Get traffic data with fallback to mock data if API is unavailable
   */
  async getTrafficDataWithFallback(
    request: RouteRequest
  ): Promise<TrafficData> {
    try {
      // Check if we should use mock data in development
      const useMockData = shouldUseMockData();

      if (useMockData) {
        console.log(
          '🎭 Development mode: Using mock traffic data. To use real API, add ?realapi=true to URL or set ENABLE_REAL_API=true'
        );
        return this.getMockTrafficData(request);
      }

      if (this.hasApiKey()) {
        return await this.getTrafficData(request);
      } else {
        console.warn('🚫 TomTom API key not configured, using mock data');
        return this.getMockTrafficData(request);
      }
    } catch (error) {
      console.error('❌ TomTom API failed, falling back to mock data:', error);
      return this.getMockTrafficData(request);
    }
  }

  /**
   * Generate mock shuttle route for development/fallback
   */
  getMockShuttleRoute(request: ShuttleRouteRequest): ShuttleRouteResponse {
    const baseTime = 20 * 60; // 20 minutes base time
    const trafficDelay = 5 * 60; // 5 minutes traffic delay

    return {
      toPickup: {
        duration: baseTime,
        durationWithTraffic: baseTime + trafficDelay,
        distance: 15000, // 15km
        trafficDelay,
        route: {
          points: [
            { lat: 43.4723, lon: -110.7624 }, // Jackson Hole area
            { lat: 43.4799, lon: -110.7624 },
          ],
          instructions: [
            'Head north on US-89',
            'Turn right onto Airport Road',
            'Arrive at pickup location',
          ],
        },
      },
      toDropoff: {
        duration: baseTime * 0.7,
        durationWithTraffic: baseTime * 0.7 + trafficDelay,
        distance: 10000, // 10km
        trafficDelay,
        route: {
          points: [
            { lat: 43.4799, lon: -110.7624 },
            { lat: 43.4647, lon: -110.8054 }, // Jackson Hole Airport
          ],
          instructions: [
            'Head south from pickup location',
            'Turn left onto Airport Road',
            'Arrive at Jackson Hole Airport',
          ],
        },
      },
      totalDuration: baseTime + baseTime * 0.7 + trafficDelay * 2,
      totalDistance: 25000,
      estimatedArrival: new Date(
        Date.now() + (baseTime + baseTime * 0.7 + trafficDelay * 2) * 1000
      ).toISOString(),
      trafficSummary: {
        currentConditions: 'moderate',
        delayMinutes: Math.floor(trafficDelay / 60),
        incidents: [
          {
            type: 'congestion',
            description: 'Moderate traffic in Jackson downtown area',
            severity: 'medium',
            impact: 'May add 3-5 minutes to travel time',
          },
        ],
      },
    };
  }

  /**
   * Geocode an address to coordinates (if needed for more precise routing)
   */
  async geocodeAddress(
    address: string
  ): Promise<{ lat: number; lon: number } | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const url = `${TOMTOM_BASE_URL}/search/2/geocode/${encodeURIComponent(address)}.json?key=${this.apiKey}&limit=1`;

      const fetchOptions: RequestInit = {};

      if (typeof AbortController !== 'undefined') {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), this.timeout);
        fetchOptions.signal = controller.signal;
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          lat: result.position.lat,
          lon: result.position.lon,
        };
      }

      return null;
    } catch (error) {
      console.warn('Geocoding failed:', error);
      return null;
    }
  }

  /**
   * Generate mock traffic data for development/fallback
   */
  private getMockTrafficData(request: RouteRequest): TrafficData {
    // Mock traffic data for Jackson Hole area routes
    const baseTimeMinutes = 25; // 25 minutes
    const trafficDelayMinutes = 5; // 5 minutes delay
    const distanceKm = 20; // 20km

    return {
      route: `${request.origin}-${request.destination}`,
      distance: `${distanceKm.toFixed(1)} km`,
      duration: baseTimeMinutes,
      durationInTraffic: baseTimeMinutes + trafficDelayMinutes,
      status: 'moderate',
      lastUpdated: new Date(),
    };
  }
}

// Default service instance
export const tomtomService = new TomTomTrafficService();

// Enhanced function for shuttle route planning
export async function planShuttleRoute(
  currentLocation: string,
  pickupLocation: string,
  dropoffLocation: string,
  departureTime?: string
): Promise<ShuttleRouteResponse> {
  return tomtomService
    .getTrafficDataWithFallback({
      origin: currentLocation,
      destination: `${pickupLocation}:${dropoffLocation}`,
    })
    .then(() =>
      tomtomService.getMockShuttleRoute({
        currentLocation,
        pickupLocation,
        dropoffLocation,
        departureTime,
      })
    );
}

// Legacy function for backward compatibility
export async function getTrafficData(
  origin: string,
  destination: string
): Promise<TrafficData> {
  return tomtomService.getTrafficDataWithFallback({
    origin,
    destination,
  });
}

// Environment variable helper
export function initializeTomTomService(): void {
  // Check for API key in environment variables only (not localStorage for security)
  const apiKey = typeof process !== 'undefined' && process.env?.TOMTOM_API_KEY;

  if (apiKey) {
    tomtomService.setApiKey(apiKey);
    console.log('✅ TomTom API key configured');
  } else {
    console.warn(
      '⚠️ TomTom API key not found. Add TOMTOM_API_KEY to environment. Using mock data for now.'
    );
  }
}

// Enhanced initialization with server config
export async function initializeTomTomServiceWithConfig(): Promise<void> {
  try {
    // Try to get configuration from server
    const response = await fetch('http://localhost:3001/api/config');

    if (response.ok) {
      const config = await response.json();

      if (config.tomtomKey) {
        tomtomService.setApiKey(config.tomtomKey);
        console.log('✅ TomTom API key configured from server');
        return;
      }
    }
  } catch (error) {
    console.warn(
      '⚠️ Failed to fetch TomTom config from server, trying local env vars'
    );
  }

  // Fallback to local initialization
  initializeTomTomService();
}
