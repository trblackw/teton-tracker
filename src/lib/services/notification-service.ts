import { notificationsApi, preferencesApi, smsApi } from '../api/client';
import { type NotificationType as DbNotificationType } from '../schema';
import { toasts } from '../toast';
import { isDevelopmentMode } from '../utils';

// Notification types
export type NotificationType =
  | 'flight-status-change'
  | 'flight-departure-reminder'
  | 'flight-arrival-reminder'
  | 'traffic-alert'
  | 'run-reminder'
  | 'system-update';

export interface BaseNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  timestamp: number;
  actions?: NotificationAction[];
  data?: Record<string, any>;
}

export interface FlightStatusNotification extends BaseNotification {
  type: 'flight-status-change';
  data: {
    flightNumber: string;
    oldStatus: string;
    newStatus: string;
    airport?: string;
    gate?: string;
    terminal?: string;
    delay?: number;
  };
}

export interface FlightReminderNotification extends BaseNotification {
  type: 'flight-departure-reminder' | 'flight-arrival-reminder';
  data: {
    flightNumber: string;
    airport: string;
    scheduledTime: string;
    estimatedTime?: string;
    gate?: string;
    terminal?: string;
  };
}

export interface TrafficAlertNotification extends BaseNotification {
  type: 'traffic-alert';
  data: {
    route: string;
    severity: 'light' | 'moderate' | 'heavy' | 'severe';
    estimatedDelay: number;
    incidents?: Array<{
      type: string;
      description: string;
      impact: string;
    }>;
  };
}

export interface RunReminderNotification extends BaseNotification {
  type: 'run-reminder';
  data: {
    runId: string;
    pickupTime: string;
    location: string;
    passengerCount: number;
  };
}

export type AppNotification =
  | FlightStatusNotification
  | FlightReminderNotification
  | TrafficAlertNotification
  | RunReminderNotification;

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationPermissionState {
  permission: NotificationPermission;
  supported: boolean;
  enabled: boolean;
  pushSubscription?: PushSubscription;
}

export interface ServiceWorkerMessage {
  type:
    | 'NOTIFICATION_ACTION'
    | 'NAVIGATE'
    | 'CHECK_TRAFFIC'
    | 'NAVIGATE_TO_PICKUP'
    | 'FIND_ALTERNATIVE_ROUTE';
  action?: string;
  notificationType?: NotificationType;
  url?: string;
  data?: any;
  flightNumber?: string;
  airport?: string;
  runId?: string;
  location?: string;
  route?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private pushSubscription: PushSubscription | null = null;
  private debug = isDevelopmentMode();
  private messageHandlers: Map<
    string,
    (message: ServiceWorkerMessage) => void
  > = new Map();

