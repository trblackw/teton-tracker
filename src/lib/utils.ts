import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Centralized API URL utilities
 * Handles both browser and server environments for API endpoint resolution
 */

/**
 * Detect if we're in development mode
 */
export function isDevelopmentMode(): boolean {
  // Check for browser environment first
  if (typeof window !== 'undefined') {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port === '3000'
    );
  }

  // Server environment - check NODE_ENV
  return process.env.NODE_ENV === 'development';
}

/**
 * Get the base API URL (without /api path)
 * Returns empty string in production (for relative URLs), localhost in development
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser environment - use relative URL in production, localhost in development
    return isDevelopmentMode() ? 'http://localhost:3001' : '';
  }

  // Server environment - use environment variable or default
  return process.env.API_BASE_URL || 'http://localhost:3001';
}

/**
 * Get the full API URL with /api path included
 * Most commonly used for API client requests
 */
export function getApiUrl(): string {
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}/api` : '/api';
}

/**
 * Build a complete API endpoint URL
 * @param endpoint - The endpoint path (e.g., '/config', '/runs')
 * @returns Complete URL for the API endpoint
 */
export function buildApiUrl(endpoint: string): string {
  const apiUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${apiUrl}${cleanEndpoint}`;
}
