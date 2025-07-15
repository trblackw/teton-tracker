import type { FlightStatus, Run, TrafficData } from '../schema';
import { isDevelopmentMode } from '../utils';
import { getFlightServiceWithConfig } from './flight-service';
import { notifications } from './notification-service';
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
  // New callback for notifications
  enableNotifications?: boolean;
}

export interface PollingDebugInfo {
  lastPolled: Date | null;
  pollCount: number;
  activeRuns: number;
  apiCallsBlocked: number;
  lastApiCallTime: Date | null;
  errors: Array<{ time: Date; message: string; context: string }>;
  notificationsSent: number;
  statusChangesDetected: number;
}

export class IntelligentPollingService {
  public config: PollingConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isPolling = false;
  private debugInfo: PollingDebugInfo;
  private currentRuns: Run[] = [];

  // Track previous flight statuses to detect changes
  private previousFlightStatuses: Map<string, FlightStatus> = new Map();

  // Track previous traffic data to detect changes
  private previousTrafficData: Map<string, TrafficData> = new Map();

  constructor(config: Partial<PollingConfig> = {}) {
    this.config = {
      intervalMs: 5 * 60 * 1000, // 5 minutes
      enableDebugMode: isDevelopmentMode(),
      enablePolling: true,
      enableNotifications: true,
      ...config,
    };

    this.debugInfo = {
      lastPolled: null,
      pollCount: 0,
      activeRuns: 0,
      apiCallsBlocked: 0,
      lastApiCallTime: null,
      errors: [],
      notificationsSent: 0,
      statusChangesDetected: 0,
    };

    this.logDebug('🔧 Intelligent Polling Service initialized', {
      intervalMs: this.config.intervalMs,
      debugMode: this.config.enableDebugMode,
      pollingEnabled: this.config.enablePolling,
      notificationsEnabled: this.config.enableNotifications,
    });
  }

  /**
   * Detect if we're in debug/development mode
   */
  private isDebugMode(): boolean {
    return isDevelopmentMode();
  }

