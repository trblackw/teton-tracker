import { Label } from '@radix-ui/react-label';
import { createFileRoute } from '@tanstack/react-router';
import { Moon, Plane, Sun } from 'lucide-react';
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
import { Toggle } from '../components/ui/toggle';
import airportsData from '../data/airports-full.json';

interface Airport {
  icao: string;
  iata: string;
  name: string;
  city: string;
  state: string;
  elevation: number;
  lat: number;
  lon: number;
  tz: string;
}

// Convert the airports object to an array for compatibility
const airports: Airport[] = Object.values(airportsData).filter(airport => 
  airport.iata && airport.iata.trim() !== '' && airport.iata !== 'N/A'
);

function Settings() {
  const { theme, setTheme } = useTheme();
  const [homeAirport, setHomeAirport] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before accessing theme
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const savedAirport = window.localStorage.getItem('home-airport');
      if (savedAirport) {
        setHomeAirport(savedAirport);
      }
    }
  }, []);

  const handleAirportChange = (airportCode: string) => {
    setHomeAirport(airportCode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('home-airport', airportCode);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (!mounted) {
    return null;
  }

  const selectedAirport = airports.find(airport => airport.iata === homeAirport);

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-foreground'>Settings</h2>
        <p className='text-muted-foreground mt-1'>
          Configure your preferences and default options
        </p>
      </div>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            {theme === 'dark' ? (
              <Moon className='h-5 w-5' />
            ) : (
              <Sun className='h-5 w-5' />
            )}
            Appearance
          </CardTitle>
          <CardDescription>
            Choose between light and dark mode, or use your system preference
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div className='space-y-1'>
              <Label htmlFor='theme-toggle'>Dark Mode</Label>
              <p className='text-sm text-muted-foreground'>
                Toggle between light and dark appearance
              </p>
            </div>
            <Toggle
              id='theme-toggle'
              pressed={theme === 'dark'}
              onPressedChange={toggleTheme}
              aria-label='Toggle dark mode'
              className='data-[state=on]:bg-foreground data-[state=on]:text-background'
            >
              {theme === 'dark' ? (
                <Moon className='h-4 w-4' />
              ) : (
                <Sun className='h-4 w-4' />
              )}
            </Toggle>
          </div>
          
          <div className='grid grid-cols-3 gap-2'>
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setTheme('light')}
              className='justify-start'
            >
              <Sun className='h-4 w-4 mr-2' />
              Light
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setTheme('dark')}
              className='justify-start'
            >
              <Moon className='h-4 w-4 mr-2' />
              Dark
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setTheme('system')}
              className='justify-start'
            >
              <div className='h-4 w-4 mr-2 rounded-full bg-gradient-to-r from-muted-foreground to-foreground' />
              System
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Airport Settings */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Plane className='h-5 w-5' />
            Home Base Airport
          </CardTitle>
          <CardDescription>
            Set your primary airport for quick access and defaults ({airports.length} airports available)
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-3'>
            <Label htmlFor='home-airport'>Select Airport</Label>
            <AirportCombobox
              airports={airports}
              value={homeAirport}
              onValueChange={handleAirportChange}
              placeholder='Choose your home airport...'
              emptyMessage='No airports found'
              maxResults={100}
            />

            {selectedAirport && (
              <div className='mt-3 p-4 bg-primary/5 rounded-lg border border-primary/20'>
                <p className='text-sm font-medium text-primary mb-2'>
                  Selected Home Airport
                </p>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <span className='font-mono bg-primary/10 text-primary px-2 py-1 rounded text-sm font-bold'>
                      {selectedAirport.iata}
                    </span>
                    <span className='font-mono bg-muted text-muted-foreground px-2 py-1 rounded text-xs'>
                      {selectedAirport.icao}
                    </span>
                  </div>
                  <p className='text-sm text-primary font-medium'>
                    {selectedAirport.name}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {selectedAirport.city}, {selectedAirport.state} • {selectedAirport.elevation}ft elevation
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    Timezone: {selectedAirport.tz}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Settings Placeholder */}
      <Card className='opacity-60'>
        <CardHeader>
          <CardTitle>Additional Settings</CardTitle>
          <CardDescription>
            More configuration options coming soon...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3 text-sm text-muted-foreground'>
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 bg-muted rounded-full' />
              Notification preferences
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 bg-muted rounded-full' />
              Default time zones
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 bg-muted rounded-full' />
              API refresh intervals
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute()({
  component: Settings,
});
