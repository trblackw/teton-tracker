import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  Bell,
  Building,
  Clock,
  Database,
  Mail,
  Monitor,
  Moon,
  Palette,
  Phone,
  SettingsIcon,
  Sun,
  Trash,
  User,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { AirportCombobox } from '../components/ui/airport-combobox';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { TimezoneCombobox } from '../components/ui/timezone-combobox';
import { IOSToggle } from '../components/ui/toggle';
import airportsData from '../data/airports-comprehensive.json';
import timezonesData from '../data/timezones.json';
import { preferencesApi, seedApi } from '../lib/api/client';
import { useAppContext } from '../lib/AppContextProvider';
import { type UpdatePreferencesData } from '../lib/db/preferences';
import { isDebugMode } from '../lib/debug';
import {
  notifications,
  type NotificationPermissionState,
} from '../lib/services/notification-service';
import { toasts } from '../lib/toast';

// Convert airport data from object to array format expected by AirportCombobox
const airports = Object.entries(airportsData)
  .map(([code, airport]) => ({
    icao: airport.icao,
    iata: airport.iata || code, // Use code as fallback if iata is empty
    name: airport.name,
    city: airport.city,
    state: airport.state,
    elevation: airport.elevation,
    lat: airport.lat,
    lon: airport.lon,
    tz: airport.tz,
  }))
  .filter(airport => airport.iata); // Filter out airports without IATA codes

// Get timezones from data file
const timezones = timezonesData.timezones;

