import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  AlertTriangle,
  Clock,
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

function AddRun() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
      type: 'pickup',
      notes: '',
    },
  });

  // Store default form values for undo functionality
  const defaultFormValues: NewRunForm = {
    flightNumber: '',
    airline: '',
    departure: '',
    arrival: '',
    pickupLocation: '',
    dropoffLocation: '',
    scheduledTime: '',
    type: 'pickup',
    notes: '',
  };

  // Enhanced flight status checking function
  const checkFlightStatus = async (
    flightNumber: string,
    scheduledTime: string
  ) => {
    if (!flightNumber || isDebugMode()) {
      return;
    }

    setFlightStatusState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const flightService = await getFlightServiceWithConfig();
      const flightStatus = await flightService.getFlightStatus({
        flightNumber,
      });

      // Determine if flight is historical based on scheduled time
      const scheduledDate = new Date(scheduledTime);
      const now = new Date();
      const isHistorical = scheduledDate < now;

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
      }));
      console.warn('Could not check flight status:', error);
    }
  };

  // Watch flight number and scheduled time to trigger status checks
  const watchedFlightNumber = form.watch('flightNumber');
  const watchedScheduledTime = form.watch('scheduledTime');

  useEffect(() => {
    if (watchedFlightNumber && watchedScheduledTime) {
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

          // Create undo function that resets form to defaults
          const handleUndo = () => {
            form.reset(defaultFormValues);
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

  // Mutation for creating a new run
  const createRunMutation = useMutation({
    mutationFn: (data: NewRunForm) => runsApi.createRun(data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch runs
      queryClient.invalidateQueries({ queryKey: ['runs'] });

      // Show success toast
      toasts.success(
        'Run created successfully',
        `${variables.type === 'pickup' ? 'Pickup' : 'Dropoff'} run for flight ${variables.flightNumber} has been scheduled.`
      );

      // Reset form
      form.reset();

      // Navigate to runs page
      router.navigate({ to: '/runs' });
    },
    onError: error => {
      console.error('Failed to create run:', error);
      toasts.error(
        'Failed to create run',
        'Please check your information and try again.'
      );
    },
  });

  const onSubmit = (data: NewRunForm) => {
    createRunMutation.mutate(data);
  };

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-foreground'>Add New Run</h2>
        <p className='text-muted-foreground mt-1'>
          Schedule a new pickup or dropoff run
        </p>
      </div>

      {/* Dismissable Info Message */}
      {!isInfoMessageDismissed && (
        <Card className='border-blue-200 py-1 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'>
          <CardContent className='px-2 py-0'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Plane className='size-12 text-blue-600 dark:text-blue-400' />
                <p className='text-sm text-blue-800 dark:text-blue-200'>
                  <strong>Snake River employee?</strong> Copy & paste scheduled
                  run messages directly
                </p>
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={dismissInfoMessage}
                className='h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Plus className='h-5 w-5' />
                Run Details
              </CardTitle>
              <CardDescription>
                Enter the flight and location information for your run
              </CardDescription>
            </div>
            {hasFilledFields && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => form.reset(defaultFormValues)}
                className='text-muted-foreground hover:text-foreground'
                title='Reset form'
              >
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='flightNumber'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-2'>
                        <Plane className='h-4 w-4' />
                        Flight Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder='e.g., UA123' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='airline'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Airline</FormLabel>
                      <FormControl>
                        <Input placeholder='e.g., United Airlines' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='departure'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure Airport</FormLabel>
                      <FormControl>
                        <Input placeholder='e.g., DEN' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='arrival'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Airport</FormLabel>
                      <FormControl>
                        <Input placeholder='e.g., JAC' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='pickupLocation'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-2'>
                        <MapPin className='h-4 w-4' />
                        Pickup Location
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., Jackson Hole Airport'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='dropoffLocation'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-2'>
                        <MapPin className='h-4 w-4' />
                        Dropoff Location
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., Snow King Resort'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='scheduledTime'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-2'>
                        <Clock className='h-4 w-4' />
                        Scheduled Time
                        {flightStatusState.isLoading && (
                          <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
                        )}
                        {!flightStatusState.isLoading &&
                          flightStatusState.status &&
                          !flightStatusState.isHistorical && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='h-4 w-4 p-0 hover:bg-transparent'
                                >
                                  <Info className='h-4 w-4 text-blue-500 hover:text-blue-600' />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className='w-64' side='top'>
                                <div className='space-y-2'>
                                  <div className='font-medium text-sm'>
                                    Flight Status
                                  </div>
                                  <div className='text-sm space-y-1'>
                                    <div>
                                      <span className='text-muted-foreground'>
                                        Flight:
                                      </span>{' '}
                                      {flightStatusState.status.flightNumber}
                                    </div>
                                    <div>
                                      <span className='text-muted-foreground'>
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
                                      <div className='text-xs text-muted-foreground'>
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
                            <div title='Historical flight detected'>
                              <AlertTriangle className='h-4 w-4 text-orange-500' />
                            </div>
                          )}
                      </FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder='Select date and time'
                          className={
                            flightStatusState.isHistorical
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                              : ''
                          }
                        />
                      </FormControl>
                      {flightStatusState.isHistorical && (
                        <div className='text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1'>
                          <AlertTriangle className='h-3 w-3' />
                          This flight has already occurred
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='type'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Run Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select run type' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='pickup'>Pickup</SelectItem>
                          <SelectItem value='dropoff'>Dropoff</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='notes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g., VIP guest, special instructions'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex gap-3'>
                <Button
                  type='submit'
                  className='flex-1'
                  disabled={createRunMutation.isPending}
                >
                  {createRunMutation.isPending ? (
                    <>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2'></div>
                      Creating Run...
                    </>
                  ) : (
                    <>
                      <Plus className='h-4 w-4 mr-2' />
                      Add Run
                    </>
                  )}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => router.navigate({ to: '/runs' })}
                  disabled={createRunMutation.isPending}
                >
                  Cancel
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
  component: AddRun,
});
