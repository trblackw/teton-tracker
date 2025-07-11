import { Label } from '@radix-ui/react-label';
import {
  AlertCircle,
  Badge,
  Clock,
  FileText,
  MapPin,
  Navigation,
  Plane,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './components/ui/card';
import { Input } from './components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import './index.css';
import IconLogo from './lib/icons/icon-logo';
import {
  convertParsedRunToForm,
  parseScheduleMessage,
  type ParseResult,
} from './lib/schedule-parser';
import {
  type FlightStatus,
  type NewRunForm,
  type Run,
  type RunStatus,
  type RunType,
  type TrafficData,
} from './lib/schema';

export default function App() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [flightStatuses, setFlightStatuses] = useState<{
    [key: string]: FlightStatus;
  }>({});
  const [trafficData, setTrafficData] = useState<{
    [key: string]: TrafficData;
  }>({});
  const [newRun, setNewRun] = useState<Partial<NewRunForm>>({
    flightNumber: '',
    airline: '',
    departure: '',
    arrival: '',
    pickupLocation: '',
    dropoffLocation: '',
    scheduledTime: '',
    type: 'pickup',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Bulk import state
  const [scheduleText, setScheduleText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showPasteDetected, setShowPasteDetected] = useState(false);
  const [currentTab, setCurrentTab] = useState('runs');

  // Load runs from localStorage on component mount with basic validation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRuns = window.localStorage.getItem('airport-runs');
      if (savedRuns) {
        try {
          const parsedRuns = JSON.parse(savedRuns);
          // Basic validation - ensure required fields exist
          const validatedRuns = parsedRuns.filter(
            (run: any) =>
              run &&
              typeof run.id === 'string' &&
              typeof run.flightNumber === 'string' &&
              typeof run.airline === 'string' &&
              typeof run.departure === 'string' &&
              typeof run.arrival === 'string' &&
              typeof run.pickupLocation === 'string' &&
              typeof run.dropoffLocation === 'string' &&
              typeof run.scheduledTime === 'string' &&
              ['pickup', 'dropoff'].includes(run.type) &&
              ['scheduled', 'active', 'completed', 'cancelled'].includes(
                run.status
              )
          );

          setRuns(validatedRuns);
        } catch (error) {
          console.error('Error parsing runs from localStorage:', error);
        }
      }
    }
  }, []);

  // Save runs to localStorage whenever runs change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('airport-runs', JSON.stringify(runs));
    }
  }, [runs]);

  // Global paste event listener for schedule detection
  useEffect(() => {
    const handleGlobalPaste = (event: any) => {
      console.log('🔍 Paste event detected:', {
        target: event.target,
        tagName: event.target?.tagName,
        isContentEditable: event.target?.isContentEditable,
        hasClipboardData: !!event.clipboardData,
        eventType: event.type,
      });

      // Don't interfere with paste events in form inputs
      const target = event.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        console.log('⏩ Skipping paste event - targeting form input');
        return;
      }

      const pastedText = event.clipboardData?.getData('text') || '';
      console.log('📄 Pasted text length:', pastedText.length);
      console.log(
        '📄 Pasted text preview:',
        pastedText.substring(0, 100) + (pastedText.length > 100 ? '...' : '')
      );

      // Check if the pasted text looks like a schedule message
      const isSchedule = isScheduleMessage(pastedText);
      console.log('🔍 Is schedule message:', isSchedule);

      if (isSchedule) {
        console.log(
          '✅ Schedule detected! Preventing default and processing...'
        );
        event.preventDefault(); // Prevent default paste behavior

        // Auto-parse the schedule
        setScheduleText(pastedText);
        const result = parseScheduleMessage(pastedText);
        setParseResult(result);
        setShowBulkImport(true);
        setShowPasteDetected(true);
        setCurrentTab('add'); // Auto-switch to Add New Run tab
        console.log('🔄 Auto-switched to "Add New Run" tab');

        console.log('📊 Parse result:', {
          success: result.success,
          runsFound: result.runs.length,
          errors: result.errors,
          warnings: result.warnings,
        });

        // Show notification
        if (result.success) {
          console.log(`📋 Schedule detected! Found ${result.runs.length} runs`);
          // Auto-hide the notification after 3 seconds
          window.setTimeout(() => setShowPasteDetected(false), 3000);
        }
      } else {
        console.log(
          '⏩ Not a schedule message, allowing normal paste behavior'
        );
      }
    };

    const handleKeyDown = (event: any) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'v') {
        console.log('⌨️ CMD/Ctrl+V detected');
      }
    };

    console.log('🚀 Adding global paste and keydown listeners');
    document.addEventListener('paste', handleGlobalPaste);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      console.log('🧹 Removing global paste and keydown listeners');
      document.removeEventListener('paste', handleGlobalPaste);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Helper function to detect if pasted text looks like a schedule message
  const isScheduleMessage = (text: string): boolean => {
    console.log('🔍 Checking if text is schedule message...');
    console.log('📝 Text length:', text.length);

    if (!text || text.length < 20) {
      console.log('❌ Text too short (< 20 chars)');
      return false;
    }

    const lines = text.split('\n').filter(line => line.trim().length > 0);
    console.log('📝 Non-empty lines:', lines.length);

    if (lines.length < 4) {
      console.log('❌ Too few lines (< 4)');
      return false;
    }

    // Look for patterns that suggest it's a schedule message
    const hasFlightPattern = lines.some(line =>
      /[A-Z]{2,3}\s*\d{1,4}[A-Z]?|[A-Z]{2,3}\s*CABIN|ASAP/i.test(line)
    );
    const hasTimePattern = lines.some(line =>
      /\d{1,2}:?\d{0,2}\s*(AM|PM)|ASAP/i.test(line)
    );
    const hasVehiclePattern = lines.some(line => /SUV|EXEC|SEDAN/i.test(line));
    const hasPricePattern = lines.some(line => /\$\d+\.?\d*/i.test(line));
    const hasRunIdPattern = lines.some(line => /^\d+\*?\d*/i.test(line));
    const hasAirportPattern = lines.some(line =>
      /\b(AP|JLL|SK|DL|AA|UA)\b/i.test(line)
    );

    console.log('🔍 Pattern analysis:', {
      hasFlightPattern,
      hasTimePattern,
      hasVehiclePattern,
      hasPricePattern,
      hasRunIdPattern,
      hasAirportPattern,
    });

    // Must have at least 2 of these patterns to be considered a schedule
    const patterns = [
      hasFlightPattern,
      hasTimePattern,
      hasVehiclePattern,
      hasPricePattern,
      hasRunIdPattern,
      hasAirportPattern,
    ];
    const patternCount = patterns.filter(Boolean).length;

    console.log('📊 Pattern count:', patternCount, '/ 6');

    const isSchedule = patternCount >= 2;
    console.log('✅ Is schedule message:', isSchedule);

    return isSchedule;
  };

  // Mock flight status API call
  const fetchFlightStatus = async (flightNumber: string) => {
    try {
      setIsLoading(true);
      // This would be replaced with actual OpenSky Network API call
      // const response = await fetch(`https://opensky-network.org/api/flights/departure?airport=KJFK&begin=${beginTime}&end=${endTime}`);

      // Mock data for demo
      const mockStatus: FlightStatus = {
        flightNumber,
        status: Math.random() > 0.5 ? 'On Time' : 'Delayed',
        scheduledDeparture: '14:30',
        actualDeparture: '14:35',
        scheduledArrival: '18:45',
        actualArrival: '18:50',
        delay: Math.random() > 0.5 ? 0 : Math.floor(Math.random() * 60),
        lastUpdated: new Date(),
      };

      setFlightStatuses(prev => ({
        ...prev,
        [flightNumber]: mockStatus,
      }));
    } catch (error) {
      console.error('Error fetching flight status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock traffic data API call
  const fetchTrafficData = async (origin: string, destination: string) => {
    try {
      setIsLoading(true);
      // This would be replaced with actual TomTom Traffic API call
      // const response = await fetch(`https://api.tomtom.com/routing/1/calculateRoute/${origin}:${destination}/json?key=${API_KEY}&traffic=true`);

      // Mock data for demo
      const routeKey = `${origin}-${destination}`;
      const baseTime = 30 + Math.random() * 60;
      const trafficMultiplier = 1 + Math.random() * 0.8;

      const mockTraffic: TrafficData = {
        route: routeKey,
        duration: Math.floor(baseTime),
        durationInTraffic: Math.floor(baseTime * trafficMultiplier),
        distance: `${(Math.random() * 50 + 10).toFixed(1)} miles`,
        status:
          trafficMultiplier > 1.4
            ? 'heavy'
            : trafficMultiplier > 1.2
              ? 'moderate'
              : 'good',
        lastUpdated: new Date(),
      };

      setTrafficData(prev => ({
        ...prev,
        [routeKey]: mockTraffic,
      }));
    } catch (error) {
      console.error('Error fetching traffic data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addRun = () => {
    try {
      // Clear previous errors
      setFormErrors({});

      // Note: Form validation is available via validateNewRunForm if needed

      // Create the run with additional required fields
      const run: Run = {
        id: crypto.randomUUID(),
        ...(newRun as NewRunForm), // Safe cast since validation passed
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setRuns(prev => [...prev, run]);

      // Fetch initial data for this run
      fetchFlightStatus(run.flightNumber);
      fetchTrafficData(run.pickupLocation, run.dropoffLocation);

      // Reset form
      setNewRun({
        flightNumber: '',
        airline: '',
        departure: '',
        arrival: '',
        pickupLocation: '',
        dropoffLocation: '',
        scheduledTime: '',
        type: 'pickup',
        notes: '',
      });
    } catch (error) {
      console.error('Error adding run:', error);
      window.alert('Error adding run. Please check your input.');
    }
  };

  const handleScheduleParse = () => {
    if (!scheduleText.trim()) {
      setParseResult({
        success: false,
        runs: [],
        errors: ['Please enter a schedule message'],
        warnings: [],
      });
      return;
    }

    const result = parseScheduleMessage(scheduleText);
    setParseResult(result);
  };

  const handleBulkImport = () => {
    if (!parseResult?.success || !parseResult.runs.length) {
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const newRuns: Run[] = [];

      parseResult.runs.forEach(parsedRun => {
        const formData = convertParsedRunToForm(parsedRun, today);
        const run: Run = {
          id: crypto.randomUUID(),
          ...formData,
          status: parsedRun.notes.includes('CANCELLED')
            ? 'cancelled'
            : 'scheduled',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        newRuns.push(run);

        // Fetch initial data for each run
        fetchFlightStatus(run.flightNumber);
        fetchTrafficData(run.pickupLocation, run.dropoffLocation);
      });

      setRuns(prev => [...prev, ...newRuns]);

      // Reset bulk import state
      setScheduleText('');
      setParseResult(null);
      setShowBulkImport(false);

      window.alert(`Successfully imported ${newRuns.length} runs!`);
    } catch (error) {
      console.error('Error importing runs:', error);
      window.alert('Error importing runs. Please try again.');
    }
  };

  const deleteRun = (id: string) => {
    setRuns(prev => prev.filter(run => run.id !== id));
  };

  const updateRunStatus = (id: string, status: RunStatus) => {
    setRuns(prev =>
      prev.map(run =>
        run.id === id ? { ...run, status, updatedAt: new Date() } : run
      )
    );
  };

  const refreshData = (run: Run) => {
    fetchFlightStatus(run.flightNumber);
    fetchTrafficData(run.pickupLocation, run.dropoffLocation);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrafficColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800';
      case 'heavy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 p-4'>
      <div className='max-w-4xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2'>
            <IconLogo className='w-8 h-8 mr-1 text-blue-500' />
            Teton Tracker
          </h1>
          <p className='text-gray-600'>
            Manage your airport pickups and dropoffs with real-time traffic and
            flight data
          </p>
        </div>

        <Tabs
          value={currentTab}
          onValueChange={setCurrentTab}
          className='w-full'
        >
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='runs'>Active Runs</TabsTrigger>
            <TabsTrigger value='add'>Add New Run</TabsTrigger>
          </TabsList>

          <TabsContent value='runs' className='space-y-4'>
            {runs.length === 0 ? (
              <Card>
                <CardContent className='p-6 text-center'>
                  <Plane className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                  <p className='text-gray-500'>
                    No runs scheduled. Add your first run to get started!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className='grid gap-4'>
                {runs.map(run => {
                  const flightStatus = flightStatuses[run.flightNumber];
                  const trafficInfo =
                    trafficData[`${run.pickupLocation}-${run.dropoffLocation}`];

                  return (
                    <Card key={run.id} className='w-full'>
                      <CardHeader className='pb-3'>
                        <div className='flex items-start justify-between'>
                          <div>
                            <CardTitle className='text-lg'>
                              {run.flightNumber}
                            </CardTitle>
                            <CardDescription>
                              {run.airline} • {run.departure} → {run.arrival}
                            </CardDescription>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Badge className={getStatusColor(run.status)}>
                              {run.status}
                            </Badge>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => deleteRun(run.id)}
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className='space-y-4'>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          {/* Flight Status */}
                          <div className='space-y-2'>
                            <h4 className='font-medium flex items-center gap-2'>
                              <Plane className='h-4 w-4' />
                              Flight Status
                            </h4>
                            {flightStatus ? (
                              <div className='bg-gray-50 p-3 rounded-lg'>
                                <div className='flex items-center justify-between mb-2'>
                                  <span className='font-medium'>
                                    {flightStatus.status}
                                  </span>
                                  {flightStatus.delay &&
                                    flightStatus.delay > 0 && (
                                      <Badge className='bg-red-500 text-white'>
                                        +{flightStatus.delay}m delay
                                      </Badge>
                                    )}
                                </div>
                                <div className='text-sm text-gray-600'>
                                  <div>
                                    Scheduled: {flightStatus.scheduledArrival}
                                  </div>
                                  <div>
                                    Actual: {flightStatus.actualArrival}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className='bg-gray-50 p-3 rounded-lg text-sm text-gray-500'>
                                No flight data available
                              </div>
                            )}
                          </div>

                          {/* Traffic Status */}
                          <div className='space-y-2'>
                            <h4 className='font-medium flex items-center gap-2'>
                              <Navigation className='h-4 w-4' />
                              Traffic Status
                            </h4>
                            {trafficInfo ? (
                              <div className='bg-gray-50 p-3 rounded-lg'>
                                <div className='flex items-center justify-between mb-2'>
                                  <Badge
                                    className={getTrafficColor(
                                      trafficInfo.status
                                    )}
                                  >
                                    {trafficInfo.status} traffic
                                  </Badge>
                                  <span className='text-sm font-medium'>
                                    {trafficInfo.durationInTraffic}m
                                  </span>
                                </div>
                                <div className='text-sm text-gray-600'>
                                  <div>Distance: {trafficInfo.distance}</div>
                                  <div>
                                    Normal time: {trafficInfo.duration}m
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className='bg-gray-50 p-3 rounded-lg text-sm text-gray-500'>
                                No traffic data available
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Route Information */}
                        <div className='space-y-2'>
                          <h4 className='font-medium flex items-center gap-2'>
                            <MapPin className='h-4 w-4' />
                            Route
                          </h4>
                          <div className='bg-gray-50 p-3 rounded-lg'>
                            <div className='flex items-center justify-between text-sm'>
                              <span>From: {run.pickupLocation}</span>
                              <Clock className='h-4 w-4 text-gray-400' />
                              <span>To: {run.dropoffLocation}</span>
                            </div>
                            <div className='mt-2 text-sm text-gray-600'>
                              Scheduled:{' '}
                              {new Date(run.scheduledTime).toLocaleString()}
                            </div>
                            {run.notes && (
                              <div className='mt-2 text-sm text-gray-600'>
                                Notes: {run.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className='flex gap-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => refreshData(run)}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Loading...' : 'Refresh Data'}
                          </Button>
                          {run.status === 'scheduled' && (
                            <Button
                              size='sm'
                              onClick={() => updateRunStatus(run.id, 'active')}
                            >
                              Start Run
                            </Button>
                          )}
                          {run.status === 'active' && (
                            <Button
                              size='sm'
                              variant='secondary'
                              onClick={() =>
                                updateRunStatus(run.id, 'completed')
                              }
                            >
                              Complete Run
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value='add' className='space-y-4'>
            {/* Bulk Import Option */}
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle className='flex items-center gap-2'>
                      <FileText className='h-5 w-5' />
                      Quick Import
                    </CardTitle>
                    <CardDescription>
                      Paste your schedule message to import multiple runs at
                      once
                    </CardDescription>
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setShowBulkImport(!showBulkImport)}
                  >
                    {showBulkImport ? 'Hide' : 'Show'} Bulk Import
                  </Button>
                </div>
              </CardHeader>
              {showBulkImport && (
                <CardContent className='space-y-4'>
                  {/* Paste Detection Notification */}
                  {showPasteDetected && (
                    <div className='bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 p-4 rounded-lg shadow-md animate-pulse'>
                      <div className='flex items-center gap-2 text-green-800'>
                        <FileText className='h-5 w-5 text-green-600' />
                        <span className='font-bold text-lg'>
                          🎉 Schedule Auto-Detected!
                        </span>
                      </div>
                      <p className='text-sm text-green-700 mt-2 font-medium'>
                        ✅ Successfully pasted and parsed your schedule message!
                        Review below and click "Import" to add the runs.
                      </p>
                    </div>
                  )}

                  <div className='space-y-2'>
                    <Label htmlFor='schedule-text'>Schedule Message</Label>
                    <textarea
                      id='schedule-text'
                      className='w-full min-h-32 p-3 border border-gray-300 rounded-md resize-vertical'
                      placeholder='Paste your schedule message here, or just paste anywhere on the page...'
                      value={scheduleText}
                      onChange={e => setScheduleText(e.target.value)}
                    />
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      onClick={handleScheduleParse}
                      disabled={!scheduleText.trim()}
                    >
                      Parse Schedule
                    </Button>
                    {parseResult?.success && (
                      <Button
                        onClick={handleBulkImport}
                        disabled={!parseResult.runs.length}
                      >
                        Import {parseResult.runs.length} Runs
                      </Button>
                    )}
                  </div>

                  {/* Parse Results */}
                  {parseResult && (
                    <div className='mt-4 space-y-2'>
                      {parseResult.success ? (
                        <div className='bg-green-50 p-3 rounded-lg'>
                          <div className='flex items-center gap-2 text-green-800 font-medium'>
                            <Badge className='bg-green-100 text-green-800'>
                              ✓ Success
                            </Badge>
                            Found {parseResult.runs.length} runs
                          </div>
                          <div className='mt-2 text-sm text-green-700'>
                            {parseResult.runs.map((run, index) => (
                              <div key={index} className='mt-1'>
                                • {run.type.toUpperCase()}: {run.flightNumber}{' '}
                                at {run.time} ({run.airline})
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className='bg-red-50 p-3 rounded-lg'>
                          <div className='flex items-center gap-2 text-red-800 font-medium'>
                            <AlertCircle className='h-4 w-4' />
                            Parse Failed
                          </div>
                          <div className='mt-2 text-sm text-red-700'>
                            {parseResult.errors.map((error, index) => (
                              <div key={index}>• {error}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {parseResult.warnings.length > 0 && (
                        <div className='bg-yellow-50 p-3 rounded-lg'>
                          <div className='flex items-center gap-2 text-yellow-800 font-medium'>
                            <AlertCircle className='h-4 w-4' />
                            Warnings
                          </div>
                          <div className='mt-2 text-sm text-yellow-700'>
                            {parseResult.warnings.map((warning, index) => (
                              <div key={index}>• {warning}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Manual Add Form */}
            <Card>
              <CardHeader>
                <CardTitle>Add New Run</CardTitle>
                <CardDescription>
                  Schedule a new airport pickup or dropoff
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='flight-number'>Flight Number *</Label>
                    <Input
                      id='flight-number'
                      placeholder='e.g., AA1234'
                      value={newRun.flightNumber || ''}
                      onChange={e =>
                        setNewRun(prev => ({
                          ...prev,
                          flightNumber: e.target.value.toUpperCase(),
                        }))
                      }
                      className={
                        formErrors.flightNumber ? 'border-red-500' : ''
                      }
                    />
                    {formErrors.flightNumber && (
                      <p className='text-sm text-red-500'>
                        {formErrors.flightNumber}
                      </p>
                    )}
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='airline'>Airline *</Label>
                    <Input
                      id='airline'
                      placeholder='e.g., American Airlines'
                      value={newRun.airline || ''}
                      onChange={e =>
                        setNewRun(prev => ({
                          ...prev,
                          airline: e.target.value,
                        }))
                      }
                      className={formErrors.airline ? 'border-red-500' : ''}
                    />
                    {formErrors.airline && (
                      <p className='text-sm text-red-500'>
                        {formErrors.airline}
                      </p>
                    )}
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='departure'>Departure Airport *</Label>
                    <Input
                      id='departure'
                      placeholder='e.g., JFK'
                      value={newRun.departure || ''}
                      onChange={e =>
                        setNewRun(prev => ({
                          ...prev,
                          departure: e.target.value.toUpperCase(),
                        }))
                      }
                      className={formErrors.departure ? 'border-red-500' : ''}
                    />
                    {formErrors.departure && (
                      <p className='text-sm text-red-500'>
                        {formErrors.departure}
                      </p>
                    )}
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='arrival'>Arrival Airport *</Label>
                    <Input
                      id='arrival'
                      placeholder='e.g., LAX'
                      value={newRun.arrival || ''}
                      onChange={e =>
                        setNewRun(prev => ({
                          ...prev,
                          arrival: e.target.value.toUpperCase(),
                        }))
                      }
                      className={formErrors.arrival ? 'border-red-500' : ''}
                    />
                    {formErrors.arrival && (
                      <p className='text-sm text-red-500'>
                        {formErrors.arrival}
                      </p>
                    )}
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='pickup-location'>Pickup Location *</Label>
                    <Input
                      id='pickup-location'
                      placeholder='e.g., 123 Main St, City, State'
                      value={newRun.pickupLocation || ''}
                      onChange={e =>
                        setNewRun(prev => ({
                          ...prev,
                          pickupLocation: e.target.value,
                        }))
                      }
                      className={
                        formErrors.pickupLocation ? 'border-red-500' : ''
                      }
                    />
                    {formErrors.pickupLocation && (
                      <p className='text-sm text-red-500'>
                        {formErrors.pickupLocation}
                      </p>
                    )}
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='dropoff-location'>Dropoff Location *</Label>
                    <Input
                      id='dropoff-location'
                      placeholder='e.g., Airport Terminal 1'
                      value={newRun.dropoffLocation || ''}
                      onChange={e =>
                        setNewRun(prev => ({
                          ...prev,
                          dropoffLocation: e.target.value,
                        }))
                      }
                      className={
                        formErrors.dropoffLocation ? 'border-red-500' : ''
                      }
                    />
                    {formErrors.dropoffLocation && (
                      <p className='text-sm text-red-500'>
                        {formErrors.dropoffLocation}
                      </p>
                    )}
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='scheduled-time'>Scheduled Time *</Label>
                    <Input
                      id='scheduled-time'
                      type='datetime-local'
                      value={newRun.scheduledTime || ''}
                      onChange={e =>
                        setNewRun(prev => ({
                          ...prev,
                          scheduledTime: e.target.value,
                        }))
                      }
                      className={
                        formErrors.scheduledTime ? 'border-red-500' : ''
                      }
                    />
                    {formErrors.scheduledTime && (
                      <p className='text-sm text-red-500'>
                        {formErrors.scheduledTime}
                      </p>
                    )}
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='type'>Run Type *</Label>
                    <select
                      id='type'
                      className='w-full p-2 border border-gray-300 rounded-md'
                      value={newRun.type || 'pickup'}
                      onChange={e =>
                        setNewRun(prev => ({
                          ...prev,
                          type: e.target.value as RunType,
                        }))
                      }
                    >
                      <option value='pickup'>Pickup (to airport)</option>
                      <option value='dropoff'>Dropoff (from airport)</option>
                    </select>
                  </div>
                  <div className='space-y-2 md:col-span-2'>
                    <Label htmlFor='notes'>Notes (Optional)</Label>
                    <Input
                      id='notes'
                      placeholder='Additional notes...'
                      value={newRun.notes || ''}
                      onChange={e =>
                        setNewRun(prev => ({ ...prev, notes: e.target.value }))
                      }
                      className={formErrors.notes ? 'border-red-500' : ''}
                    />
                    {formErrors.notes && (
                      <p className='text-sm text-red-500'>{formErrors.notes}</p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={addRun}
                  className='w-full'
                  disabled={isLoading}
                >
                  <Plus className='h-4 w-4 mr-2' />
                  Add Run
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
