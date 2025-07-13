import type { FlightStatus, Run, TrafficData } from '../schema';
import { getFlightServiceWithConfig } from './flight-service';
import { getTrafficData } from './tomtom-service';

export interface PollingConfig {
  intervalMs: number;
  enableDebugMode: boolean;
  enablePolling: boolean;
  onFlightStatusUpdate?: (flightNumber: string, status: FlightStatus) => void;
  onTrafficDataUpdate?: (route: string, data: TrafficData) => void;
  onError?: (error: Error, context: string) => void;
  // New callback for React Query integration
  onDataInvalidation?: (type: 'flight' | 'traffic', key: string) => void;
}

export interface PollingDebugInfo {
  lastPolled: Date | null;
  pollCount: number;
  activeRuns: number;
  apiCallsBlocked: number;
  lastApiCallTime: Date | null;
  errors: Array<{ time: Date; message: string; context: string }>;
}

export class IntelligentPollingService {
  public config: PollingConfig;
  private intervalId: number | null = null;
  private isPolling = false;
  private debugInfo: PollingDebugInfo;
  private currentRuns: Run[] = [];

  constructor(config: Partial<PollingConfig> = {}) {
    this.config = {
      intervalMs: 5 * 60 * 1000, // 5 minutes
      enableDebugMode: this.isDebugMode(),
      enablePolling: true,
      ...config,
    };

    this.debugInfo = {
      lastPolled: null,
      pollCount: 0,
      activeRuns: 0,
      apiCallsBlocked: 0,
      lastApiCallTime: null,
      errors: [],
    };

    this.logDebug('🔧 Intelligent Polling Service initialized', {
      intervalMs: this.config.intervalMs,
      debugMode: this.config.enableDebugMode,
      pollingEnabled: this.config.enablePolling,
    });
  }

  /**
   * Detect if we're in debug/development mode
   */
  private isDebugMode(): boolean {
    // Check multiple indicators of development mode
    const isDev =
      // Hot reloading indicators
      !!(globalThis as any).__webpack_require__ ||
      !!(globalThis as any).__webpack_hot_module_replacement__ ||
      !!(globalThis as any).__vite_hot_module_replacement__ ||
      // Development server indicators
      (typeof window !== 'undefined' &&
        window.location.hostname === 'localhost') ||
      (typeof window !== 'undefined' &&
        window.location.hostname === '127.0.0.1') ||
      (typeof window !== 'undefined' && window.location.port !== '') ||
      // Build environment indicators
      (typeof process !== 'undefined' &&
        process.env?.NODE_ENV === 'development') ||
      // Manual debug flag
      (typeof window !== 'undefined' && (window as any).DEBUG_MODE === true);

    this.logDebug('🔍 Debug mode detection', {
      isDev,
      hostname:
        typeof window !== 'undefined' ? window.location.hostname : 'unknown',
      port: typeof window !== 'undefined' ? window.location.port : 'unknown',
      nodeEnv:
        typeof process !== 'undefined' ? process.env?.NODE_ENV : 'unknown',
      hasWebpack: !!(globalThis as any).__webpack_require__,
      hasViteHMR: !!(globalThis as any).__vite_hot_module_replacement__,
    });

    return isDev;
  }