function Settings() {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const { currentUser } = useAppContext();
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>({
      permission: 'default',
      supported: false,
      enabled: false,
    });
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);

  // Query for user preferences from API
  const {
    data: preferences,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => preferencesApi.getPreferences(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Email and phone number are now managed by Clerk - no local state needed

  // Load notification permission state on mount
  useEffect(() => {
    const loadNotificationState = async () => {
      const state = await notifications.getPermissionState();
      setNotificationPermission(state);
    };
    loadNotificationState();
  }, []);

  // Mutation for updating preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: (data: UpdatePreferencesData) => {
      if (!currentUser?.id) {
        throw new Error('User ID is required');
      }
      return preferencesApi.updatePreferences({
        ...data,
        userId: currentUser.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });

      // Show success toast based on what was updated
      if (variables.homeAirport !== undefined) {
        if (variables.homeAirport === '') {
          toasts.success(
            'Home airport cleared',
            'Your home airport has been removed from your preferences.'
          );
        } else {
          const selectedAirport = airports.find(
            a => a.iata === variables.homeAirport
          );
          toasts.success(
            'Home airport updated',
            selectedAirport
              ? `Set to ${selectedAirport.name} (${selectedAirport.iata})`
              : `Set to ${variables.homeAirport}`
          );
        }
      }

      if (variables.timezone !== undefined) {
        const selectedTimezone = timezones.find(
          tz => tz.id === variables.timezone
        );
        toasts.success(
          'Timezone updated',
          selectedTimezone
            ? `Set to ${selectedTimezone.label}`
            : `Set to ${variables.timezone}`
        );
      }

      if (variables.theme !== undefined) {
        toasts.settingsUpdated('Theme', variables.theme);
      }

      if (variables.notificationPreferences !== undefined) {
        // Check if SMS notifications were specifically toggled
        if (
          variables.notificationPreferences.smsNotificationsEnabled !==
          undefined
        ) {
          const isEnabled =
            variables.notificationPreferences.smsNotificationsEnabled;
          toasts.success(
            `SMS notifications ${isEnabled ? 'enabled' : 'disabled'}`,
            isEnabled
              ? 'You will now receive flight updates via text message'
              : 'SMS notifications have been turned off'
          );
        } else {
          toasts.settingsUpdated('Notification preferences');
        }
      }
    },
    onError: error => {
      console.error('Failed to update preferences:', error);
      toasts.error(
        'Failed to update settings',
        'Please try again or contact support if the problem persists.'
      );
    },
  });

  // Email and phone number handlers removed - fields are now readonly and managed by Clerk

  // Mutation for requesting notification permissions
  const requestNotificationPermission = useMutation({
    mutationFn: async () => {
      const state = await notifications.requestPermission();
      setNotificationPermission(state);
      return state;
    },
    onError: error => {
      console.error('Failed to request notification permission:', error);
      toasts.error(
        'Permission request failed',
        'Could not request notification permission. Please try again.'
      );
    },
  });

  const handleHomeAirportChange = (airport: string) => {
    updatePreferencesMutation.mutate({ homeAirport: airport });
  };

  const handleTimezoneChange = (timezone: string) => {
    updatePreferencesMutation.mutate({ timezone });
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    updatePreferencesMutation.mutate({ theme: newTheme });
  };

  const handleNotificationToggle = (key: string, value: boolean) => {
    if (!preferences?.notificationPreferences) return;

    updatePreferencesMutation.mutate({
      notificationPreferences: {
        ...preferences.notificationPreferences,
        [key]: value,
      },
    });
  };

  const handlePushNotificationsToggle = async (value: boolean) => {
    if (value) {
      // If enabling, request permission first
      if (!notificationPermission.enabled) {
        const permissionResult =
          await requestNotificationPermission.mutateAsync();
        if (!permissionResult.enabled) {
          return; // Permission denied, don't update preference
        }
      }
      // Update preference to enabled
      handleNotificationToggle('pushNotificationsEnabled', true);
    } else {
      // If disabling, just update the preference
      handleNotificationToggle('pushNotificationsEnabled', false);
    }
  };

  const handleRequestNotificationPermission = () => {
    requestNotificationPermission.mutate();
  };

  const handleTestNotification = async () => {
    try {
      await notifications.test();
      toasts.success('Test notification sent', 'Check your notifications!');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toasts.error(
        'Test notification failed',
        'Please check your notification settings and try again.'
      );
    }
  };

  // Mutation for generating seed data (debug only)
  const generateSeedDataMutation = useMutation({
    mutationFn: () => {
      if (!currentUser?.id) {
        throw new Error('User ID is required');
      }
      return seedApi.generateData(currentUser.id);
    },
    onSuccess: result => {
      // Invalidate all queries to refresh the UI
      queryClient.invalidateQueries();
      toasts.success(
        'Seed data generated!',
        `Created ${result.runs} runs and ${result.notifications} notifications`
      );
    },
    onError: error => {
      console.error('Failed to generate seed data:', error);
      toasts.error(
        'Failed to generate seed data',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    },
  });

  // Mutation for clearing user data (debug only)
  const clearUserDataMutation = useMutation({
    mutationFn: () => {
      if (!currentUser?.id) {
        throw new Error('User ID is required');
      }
      return seedApi.clearUserData(currentUser.id);
    },
    onSuccess: result => {
      // Invalidate all queries to refresh the UI
      queryClient.invalidateQueries();
      toasts.success(
        'Data cleared!',
        result.message || 'All your data has been cleared'
      );
    },
    onError: error => {
      console.error('Failed to clear user data:', error);
      toasts.error(
        'Failed to clear data',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    },
  });

  const handleGenerateSeedData = () => {
    generateSeedDataMutation.mutate();
  };

  const handleClearUserData = () => {
    setShowClearDataDialog(true);
  };

  const handleConfirmClearData = () => {
    clearUserDataMutation.mutate();
    setShowClearDataDialog(false);
  };

  const handleCancelClearData = () => {
    setShowClearDataDialog(false);
  };

  if (isLoading || !currentUser) {
    return (
      <div className="space-y-6 px-4 sm:px-0">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground mt-1">
            Loading your preferences...
          </p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 px-4 sm:px-0">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground mt-1">
            Failed to load preferences
          </p>
        </div>
        <Card className="border-destructive">
          <CardContent className="p-8 text-center">
            <SettingsIcon className="h-16 w-16 text-destructive mx-auto mb-6" />
            <p className="text-destructive text-lg mb-4">
              Failed to load settings from database
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure your preferences & settings
        </p>
      </div>

      {/* User Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>
            Your account details managed by Clerk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {currentUser?.imageUrl && (
              <img
                src={currentUser.imageUrl}
                alt="User Avatar"
                className="h-12 w-12 rounded-full border-2 border-gray-200"
              />
            )}
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {currentUser.name || currentUser.email || 'User'}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              To update your profile, email, or password, please use the account
              settings.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Home Airport */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Home Airport
          </CardTitle>
          <CardDescription>
            Set your primary airport for flight tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <AirportCombobox
                  airports={airports}
                  value={preferences?.homeAirport || ''}
                  onValueChange={handleHomeAirportChange}
                  placeholder="Search for your home airport..."
                  emptyMessage="No airports found matching your search."
                />
              </div>
              {preferences?.homeAirport && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleHomeAirportChange('')}
                  disabled={updatePreferencesMutation.isPending}
                  title="Clear home airport"
                >
                  <X className="h-4 w-4 text-destructive hover:text-destructive/80" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email - Managed by Clerk */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email
          </CardTitle>
          <CardDescription>
            Your email address is managed by your account provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  type="email"
                  value={currentUser.email || 'Not set'}
                  readOnly
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              To change your email address, please use the account settings in
              your profile.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Phone Number - Managed by Clerk */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Phone Number
          </CardTitle>
          <CardDescription>
            Your phone number is managed by your account provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  type="tel"
                  value="Managed by Clerk"
                  readOnly
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              To change your phone number, please use the account settings in
              your profile.
            </p>

            {/* SMS Notifications Toggle - always available for notification preferences */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">SMS Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive flight updates and alerts via text message
                  </p>
                </div>
                <IOSToggle
                  pressed={
                    preferences?.notificationPreferences
                      ?.smsNotificationsEnabled ?? false
                  }
                  onPressedChange={(value: boolean) =>
                    handleNotificationToggle('smsNotificationsEnabled', value)
                  }
                  disabled={updatePreferencesMutation.isPending}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timezone Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timezone
          </CardTitle>
          <CardDescription>
            Set your preferred timezone for flight times
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <TimezoneCombobox
                  timezones={timezones}
                  value={preferences?.timezone || ''}
                  onValueChange={handleTimezoneChange}
                  placeholder="Select your timezone..."
                  emptyMessage="No timezones found matching your search."
                />
              </div>
              {preferences?.timezone && preferences.timezone !== 'UTC' && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleTimezoneChange('UTC')}
                  disabled={updatePreferencesMutation.isPending}
                  title="Reset to UTC"
                >
                  <X className="h-4 w-4 text-destructive hover:text-destructive/80" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme
          </CardTitle>
          <CardDescription>
            Choose your preferred theme appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleThemeChange('light')}
                disabled={updatePreferencesMutation.isPending}
                className="flex items-center gap-2 justify-center"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleThemeChange('dark')}
                disabled={updatePreferencesMutation.isPending}
                className="flex items-center gap-2 justify-center"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleThemeChange('system')}
                disabled={updatePreferencesMutation.isPending}
                className="flex items-center gap-2 justify-center"
              >
                <Monitor className="h-4 w-4" />
                System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure push notifications for flight updates and alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Push Notifications Permission */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Enable browser notifications for flight updates and alerts
                </p>
                {!notificationPermission.supported && (
                  <p className="text-sm text-amber-600 mt-1">
                    Not supported in this browser
                  </p>
                )}
                {notificationPermission.permission === 'denied' && (
                  <p className="text-sm text-red-600 mt-1">
                    Blocked - please enable in browser settings
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <IOSToggle
                  pressed={
                    notificationPermission.enabled &&
                    (preferences?.notificationPreferences
                      ?.pushNotificationsEnabled ??
                      true)
                  }
                  onPressedChange={handlePushNotificationsToggle}
                  disabled={
                    !notificationPermission.supported ||
                    notificationPermission.permission === 'denied' ||
                    requestNotificationPermission.isPending ||
                    updatePreferencesMutation.isPending
                  }
                />
                {/* {notificationPermission.enabled &&
                  (preferences?.notificationPreferences
                    ?.pushNotificationsEnabled ??
                    true) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestNotification}
                    >
                      Test
                    </Button>
                  )} */}
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium">Flight Updates</p>
                <p className="text-sm text-muted-foreground">
                  Get notified about flight status changes, delays, and gate
                  updates
                </p>
              </div>
              <IOSToggle
                pressed={
                  preferences?.notificationPreferences?.flightUpdates ?? true
                }
                onPressedChange={(value: boolean) =>
                  handleNotificationToggle('flightUpdates', value)
                }
                disabled={updatePreferencesMutation.isPending}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium">Traffic Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Get notified about traffic conditions and delays on your
                  routes
                </p>
              </div>
              <IOSToggle
                pressed={
                  preferences?.notificationPreferences?.trafficAlerts ?? true
                }
                onPressedChange={(value: boolean) =>
                  handleNotificationToggle('trafficAlerts', value)
                }
                disabled={updatePreferencesMutation.isPending}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium">Run Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Get reminded about upcoming shuttle runs and pickups
                </p>
              </div>
              <IOSToggle
                pressed={
                  preferences?.notificationPreferences?.runReminders ?? true
                }
                onPressedChange={(value: boolean) =>
                  handleNotificationToggle('runReminders', value)
                }
                disabled={updatePreferencesMutation.isPending}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Tools */}
      {isDebugMode() && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Database className="h-5 w-5" />
              Debug Tools
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-300">
              Development tools for testing and data generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                Generate Sample Data
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                This will create realistic sample runs and notifications for
                your account. Any existing data will be replaced.
              </p>
              <Button
                onClick={handleGenerateSeedData}
                disabled={generateSeedDataMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {generateSeedDataMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Generate Data
                  </>
                )}
              </Button>
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400">
              <p>• Creates 20 realistic runs with various statuses</p>
              <p>• Generates 40+ notifications across different types</p>
              <p>• Uses Jackson Hole locations and major airlines</p>
              <p>• Only available in development mode</p>
            </div>
            <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                Clear All Data
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                This will delete all your runs, notifications, and preferences.
                This action cannot be undone.
              </p>
              <Button
                onClick={handleClearUserData}
                disabled={clearUserDataMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {clearUserDataMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash className="h-4 w-4 mr-2" />
                    Clear Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status */}
      {updatePreferencesMutation.isPending && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <p className="text-primary text-sm">Saving preferences...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clear Data Dialog */}
      <Dialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash className="h-5 w-5" />
              Clear All Data
            </DialogTitle>
            <DialogDescription className="text-red-600 dark:text-red-400">
              This action cannot be undone. All your data will be permanently
              deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This will permanently delete:
              </p>
              <ul className="space-y-1 text-sm text-red-600 dark:text-red-400">
                <li>• All your runs and shuttles</li>
                <li>• All notifications and alerts</li>
                <li>• All your preferences and settings</li>
              </ul>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Are you absolutely sure you want to continue?
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelClearData}
              disabled={clearUserDataMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmClearData}
              disabled={clearUserDataMutation.isPending}
            >
              {clearUserDataMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash className="h-4 w-4 mr-2" />
                  Clear All Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute('/settings')({
  component: Settings,
});