  private constructor() {
    this.initialize();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  private async initialize(): Promise<void> {
    if (!this.isSupported()) {
      if (this.debug) {
        console.warn('🔔 Notifications not supported in this browser');
      }
      return;
    }

    try {
      // Register service worker if not already registered
      if ('serviceWorker' in navigator) {
        this.registration = await navigator.serviceWorker.ready;

        // Set up message handler for service worker messages
        this.setupServiceWorkerMessageHandler();

        if (this.debug) {
          console.log(
            '🔔 Notification service initialized with service worker'
          );
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
    }
  }

  /**
   * Set up service worker message handler
   */
  private setupServiceWorkerMessageHandler(): void {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', event => {
      const message: ServiceWorkerMessage = event.data;

      if (this.debug) {
        console.log('📨 Received service worker message:', message);
      }

      // Handle different message types
      switch (message.type) {
        case 'NOTIFICATION_ACTION':
          this.handleNotificationAction(message);
          break;
        case 'NAVIGATE':
          this.handleNavigate(message);
          break;
        case 'CHECK_TRAFFIC':
          this.handleCheckTraffic(message);
          break;
        case 'NAVIGATE_TO_PICKUP':
          this.handleNavigateToPickup(message);
          break;
        case 'FIND_ALTERNATIVE_ROUTE':
          this.handleFindAlternativeRoute(message);
          break;
        default:
          console.warn('Unknown service worker message type:', message.type);
      }
    });
  }

  /**
   * Handle notification action messages
   */
  private handleNotificationAction(message: ServiceWorkerMessage): void {
    const handler = this.messageHandlers.get('NOTIFICATION_ACTION');
    if (handler) {
      handler(message);
    } else {
      // Default handling
      toasts.info(
        'Notification Action',
        `Action: ${message.action} for ${message.notificationType}`
      );
    }
  }

  /**
   * Handle navigate messages
   */
  private handleNavigate(message: ServiceWorkerMessage): void {
    if (message.url) {
      // Use router navigation if available, otherwise fallback to location
      if (typeof window !== 'undefined') {
        window.location.hash = message.url;
      }
    }
  }

  /**
   * Handle check traffic messages
   */
  private handleCheckTraffic(message: ServiceWorkerMessage): void {
    const handler = this.messageHandlers.get('CHECK_TRAFFIC');
    if (handler) {
      handler(message);
    } else {
      // Default handling
      toasts.info(
        'Check Traffic',
        `Checking traffic for flight ${message.flightNumber} at ${message.airport}`
      );
    }
  }

  /**
   * Handle navigate to pickup messages
   */
  private handleNavigateToPickup(message: ServiceWorkerMessage): void {
    const handler = this.messageHandlers.get('NAVIGATE_TO_PICKUP');
    if (handler) {
      handler(message);
    } else {
      // Default handling
      toasts.info(
        'Navigate to Pickup',
        `Navigating to pickup location: ${message.location}`
      );
    }
  }

  /**
   * Handle find alternative route messages
   */
  private handleFindAlternativeRoute(message: ServiceWorkerMessage): void {
    const handler = this.messageHandlers.get('FIND_ALTERNATIVE_ROUTE');
    if (handler) {
      handler(message);
    } else {
      // Default handling
      toasts.info(
        'Find Alternative Route',
        `Finding alternative route for: ${message.route}`
      );
    }
  }

  /**
   * Register a message handler
   */
  onMessage(
    type: string,
    handler: (message: ServiceWorkerMessage) => void
  ): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Unregister a message handler
   */
  offMessage(type: string): void {
    this.messageHandlers.delete(type);
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator
    );
  }

  /**
   * Get current notification permission state
   */
  async getPermissionState(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) {
      return {
        permission: 'denied',
        supported: false,
        enabled: false,
      };
    }

    const permission = Notification.permission;
    let pushSubscription: PushSubscription | null = null;

    if (this.registration && permission === 'granted') {
      try {
        pushSubscription =
          await this.registration.pushManager.getSubscription();
        this.pushSubscription = pushSubscription;
      } catch (error) {
        console.warn('⚠️ Failed to get push subscription:', error);
      }
    }

