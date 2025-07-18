import { Label } from '@radix-ui/react-label';
import {
  Activity,
  AlertCircle,
  Badge,
  Clock,
  FileText,
  MapPin,
  Navigation,
  Plane,
  Plus,
  Settings,
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
import { RefreshButton } from './components/ui/refresh-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import './index.css';
import { useAppContext } from './lib/AppContextProvider';
import { useMultipleRunsData } from './lib/hooks/use-api-data';
import IconLogo from './lib/icons/icon-logo';
import { invalidateAllApiData, queryClient } from './lib/react-query-client';
import {
  convertParsedRunToForm,
  parseScheduleMessage,
  type ParseResult,
} from './lib/schedule-parser';
import {
  type NewRunForm,
  type Run,
  type RunStatus,
  type RunType,
} from './lib/schema';
import { pollingService } from './lib/services/polling-service';
import { initializeTomTomService } from './lib/services/tomtom-service';

export default function App() {
  const { currentUser, isLoading: userLoading } = useAppContext();
  const [runs, setRuns] = useState<Run[]>([]);
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

  // Bulk import state
  const [scheduleText, setScheduleText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showPasteDetected, setShowPasteDetected] = useState(false);
  const [currentTab, setCurrentTab] = useState('runs');

  // Polling and debug state
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugInfo, setDebugInfo] = useState(pollingService.getDebugInfo());

  // Use React Query hooks for API data
  const runsApiData = useMultipleRunsData(runs);

  // Initialize services on component mount
  useEffect(() => {
    initializeTomTomService();

    // Configure polling service to work with React Query
    pollingService.config = {
      ...pollingService.config,
      onDataInvalidation: (type, key) => {
        // Invalidate React Query cache to trigger refetch
        if (type === 'flight') {
          queryClient.invalidateQueries({ queryKey: ['flight-status', key] });
        } else if (type === 'traffic') {
          const [origin, destination] = key.split('-');
          queryClient.invalidateQueries({
            queryKey: ['traffic-data', origin, destination],
          });
        }
      },
      onError: (error, context) => {
        console.error(`[PollingService] Error in ${context}:`, error);
      },
    };

    // Start polling if enabled
    if (pollingEnabled) {
      pollingService.start();
    }

    // Update debug info every second
    const debugInterval = window.setInterval(() => {
      setDebugInfo(pollingService.getDebugInfo());
    }, 1000);

    return () => {
      pollingService.stop();
      window.clearInterval(debugInterval);
    };
  }, [pollingEnabled]);

  // Update polling service with current runs
  useEffect(() => {
    pollingService.updateRuns(runs);
  }, [runs]);

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

        // Show notification and auto-fill form if successful
        if (result.success && result.runs.length > 0) {
          console.log(`📋 Schedule detected! Found ${result.runs.length} runs`);

          // Auto-fill the form fields with the first run's data
          const today = new Date().toISOString().split('T')[0];
          const firstRun = result.runs[0];
          const formData = convertParsedRunToForm(firstRun, today);

          console.log('🔄 Auto-filling form fields with:', formData);
          setNewRun(formData);

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

  const addRun = () => {
    if (!currentUser) {
      console.error('No current user available');
      return;
    }

    try {
      // Clear previous errors
      setFormErrors({});

      // Create the run with additional required fields
      const run: Run = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        ...(newRun as NewRunForm), // Safe cast since validation passed
        status: 'scheduled',
        createdAt: new Date(),
        airline: newRun.airline || '',
        updatedAt: new Date(),
      };

      setRuns(prev => [...prev, run]);

      // React Query will automatically fetch data for the new run
      // No need for manual API calls anymore

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

    // Auto-fill form fields with the first run's data if parsing was successful
    if (result.success && result.runs.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const firstRun = result.runs[0];
      const formData = convertParsedRunToForm(firstRun, today);

      console.log('🔄 Auto-filling form fields with:', formData);
      setNewRun(formData);
    }
  };

  const handleBulkImport = () => {
    if (!currentUser) {
      console.error('No current user available');
      return;
    }

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
          userId: currentUser.id,
          ...formData,
          status: parsedRun.notes.includes('CANCELLED')
            ? 'cancelled'
            : 'scheduled',
          createdAt: new Date(),
          updatedAt: new Date(),
          airline: formData.airline || '',
        };
        newRuns.push(run);
      });

      setRuns(prev => [...prev, ...newRuns]);

      // React Query will automatically fetch data for the new runs
      // No need for manual API calls anymore

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

  const refreshAllData = () => {
    // Invalidate all API data to force refetch
    invalidateAllApiData();
    runsApiData.refetchAll();
  };

  const refreshRunData = (run: Run) => {
    // Find the specific run data and refetch it
    const runData = runsApiData.data.find(data => data.run.id === run.id);
    if (runData) {
      // Invalidate specific queries for this run
      queryClient.invalidateQueries({
        queryKey: ['flight-status', run.flightNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ['traffic-data', run.pickupLocation, run.dropoffLocation],
      });
    }
  };

  // Format debug info for display
  const formatDebugInfo = () => {
    if (!debugInfo) return null;

    const activeRunsCount = runs.filter(run => run.status === 'active').length;
    const isDebugMode = debugInfo.apiCallsBlocked > 0;
    const lastPollTime = debugInfo.lastPolled
      ? new Date(debugInfo.lastPolled).toLocaleTimeString()
      : 'Never';

    return {
      status: pollingEnabled
        ? isDebugMode
          ? 'Debug Mode'
          : 'Active'
        : 'Disabled',
      activeRuns: activeRunsCount,
      lastPoll: lastPollTime,
      pollCount: debugInfo.pollCount,
      apiCallsBlocked: debugInfo.apiCallsBlocked,
      errors: debugInfo.errors.slice(-3), // Show last 3 errors
    };
  };

  const getStatusColor = (status: RunStatus) => {
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

  useEffect(() => {
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(registration => {
          console.log('Service Worker registered successfully:', registration);
        })
        .catch(error => {
          console.log('Service Worker registration failed:', error);
        });
    }

    // Prevent context menu on long press (native app behavior)
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    // Prevent text selection on long press
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      if (
        target.closest('button') ||
        target.closest('[role="button"]') ||
        target.closest('.cursor-pointer')
      ) {
        e.preventDefault();
      }
    };

    // Prevent drag operations on images and other elements
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    // Prevent pull-to-refresh on mobile
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });

    // iOS specific: prevent rubber band scrolling
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const scrollable =
        target.closest('[data-scrollable]') || target.closest('#root');

      if (!scrollable) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Handle PWA install prompt
    let deferredPrompt: any;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      // Update UI to notify the user they can install the PWA
      console.log('PWA install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle PWA installation
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      deferredPrompt = null;
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Show loading state while user is being initialized
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing user...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <IconLogo className="h-6 w-6 sm:h-8 sm:w-8" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Teton Tracker
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="p-2 sm:px-3"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Debug</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPollingEnabled(!pollingEnabled);
                  if (!pollingEnabled) {
                    pollingService.start();
                  } else {
                    pollingService.stop();
                  }
                }}
                className="p-2 sm:px-3"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">
                  {pollingEnabled ? 'Disable' : 'Enable'} Polling
                </span>
              </Button>
              <RefreshButton
                onRefresh={refreshAllData}
                size="sm"
                className="p-2 sm:px-3"
                defaultText="Refresh All"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Refresh All</span>
              </RefreshButton>
            </div>
          </div>
          <p className="text-gray-600 text-sm sm:text-base">
            Track airport runs with real-time flight and traffic data
          </p>
        </div>

        {/* API Loading Indicator */}
        {runsApiData.isLoading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <p className="text-blue-800 text-sm">
                Fetching latest flight and traffic data...
              </p>
            </div>
          </div>
        )}

        {/* Debug Info Panel */}
        {showDebugInfo && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Debug Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const debugDisplay = formatDebugInfo();
                if (!debugDisplay) return <p>No debug info available</p>;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Polling Status</p>
                      <p
                        className={`${
                          debugDisplay.status === 'Active'
                            ? 'text-green-600'
                            : debugDisplay.status === 'Debug Mode'
                              ? 'text-yellow-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {debugDisplay.status}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Active Runs</p>
                      <p>{debugDisplay.activeRuns}</p>
                    </div>
                    <div>
                      <p className="font-medium">Last Poll</p>
                      <p>{debugDisplay.lastPoll}</p>
                    </div>
                    <div>
                      <p className="font-medium">Poll Count</p>
                      <p>{debugDisplay.pollCount}</p>
                    </div>
                    <div>
                      <p className="font-medium">React Query Status</p>
                      <p
                        className={
                          runsApiData.isLoading
                            ? 'text-blue-600'
                            : 'text-green-600'
                        }
                      >
                        {runsApiData.isLoading ? 'Fetching' : 'Idle'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Cached Queries</p>
                      <p>{queryClient.getQueryCache().getAll().length}</p>
                    </div>
                    {debugDisplay.apiCallsBlocked > 0 && (
                      <div className="sm:col-span-2 lg:col-span-2">
                        <p className="font-medium">API Calls Blocked</p>
                        <p className="text-yellow-600">
                          {debugDisplay.apiCallsBlocked} (Debug Mode)
                        </p>
                      </div>
                    )}
                    {debugDisplay.errors.length > 0 && (
                      <div className="sm:col-span-2 lg:col-span-4">
                        <p className="font-medium">Recent Errors</p>
                        <div className="text-xs text-red-600 mt-1">
                          {debugDisplay.errors.map((error, index) => (
                            <div key={index} className="mb-1">
                              {error.time.toLocaleTimeString()}: {error.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="mt-4 pt-4 border-t border-yellow-200">
                <p className="text-xs text-gray-600">
                  <strong>Debug Mode:</strong>{' '}
                  {pollingService.config.enableDebugMode ? 'ON' : 'OFF'} -
                  {pollingService.config.enableDebugMode
                    ? ' API calls are blocked to prevent unnecessary requests during development.'
                    : ' API calls are enabled for active runs every 5 minutes.'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  <strong>React Query:</strong> Automatic background refetching
                  every 5 minutes for stale data. Data is cached for 10 minutes
                  and considered fresh for 2-3 minutes.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paste Detection Notification */}
        {showPasteDetected && (
          <Card className="mb-6 border-green-200 bg-green-50 animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium">
                  Schedule detected! Found {parseResult?.runs.length || 0} runs
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs
          value={currentTab}
          onValueChange={setCurrentTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger className="cursor-pointer py-2" value="runs">
              Current Runs
            </TabsTrigger>
            <TabsTrigger className="cursor-pointer py-2" value="add">
              Add New Run
            </TabsTrigger>
          </TabsList>

          <TabsContent value="runs" className="mt-6">
            {runs.length === 0 ? (
              <Card className="bg-accent/50 border rounded-md">
                <CardContent className="p-8 text-center">
                  <Plane className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                  <p className="text-gray-500 text-lg mb-4">
                    No runs scheduled. Add your first run to get started!
                  </p>
                  <Button
                    onClick={() => setCurrentTab('add')}
                    className="mt-2 bg-blue-400 hover:bg-blue-500/90 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" strokeWidth={3} />
                    Add Your First Run
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {runsApiData.data.map(({ run, flightStatus, trafficData }) => {
                  return (
                    <Card key={run.id} className="w-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {run.flightNumber}
                              {runsApiData.isLoading && (
                                <span className="ml-2 inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></span>
                              )}
                              {runsApiData.isError && (
                                <span className="ml-2 text-red-500 text-sm">
                                  ⚠️
                                </span>
                              )}
                            </CardTitle>
                            <CardDescription>
                              {run.airline} • {run.departure} → {run.arrival}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(run.status)}>
                              {run.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRun(run.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-sm font-medium">
                                {new Date(run.scheduledTime).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                              <span className="text-sm">
                                {run.type === 'pickup' ? 'Pickup' : 'Dropoff'} •{' '}
                                {run.pickupLocation} → {run.dropoffLocation}
                              </span>
                            </div>
                            {run.notes && (
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-600">
                                  {run.notes}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            {flightStatus && (
                              <div className="flex items-center gap-2">
                                <Plane className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                <span className="text-sm">
                                  Flight: {flightStatus.status}
                                  {flightStatus.delay &&
                                    flightStatus.delay > 0 && (
                                      <span className="text-red-600 ml-1">
                                        (+{flightStatus.delay} min)
                                      </span>
                                    )}
                                </span>
                              </div>
                            )}
                            {trafficData && (
                              <div className="flex items-start gap-2">
                                <Navigation className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm">
                                  Traffic: {trafficData.duration} min •{' '}
                                  {trafficData.distance} •{' '}
                                  <span
                                    className={
                                      trafficData.status === 'heavy'
                                        ? 'text-red-600'
                                        : trafficData.status === 'moderate'
                                          ? 'text-yellow-600'
                                          : 'text-green-600'
                                    }
                                  >
                                    {trafficData.status}
                                  </span>
                                </span>
                              </div>
                            )}
                            {trafficData?.incidents &&
                              trafficData.incidents.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                  <span className="text-sm text-orange-600">
                                    {trafficData.incidents.length} incident(s)
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                          <RefreshButton
                            variant="outline"
                            size="sm"
                            onRefresh={() => refreshRunData(run)}
                            className="min-w-0"
                            defaultText="Refresh Data"
                          />
                          {run.status === 'scheduled' && (
                            <Button
                              size="sm"
                              onClick={() => updateRunStatus(run.id, 'active')}
                              className="min-w-0"
                            >
                              Start Run
                            </Button>
                          )}
                          {run.status === 'active' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                updateRunStatus(run.id, 'completed')
                              }
                              className="min-w-0"
                            >
                              Complete Run
                            </Button>
                          )}
                          {run.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => pollingService.triggerPoll()}
                              className="min-w-0"
                            >
                              Manual Poll
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

          <TabsContent value="add" className="mt-6">
            {/* Bulk Import Option */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Quick Import
                    </CardTitle>
                    <CardDescription>
                      Paste your schedule message to import multiple runs at
                      once
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkImport(!showBulkImport)}
                  >
                    {showBulkImport ? 'Hide' : 'Show'} Bulk Import
                  </Button>
                </div>
              </CardHeader>
              {showBulkImport && (
                <CardContent className="space-y-4">
                  {/* Paste Detection Notification */}
                  {showPasteDetected && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 p-4 rounded-lg shadow-md animate-pulse">
                      <div className="flex items-center gap-2 text-green-800">
                        <FileText className="h-5 w-5 text-green-600" />
                        <span className="font-bold text-lg">
                          🎉 Schedule Auto-Detected!
                        </span>
                      </div>
                      <p className="text-sm text-green-700 mt-2 font-medium">
                        ✅ Successfully pasted and parsed your schedule message!
                        Review below and click "Import" to add the runs.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="schedule-text">Schedule Message</Label>
                    <textarea
                      id="schedule-text"
                      className="w-full min-h-32 p-3 border border-gray-300 rounded-md resize-vertical"
                      placeholder="Paste your schedule message here, or just paste anywhere on the page..."
                      value={scheduleText}
                      onChange={e => setScheduleText(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
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
                    <div className="mt-4 space-y-2">
                      {parseResult.success ? (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-green-800 font-medium">
                            <Badge className="bg-green-100 text-green-800">
                              ✓ Success
                            </Badge>
                            Found {parseResult.runs.length} runs
                          </div>
                          <div className="mt-2 text-sm text-green-700">
                            {parseResult.runs.map((run, index) => (
                              <div key={index} className="mt-1">
                                • {run.type.toUpperCase()}: {run.flightNumber}{' '}
                                at {run.time} ({run.airline})
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-red-800 font-medium">
                            <AlertCircle className="h-4 w-4" />
                            Parse Failed
                          </div>
                          <div className="mt-2 text-sm text-red-700">
                            {parseResult.errors.map((error, index) => (
                              <div key={index}>• {error}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {parseResult.warnings.length > 0 && (
                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-800 font-medium">
                            <AlertCircle className="h-4 w-4" />
                            Warnings
                          </div>
                          <div className="mt-2 text-sm text-yellow-700">
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
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="flight-number">Flight Number *</Label>
                    <Input
                      id="flight-number"
                      placeholder="e.g., AA1234"
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
                      <p className="text-sm text-red-500">
                        {formErrors.flightNumber}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="airline">Airline *</Label>
                    <Input
                      id="airline"
                      placeholder="e.g., American Airlines"
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
                      <p className="text-sm text-red-500">
                        {formErrors.airline}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="departure">Departure Airport *</Label>
                    <Input
                      id="departure"
                      placeholder="e.g., JFK"
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
                      <p className="text-sm text-red-500">
                        {formErrors.departure}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arrival">Arrival Airport *</Label>
                    <Input
                      id="arrival"
                      placeholder="e.g., LAX"
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
                      <p className="text-sm text-red-500">
                        {formErrors.arrival}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="pickup-location">Pickup Location *</Label>
                    <Input
                      id="pickup-location"
                      placeholder="e.g., 123 Main St, City, State"
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
                      <p className="text-sm text-red-500">
                        {formErrors.pickupLocation}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="dropoff-location">Dropoff Location *</Label>
                    <Input
                      id="dropoff-location"
                      placeholder="e.g., Airport Terminal 1"
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
                      <p className="text-sm text-red-500">
                        {formErrors.dropoffLocation}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-time">Scheduled Time *</Label>
                    <Input
                      id="scheduled-time"
                      type="datetime-local"
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
                      <p className="text-sm text-red-500">
                        {formErrors.scheduledTime}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Run Type *</Label>
                    <select
                      id="type"
                      className="w-full p-2 border border-gray-300 rounded-md h-10"
                      value={newRun.type || 'pickup'}
                      onChange={e =>
                        setNewRun(prev => ({
                          ...prev,
                          type: e.target.value as RunType,
                        }))
                      }
                    >
                      <option value="pickup">Pickup (to airport)</option>
                      <option value="dropoff">Dropoff (from airport)</option>
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Additional notes..."
                      value={newRun.notes || ''}
                      onChange={e =>
                        setNewRun(prev => ({ ...prev, notes: e.target.value }))
                      }
                      className={formErrors.notes ? 'border-red-500' : ''}
                    />
                    {formErrors.notes && (
                      <p className="text-sm text-red-500">{formErrors.notes}</p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={addRun}
                  className="w-full h-12 text-lg"
                  disabled={runsApiData.isLoading || !currentUser}
                >
                  <Plus className="h-5 w-5 mr-2" strokeWidth={3} />
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
