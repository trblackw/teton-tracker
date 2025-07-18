import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFileRoute,
  Link,
  useRouter,
  useSearch,
} from '@tanstack/react-router';
import { differenceInSeconds, intervalToDuration } from 'date-fns';
import {
  AlertTriangle,
  Car,
  CheckCircle,
  Clock,
  MapPin,
  Navigation,
  Plane,
  Timer,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { BackButton } from '../components/ui/navigation-arrow';
import { runsApi } from '../lib/api/client';
import { useMultipleRunsData } from '../lib/hooks/use-api-data';
import { toasts } from '../lib/toast';

export const Route = createFileRoute('/active-run')({
  component: ActiveRunPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      id: (search.id as string) || '',
    };
  },
});

// Timer component that tracks elapsed time
function RunTimer({
  startTime,
  estimatedDuration,
  includeTimerIcon = true,
}: {
  startTime: Date;
  estimatedDuration: number;
  includeTimerIcon?: boolean;
}) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      // Use date-fns for cleaner time difference calculation
      const elapsed = differenceInSeconds(now, startTime);
      setElapsedTime(Math.max(0, elapsed)); // Ensure non-negative
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    // Use date-fns intervalToDuration for cleaner duration formatting
    const duration = intervalToDuration({ start: 0, end: seconds * 1000 });

    const hours = duration.hours || 0;
    const minutes = duration.minutes || 0;
    const secs = duration.seconds || 0;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const isOvertime = elapsedTime > estimatedDuration * 60;
  const remainingTime = Math.max(0, estimatedDuration * 60 - elapsedTime);
  const progressPercentage = Math.min(
    100,
    (elapsedTime / (estimatedDuration * 60)) * 100
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {includeTimerIcon && <Timer className="h-6 w-6 text-blue-600" />}
          <div>
            <div className="text-2xl font-mono font-bold">
              <span className={isOvertime ? 'text-red-600' : 'text-green-600'}>
                {formatTime(elapsedTime)}
              </span>
              <span className="text-muted-foreground text-lg">
                {' '}
                / {formatTime(estimatedDuration * 60)}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {isOvertime ? (
                <span className="text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Running overtime
                </span>
              ) : (
                `${formatTime(remainingTime)} remaining`
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Progress</div>
          <div className="text-lg font-semibold">
            {progressPercentage.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
        <div
          className={`h-3 rounded-full transition-all duration-1000 ${
            isOvertime
              ? 'bg-red-500'
              : progressPercentage > 75
                ? 'bg-yellow-500'
                : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(100, progressPercentage)}%` }}
        />
      </div>
    </div>
  );
}

function ActiveRunPage() {
  const search = useSearch({ from: '/active-run' });
  const router = useRouter();
  const queryClient = useQueryClient();

  // Get the active run data
  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: runsApi.getRuns,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mutation for completing a run
  const completeRunMutation = useMutation({
    mutationFn: (runId: string) => runsApi.updateRunStatus(runId, 'completed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      toasts.success(
        'Run Completed',
        'The run has been marked as completed successfully.'
      );
      router.navigate({ to: '/runs' });
    },
    onError: error => {
      console.error('Failed to complete run:', error);
      toasts.error('Error', 'Failed to complete the run. Please try again.');
    },
  });

  // Mutation for canceling a run
  const cancelRunMutation = useMutation({
    mutationFn: (runId: string) => runsApi.updateRunStatus(runId, 'cancelled'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      toasts.info('Run Cancelled', 'The run has been cancelled successfully.');
      router.navigate({ to: '/runs' });
    },
    onError: error => {
      console.error('Failed to cancel run:', error);
      toasts.error('Error', 'Failed to cancel the run. Please try again.');
    },
  });

  const activeRun =
    runs.find(run => run.id === search.id && run.status === 'active') ||
    runs.find(run => run.status === 'active'); // Fallback to any active run

  // Get flight and traffic data
  const { data: runData } = useMultipleRunsData(activeRun ? [activeRun] : []);
  const flightStatus = runData[0]?.flightStatus;
  const trafficStatus = runData[0]?.trafficData;

  // Handle case where no active run is found
  if (!activeRun) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/runs">
            <BackButton />
          </Link>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <Car className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  No Active Run
                </h3>
                <p className="text-muted-foreground">
                  There are currently no active runs. Start a run to see
                  detailed information here.
                </p>
              </div>
              <Link to="/runs">
                <Button>View All Runs</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate run start time (when it became active)
  const calculateStartTime = () => {
    const now = new Date();

    // Use activatedAt if available and not null
    if (activeRun.activatedAt && activeRun.activatedAt !== null) {
      return new Date(activeRun.activatedAt);
    }

    // Fallback for legacy data without activatedAt
    const fallbackTime = new Date(
      activeRun.updatedAt || activeRun.createdAt || now
    );

    // If the fallback time is in the future, assume run started 5 minutes ago
    if (fallbackTime > now) {
      return new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
    }

    return fallbackTime;
  };

  const startTime = calculateStartTime();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/runs">
          <BackButton />
        </Link>
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></div>
          Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Timer Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Run Timer
            </CardTitle>
            <CardDescription>
              Track the progress of your current run
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RunTimer
              startTime={startTime}
              estimatedDuration={activeRun.estimatedDuration}
              includeTimerIcon={false}
            />
          </CardContent>
        </Card>

        {/* Flight Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Flight Information
            </CardTitle>
            <CardDescription>
              Real-time flight status and details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Flight Number
                </label>
                <div className="text-lg font-mono font-semibold">
                  {activeRun.flightNumber}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Airline
                </label>
                <div className="text-lg">{activeRun.airline}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Departure
                </label>
                <div className="text-lg font-mono">{activeRun.departure}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Arrival
                </label>
                <div className="text-lg font-mono">{activeRun.arrival}</div>
              </div>
            </div>

            {flightStatus && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <Badge
                    variant={
                      flightStatus.status === 'On Time'
                        ? 'default'
                        : 'destructive'
                    }
                    className={
                      flightStatus.status === 'On Time'
                        ? '  text-white border-green-700'
                        : ' text-white border-red-700'
                    }
                  >
                    {flightStatus.status === 'On Time' ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {flightStatus.status}
                  </Badge>
                </div>
                {flightStatus.delay && flightStatus.delay > 0 && (
                  <div className="text-sm text-red-600 mt-1">
                    Delayed by {flightStatus.delay} minutes
                  </div>
                )}
                {flightStatus.gate && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Gate: {flightStatus.gate}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Route & Traffic Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Route & Locations
            </CardTitle>
            <CardDescription>Pickup and dropoff locations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Run Type
              </label>
              <Badge variant="outline" className="ml-2">
                {activeRun.type === 'pickup' ? 'Pickup' : 'Dropoff'}
              </Badge>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Pickup Location
              </label>
              <div className="text-lg">{activeRun.pickupLocation}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Dropoff Location
              </label>
              <div className="text-lg">{activeRun.dropoffLocation}</div>
            </div>

            {trafficStatus && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="h-4 w-4" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Traffic Conditions
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Duration
                    </label>
                    <div className="text-sm font-semibold">
                      {trafficStatus.duration} min
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Distance
                    </label>
                    <div className="text-sm font-semibold">
                      {trafficStatus.distance}
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <Badge
                    variant="outline"
                    className={
                      trafficStatus.status === 'good'
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : trafficStatus.status === 'moderate'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          : 'bg-red-100 text-red-800 border-red-200'
                    }
                  >
                    {trafficStatus.status === 'good'
                      ? '🟢'
                      : trafficStatus.status === 'moderate'
                        ? '🟡'
                        : '🔴'}{' '}
                    {trafficStatus.status.charAt(0).toUpperCase() +
                      trafficStatus.status.slice(1)}{' '}
                    Traffic
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Run Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Run Details
            </CardTitle>
            <CardDescription>
              Additional information about this run
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Price
                </label>
                <div className="text-lg font-semibold">${activeRun.price}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Estimated Duration
                </label>
                <div className="text-lg">{activeRun.estimatedDuration} min</div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Scheduled Time
              </label>
              <div className="text-lg">
                {new Date(activeRun.scheduledTime).toLocaleString()}
              </div>
            </div>

            {activeRun.notes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Notes
                </label>
                <div className="text-sm bg-gray-50 p-3 rounded-md dark:bg-gray-800">
                  {activeRun.notes}
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="bg-green-700 hover:bg-green-800 text-white"
                  onClick={() => {
                    completeRunMutation.mutate(activeRun.id);
                  }}
                  disabled={completeRunMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {completeRunMutation.isPending
                    ? 'Completing...'
                    : 'Complete Run'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    cancelRunMutation.mutate(activeRun.id);
                  }}
                  disabled={cancelRunMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {cancelRunMutation.isPending ? 'Cancelling...' : 'Cancel Run'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