  /**
   * Start intelligent polling for active runs
   */
  start(): void {
    if (this.isPolling) {
      this.logDebug('⚠️ Polling already started');
      return;
    }

    if (!this.config.enablePolling) {
      this.logDebug('⏸️ Polling disabled in config');
      return;
    }

    this.logDebug('🚀 Starting intelligent polling', {
      intervalMs: this.config.intervalMs,
      debugMode: this.config.enableDebugMode,
    });

    this.isPolling = true;
    this.intervalId = window.setInterval(() => {
      this.pollActiveRuns();
    }, this.config.intervalMs);

    // Initial poll
    this.pollActiveRuns();
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (!this.isPolling) {
      this.logDebug('⚠️ Polling not running');
      return;
    }

    this.logDebug('🛑 Stopping intelligent polling');

    this.isPolling = false;
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Update the runs list that the polling service should monitor
   */
  updateRuns(runs: Run[]): void {
    this.currentRuns = runs;
    const activeRuns = runs.filter(run => run.status === 'active');
    this.debugInfo.activeRuns = activeRuns.length;

    this.logDebug('📋 Updated runs list', {
      totalRuns: runs.length,
      activeRuns: activeRuns.length,
      statuses: runs.reduce(
        (acc, run) => {
          acc[run.status] = (acc[run.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    });
  }

  /**
   * Get current debug information
   */
  getDebugInfo(): PollingDebugInfo {
    return { ...this.debugInfo };
  }

  /**
   * Manual trigger for polling (for testing/debugging)
   */
  triggerPoll(): void {
    this.logDebug('🔄 Manual poll trigger');
    this.pollActiveRuns();
  }

  /**
   * Core polling logic - only polls for active runs
   */
  private async pollActiveRuns(): Promise<void> {
    const activeRuns = this.currentRuns.filter(run => run.status === 'active');

    if (activeRuns.length === 0) {
      this.logDebug('⏸️ No active runs to poll');
      return;
    }

    if (this.config.enableDebugMode) {
      this.debugInfo.apiCallsBlocked += activeRuns.length * 2; // Each run = 2 API calls
      this.logDebug('🚫 Debug mode: Blocking API calls', {
        activeRuns: activeRuns.length,
        totalBlocked: this.debugInfo.apiCallsBlocked,
      });
      return;
    }

    this.logDebug('🔄 Polling active runs', {
      activeRuns: activeRuns.length,
      runIds: activeRuns.map(r => r.id.substring(0, 8)),
    });

    this.debugInfo.lastPolled = new Date();
    this.debugInfo.pollCount++;

    // Poll each active run
    for (const run of activeRuns) {
      try {
        // Fetch flight status
        await this.pollFlightStatus(run);

        // Fetch traffic data
        await this.pollTrafficData(run);

        // Small delay between runs to be respectful to APIs
        await this.delay(1000);
      } catch (error) {
        this.handleError(error, `Polling run ${run.id}`);
      }
    }

    this.debugInfo.lastApiCallTime = new Date();
  }

  /**
   * Poll flight status for a specific run
   */
  private async pollFlightStatus(run: Run): Promise<void> {
    try {
      this.logDebug('✈️ Polling flight status', {
        runId: run.id.substring(0, 8),
        flightNumber: run.flightNumber,
      });

      const flightService = await getFlightServiceWithConfig();
      const flightStatus = await flightService.getFlightStatus({
        flightNumber: run.flightNumber,
      });

      // Use React Query cache invalidation instead of direct updates
      if (this.config.onDataInvalidation) {
        this.config.onDataInvalidation('flight', run.flightNumber);
      }

      // Keep legacy callback for backward compatibility
      if (this.config.onFlightStatusUpdate) {
        this.config.onFlightStatusUpdate(run.flightNumber, flightStatus);
      }

      this.logDebug('✅ Flight status updated', {
        flightNumber: run.flightNumber,
        status: flightStatus.status,
        delay: flightStatus.delay,
      });
    } catch (error) {
      this.handleError(error, `Flight status for ${run.flightNumber}`);
    }
  }

  /**
   * Poll traffic data for a specific run
   */
  private async pollTrafficData(run: Run): Promise<void> {
    try {
      this.logDebug('🚗 Polling traffic data', {
        runId: run.id.substring(0, 8),
        route: `${run.pickupLocation} → ${run.dropoffLocation}`,
      });

      const trafficData = await getTrafficData(
        run.pickupLocation,
        run.dropoffLocation
      );
      const routeKey = `${run.pickupLocation}-${run.dropoffLocation}`;

      // Use React Query cache invalidation instead of direct updates
      if (this.config.onDataInvalidation) {
        this.config.onDataInvalidation(
          'traffic',
          `${run.pickupLocation}-${run.dropoffLocation}`
        );
      }

      // Keep legacy callback for backward compatibility
      if (this.config.onTrafficDataUpdate) {
        this.config.onTrafficDataUpdate(routeKey, trafficData);
      }

      this.logDebug('✅ Traffic data updated', {
        route: routeKey,
        duration: trafficData.duration,
        status: trafficData.status,
      });
    } catch (error) {
      this.handleError(
        error,
        `Traffic data for ${run.pickupLocation} → ${run.dropoffLocation}`
      );
    }
  }

  /**
   * Handle and log errors
   */
  private handleError(error: unknown, context: string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.debugInfo.errors.push({
      time: new Date(),
      message: errorMessage,
      context,
    });

    // Keep only last 10 errors
    if (this.debugInfo.errors.length > 10) {
      this.debugInfo.errors = this.debugInfo.errors.slice(-10);
    }

    this.logDebug('❌ Polling error', {
      context,
      error: errorMessage,
    });

    if (this.config.onError) {
      this.config.onError(
        error instanceof Error ? error : new Error(errorMessage),
        context
      );
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  /**
   * Debug logging
   */
  private logDebug(message: string, data?: any): void {
    console.log(`[PollingService] ${message}`, data || '');
  }
}

// Global instance
export const pollingService = new IntelligentPollingService();
