import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  AlertTriangle,
  Clock,
  Filter,
  MapPin,
  Plane,
  RefreshCw,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { ExpandableActionsDrawer } from '../components/ui/expandable-actions-drawer';
import { Input } from '../components/ui/input';
import { RefreshButton } from '../components/ui/refresh-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { TimePicker } from '../components/ui/time-picker';
import airlinesData from '../data/airlines.json';
import airportsData from '../data/airports-comprehensive.json';
import { preferencesApi } from '../lib/api/client';
import { isDebugMode } from '../lib/debug';
import { useTimezone, useTimezoneFormatters } from '../lib/hooks/use-timezone';
import { getFlightServiceWithConfig } from '../lib/services/flight-service';
import { isDevelopmentMode } from '../lib/utils';

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
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [flightLimit, setFlightLimit] = useState<number>(5);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchMode, setSearchMode] = useState<'selected' | 'all'>('selected');

  // Time frame filtering state - now using time instead of dates
  const [filterTime, setFilterTime] = useState<string>('');
  const [isAfterTime, setIsAfterTime] = useState<boolean>(true); // true = at/after, false = before

  // Dismissible temporal alert state
  const [dismissedTemporalAlerts, setDismissedTemporalAlerts] = useState<
    Set<string>
  >(new Set());

  // Clipboard detection state
  const [clipboardSuggestion, setClipboardSuggestion] = useState<{
    flights: string[];
    airports: string[];
    confirmations: string[];
    rawText: string;
  } | null>(null);

  // Last update timestamp state
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Debug mode state
  const [isDebugModeEnabled, setIsDebugModeEnabled] = useState<boolean>(false);

  const { formatDateTime } = useTimezoneFormatters();
  const userTimezone = useTimezone();

  // Initialize debug mode state
  useEffect(() => {
    setIsDebugModeEnabled(isDebugMode());
  }, []);

  // Helper function to format time filter for display
  const formatTimeFilter = () => {
    if (!filterTime) return '';

    // Convert 24-hour to 12-hour format for display
    const [hours, minutes] = filterTime.split(':');
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
    const displayTime = `${hour12}:${minutes} ${ampm}`;

    return `${isAfterTime ? 'At/after' : 'Before'} ${displayTime}`;
  };

  // Clear time frame filter
  const clearTimeFrame = () => {
    setFilterTime('');
    setIsAfterTime(true);
  };

  // Generate temporal alert key based on stale data
  const generateTemporalAlertKey = (temporalStatus: any) => {
    if (!temporalStatus?.hasStaleData) return '';

    const keyComponents = [
      'temporal-alert',
      temporalStatus.staleDates.sort().join('-'),
      temporalStatus.staleFlights.toString(),
      new Date().toDateString(), // Include current date to make alerts date-specific
    ];

    return keyComponents.join('_');
  };

  // Clean up old temporal alert dismissals from sessionStorage
  const cleanupOldTemporalAlerts = () => {
    const currentDate = new Date().toDateString();
    const keysToRemove: string[] = [];

    // Check all sessionStorage keys for old temporal alerts
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('temporal-alert_')) {
        // Extract date from key (last component after final underscore)
        const keyParts = key.split('_');
        const keyDate = keyParts[keyParts.length - 1];

        // If the key is from a different date, mark for removal
        if (keyDate !== currentDate) {
          keysToRemove.push(key);
        }
      }
    }

    // Remove old keys
    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`🧹 Cleaned up old temporal alert: ${key}`);
    });
  };

  // Check if temporal alert should be shown
  const shouldShowTemporalAlert = (temporalStatus: any) => {
    if (!temporalStatus?.hasStaleData) return false;

    const alertKey = generateTemporalAlertKey(temporalStatus);
    if (!alertKey) return false;

    // Clean up old alerts on each check
    cleanupOldTemporalAlerts();

    // Check if this specific alert has been dismissed
    const isDismissed = sessionStorage.getItem(alertKey) === 'dismissed';
    return !isDismissed;
  };

  // Dismiss temporal alert
  const dismissTemporalAlert = (temporalStatus: any) => {
    const alertKey = generateTemporalAlertKey(temporalStatus);
    if (alertKey) {
      const newDismissed = new Set(dismissedTemporalAlerts);
      newDismissed.add(alertKey);
      setDismissedTemporalAlerts(newDismissed);

      // Store in sessionStorage
      sessionStorage.setItem(
        'dismissedTemporalAlerts',
        JSON.stringify(Array.from(newDismissed))
      );
    }
  };

  // Clipboard detection utilities
  const isClipboardSupported = () => {
    return 'clipboard' in navigator && 'readText' in navigator.clipboard;
  };

  const detectFlightFormats = (text: string) => {
    const patterns = {
      // Flight numbers: AA123, DL 4567, United 1234, etc.
      flights:
        /\b(?:[A-Z]{2,3}[\s\-]?\d{1,4}|(?:American|Delta|United|Southwest|Alaska|JetBlue|Spirit|Frontier)[\s\-]\d{1,4})\b/gi,

      // Airport codes: LAX, JFK, DEN
      airports: /\b[A-Z]{3}\b/g,

      // Confirmation codes: 6-character alphanumeric
      confirmations: /\b[A-Z0-9]{6}\b/g,
    };

    const results = {
      flights: (text.match(patterns.flights) || []) as string[],
      airports: (text.match(patterns.airports) || []) as string[],
      confirmations: (text.match(patterns.confirmations) || []) as string[],
    };

    // Filter out common false positives for airports
    const commonWords = [
      'THE',
      'AND',
      'FOR',
      'YOU',
      'ARE',
      'CAN',
      'GET',
      'ALL',
      'NEW',
      'NOW',
      'ANY',
      'WAY',
      'DAY',
      'USE',
      'HER',
      'HOW',
      'ITS',
      'OUR',
      'OUT',
      'WHO',
      'BOY',
      'DID',
      'HAS',
      'LET',
      'OLD',
      'SEE',
      'TWO',
      'WAR',
      'FAR',
      'OFF',
      'BAD',
      'AGO',
      'YES',
    ];
    results.airports = results.airports.filter(
      code => !commonWords.includes(code.toUpperCase())
    );

    return results;
  };

  const checkClipboardForFlightData = async () => {
    if (!isClipboardSupported()) {
      console.warn('Clipboard API not supported');
      return;
    }

    try {
      const text = await navigator.clipboard.readText();

      if (!text || text.trim().length === 0) {
        console.log('Clipboard is empty');
        return;
      }

      const detected = detectFlightFormats(text);

      if (detected.flights.length > 0 || detected.confirmations.length > 0) {
        setClipboardSuggestion({
          flights: detected.flights,
          airports: detected.airports,
          confirmations: detected.confirmations,
          rawText: text,
        });

        console.log('Found flight data in clipboard:', detected);
      } else {
        console.log('No flight data detected in clipboard');
        setClipboardSuggestion(null);
      }
    } catch (error) {
      console.warn('Clipboard access denied:', error);
    }
  };

  const addFlightFromClipboard = (flightNumber: string) => {
    setSearchTerm(flightNumber);
    setSearchMode('all');

    // Auto-set airline if we can detect it from the flight number
    const airlineCode = flightNumber.match(/^([A-Z]{2,3})/)?.[1];
    if (airlineCode) {
      const airline = airlines.find(
        a =>
          a.lcc.toUpperCase() === airlineCode.toUpperCase() ||
          a.id.toUpperCase() === airlineCode.toUpperCase()
      );
      if (airline) {
        setSelectedAirline(airline.lcc);
        console.log(`Auto-selected airline: ${airline.name} (${airline.lcc})`);
      }
    }

    setClipboardSuggestion(null);
    console.log(`Added ${flightNumber} to search from clipboard`);
  };

  // Auto-check clipboard when user returns to app
  useEffect(() => {
    const handleWindowFocus = () => {
      // Only auto-check if we don't already have a suggestion showing
      if (!clipboardSuggestion && isClipboardSupported()) {
        // Small delay to ensure window is fully focused
        setTimeout(checkClipboardForFlightData, 100);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [clipboardSuggestion]); // Re-run effect when clipboardSuggestion changes

  // Query for user preferences to get home airport
  const { data: preferences, isLoading: isLoadingPreferences } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => preferencesApi.getPreferences(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const homeAirport = preferences?.homeAirport || '';

  const {
    isLoading,
    error,
    data: flightResponse,
    refetch,
    isError,
  } = useQuery({
    queryKey: [
      'upcoming-flights',
      homeAirport,
      selectedAirline,
      flightLimit,
      searchMode === 'all' ? searchTerm : '',
      filterTime,
      isAfterTime,
    ],
    queryFn: async () => {
      if (!homeAirport)
        return {
          flights: [],
          temporalStatus: {
            hasStaleData: false,
            totalFlights: 0,
            staleFlights: 0,
            staleDates: [],
            currentLocalTime: new Date().toLocaleString(),
          },
        };

      const flightService = await getFlightServiceWithConfig();
      return flightService.getUpcomingDepartures({
        airport: homeAirport,
        airline: selectedAirline || undefined,
        flightNumber:
          searchMode === 'all' ? searchTerm || undefined : undefined,
        limit: flightLimit,
        // Only include timeFrame in API call when searchMode is 'all'
        // When searchMode is 'selected', time filtering is done client-side
        // This optimizes API usage by only hitting the server when fetching all flights
        timeFrame:
          searchMode === 'all' && filterTime
            ? {
                time: filterTime,
                timezone: userTimezone,
                isAfter: isAfterTime,
              }
            : undefined,
      });
    },
    enabled: false, // Disable automatic fetching
    staleTime: Infinity, // Keep data fresh until manually updated
  });

  // Manual update function with debug mode integration
  const handleManualUpdate = async () => {
    if (!homeAirport) return;

    // In debug mode, simulate update behavior
    if (isDebugModeEnabled) {
      console.log('🐛 Debug mode: Simulating flight data refresh...');

      // Simulate loading delay
      await new Promise(resolve =>
        setTimeout(resolve, 1000 + Math.random() * 2000)
      );

      // Update debug counter and timestamp
      setLastUpdateTime(new Date());

      // Force a refetch to trigger the mock data
      await refetch();

      console.log('🐛 Debug mode: Simulated refresh complete');
      return;
    }

    try {
      await refetch();
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Failed to update flight data:', error);
    }
  };

  // Extract flights and temporal status from response
  const upcomingFlights = flightResponse?.flights || [];
  const temporalStatus = flightResponse?.temporalStatus;

  // Filter flights client-side when in "selected" mode
  let filteredFlights = upcomingFlights;

  // Apply search filter
  if (searchMode === 'selected' && searchTerm) {
    filteredFlights = filteredFlights.filter(
      flight =>
        flight.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flight.airline.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Apply status filter
  if (selectedStatus) {
    filteredFlights = filteredFlights.filter(
      flight => flight.status.toLowerCase() === selectedStatus.toLowerCase()
    );
  }

  // Apply time filter client-side when in "selected" mode
  if (searchMode === 'selected' && filterTime) {
    if (isDevelopmentMode()) {
      console.log(`🔍 Applying time filter client-side: ${formatTimeFilter()}`);
    }

    filteredFlights = filteredFlights.filter(flight => {
      try {
        // Parse the flight's scheduled departure time
        const flightTime = new Date(flight.scheduledDeparture);

        // Create a date object for today with the filter time in the user's timezone
        const today = new Date();
        const [hours, minutes] = filterTime.split(':');
        const filterDateTime = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          parseInt(hours),
          parseInt(minutes),
          0
        );

        // Convert flight time to user's timezone for comparison
        const flightTimeInUserTz = new Date(
          flightTime.toLocaleString('en-US', { timeZone: userTimezone })
        );
        const filterTimeInUserTz = new Date(
          filterDateTime.toLocaleString('en-US', { timeZone: userTimezone })
        );

        // Extract just the time portion for comparison (ignore date)
        const flightTimeOfDay =
          flightTimeInUserTz.getHours() * 60 + flightTimeInUserTz.getMinutes();
        const filterTimeOfDay =
          filterTimeInUserTz.getHours() * 60 + filterTimeInUserTz.getMinutes();

        if (isAfterTime) {
          // Filter for flights at or after the specified time
          return flightTimeOfDay >= filterTimeOfDay;
        } else {
          // Filter for flights before the specified time
          return flightTimeOfDay < filterTimeOfDay;
        }
      } catch (error) {
        console.warn('Error filtering flight by time:', error);
        return true; // Include flight if there's an error parsing time
      }
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `📊 Client-side time filtering result: ${filteredFlights.length} flights match`
      );
    }
  }

  // Get available statuses from current flights
  const availableStatuses = Array.from(
    new Set(upcomingFlights.map(flight => flight.status))
  ).sort();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'on time':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
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

  const noFlightData =
    !homeAirport || (!isLoading && !isError && !flightResponse);

  // Search content for drawer
  const SearchContent = () => (
    <div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Flight number"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 border-none"
            autoFocus
          />
        </div>
        <Select
          value={searchMode}
          onValueChange={(value: 'selected' | 'all') => setSearchMode(value)}
        >
          <SelectTrigger className="w-30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="selected">Selected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clipboard suggestions */}
      {clipboardSuggestion && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-2">
            📋 Found flight data in clipboard:
          </p>
          <div className="flex flex-wrap gap-2">
            {clipboardSuggestion.flights.map((flight, index) => (
              <Button
                key={`flight-${index}`}
                variant="outline"
                size="sm"
                onClick={() => addFlightFromClipboard(flight)}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                ✈️ {flight}
              </Button>
            ))}
            {clipboardSuggestion.confirmations.map((conf, index) => (
              <Button
                key={`conf-${index}`}
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm(conf)}
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                🎫 {conf}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setClipboardSuggestion(null)}
            className="mt-2 text-xs text-muted-foreground"
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );

  // Filter content for drawer
  const FilterContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Airline</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <AirlineCombobox
                airlines={airlines}
                value={selectedAirline}
                onValueChange={setSelectedAirline}
                placeholder="All airlines"
                emptyMessage="No airlines found"
                maxResults={100}
              />
            </div>
            {selectedAirline && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedAirline('')}
                title="Clear airline filter"
              >
                <X className="h-4 w-4 text-destructive hover:text-destructive/80" />
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Status</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getStatusColor(status)}`}>
                          {status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedStatus && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedStatus('')}
                title="Clear status filter"
              >
                <X className="h-4 w-4 text-destructive hover:text-destructive/80" />
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Time Frame
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Filter flights by departure time in your timezone
            <Button
              asChild
              className="ml-2 underline pb-1 bg-transparent border-none text-primary px-0 text-xs"
            >
              <a href="/settings">{userTimezone}</a>
            </Button>
          </p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <TimePicker
                  value={filterTime}
                  onChange={setFilterTime}
                  placeholder="Select time"
                  isAfterTime={isAfterTime}
                  onIsAfterTimeChange={setIsAfterTime}
                />
              </div>
            </div>
            {filterTime && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearTimeFrame}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Time Frame
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoadingPreferences) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Upcoming Flights
          </h2>
          <p className="text-muted-foreground mt-1">
            View upcoming departures from your home base airport
          </p>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading preferences...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!homeAirport) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Upcoming Flights
          </h2>
          <p className="text-muted-foreground mt-1">
            View upcoming departures from your home base airport
          </p>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <Plane className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <p className="text-muted-foreground text-lg mb-4">
              No home airport configured. Please set your home base airport in
              settings first.
            </p>
            <Button
              asChild
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <a href="/settings" className="flex items-center gap-2">
                <Settings className="size-5" />
                <span>Settings</span>
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Upcoming Flights
          </h2>
          <div className="mt-1 min-h-[2.5rem]">
            <p className="text-muted-foreground text-sm">
              Next{' '}
              <Select
                value={flightLimit.toString()}
                onValueChange={value => setFlightLimit(parseInt(value))}
              >
                <SelectTrigger className="inline-flex min-w-fit w-1 border-0 bg-transparent p-0 pr-1 pl-2 font-bold text-foreground underline hover:text-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>{' '}
              departures from
              <Button
                variant="link"
                className="font-bold text-foreground px-0 underline hover:text-blue-500"
              >
                <a href="/settings">{homeAirport}</a>
              </Button>
            </p>
            {selectedAirline && (
              <span className="text-foreground/90 block text-sm">
                {getAirlineName(selectedAirline)}
              </span>
            )}
            {selectedStatus && (
              <span className="text-foreground/90 block text-sm">
                Status: {selectedStatus}
              </span>
            )}
            {searchTerm && (
              <span className="text-foreground/90 block text-sm">
                Searching{' '}
                {searchMode === 'selected' ? 'selected flights' : 'all flights'}{' '}
                for: {searchTerm}
              </span>
            )}
            {formatTimeFilter() && (
              <span className="text-foreground/90 block text-sm">
                Time frame: {formatTimeFilter()}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RefreshButton
            onRefresh={handleManualUpdate}
            disabled={!homeAirport}
            className="flex items-center gap-2"
            variant={isDebugModeEnabled ? 'secondary' : 'default'}
          />
        </div>
      </div>
      {lastUpdateTime && (
        <div className="text-xs text-muted-foreground text-center">
          Last updated: {formatDateTime(lastUpdateTime.toISOString())}
        </div>
      )}
      {/* Temporal Status Alert */}
      {temporalStatus?.hasStaleData &&
        shouldShowTemporalAlert(temporalStatus) && (
          <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20 relative">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-orange-800 dark:text-orange-200">
                    Note:
                  </div>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    {temporalStatus.message}
                  </p>
                  {temporalStatus.staleFlights > 0 && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                      Filtered out {temporalStatus.staleFlights} outdated
                      flights from {temporalStatus.staleDates.join(', ')}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 h-8 w-8 p-0 hover:bg-orange-200 dark:hover:bg-orange-900/50"
                  onClick={() => dismissTemporalAlert(temporalStatus)}
                  title="Dismiss this alert"
                >
                  <X className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Search & Filter Actions */}
      <ExpandableActionsDrawer
        actions={[
          {
            id: 'search',
            icon: <Search className="h-4 w-4" />,
            label: 'Search Flights',
            content: <SearchContent />,
            badge: searchTerm ? '1' : undefined,
            showHeader: false, // Minimal search with no header
          },
          {
            id: 'filter',
            icon: <Filter className="h-4 w-4" />,
            label: 'Filter & Sort',
            content: <FilterContent />,
            badge:
              [selectedAirline, selectedStatus, filterTime].filter(Boolean)
                .length || undefined,
            showHeader: false, // Minimal filter with no header
          },
        ]}
        disabled={noFlightData}
      />

      {/* No data loaded yet state */}
      {noFlightData && (
        <Card>
          <CardContent className="p-6 text-center">
            <Plane className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <p className="text-muted-foreground text-lg mb-4">
              No flight data loaded yet
            </p>
            <p className="text-sm text-muted-foreground/70 mb-6">
              Refresh to get latest flight information
            </p>
            {homeAirport && (
              <RefreshButton onRefresh={handleManualUpdate} className="mr-2" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>
                {isDebugModeEnabled
                  ? 'Simulating flight data refresh...'
                  : 'Loading upcoming flights...'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Card className="border-destructive">
          <CardContent className="p-8 text-center">
            <p className="text-destructive mb-4">
              Failed to load upcoming flights. Please try again.
            </p>
            <Button onClick={handleManualUpdate}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Flights Grid */}
      {!isLoading && !isError && filteredFlights.length > 0 && (
        <div className="grid gap-4">
          {filteredFlights.map((flight, index) => (
            <Card key={`${flight.flightNumber}-${index}`} className="w-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getAirlineLogo(flight.airline) && (
                      <img
                        src={getAirlineLogo(flight.airline)}
                        alt={getAirlineName(flight.airline)}
                        className="h-8 w-8 rounded"
                        onError={e => {
                          e.currentTarget.style.display = 'none';
                        }}
                        loading="lazy"
                      />
                    )}
                    <div>
                      <CardTitle className="text-lg">
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="text-sm">
                      <div className="font-medium">
                        Departure: {formatDateTime(flight.scheduledDeparture)}
                      </div>
                      {flight.estimatedDeparture &&
                        flight.estimatedDeparture !==
                          flight.scheduledDeparture && (
                          <div className="text-muted-foreground">
                            Estimated:{' '}
                            {formatDateTime(flight.estimatedDeparture)}
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="text-sm">
                      <div className="font-medium">
                        To: {getAirportName(flight.destination)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="text-sm">
                      <div className="font-medium">
                        Gate: {flight.gate || 'Indeterminate'}
                      </div>
                      {flight.aircraft && (
                        <div className="text-muted-foreground text-xs">
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
        flightResponse &&
        filteredFlights.length === 0 &&
        upcomingFlights.length > 0 &&
        (searchTerm || selectedStatus) && (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <p className="text-muted-foreground text-lg mb-4">
                No flights found matching your filters
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm && `Search: "${searchTerm}"`}
                {searchTerm && (selectedStatus || formatTimeFilter()) && ', '}
                {selectedStatus && `Status: ${selectedStatus}`}
                {selectedStatus && formatTimeFilter() && ', '}
                {formatTimeFilter() && `Time frame: ${formatTimeFilter()}`}
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                {searchTerm && (
                  <Button variant="outline" onClick={() => setSearchTerm('')}>
                    Clear search
                  </Button>
                )}
                {selectedStatus && (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedStatus('')}
                  >
                    Clear status filter
                  </Button>
                )}
                {filterTime && (
                  <Button variant="outline" onClick={clearTimeFrame}>
                    Clear time frame
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Original no flights state */}
      {!isLoading &&
        !isError &&
        flightResponse &&
        upcomingFlights.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Plane className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <p className="text-muted-foreground text-lg mb-4">
                No upcoming flights found
                {selectedAirline && ` for ${getAirlineName(selectedAirline)}`}
                {formatTimeFilter() && ` in ${formatTimeFilter()}`}
              </p>
              <p className="text-sm text-muted-foreground">
                Try refreshing or adjusting your filters
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