    return {
      permission,
      supported: true,
      enabled: permission === 'granted',
      pushSubscription: pushSubscription || undefined,
    };
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) {
      toasts.error(
        'Notifications not supported',
        'Your browser does not support push notifications'
      );
      return this.getPermissionState();
    }

    try {
      // Request permission
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        // Set up push subscription
        await this.setupPushSubscription();

        toasts.success(
          'Notifications enabled',
          'You will now receive flight updates and alerts'
        );

        if (this.debug) {
          console.log('✅ Notification permission granted');
        }
      } else {
        toasts.error(
          'Notifications blocked',
          'Please enable notifications in your browser settings to receive updates'
        );
      }

      return this.getPermissionState();
    } catch (error) {
      console.error('❌ Failed to request notification permission:', error);
      toasts.error(
        'Permission request failed',
        'Could not request notification permission'
      );
      return this.getPermissionState();
    }
  }

  /**
   * Set up push subscription for background notifications
   */
  private async setupPushSubscription(): Promise<void> {
    if (!this.registration) {
      console.warn('⚠️ Service worker not available for push subscription');
      return;
    }

    try {
      // For development, we'll use a mock VAPID key
      // In production, you'd use your actual VAPID public key
      const publicKey = isDevelopmentMode()
        ? 'BNNtMcQwuAF6WOYJHuMqrUZFPVUu0ZkxQDa8mDfmZgC1YpN6X7K3lPGpXBXhk6_aWiPWQ7Gn_WQ4F3Y6N8eQHVA'
        : process.env.VAPID_PUBLIC_KEY;

      if (!publicKey) {
        if (this.debug) {
          console.warn(
            '⚠️ VAPID public key not configured, using mock subscription'
          );
        }
        return;
      }

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      this.pushSubscription = subscription;

      if (this.debug) {
        console.log('📱 Push subscription created:', subscription.endpoint);
      }

      // In production, you'd send this subscription to your server
      // await this.sendSubscriptionToServer(subscription);
    } catch (error) {
      console.error('❌ Failed to set up push subscription:', error);
    }
  }

  /**
   * Send a notification
   */
  async sendNotification(notification: AppNotification): Promise<void> {
    // Save notification to database first
    try {
      await this.saveNotificationToDatabase(notification);
    } catch (error) {
      console.error('❌ Failed to save notification to database:', error);
      // Continue with push notification even if database save fails
    }

    // Check user preferences first
    const shouldSend = await this.shouldSendNotification(notification);
    if (!shouldSend) {
      if (this.debug) {
        console.log(
          '🔇 Notification blocked by user preferences:',
          notification.type
        );
      }
      return;
    }

    // Send SMS notification if enabled
    await this.sendSMSNotification(notification);

    // In development mode, show mock notifications
    if (isDevelopmentMode()) {
      this.showMockNotification(notification);
      return;
    }

    const permissionState = await this.getPermissionState();
    if (!permissionState.enabled) {
      if (this.debug) {
        console.warn(
          '🔔 Notifications not enabled, skipping:',
          notification.title
        );
      }
      return;
    }

    try {
      // Create notification options
      const options: NotificationOptions = {
        body: notification.body,
        icon: notification.icon || '/logo.svg',
        badge: notification.badge || '/favicon.ico',
        tag: notification.id,
        data: notification.data,
        requireInteraction: this.shouldRequireInteraction(notification.type),
        silent: false,
      };

      // Send notification
      if (this.registration) {
        await this.registration.showNotification(notification.title, options);
      } else {
        // Fallback to basic notification
        new Notification(notification.title, options);
      }

      if (this.debug) {
        console.log('🔔 Notification sent:', notification.title);
      }
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
    }
  }

  /**
   * Save notification to database
   */
  private async saveNotificationToDatabase(
    notification: AppNotification
  ): Promise<void> {
    try {
      // Map notification type to database type
      const dbType = this.mapNotificationTypeToDbType(notification.type);

      // Extract common fields
      const { flightNumber, pickupLocation, dropoffLocation, runId } =
        this.extractNotificationFields(notification);

      // Create notification data for database
      const notificationData = {
        type: dbType,
        title: notification.title,
        message: notification.body,
        flightNumber,
        pickupLocation,
        dropoffLocation,
        runId,
        metadata: {
          originalType: notification.type,
          timestamp: notification.timestamp,
          icon: notification.icon,
          badge: notification.badge,
          actions: notification.actions,
          data: notification.data,
        },
      };

      await notificationsApi.createNotification(notificationData);

      if (this.debug) {
        console.log('💾 Notification saved to database:', notification.title);
      }
    } catch (error) {
      console.error('❌ Failed to save notification to database:', error);
      throw error;
    }
  }

  /**
   * Map notification type to database notification type
   */
  private mapNotificationTypeToDbType(
    type: NotificationType
  ): DbNotificationType {
    switch (type) {
      case 'flight-status-change':
      case 'flight-departure-reminder':
      case 'flight-arrival-reminder':
        return 'flight_update';
      case 'traffic-alert':
        return 'traffic_alert';
      case 'run-reminder':
        return 'run_reminder';
      case 'system-update':
        return 'system';
      default:
        return 'system';
    }
  }

  /**
   * Extract relevant fields from notification for database storage
   */
  private extractNotificationFields(notification: AppNotification): {
    flightNumber?: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    runId?: string;
  } {
    const fields: {
      flightNumber?: string;
      pickupLocation?: string;
      dropoffLocation?: string;
      runId?: string;
    } = {};

    switch (notification.type) {
      case 'flight-status-change':
      case 'flight-departure-reminder':
      case 'flight-arrival-reminder':
        fields.flightNumber = notification.data.flightNumber;
        break;
      case 'traffic-alert':
        // Traffic alerts might include route information
        break;
      case 'run-reminder':
        fields.runId = notification.data.runId;
        fields.pickupLocation = notification.data.location;
        break;
    }

    return fields;
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private async shouldSendNotification(
    notification: AppNotification
  ): Promise<boolean> {
    try {
      const preferences = await preferencesApi.getPreferences();

      if (!preferences?.notificationPreferences) {
        return true; // Default to enabled if no preferences
      }

      const { notificationPreferences } = preferences;

      // Check global push notifications enabled setting first
      if (notificationPreferences.pushNotificationsEnabled === false) {
        return false;
      }

      switch (notification.type) {
        case 'flight-status-change':
        case 'flight-departure-reminder':
        case 'flight-arrival-reminder':
          return notificationPreferences.flightUpdates ?? true;

        case 'traffic-alert':
          return notificationPreferences.trafficAlerts ?? true;

        case 'run-reminder':
          return notificationPreferences.runReminders ?? true;

        default:
          return true;
      }
    } catch (error) {
      console.error('❌ Failed to check notification preferences:', error);
      return true; // Default to enabled on error
    }
  }

  /**
   * Send SMS notification if enabled and configured
   */
  private async sendSMSNotification(
    notification: AppNotification
  ): Promise<void> {
    try {
      const preferences = await preferencesApi.getPreferences();

      // Check if SMS notifications are enabled globally
      if (!preferences?.notificationPreferences?.smsNotificationsEnabled) {
        return;
      }

      // Check if this specific type of SMS notification is enabled
      const shouldSendSMS = this.shouldSendSMSForType(
        notification.type,
        preferences.notificationPreferences
      );
      if (!shouldSendSMS) {
        return;
      }

      // Check if user has a phone number configured
      if (!preferences.phoneNumber) {
        if (this.debug) {
          console.warn(
            '📱 SMS notification requested but no phone number configured'
          );
        }
        return;
      }

      // Format SMS message
      const smsMessage = this.formatSMSMessage(notification);

      // Send SMS via API
      const result = await smsApi.sendSMS(preferences.phoneNumber, smsMessage);

      if (result.success) {
        if (this.debug) {
          console.log(
            '📱 SMS notification sent successfully:',
            result.messageId
          );
        }
      } else {
        console.error('❌ Failed to send SMS notification:', result.error);
      }
    } catch (error) {
      console.error('❌ Failed to send SMS notification:', error);
    }
  }

  /**
   * Check if SMS should be sent for this notification type
   */
  private shouldSendSMSForType(
    type: NotificationType,
    preferences: any
  ): boolean {
    switch (type) {
      case 'flight-status-change':
      case 'flight-departure-reminder':
      case 'flight-arrival-reminder':
        return preferences.smsFlightUpdates ?? true;

      case 'traffic-alert':
        return preferences.smsTrafficAlerts ?? true;

      case 'run-reminder':
        return preferences.smsRunReminders ?? true;

      default:
        return false;
    }
  }

  /**
   * Format notification for SMS
   */
  private formatSMSMessage(notification: AppNotification): string {
    // SMS has character limits, so we need to keep it concise
    const maxLength = 160; // Standard SMS length

    // Create a short, informative message
    let message = `${notification.title}: ${notification.body}`;

    // Add specific formatting for different notification types
    switch (notification.type) {
      case 'flight-status-change':
        if (notification.data?.flightNumber) {
          message = `Flight ${notification.data.flightNumber}: ${notification.data.newStatus}`;
          if (notification.data.gate) {
            message += ` (Gate ${notification.data.gate})`;
          }
        }
        break;

      case 'traffic-alert':
        if (notification.data?.severity) {
          message = `Traffic Alert: ${notification.data.severity} conditions on your route`;
        }
        break;

      case 'run-reminder':
        if (notification.data?.pickupTime && notification.data?.location) {
          const time = new Date(
            notification.data.pickupTime
          ).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          message = `Run reminder: Pickup at ${notification.data.location} at ${time}`;
        }
        break;
    }

    // Truncate if too long and add attribution
    if (message.length > maxLength - 15) {
      message = message.substring(0, maxLength - 18) + '...';
    }

    message += ' - Teton Tracker';

    return message;
  }

  /**
   * Determine if notification should require interaction
   */
  private shouldRequireInteraction(type: NotificationType): boolean {
    switch (type) {
      case 'flight-status-change':
      case 'traffic-alert':
        return true; // Critical notifications require interaction
      case 'run-reminder':
        return true; // Time-sensitive
      default:
        return false;
    }
  }

  /**
   * Show mock notification in development mode
   */
  private showMockNotification(notification: AppNotification): void {
    if (this.debug) {
      console.log('🎭 Mock notification:', {
        title: notification.title,
        body: notification.body,
        type: notification.type,
        data: notification.data,
      });
    }

    // Show as toast for development
    switch (notification.type) {
      case 'flight-status-change':
        toasts.info(notification.title, notification.body);
        break;
      case 'traffic-alert':
        toasts.error(notification.title, notification.body);
        break;
      case 'run-reminder':
        toasts.info(notification.title, notification.body);
        break;
      default:
        toasts.info(notification.title, notification.body);
    }
  }

  /**
   * Create flight status change notification
   */
  createFlightStatusNotification(
    flightNumber: string,
    oldStatus: string,
    newStatus: string,
    details?: {
      airport?: string;
      gate?: string;
      terminal?: string;
      delay?: number;
    }
  ): FlightStatusNotification {
    const id = `flight-status-${flightNumber}-${Date.now()}`;
    const airport = details?.airport ? ` at ${details.airport}` : '';
    const gateInfo = details?.gate ? ` (Gate ${details.gate})` : '';
    const delayInfo = details?.delay ? ` - ${details.delay}min delay` : '';

    return {
      id,
      type: 'flight-status-change',
      title: `Flight ${flightNumber} Status Update`,
      body: `${oldStatus} → ${newStatus}${airport}${gateInfo}${delayInfo}`,
      icon: '/logo.svg',
      timestamp: Date.now(),
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      data: {
        flightNumber,
        oldStatus,
        newStatus,
        ...details,
      },
    };
  }

  /**
   * Create flight reminder notification
   */
  createFlightReminderNotification(
    type: 'departure' | 'arrival',
    flightNumber: string,
    airport: string,
    scheduledTime: string,
    details?: {
      estimatedTime?: string;
      gate?: string;
      terminal?: string;
    }
  ): FlightReminderNotification {
    const id = `flight-reminder-${type}-${flightNumber}-${Date.now()}`;
    const isoDeparture = new Date(scheduledTime);
    const timeStr = isoDeparture.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const gateInfo = details?.gate ? ` at Gate ${details.gate}` : '';
    const estimatedInfo = details?.estimatedTime
      ? ` (Est: ${new Date(details.estimatedTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })})`
      : '';

    return {
      id,
      type:
        type === 'departure'
          ? 'flight-departure-reminder'
          : 'flight-arrival-reminder',
      title: `Flight ${flightNumber} ${type === 'departure' ? 'Departure' : 'Arrival'} Reminder`,
      body: `${type === 'departure' ? 'Departing' : 'Arriving'} ${airport} at ${timeStr}${estimatedInfo}${gateInfo}`,
      icon: '/logo.svg',
      timestamp: Date.now(),
      actions: [
        { action: 'view', title: 'View Flight' },
        { action: 'traffic', title: 'Check Traffic' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      data: {
        flightNumber,
        airport,
        scheduledTime,
        ...details,
      },
    };
  }

  /**
   * Create traffic alert notification
   */
  createTrafficAlertNotification(
    route: string,
    severity: 'light' | 'moderate' | 'heavy' | 'severe',
    estimatedDelay: number,
    incidents?: Array<{
      type: string;
      description: string;
      impact: string;
    }>
  ): TrafficAlertNotification {
    const id = `traffic-alert-${route.replace(/\s+/g, '-')}-${Date.now()}`;
    const severityEmoji = {
      light: '🟢',
      moderate: '🟡',
      heavy: '🟠',
      severe: '🔴',
    }[severity];

    const delayText =
      estimatedDelay > 0
        ? `${Math.round(estimatedDelay / 60)} minute delay expected`
        : 'No significant delays';

    return {
      id,
      type: 'traffic-alert',
      title: `${severityEmoji} Traffic Alert: ${route}`,
      body: `${severity.charAt(0).toUpperCase() + severity.slice(1)} traffic conditions. ${delayText}`,
      icon: '/logo.svg',
      timestamp: Date.now(),
      actions: [
        { action: 'view', title: 'View Route' },
        { action: 'alternative', title: 'Find Alternative' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      data: {
        route,
        severity,
        estimatedDelay,
        incidents,
      },
    };
  }

  /**
   * Create run reminder notification
   */
  createRunReminderNotification(
    runId: string,
    pickupTime: string,
    location: string,
    passengerCount: number
  ): RunReminderNotification {
    const id = `run-reminder-${runId}-${Date.now()}`;
    const pickupTimeObj = new Date(pickupTime);
    const timeStr = pickupTimeObj.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      id,
      type: 'run-reminder',
      title: `Upcoming Run Reminder`,
      body: `Pickup at ${location} at ${timeStr} for ${passengerCount} passenger${passengerCount !== 1 ? 's' : ''}`,
      icon: '/logo.svg',
      timestamp: Date.now(),
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'navigate', title: 'Navigate' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      data: {
        runId,
        pickupTime,
        location,
        passengerCount,
      },
    };
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    if (!this.registration) {
      return;
    }

    try {
      const notifications = await this.registration.getNotifications();
      notifications.forEach(notification => notification.close());

      if (this.debug) {
        console.log('🧹 Cleared all notifications');
      }
    } catch (error) {
      console.error('❌ Failed to clear notifications:', error);
    }
  }

  /**
   * Test notification (for development)
   */
  async testNotification(): Promise<void> {
    const testNotification: FlightStatusNotification = {
      id: `test-${Date.now()}`,
      type: 'flight-status-change',
      title: 'Test Notification',
      body: 'This is a test notification to verify the system is working',
      icon: '/logo.svg',
      timestamp: Date.now(),
      data: {
        flightNumber: 'TEST123',
        oldStatus: 'Scheduled',
        newStatus: 'Boarding',
      },
    };

    await this.sendNotification(testNotification);
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Development testing helper - attach to window in dev mode
if (isDevelopmentMode() && typeof window !== 'undefined') {
  (window as any).testNotifications = {
    // Test basic notification
    test: () => notifications.test(),

    // Test flight status change
    flightStatus: (
      flightNumber = 'AA1234',
      oldStatus = 'Scheduled',
      newStatus = 'Boarding'
    ) =>
      notifications.flightStatusChanged(flightNumber, oldStatus, newStatus, {
        airport: 'JAC',
        gate: 'A12',
        delay: 15,
      }),

    // Test traffic alert
    traffic: (route = 'Jackson → Airport', severity = 'heavy') =>
      notifications.trafficAlert(route, severity as any, 600, [
        {
          type: 'congestion',
          description: 'Heavy traffic detected',
          impact: 'Adds 10 minutes to travel time',
        },
      ]),

    // Test run reminder
    runReminder: (location = 'Hotel Jackson', passengers = 3) => {
      const pickupTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      return notifications.runReminder(
        'run-123',
        pickupTime,
        location,
        passengers
      );
    },

    // Test permission request
    requestPermission: () => notifications.requestPermission(),

    // Get permission state
    getPermissionState: () => notifications.getPermissionState(),

    // Help text
    help: () => {
      console.log(`
🔔 Notification Testing Commands:
══════════════════════════════════

Basic test:
  testNotifications.test()

Flight notifications:
  testNotifications.flightStatus()
  testNotifications.flightStatus('UA456', 'On Time', 'Delayed')

Traffic alerts:
  testNotifications.traffic()
  testNotifications.traffic('Downtown → Airport', 'moderate')

Run reminders:
  testNotifications.runReminder()
  testNotifications.runReminder('Four Seasons', 2)

Permissions:
  testNotifications.requestPermission()
  testNotifications.getPermissionState()

All notifications show as toasts in development mode!
      `);
    },
  };

  console.log(
    '🔔 Notification testing helper loaded! Run testNotifications.help() for commands.'
  );
}

// Utility functions for common notification scenarios
export const notifications = {
  /**
   * Send flight status change notification
   */
  async flightStatusChanged(
    flightNumber: string,
    oldStatus: string,
    newStatus: string,
    details?: {
      airport?: string;
      gate?: string;
      terminal?: string;
      delay?: number;
    }
  ): Promise<void> {
    const notification = notificationService.createFlightStatusNotification(
      flightNumber,
      oldStatus,
      newStatus,
      details
    );
    await notificationService.sendNotification(notification);
  },

  /**
   * Send flight departure reminder
   */
  async flightDepartureReminder(
    flightNumber: string,
    airport: string,
    scheduledTime: string,
    details?: {
      estimatedTime?: string;
      gate?: string;
      terminal?: string;
    }
  ): Promise<void> {
    const notification = notificationService.createFlightReminderNotification(
      'departure',
      flightNumber,
      airport,
      scheduledTime,
      details
    );
    await notificationService.sendNotification(notification);
  },

  /**
   * Send traffic alert
   */
  async trafficAlert(
    route: string,
    severity: 'light' | 'moderate' | 'heavy' | 'severe',
    estimatedDelay: number,
    incidents?: Array<{
      type: string;
      description: string;
      impact: string;
    }>
  ): Promise<void> {
    const notification = notificationService.createTrafficAlertNotification(
      route,
      severity,
      estimatedDelay,
      incidents
    );
    await notificationService.sendNotification(notification);
  },

  /**
   * Send run reminder
   */
  async runReminder(
    runId: string,
    pickupTime: string,
    location: string,
    passengerCount: number
  ): Promise<void> {
    const notification = notificationService.createRunReminderNotification(
      runId,
      pickupTime,
      location,
      passengerCount
    );
    await notificationService.sendNotification(notification);
  },

  /**
   * Request notification permissions
   */
  async requestPermission(): Promise<NotificationPermissionState> {
    return notificationService.requestPermission();
  },

  /**
   * Get permission state
   */
  async getPermissionState(): Promise<NotificationPermissionState> {
    return notificationService.getPermissionState();
  },

  /**
   * Test notification
   */
  async test(): Promise<void> {
    return notificationService.testNotification();
  },

  /**
   * Register message handler
   */
  onMessage(
    type: string,
    handler: (message: ServiceWorkerMessage) => void
  ): void {
    notificationService.onMessage(type, handler);
  },

  /**
   * Unregister message handler
   */
  offMessage(type: string): void {
    notificationService.offMessage(type);
  },
};
