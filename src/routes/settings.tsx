import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  Bell,
  Building,
  Clock,
  Monitor,
  Moon,
  Palette,
  SettingsIcon,
  Sun,
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
import { TimezoneCombobox } from '../components/ui/timezone-combobox';
import { IOSToggle } from '../components/ui/toggle';
import airportsData from '../data/airports-comprehensive.json';
import timezonesData from '../data/timezones.json';
import { preferencesApi } from '../lib/api/client';
import { type UpdatePreferencesData } from '../lib/db/preferences';
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
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>({
      permission: 'default',
      supported: false,
      enabled: false,
    });

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
    mutationFn: (data: UpdatePreferencesData) =>
      preferencesApi.updatePreferences(data),
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
        toasts.settingsUpdated('Notification preferences');
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

  if (isLoading) {
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
                {notificationPermission.enabled &&
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
                  )}
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
    </div>
  );
}

export const Route = createFileRoute('/settings')({
  component: Settings,
});
