import React from 'react';
import { isDevelopmentMode } from './utils';

// Feature flag definitions
const features = {
  realTimeFlightTraffic: false,
  pushNotifications: false,
} as const;

export type Feature = keyof typeof features;

// Global feature flag override - set this to true to simulate production in dev
// This allows you to test what the app looks like without dev-only features
const SIMULATE_PRODUCTION_IN_DEV = false;

/**
 * Feature Flag Configuration
 *
 * This system provides environment-based feature flags with easy dev/prod switching:
 *
 * - All features default to TRUE in local development
 * - You can override individual features via environment variables
 * - Set SIMULATE_PRODUCTION_IN_DEV=true to test production behavior in dev
 * - URL parameter ?simulate-prod=true also triggers production simulation
 * - Features can be individually controlled via FEATURE_[NAME]=false
 *
 * Examples:
 * - FEATURE_PUSH_NOTIFICATIONS=false (disables push notifications)
 * - FEATURE_REAL_TIME_FLIGHT_TRAFFIC=false (disables real-time traffic)
 * - SIMULATE_PRODUCTION_IN_DEV=true (simulates all production settings)
 */

/**
 * Check if we should simulate production environment in development
 */
function shouldSimulateProduction(): boolean {
  // Check URL parameter first (for quick testing)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('simulate-prod') === 'true') {
      return true;
    }
  }

  // Check environment variable
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.SIMULATE_PRODUCTION_IN_DEV === 'true') {
      return true;
    }
  }

  // Check global override (set at top of file for quick testing)
  return SIMULATE_PRODUCTION_IN_DEV;
}

/**
 * Get feature flag environment variable name
 */
function getFeatureEnvVar(feature: Feature): string {
  // Convert camelCase to SCREAMING_SNAKE_CASE
  const envName = feature
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '');
  return `FEATURE_${envName}`;
}

/**
 * Check if a specific feature is enabled via environment variable
 */
function isFeatureEnabledByEnv(feature: Feature): boolean | null {
  if (isDevelopmentMode()) return true;

  // Check if process.env is available (it won't be in browser)
  if (typeof process === 'undefined' || !process.env) {
    return null;
  }

  const envVar = getFeatureEnvVar(feature);
  const envValue = process.env[envVar];

  if (envValue === 'true') return true;
  if (envValue === 'false') return false;
  return null; // Not set
}

/**
 * Check if a feature is enabled
 *
 * @param feature - The feature to check
 * @returns true if the feature is enabled, false otherwise
 */
export function isFeatureEnabled(feature: Feature): boolean {
  // Check if feature exists
  if (!(feature in features)) {
    console.warn(`⚠️ Unknown feature flag: ${feature}`);
    return false;
  }

  // Check environment variable override first
  const envOverride = isFeatureEnabledByEnv(feature);
  if (envOverride !== null) {
    return envOverride;
  }

  // In development, features are enabled by default unless simulating production
  if (isDevelopmentMode() && !shouldSimulateProduction()) {
    return features[feature];
  }

  // In production (or simulated production), use the default feature value
  return features[feature];
}

/**
 * Get all feature flags and their current state
 * Useful for debugging and admin interfaces
 */
export function getAllFeatures(): Record<Feature, boolean> {
  const result = {} as Record<Feature, boolean>;

  for (const feature of Object.keys(features) as Feature[]) {
    result[feature] = isFeatureEnabled(feature);
  }

  return result;
}

/**
 * Log current feature flag state (for debugging)
 */
export function logFeatureFlags(): void {
  if (!isDevelopmentMode() && !shouldSimulateProduction()) return;

  const allFeatures = getAllFeatures();
  const isDev = isDevelopmentMode();
  const isSimulatingProd = shouldSimulateProduction();

  console.group('🚩 Feature Flags Status');
  console.log(`Environment: ${isDev ? 'Development' : 'Production'}`);
  if (isDev && isSimulatingProd) {
    console.log('🎭 Simulating production behavior in development');
  }
  console.table(allFeatures);
  console.groupEnd();
}

/**
 * React hook for feature flags (optional - for React components)
 */
export function useFeature(feature: Feature): boolean {
  return isFeatureEnabled(feature);
}

/**
 * Higher-order component for conditional feature rendering
 */
export function withFeature<P extends object>(
  feature: Feature,
  Component: React.ComponentType<P>,
  Fallback?: React.ComponentType<P>
): React.ComponentType<P> {
  return function FeatureGatedComponent(props: P) {
    if (isFeatureEnabled(feature)) {
      return React.createElement(Component, props);
    }

    if (Fallback) {
      return React.createElement(Fallback, props);
    }

    return null;
  };
}

/**
 * Component for conditional feature rendering
 */
interface FeatureGateProps {
  feature: Feature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({
  feature,
  children,
  fallback = null,
}: FeatureGateProps) {
  if (isFeatureEnabled(feature)) {
    return React.createElement(React.Fragment, null, children);
  }

  return React.createElement(React.Fragment, null, fallback);
}

// Initialize feature flags on import (for debugging)
if (typeof window !== 'undefined') {
  // Only log in development or when explicitly requested
  if (isDevelopmentMode() || shouldSimulateProduction()) {
    setTimeout(() => logFeatureFlags(), 100);
  }
}