  /**
   * Start polling for active runs
   */
  start(): void {
    if (this.intervalId) {
      this.logDebug('⚠️ Polling already started');
      return;
    }

    if (!this.config.enablePolling) {
      this.logDebug('⚠️ Polling disabled in config');
      return;
    }

    this.logDebug('▶️ Starting intelligent polling service');

    // Run initial poll
    this.triggerPoll();

    // Set up interval polling
    this.intervalId = setInterval(() => {
      this.triggerPoll();
    }, this.config.intervalMs);

    this.logDebug('✅ Polling service started', {
      intervalMs: this.config.intervalMs,
    });
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logDebug('⏹️ Polling service stopped');
    }
  }

  /**
   * Update the list of runs to monitor
   */
  updateRuns(runs: Run[]): void {
    this.currentRuns = runs;
    this.debugInfo.activeRuns = runs.length;

    this.logDebug('📝 Updated runs', {
      count: runs.length,
      flights: runs.map(r => r.flightNumber).join(', '),
    });

    // If we have runs and polling isn't started, start it
    if (runs.length > 0 && !this.intervalId) {
      this.start();
    }
  }

  /**
   * Get current debug information
   */
  getDebugInfo(): PollingDebugInfo {
    return { ...this.debugInfo };
  }

  /**
   * Trigger a poll manually (for testing/debugging)
   */
  triggerPoll(): void {
    if (this.isPolling) {
      this.logDebug('⚠️ Poll already in progress, skipping');
      return;
    }

    this.pollActiveRuns().catch(error => {
      this.handleError(error, 'Manual poll trigger');
    });
  }

  /**
   * Main polling logic
   */
  private async pollActiveRuns(): Promise<void> {
    if (!this.config.enablePolling) {
      this.logDebug('⚠️ Polling disabled');
      return;
    }

    this.isPolling = true;
    this.debugInfo.lastPolled = new Date();

    const activeRuns = this.currentRuns.filter(run => run.status === 'active');

    this.logDebug('🔄 Polling active runs', {
      totalRuns: this.currentRuns.length,
      activeRuns: activeRuns.length,
    });

    if (activeRuns.length === 0) {
      this.logDebug('📭 No active runs to poll');
      this.isPolling = false;
      return;
    }

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
    this.isPolling = false;
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

      // Check for flight status changes and send notifications
      if (this.config.enableNotifications) {
        await this.checkFlightStatusChanges(run, flightStatus);
      }

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
   * Check for flight status changes and send notifications
   */
  private async checkFlightStatusChanges(
    run: Run,
    newStatus: FlightStatus
  ): Promise<void> {
    const flightNumber = run.flightNumber;
    const previousStatus = this.previousFlightStatuses.get(flightNumber);

    if (!previousStatus) {
      // First time seeing this flight - store it but don't notify
      this.previousFlightStatuses.set(flightNumber, newStatus);
      return;
    }

    // Check if status has changed
    if (previousStatus.status !== newStatus.status) {
      this.debugInfo.statusChangesDetected++;

      this.logDebug('🔔 Flight status changed', {
        flightNumber,
        oldStatus: previousStatus.status,
        newStatus: newStatus.status,
      });

      // Send notification about status change
      try {
        await notifications.flightStatusChanged(
          flightNumber,
          previousStatus.status,
          newStatus.status,
          {
            airport: run.departure,
            gate: newStatus.gate,
            terminal: newStatus.terminal,
            delay: newStatus.delay,
          }
        );

        this.debugInfo.notificationsSent++;
      } catch (error) {
        this.handleError(
          error,
          `Sending flight status notification for ${flightNumber}`
        );
      }
    }

    // Check for gate/terminal changes
    if (
      previousStatus.gate !== newStatus.gate ||
      previousStatus.terminal !== newStatus.terminal
    ) {
      this.logDebug('🚪 Gate/terminal changed', {
        flightNumber,
        oldGate: previousStatus.gate,
        newGate: newStatus.gate,
        oldTerminal: previousStatus.terminal,
        newTerminal: newStatus.terminal,
      });

      // Send notification about gate/terminal change
      try {
        await notifications.flightStatusChanged(
          flightNumber,
          `Gate ${previousStatus.gate || 'TBD'}`,
          `Gate ${newStatus.gate || 'TBD'}`,
          {
            airport: run.departure,
            gate: newStatus.gate,
            terminal: newStatus.terminal,
          }
        );

        this.debugInfo.notificationsSent++;
      } catch (error) {
        this.handleError(
          error,
          `Sending gate change notification for ${flightNumber}`
        );
      }
    }

    // Check for significant delay changes (more than 15 minutes)
    if (previousStatus.delay !== newStatus.delay) {
      const delayDiff = (newStatus.delay || 0) - (previousStatus.delay || 0);

      if (Math.abs(delayDiff) >= 15) {
        this.logDebug('⏰ Significant delay change detected', {
          flightNumber,
          oldDelay: previousStatus.delay,
          newDelay: newStatus.delay,
          delayDiff,
        });

        // Send notification about delay change
        try {
          await notifications.flightStatusChanged(
            flightNumber,
            `${previousStatus.delay || 0}min delay`,
            `${newStatus.delay || 0}min delay`,
            {
              airport: run.departure,
              gate: newStatus.gate,
              terminal: newStatus.terminal,
              delay: newStatus.delay,
            }
          );

          this.debugInfo.notificationsSent++;
        } catch (error) {
          this.handleError(
            error,
            `Sending delay change notification for ${flightNumber}`
          );
        }
      }
    }

    // Update the stored status
    this.previousFlightStatuses.set(flightNumber, newStatus);
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

      // Check for traffic condition changes and send notifications
      if (this.config.enableNotifications) {
        await this.checkTrafficChanges(run, trafficData, routeKey);
      }

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
        status: trafficData.status,
        duration: trafficData.duration,
        durationInTraffic: trafficData.durationInTraffic,
      });
    } catch (error) {
      this.handleError(
        error,
        `Traffic data for ${run.pickupLocation} → ${run.dropoffLocation}`
      );
    }
  }

  /**
   * Check for traffic condition changes and send notifications
   */
  private async checkTrafficChanges(
    run: Run,
    newTrafficData: TrafficData,
    routeKey: string
  ): Promise<void> {
    const previousTrafficData = this.previousTrafficData.get(routeKey);

    if (!previousTrafficData) {
      // First time seeing this route - store it but don't notify
      this.previousTrafficData.set(routeKey, newTrafficData);
      return;
    }

    // Check if traffic status has worsened significantly
    const statusPriority = { good: 0, moderate: 1, heavy: 2 };
    const oldPriority = statusPriority[previousTrafficData.status];
    const newPriority = statusPriority[newTrafficData.status];

    if (newPriority > oldPriority) {
      this.logDebug('🚨 Traffic conditions worsened', {
        route: routeKey,
        oldStatus: previousTrafficData.status,
        newStatus: newTrafficData.status,
      });

      // Send traffic alert notification
      try {
        const delayIncrease =
          newTrafficData.durationInTraffic -
          previousTrafficData.durationInTraffic;

        await notifications.trafficAlert(
          routeKey,
          newTrafficData.status as 'light' | 'moderate' | 'heavy' | 'severe',
          delayIncrease * 60, // Convert to seconds
          [
            {
              type: 'congestion',
              description: `Traffic conditions changed from ${previousTrafficData.status} to ${newTrafficData.status}`,
              impact: `Additional ${delayIncrease} minutes expected`,
            },
          ]
        );

        this.debugInfo.notificationsSent++;
      } catch (error) {
        this.handleError(
          error,
          `Sending traffic alert notification for ${routeKey}`
        );
      }
    }

    // Check for significant delay increases (more than 10 minutes)
    const delayIncrease =
      newTrafficData.durationInTraffic - previousTrafficData.durationInTraffic;
    if (delayIncrease >= 10) {
      this.logDebug('⏰ Significant traffic delay increase', {
        route: routeKey,
        delayIncrease,
        oldDuration: previousTrafficData.durationInTraffic,
        newDuration: newTrafficData.durationInTraffic,
      });

      // Send delay alert notification
      try {
        await notifications.trafficAlert(
          routeKey,
          'moderate',
          delayIncrease * 60, // Convert to seconds
          [
            {
              type: 'congestion',
              description: `Traffic delays increased significantly on your route`,
              impact: `Additional ${delayIncrease} minutes expected`,
            },
          ]
        );

        this.debugInfo.notificationsSent++;
      } catch (error) {
        this.handleError(
          error,
          `Sending traffic delay notification for ${routeKey}`
        );
      }
    }

    // Update the stored traffic data
    this.previousTrafficData.set(routeKey, newTrafficData);
  }

  /**
   * Handle errors during polling
   */
  private handleError(error: unknown, context: string): void {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

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
      errorCount: this.debugInfo.errors.length,
    });

    // Call error handler if provided
    if (this.config.onError) {
      this.config.onError(
        error instanceof Error ? error : new Error(errorMessage),
        context
      );
    }
  }

  /**
   * Utility function to add delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Debug logging helper
   */
  private logDebug(message: string, data?: any): void {
    if (this.config.enableDebugMode) {
      console.log(`[PollingService] ${message}`, data || '');
    }
  }
}

// Global instance
export const pollingService = new IntelligentPollingService();
