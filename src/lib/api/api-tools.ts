import { getApiUrl } from '../environment';

export function isBetterAuthRoute(path: string): boolean {
  return path.startsWith('/api/auth');
}

export function getBetterAuthUrl(): string {
  const environment = process.env.NODE_ENV || 'development';
  return (
    process.env.BETTER_AUTH_URL ||
    (environment === 'production'
      ? 'https://tetontracker.com'
      : 'http://localhost:3001')
  );
}

export function initJSONResponse(
  data: any,
  status: number = 200,
  headersAdditional?: Record<string, string> | Headers
) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...headersAdditional,
    },
    status,
  });
} // Helper function to create fetch options with credentials

export function createFetchOptions(options: RequestInit = {}): RequestInit {
  return {
    ...options,
    credentials: 'include', // Always include session cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
}

// Helper function to build organization-scoped API URLs
export function buildOrgApiUrl(
  organizationId: string,
  endpoint: string
): string {
  const baseUrl = getApiUrl();
  // Ensure endpoint starts with '/'
  const normalizedEndpoint = endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`;
  return `${baseUrl}/api/organizations/${organizationId}${normalizedEndpoint}`;
}

export const API_BASE = getApiUrl();
