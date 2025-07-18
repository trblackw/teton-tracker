import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router';
import {
  AlertTriangle,
  Clock,
  DollarSign,
  Info,
  Loader2,
  MapPin,
  Plane,
  Plus,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { DateTimePicker } from '../components/ui/date-time-picker';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import { Input } from '../components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { runsApi } from '../lib/api/client';
import { isDebugMode } from '../lib/debug';
import {
  convertParsedRunToForm,
  parseScheduleMessage,
} from '../lib/schedule-parser';
import type { FlightStatus } from '../lib/schema';
import { NewRunFormSchema, type NewRunForm } from '../lib/schema';
import { getFlightServiceWithConfig } from '../lib/services/flight-service';
import { toasts } from '../lib/toast';

// Flight status state for the form
interface FlightStatusState {
  isLoading: boolean;
  status: FlightStatus | null;
  error: string | null;
  isHistorical: boolean;
}

// Helper function to check if a flight is historical (separate from API call)
const checkIsHistorical = (scheduledTime: string): boolean => {
  if (!scheduledTime) return false;

  try {
    const scheduledDate = new Date(scheduledTime);
    const now = new Date();
    return scheduledDate < now;
  } catch (error) {
    console.warn('Error checking if flight is historical:', error);
    return false;
  }
};

// Helper function to detect if pasted text looks like a schedule message
function isScheduleMessage(text: string): boolean {
  if (!text || text.length < 20) {
    return false;
  }

  const lines = text.split('\n').filter(line => line.trim().length > 0);

  if (lines.length < 4) {
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

  return patternCount >= 2;
}

// Makes use of the default report config fields
function DefaultAddRun() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const search = useSearch({ from: '/add' });
  const [isInfoMessageDismissed, setIsInfoMessageDismissed] =
    useState<boolean>(false);
  const [flightStatusState, setFlightStatusState] = useState<FlightStatusState>(
    {
      isLoading: false,
      status: null,
      error: null,
      isHistorical: false,
    }
  );

  // Query for edit mode
  const { data: editingRun } = useQuery({
    queryKey: ['run', search.edit],
    queryFn: () =>
      runsApi.getRuns().then(runs => runs.find(run => run.id === search.edit)),
    enabled: !!search.edit,
  });

  // Check sessionStorage for dismissed state on component mount
  useEffect(() => {
    const dismissed = sessionStorage.getItem('snake-river-info-dismissed');
    if (dismissed === 'true') {
      setIsInfoMessageDismissed(true);
    }
  }, []);

  // Function to dismiss the info message
  const dismissInfoMessage = () => {
    setIsInfoMessageDismissed(true);
    sessionStorage.setItem('snake-river-info-dismissed', 'true');
  };

  const form = useForm<NewRunForm>({
    resolver: zodResolver(NewRunFormSchema),
    defaultValues: {
      flightNumber: '',
      airline: '',
      departure: '',
      arrival: '',
      pickupLocation: '',
      dropoffLocation: '',
      scheduledTime: '',
      estimatedDuration: 60,
      type: 'pickup',
      price: '',
      notes: '',
    },
  });

  // Effect to populate form when editing run is loaded
  useEffect(() => {
    if (editingRun) {
      form.reset({
        flightNumber: editingRun.flightNumber,
        airline: editingRun.airline,
        departure: editingRun.departure,
        arrival: editingRun.arrival,
        pickupLocation: editingRun.pickupLocation,
        dropoffLocation: editingRun.dropoffLocation,
        scheduledTime: editingRun.scheduledTime,
        estimatedDuration: editingRun.estimatedDuration,
        type: editingRun.type,
        price: editingRun.price,
        notes: editingRun.notes || '',
      });
    }
  }, [editingRun, form]);

  // Store default form values for undo functionality
  const defaultFormValues: NewRunForm = {
    flightNumber: '',
    airline: '',
    departure: '',
    arrival: '',
    pickupLocation: '',
    dropoffLocation: '',
    scheduledTime: '',
    estimatedDuration: 60,
    type: 'pickup',
    price: '',
    notes: '',
    reportTemplateId: '',
    reservation_id: '',
    billTo: '',
  };

  // Enhanced flight status checking function
  const checkFlightStatus = async (
    flightNumber: string,
    scheduledTime: string
  ) => {
    // Always check if flight is historical, regardless of debug mode
    const isHistorical = checkIsHistorical(scheduledTime);

    if (!flightNumber || isDebugMode()) {
      // Even in debug mode, we still set the historical state
      setFlightStatusState(prev => ({
        ...prev,
        isHistorical,
      }));
      return;
    }

    setFlightStatusState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const flightService = await getFlightServiceWithConfig();
      const flightStatus = await flightService.getFlightStatus({
        flightNumber,
      });

      setFlightStatusState({
        isLoading: false,
        status: flightStatus,
        error: null,
        isHistorical,
      });
    } catch (error) {
      setFlightStatusState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to fetch flight status',
        isHistorical,
      }));
      console.warn('Could not check flight status:', error);
    }
  };

  // Watch flight number and scheduled time to trigger status checks
  const watchedFlightNumber = form.watch('flightNumber');
  const watchedScheduledTime = form.watch('scheduledTime');

  useEffect(() => {
    if (watchedFlightNumber && watchedScheduledTime) {
      // Immediately check if flight is historical
      const isHistorical = checkIsHistorical(watchedScheduledTime);
      setFlightStatusState(prev => ({
        ...prev,
        isHistorical,
      }));

      // Then debounce the API call
      const timeoutId = setTimeout(() => {
        checkFlightStatus(watchedFlightNumber, watchedScheduledTime);
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    } else {
      // Reset flight status when flight number or time is cleared
      setFlightStatusState({
        isLoading: false,
        status: null,
        error: null,
        isHistorical: false,
      });
    }
  }, [watchedFlightNumber, watchedScheduledTime]);

  // Global paste event listener for schedule detection
  useEffect(() => {
    const handleGlobalPaste = (event: ClipboardEvent) => {
      // Don't interfere with paste events in form inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const pastedText = event.clipboardData?.getData('text') || '';

      // Check if the pasted text looks like a schedule message
      if (isScheduleMessage(pastedText)) {
        event.preventDefault(); // Prevent default paste behavior

        // Parse the schedule message
        const result = parseScheduleMessage(pastedText);

        if (result.success && result.runs.length > 0) {
          // Auto-fill the form fields with the first run's data
          const today = new Date().toISOString().split('T')[0];
          const firstRun = result.runs[0];
          const formData = convertParsedRunToForm(firstRun, today);

          // Set form values
          form.reset(formData);

          // Immediately check if the flight is historical
          if (formData.scheduledTime) {
            const isHistorical = checkIsHistorical(formData.scheduledTime);
            setFlightStatusState(prev => ({
              ...prev,
              isHistorical,
            }));
          }

          // Create undo function that resets form to defaults
          const handleUndo = () => {
            form.reset(defaultFormValues);
            // Reset historical state when undoing
            setFlightStatusState(prev => ({
              ...prev,
              isHistorical: false,
            }));
          };

          // Show enhanced toast with undo action
          toasts.scheduleDetected(result.runs.length, handleUndo);

          if (result.runs.length > 1) {
            toasts.info(
              'Multiple runs detected',
              `${result.runs.length} runs found. Only the first run was auto-filled. You can manually add the others.`
            );
          }
        } else {
          // Show error toast
          toasts.error(
            'Unable to parse schedule message',
            result.errors.length > 0
              ? result.errors[0]
              : 'The pasted content does not appear to be a valid schedule message.'
          );
        }
      }
    };

    // Add event listener
    document.addEventListener('paste', handleGlobalPaste);

    // Cleanup
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, [form]);

  // Watch form values to determine if any field has been filled
  const watchedValues = form.watch();
  const hasFilledFields = Object.values(watchedValues).some(
    value => value !== '' && value !== defaultFormValues.type
  );

  // Mutation for creating/updating a run
  const createRunMutation = useMutation({
    mutationFn: (data: NewRunForm) => {
      if (editingRun) {
        return runsApi.updateRun(editingRun.id, data);
      } else {
        return runsApi.createRun(data);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch runs
      queryClient.invalidateQueries({ queryKey: ['runs'] });

      // Show success toast
      const action = editingRun ? 'updated' : 'created';
      toasts.success(
        `Run ${action} successfully`,
        `${variables.type === 'pickup' ? 'Pickup' : 'Dropoff'} run for flight ${variables.flightNumber} has been ${action}.`
      );

      // Reset form
      form.reset();

      // Navigate to runs page
      router.navigate({ to: '/runs' });
    },
    onError: error => {
      console.error(
        `Failed to ${editingRun ? 'update' : 'create'} run:`,
        error
      );
      toasts.error(
        `Failed to ${editingRun ? 'update' : 'create'} run`,
        'Please check your information and try again.'
      );
    },
  });

  const onSubmit = (data: NewRunForm) => {
    createRunMutation.mutate(data);
  };

  // Handle paste from clipboard button
  const handlePasteFromClipboard = async () => {
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard) {
        toasts.error(
          'Clipboard not available',
          'Your browser does not support clipboard access. Try using Ctrl+V instead.'
        );
        return;
      }

      // Read text from clipboard
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText) {
        toasts.error(
          'No text in clipboard',
          'Please copy a schedule message to your clipboard first.'
        );
        return;
      }

      // Check if the text looks like a schedule message
      if (isScheduleMessage(clipboardText)) {
        // Parse the schedule message
        const result = parseScheduleMessage(clipboardText);

        if (result.success && result.runs.length > 0) {
          // Auto-fill the form fields with the first run's data
          const today = new Date().toISOString().split('T')[0];
          const firstRun = result.runs[0];
          const formData = convertParsedRunToForm(firstRun, today);

          // Set form values
          form.reset(formData);

          // Immediately check if the flight is historical
          if (formData.scheduledTime) {
            const isHistorical = checkIsHistorical(formData.scheduledTime);
            setFlightStatusState(prev => ({
              ...prev,
              isHistorical,
            }));
          }

          // Create undo function that resets form to defaults
          const handleUndo = () => {
            form.reset(defaultFormValues);
            // Reset historical state when undoing
            setFlightStatusState(prev => ({
              ...prev,
              isHistorical: false,
            }));
          };

          // Show enhanced toast with undo action
          toasts.scheduleDetected(result.runs.length, handleUndo);

          if (result.runs.length > 1) {
            toasts.info(
              'Multiple runs detected',
              `${result.runs.length} runs found. Only the first run was auto-filled. You can manually add the others.`
            );
          }
        } else {
          // Show error toast
          toasts.error(
            'Unable to parse schedule message',
            result.errors.length > 0
              ? result.errors[0]
              : 'The pasted content does not appear to be a valid schedule message.'
          );
        }
      } else {
        toasts.error(
          'Invalid schedule format',
          'The clipboard content does not appear to be a schedule message. Please check the format and try again.'
        );
      }
    } catch (error) {
      // Handle clipboard access errors
      toasts.error(
        'Clipboard access failed',
        'Unable to read from clipboard. You may need to grant permission or use Ctrl+V instead.'
      );
      console.error('Clipboard access error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {editingRun ? 'Edit Run' : 'Add New Run'}
        </h2>
        <p className="text-muted-foreground mt-1">
          {editingRun
            ? 'Update the details for this run'
            : 'Schedule a new pickup or dropoff run'}
        </p>
      </div>

      {/* Dismissable Info Message */}
      {!isInfoMessageDismissed && !editingRun && (
        <Card className="border-blue-200 py-1 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="px-2 py-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plane className="size-12 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Snake River employee?</strong> <br />
                  Copy & paste scheduled run messages directly
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePasteFromClipboard}
                  className="text-xs m-0 bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 hover:border-blue-400 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-800"
                >
                  Paste
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissInfoMessage}
                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Run Details
              </CardTitle>
              <CardDescription>
                Enter the flight & location information for your run
              </CardDescription>
            </div>
            {hasFilledFields && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => form.reset(defaultFormValues)}
                className="text-muted-foreground hover:text-foreground"
                title="Reset form"
              >
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="flightNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Plane className="h-4 w-4" />
                        Flight Number
                        <small className="text-destructive">*</small>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., UA123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="airline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Airline</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., United Airlines" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="departure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Departure Airport
                        <small className="text-destructive">*</small>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., DEN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="arrival"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Arrival Airport
                        <small className="text-destructive">*</small>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., JAC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pickupLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Pickup Location
                        <small className="text-destructive">*</small>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Jackson Hole Airport"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dropoffLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Dropoff Location
                        <small className="text-destructive">*</small>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Snow King Resort"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduledTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Scheduled Time
                        <small className="text-destructive">*</small>
                        {flightStatusState.isLoading && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                        {!flightStatusState.isLoading &&
                          flightStatusState.status &&
                          !flightStatusState.isHistorical && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 hover:bg-transparent"
                                >
                                  <Info className="h-4 w-4 text-blue-500 hover:text-blue-600" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" side="top">
                                <div className="space-y-2">
                                  <div className="font-medium text-sm">
                                    Flight Status
                                  </div>
                                  <div className="text-sm space-y-1">
                                    <div>
                                      <span className="text-muted-foreground">
                                        Flight:
                                      </span>{' '}
                                      {flightStatusState.status.flightNumber}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">
                                        Status:
                                      </span>{' '}
                                      <span
                                        className={`font-medium ${
                                          flightStatusState.status.status ===
                                          'On Time'
                                            ? 'text-green-600'
                                            : flightStatusState.status
                                                  .status === 'Delayed'
                                              ? 'text-red-600'
                                              : flightStatusState.status
                                                    .status === 'Cancelled'
                                                ? 'text-red-600'
                                                : 'text-blue-600'
                                        }`}
                                      >
                                        {flightStatusState.status.status}
                                      </span>
                                    </div>
                                    {flightStatusState.status.lastUpdated && (
                                      <div className="text-xs text-muted-foreground">
                                        Updated:{' '}
                                        {flightStatusState.status.lastUpdated.toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        {!flightStatusState.isLoading &&
                          flightStatusState.isHistorical && (
                            <div title="Historical flight detected">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            </div>
                          )}
                      </FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select date and time"
                          className={
                            flightStatusState.isHistorical
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                              : ''
                          }
                        />
                      </FormControl>
                      {flightStatusState.isHistorical && (
                        <div className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          This flight has already occurred
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimatedDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Estimated Duration (minutes)
                        <small className="text-destructive">*</small>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="60"
                          min="1"
                          max="1440"
                          value={field.value}
                          onChange={e =>
                            field.onChange(parseInt(e.target.value) || 60)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Run Type
                        <small className="text-destructive">*</small>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select run type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pickup">Pickup</SelectItem>
                          <SelectItem value="dropoff">Dropoff</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Price
                        <small className="text-destructive">*</small>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., $100 or 176" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., VIP guest, special instructions"
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.navigate({ to: '/runs' })}
                  disabled={createRunMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-green-600 text-white hover:bg-green-700"
                  disabled={createRunMutation.isPending}
                >
                  {createRunMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      {editingRun ? 'Updating Run...' : 'Creating Run...'}
                    </>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      {editingRun ? 'Update Run' : 'Add Run'}
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/add')({
  component: DefaultAddRun,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      edit: search.edit as string | undefined,
    };
  },
});
