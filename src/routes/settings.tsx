import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  Building,
  Monitor,
  Moon,
  Palette,
  SettingsIcon,
  Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Toggle } from '../components/ui/toggle';
import { preferencesApi } from '../lib/api/client';
import { type UpdatePreferencesData } from '../lib/db/preferences';

function Settings() {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

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

  // Mutation for updating preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: (data: UpdatePreferencesData) =>
      preferencesApi.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    },
    onError: error => {
      console.error('Failed to update preferences:', error);
    },
  });

  const handleHomeAirportChange = (airport: string) => {
    updatePreferencesMutation.mutate({ homeAirport: airport });
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

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div>
          <h2 className='text-2xl font-bold text-foreground'>Settings</h2>
          <p className='text-muted-foreground mt-1'>
            Loading your preferences...
          </p>
        </div>
        <Card>
          <CardContent className='p-8 text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
            <p className='text-muted-foreground'>Loading settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className='space-y-6'>
        <div>
          <h2 className='text-2xl font-bold text-foreground'>Settings</h2>
          <p className='text-muted-foreground mt-1'>
            Failed to load preferences
          </p>
        </div>
        <Card className='border-destructive'>
          <CardContent className='p-8 text-center'>
            <SettingsIcon className='h-16 w-16 text-destructive mx-auto mb-6' />
            <p className='text-destructive text-lg mb-4'>
              Failed to load settings from database
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-foreground'>Settings</h2>
        <p className='text-muted-foreground mt-1'>
          Configure your preferences and settings
        </p>
      </div>

      {/* Home Airport */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Building className='h-5 w-5' />
            Home Airport
          </CardTitle>
          <CardDescription>
            Set your primary airport for flight tracking
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex flex-col gap-2'>
            <Input
              value={preferences?.homeAirport || ''}
              onChange={e => handleHomeAirportChange(e.target.value)}
              placeholder='Enter your home airport code (e.g., LAX, JFK)'
              disabled={updatePreferencesMutation.isPending}
            />
            {preferences?.homeAirport && (
              <p className='text-sm text-muted-foreground'>
                Current home airport: {preferences.homeAirport}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Palette className='h-5 w-5' />
            Theme
          </CardTitle>
          <CardDescription>
            Choose your preferred theme appearance
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-3'>
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size='sm'
                onClick={() => handleThemeChange('light')}
                disabled={updatePreferencesMutation.isPending}
                className='flex items-center gap-2'
              >
                <Sun className='h-4 w-4' />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size='sm'
                onClick={() => handleThemeChange('dark')}
                disabled={updatePreferencesMutation.isPending}
                className='flex items-center gap-2'
              >
                <Moon className='h-4 w-4' />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size='sm'
                onClick={() => handleThemeChange('system')}
                disabled={updatePreferencesMutation.isPending}
                className='flex items-center gap-2'
              >
                <Monitor className='h-4 w-4' />
                System
              </Button>
            </div>
            <p className='text-sm text-muted-foreground'>
              Current theme: {theme}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <SettingsIcon className='h-5 w-5' />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure what notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='font-medium'>Flight Updates</p>
                <p className='text-sm text-muted-foreground'>
                  Get notified about flight status changes
                </p>
              </div>
              <Toggle
                pressed={
                  preferences?.notificationPreferences?.flightUpdates ?? true
                }
                onPressedChange={value =>
                  handleNotificationToggle('flightUpdates', value)
                }
                disabled={updatePreferencesMutation.isPending}
              />
            </div>
            <div className='flex items-center justify-between'>
              <div>
                <p className='font-medium'>Traffic Alerts</p>
                <p className='text-sm text-muted-foreground'>
                  Get notified about traffic conditions
                </p>
              </div>
              <Toggle
                pressed={
                  preferences?.notificationPreferences?.trafficAlerts ?? true
                }
                onPressedChange={value =>
                  handleNotificationToggle('trafficAlerts', value)
                }
                disabled={updatePreferencesMutation.isPending}
              />
            </div>
            <div className='flex items-center justify-between'>
              <div>
                <p className='font-medium'>Run Reminders</p>
                <p className='text-sm text-muted-foreground'>
                  Get reminded about upcoming runs
                </p>
              </div>
              <Toggle
                pressed={
                  preferences?.notificationPreferences?.runReminders ?? true
                }
                onPressedChange={value =>
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
        <Card className='border-primary/20 bg-primary/5'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-2'>
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-primary'></div>
              <p className='text-primary text-sm'>Saving preferences...</p>
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
