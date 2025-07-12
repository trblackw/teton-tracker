import { type TrafficData, transformTomTomToTrafficData, validateTrafficData } from '../schema';

// TomTom API configuration
const TOMTOM_BASE_URL = 'https://api.tomtom.com';
const ROUTING_VERSION = 'v1';

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
   * Get traffic data for a route between two locations
   */
  async getTrafficData(request: RouteRequest): Promise<TrafficData> {
    if (!this.apiKey) {
      throw new Error('TomTom API key is required. Please set it in the service configuration.');
    }

    try {
      const url = this.buildRouteUrl(request);
      
      const fetchOptions: any = {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      };

      // Add timeout if AbortController is available
      if (typeof (globalThis as any).AbortController !== 'undefined') {
        const controller = new (globalThis as any).AbortController();
        (globalThis as any).setTimeout(() => controller.abort(), this.timeout);
        fetchOptions.signal = controller.signal;
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`TomTom API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform TomTom response to our TrafficData format
      const routeKey = `${request.origin}-${request.destination}`;
      const trafficData = transformTomTomToTrafficData(data, routeKey);
      
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
  async getTrafficDataWithFallback(request: RouteRequest): Promise<TrafficData> {
    try {
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
   * Geocode an address to coordinates (if needed for more precise routing)
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const url = `${TOMTOM_BASE_URL}/search/2/geocode/${encodeURIComponent(address)}.json?key=${this.apiKey}&limit=1`;
      
      const fetchOptions: any = {};
      
      // Add timeout if AbortController is available
      if (typeof (globalThis as any).AbortController !== 'undefined') {
        const controller = new (globalThis as any).AbortController();
        (globalThis as any).setTimeout(() => controller.abort(), this.timeout);
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
   * Build the TomTom routing API URL
   */
  private buildRouteUrl(request: RouteRequest): string {
    const params = new Map([
      ['key', this.apiKey!],
      ['traffic', (request.traffic !== false).toString()],
      ['travelMode', request.travelMode || 'car'],
    ]);

    if (request.departAt) {
      params.set('departAt', request.departAt);
    }

    // Convert Map to URLSearchParams-like string
    const paramStrings = Array.from(params.entries()).map(
      ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    );
    const queryString = paramStrings.join('&');

    // For simplicity, assume origin and destination are addresses
    // In production, you might want to geocode first for better accuracy
    const origin = encodeURIComponent(request.origin);
    const destination = encodeURIComponent(request.destination);
    
    return `${TOMTOM_BASE_URL}/routing/${ROUTING_VERSION}/calculateRoute/${origin}:${destination}/json?${queryString}`;
  }

  /**
   * Generate mock traffic data as fallback
   */
  private getMockTrafficData(request: RouteRequest): TrafficData {
    const routeKey = `${request.origin}-${request.destination}`;
    const baseTime = 20 + Math.random() * 40; // 20-60 minutes base
    const trafficMultiplier = 1 + Math.random() * 0.6; // 1.0-1.6x multiplier
    
    return {
      route: routeKey,
      duration: Math.floor(baseTime),
      durationInTraffic: Math.floor(baseTime * trafficMultiplier),
      distance: `${(Math.random() * 30 + 10).toFixed(1)} miles`,
      status: trafficMultiplier > 1.4 ? 'heavy' : trafficMultiplier > 1.2 ? 'moderate' : 'good',
      lastUpdated: new Date(),
      incidents: Math.random() > 0.7 ? [
        {
          type: 'congestion' as const,
          description: 'Heavy traffic due to high volume',
          severity: 'moderate' as const,
        }
      ] : undefined,
    };
  }
}

// Default service instance
export const tomtomService = new TomTomTrafficService();

// Utility function for easy access
export async function getTrafficData(origin: string, destination: string): Promise<TrafficData> {
  return tomtomService.getTrafficDataWithFallback({
    origin,
    destination,
    traffic: true,
  });
}

// Environment variable helper
export function initializeTomTomService(): void {
  // Check for API key in various possible locations
  const apiKey = 
    (typeof process !== 'undefined' && process.env?.TOMTOM_API_KEY) ||
    (typeof window !== 'undefined' && (window as any).TOMTOM_API_KEY) ||
    (typeof window !== 'undefined' && window.localStorage?.getItem('tomtom-api-key'));

  if (apiKey) {
    tomtomService.setApiKey(apiKey);
    console.log('✅ TomTom API key configured');
  } else {
    console.warn('⚠️ TomTom API key not found. Add TOMTOM_API_KEY to environment or localStorage. Using mock data for now.');
  }
} 