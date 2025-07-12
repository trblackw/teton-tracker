import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  MapPin,
  Plane,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
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
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import airlinesData from '../data/airlines.json';
import airportsData from '../data/airports-comprehensive.json';
import { preferencesApi } from '../lib/api/client';
import { useTimezoneFormatters } from '../lib/hooks/use-timezone';
import { getFlightServiceWithConfig } from '../lib/services/flight-service';

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
  const [flightLimit, setFlightLimit] = useState<number>(5);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchMode, setSearchMode] = useState<'selected' | 'all'>('selected');
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const { formatDateTime } = useTimezoneFormatters();

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
    queryKey: [
      'upcoming-flights',
      homeAirport,
      selectedAirline,
      flightLimit,
      searchMode === 'all' ? searchTerm : '',
    ],
    queryFn: async () => {
      if (!homeAirport) return [];

      const flightService = await getFlightServiceWithConfig();
      return flightService.getUpcomingDepartures({
        airport: homeAirport,
        airline: selectedAirline || undefined,
        flightNumber:
          searchMode === 'all' ? searchTerm || undefined : undefined,
        limit: flightLimit,
      });
    },
    enabled: !!homeAirport,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });

  // Filter flights client-side when in "selected" mode
  const filteredFlights =
    searchMode === 'selected' && searchTerm
      ? upcomingFlights.filter(
          flight =>
            flight.flightNumber
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            flight.airline.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : upcomingFlights;

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

  const getAirportName = (airportCode: string) => {
    if (!airportCode || airportCode === 'Unknown') return 'Unknown';

    // Remove 'K' prefix if present (US airports)
    const cleanCode = airportCode.startsWith('K')
      ? airportCode.substring(1)
      : airportCode;

    // Find airport in data - check both with and without 'K' prefix
    const airport = Object.values(airportsData).find(
      (airport: any) =>
        airport.iata === cleanCode ||
        airport.icao === airportCode ||
        airport.icao === cleanCode
    );

    if (airport) {
      return `${airport.city}, ${airport.state} (${airport.iata || cleanCode})`;
    }

    return airportCode;
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
          <div className='mt-1 min-h-[3.5rem]'>
            {' '}
            <p className='text-muted-foreground'>
              Next{' '}
              <Select
                value={flightLimit.toString()}
                onValueChange={value => setFlightLimit(parseInt(value))}
              >
                <SelectTrigger className='inline-flex h-auto w-auto border-0 bg-transparent p-0 font-bold text-foreground underline hover:text-blue-500'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='5'>5</SelectItem>
                  <SelectItem value='10'>10</SelectItem>
                  <SelectItem value='20'>20</SelectItem>
                </SelectContent>
              </Select>{' '}
              departures from{' '}
              <Button
                variant='link'
                className='font-bold text-foreground px-0 underline hover:text-blue-500'
              >
                <a href='/settings'>{homeAirport}</a>
              </Button>
            </p>
            {selectedAirline && (
              <span className='text-foreground/90 block text-sm'>
                {getAirlineName(selectedAirline)}
              </span>
            )}
            {searchTerm && (
              <span className='text-foreground/90 block text-sm'>
                Searching{' '}
                {searchMode === 'selected' ? 'selected flights' : 'all flights'}{' '}
                for: {searchTerm}
              </span>
            )}
          </div>
        </div>
        <Button
          variant='outline'
          size='sm'
          className='mt-2'
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Collapsible Flight Search */}
      <Card className='pb-2 pt-3'>
        <CardHeader
          className='cursor-pointer hover:bg-muted/50 transition-colors'
          onClick={() => setIsSearchExpanded(!isSearchExpanded)}
        >
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2 mb-1'>
                <Search className='h-5 w-5 text-muted-foreground' />
                Search Flights
                {searchTerm && (
                  <span className='text-sm font-normal text-muted-foreground'>
                    ({searchTerm})
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Search selected flights or query all flights from the airport
              </CardDescription>
            </div>
            {isSearchExpanded ? (
              <ChevronUp className='h-5 w-5 text-muted-foreground' />
            ) : (
              <ChevronDown className='h-5 w-5 text-muted-foreground' />
            )}
          </div>
        </CardHeader>
        {isSearchExpanded && (
          <div className='animate-in slide-in-from-top-2 duration-300'>
            <CardContent className='pt-0'>
              <div className='flex gap-2'>
                <div className='flex-1'>
                  <Input
                    placeholder='Enter flight number or airline...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className='w-full'
                  />
                </div>
                <Select
                  value={searchMode}
                  onValueChange={(value: 'selected' | 'all') =>
                    setSearchMode(value)
                  }
                >
                  <SelectTrigger className='w-30'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='selected'>Selected</SelectItem>
                    <SelectItem value='all'>All</SelectItem>
                  </SelectContent>
                </Select>
                {searchTerm && (
                  <Button
                    variant='outline'
                    size='icon'
                    onClick={() => setSearchTerm('')}
                    title='Clear search'
                  >
                    <X className='h-4 w-4 text-destructive hover:text-destructive/80' />
                  </Button>
                )}
              </div>
            </CardContent>
          </div>
        )}
      </Card>

      {/* Collapsible Airline Filter */}
      <Card className='pb-2 pt-3'>
        <CardHeader
          className='cursor-pointer hover:bg-muted/50 transition-colors'
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
        >
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2 mb-1'>
                <Filter className='h-5 w-5 text-muted-foreground' />
                Filter by Airline
                {selectedAirline && (
                  <span className='text-sm font-normal text-muted-foreground'>
                    ({getAirlineName(selectedAirline)})
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Filter flights by a specific airline or show all departures
              </CardDescription>
            </div>
            {isFilterExpanded ? (
              <ChevronUp className='h-5 w-5 text-muted-foreground' />
            ) : (
              <ChevronDown className='h-5 w-5 text-muted-foreground' />
            )}
          </div>
        </CardHeader>
        {isFilterExpanded && (
          <div className='animate-in slide-in-from-top-2 duration-300'>
            <CardContent className='pt-0'>
              <div className='flex gap-2'>
                <div className='flex-1'>
                  <AirlineCombobox
                    airlines={airlines}
                    value={selectedAirline}
                    onValueChange={setSelectedAirline}
                    placeholder='All airlines'
                    emptyMessage='No airlines found'
                    maxResults={100}
                  />
                </div>
                {selectedAirline && (
                  <Button
                    variant='outline'
                    size='icon'
                    onClick={() => setSelectedAirline('')}
                    title='Clear airline filter'
                  >
                    <X className='h-4 w-4 text-destructive hover:text-destructive/80' />
                  </Button>
                )}
              </div>
            </CardContent>
          </div>
        )}
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

      {/* Flights Grid */}
      {!isLoading && !isError && filteredFlights.length > 0 && (
        <div className='grid gap-4'>
          {filteredFlights.map((flight, index) => (
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
                        loading='lazy'
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
                        Departure: {formatDateTime(flight.scheduledDeparture)}
                      </div>
                      {flight.estimatedDeparture &&
                        flight.estimatedDeparture !==
                          flight.scheduledDeparture && (
                          <div className='text-muted-foreground'>
                            Estimated:{' '}
                            {formatDateTime(flight.estimatedDeparture)}
                          </div>
                        )}
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <MapPin className='h-4 w-4 text-muted-foreground flex-shrink-0' />
                    <div className='text-sm'>
                      <div className='font-medium'>
                        To: {getAirportName(flight.destination)}
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

      {/* No flights found state */}
      {!isLoading &&
        !isError &&
        filteredFlights.length === 0 &&
        upcomingFlights.length > 0 &&
        searchTerm && (
          <Card>
            <CardContent className='p-8 text-center'>
              <Search className='h-16 w-16 text-muted-foreground mx-auto mb-6' />
              <p className='text-muted-foreground text-lg mb-4'>
                No flights found matching "{searchTerm}"
              </p>
              <p className='text-sm text-muted-foreground mb-4'>
                Try searching{' '}
                {searchMode === 'selected' ? 'all flights' : 'selected flights'}{' '}
                or adjusting your search term
              </p>
              <Button
                variant='outline'
                onClick={() =>
                  setSearchMode(searchMode === 'selected' ? 'all' : 'selected')
                }
              >
                Search{' '}
                {searchMode === 'selected' ? 'all flights' : 'selected flights'}
              </Button>
            </CardContent>
          </Card>
        )}

      {/* Original no flights state */}
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
    </div>
  );
}

export const Route = createFileRoute('/flights')({
  component: UpcomingFlights,
});
