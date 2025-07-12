import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Clock, Filter, MapPin, Plane, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { AirlineCombobox } from '../components/ui/airline-combobox';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import airlinesData from '../data/airlines.json';
import { preferencesApi } from '../lib/api/client';
import { openskyService } from '../lib/services/opensky-service';

interface Airline {
  id: string;
  lcc: string;
  name: string;
  logo: string;
}

// Convert the airlines data for compatibility
const airlines: Airline[] = airlinesData;

function UpcomingFlights() {
  const [selectedAirline, setSelectedAirline] = useState<string>('');

  // Query for user preferences to get home airport
  const { data: preferences, isLoading: isLoadingPreferences } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => preferencesApi.getPreferences(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const homeAirport = preferences?.homeAirport || '';

  // Query for upcoming flights
  const {
    data: upcomingFlights = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['upcoming-flights', homeAirport, selectedAirline],
    queryFn: async () => {
      if (!homeAirport) return [];

      return openskyService.getUpcomingDepartures({
        airport: homeAirport,
        airline: selectedAirline || undefined,
        limit: 5,
      });
    },
    enabled: !!homeAirport,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'on time':
      case 'scheduled':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'delayed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'boarding':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'departed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getAirlineName = (airlineCode: string) => {
    const airline = airlines.find(a => a.id === airlineCode);
    return airline?.name || airlineCode;
  };

  const getAirlineLogo = (airlineCode: string) => {
    const airline = airlines.find(a => a.id === airlineCode);
    return airline?.logo;
  };

  if (isLoadingPreferences) {
    return (
      <div className='space-y-6'>
        <div>
          <h2 className='text-2xl font-bold text-foreground'>
            Upcoming Flights
          </h2>
          <p className='text-muted-foreground mt-1'>
            View upcoming departures from your home base airport
          </p>
        </div>

        <Card>
          <CardContent className='p-8 text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
            <p className='text-muted-foreground'>Loading preferences...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!homeAirport) {
    return (
      <div className='space-y-6'>
        <div>
          <h2 className='text-2xl font-bold text-foreground'>
            Upcoming Flights
          </h2>
          <p className='text-muted-foreground mt-1'>
            View upcoming departures from your home base airport
          </p>
        </div>

        <Card>
          <CardContent className='p-8 text-center'>
            <Plane className='h-16 w-16 text-muted-foreground mx-auto mb-6' />
            <p className='text-muted-foreground text-lg mb-4'>
              No home airport configured. Please set your home base airport in
              settings first.
            </p>
            <Button asChild>
              <a href='/settings'>Go to Settings</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-foreground'>
            Upcoming Flights
          </h2>
          <p className='text-muted-foreground mt-1'>
            Next 5 departures from {homeAirport}
            {selectedAirline && ` • ${getAirlineName(selectedAirline)}`}
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Airline Filter */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Filter className='h-5 w-5' />
            Filter by Airline
          </CardTitle>
          <CardDescription>
            Filter flights by a specific airline or show all departures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AirlineCombobox
            airlines={airlines}
            value={selectedAirline}
            onValueChange={setSelectedAirline}
            placeholder='All airlines'
            emptyMessage='No airlines found'
            maxResults={100}
          />
          {selectedAirline && (
            <div className='mt-3 flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>
                Showing flights for {getAirlineName(selectedAirline)}
              </span>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setSelectedAirline('')}
              >
                Clear Filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className='p-8 text-center'>
            <div className='flex items-center justify-center gap-2'>
              <RefreshCw className='h-5 w-5 animate-spin' />
              <span>Loading upcoming flights...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Card className='border-destructive'>
          <CardContent className='p-8 text-center'>
            <p className='text-destructive mb-4'>
              Failed to load upcoming flights. Please try again.
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Flights List */}
      {!isLoading && !isError && upcomingFlights.length === 0 && (
        <Card>
          <CardContent className='p-8 text-center'>
            <Plane className='h-16 w-16 text-muted-foreground mx-auto mb-6' />
            <p className='text-muted-foreground text-lg mb-4'>
              No upcoming flights found
              {selectedAirline && ` for ${getAirlineName(selectedAirline)}`}
            </p>
            <p className='text-sm text-muted-foreground'>
              Try refreshing or selecting a different airline filter
            </p>
          </CardContent>
        </Card>
      )}

      {/* Flights Grid */}
      {!isLoading && !isError && upcomingFlights.length > 0 && (
        <div className='grid gap-4'>
          {upcomingFlights.map((flight, index) => (
            <Card key={`${flight.flightNumber}-${index}`} className='w-full'>
              <CardHeader className='pb-3'>
                <div className='flex items-start justify-between'>
                  <div className='flex items-center gap-3'>
                    {getAirlineLogo(flight.airline) && (
                      <img
                        src={getAirlineLogo(flight.airline)}
                        alt={getAirlineName(flight.airline)}
                        className='h-8 w-8 rounded'
                        onError={e => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      <CardTitle className='text-lg'>
                        {flight.flightNumber}
                      </CardTitle>
                      <CardDescription>
                        {getAirlineName(flight.airline)}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(flight.status)}>
                    {flight.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
                  <div className='flex items-center gap-2'>
                    <Clock className='h-4 w-4 text-muted-foreground flex-shrink-0' />
                    <div className='text-sm'>
                      <div className='font-medium'>
                        Departure: {flight.scheduledDeparture}
                      </div>
                      {flight.estimatedDeparture &&
                        flight.estimatedDeparture !==
                          flight.scheduledDeparture && (
                          <div className='text-muted-foreground'>
                            Estimated: {flight.estimatedDeparture}
                          </div>
                        )}
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <MapPin className='h-4 w-4 text-muted-foreground flex-shrink-0' />
                    <div className='text-sm'>
                      <div className='font-medium'>
                        To: {flight.destination}
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <Plane className='h-4 w-4 text-muted-foreground flex-shrink-0' />
                    <div className='text-sm'>
                      {flight.gate && (
                        <div className='font-medium'>Gate: {flight.gate}</div>
                      )}
                      {flight.aircraft && (
                        <div className='text-muted-foreground text-xs'>
                          Aircraft: {flight.aircraft}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/flights')({
  component: UpcomingFlights,
});
