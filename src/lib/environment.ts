/**
 * Centralized environment detection utilities
 *
 * This module provides a single source of truth for environment detection
 * across the application, eliminating duplicate window/hostname checks.
 */

interface EnvironmentInfo {
  isBrowser: boolean;
  isServer: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
  hostname: string | null;
  port: string | null;
}

/**
 * Get comprehensive environment information
 */
function getEnvironmentInfo(): EnvironmentInfo {
  const isBrowser = typeof window !== 'undefined';
  const isServer = !isBrowser;

  let hostname: string | null = null;
  let port: string | null = null;
  let isDevelopment = false;

  if (isBrowser) {
    hostname = window.location.hostname;
    port = window.location.port;

    // Browser development detection
    isDevelopment =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname?.includes('.local') ||
      port === '3000';
  } else {
    // Server development detection
    isDevelopment = process.env.NODE_ENV === 'development';
  }

  return {
    isBrowser,
    isServer,
    isDevelopment,
    isProduction: !isDevelopment,
    hostname,
    port,
  };
}

// Create a singleton instance to avoid recalculating
let envInfo: EnvironmentInfo | null = null;

function getEnvInfo(): EnvironmentInfo {
  if (!envInfo) {
    envInfo = getEnvironmentInfo();
  }
  return envInfo;
}

/**
 * Check if code is running in a browser environment
 */
export function isBrowser(): boolean {
  return getEnvInfo().isBrowser;
}

/**
 * Check if code is running in a server environment
 */
export function isServer(): boolean {
  return getEnvInfo().isServer;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvInfo().isDevelopment;
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnvInfo().isProduction;
}

/**
 * Get the current hostname (browser only)
 */
export function getHostname(): string | null {
  return getEnvInfo().hostname;
}

/**
 * Get the current port (browser only)
 */
export function getPort(): string | null {
  return getEnvInfo().port;
}

/**
 * Get the appropriate base URL for the current environment
 */
export function getBaseUrl(): string {
  if (isServer()) {
    return isDevelopment()
      ? 'http://localhost:3000'
      : 'https://tetontracker.com';
  }

  // Browser environment
  return isDevelopment() ? 'http://localhost:3000' : 'https://tetontracker.com';
}

/**
 * Get the API base URL
 */
export function getApiBaseUrl(): string {
  if (isServer()) {
    return process.env.API_BASE_URL || 'http://localhost:3001';
  }

  // Browser environment - use relative URL in production, localhost in development
  return isDevelopment() ? 'http://localhost:3001' : '';
}

/**
 * Get the full API URL with /api path
 */
export function getApiUrl(): string {
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}/api` : '/api';
}

/**
 * Check if development debugging should be enabled
 */
export function isDebugMode(): boolean {
  return isDevelopment();
}

/**
 * Utility for development-only console logging
 */
export function debugLog(...args: any[]): void {
  if (isDebugMode() && isBrowser()) {
    console.log(...args);
  }
} /**
 * Build a complete API endpoint URL
 * @param endpoint - The endpoint path (e.g., '/config', '/runs')
 * @returns Complete URL for the API endpoint
 */

export function buildApiUrl(endpoint: string): string {
  const apiUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${apiUrl}${cleanEndpoint}`;
}
