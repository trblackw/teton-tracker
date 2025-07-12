import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  AlertCircle,
  Clock,
  FileText,
  MapPin,
  Navigation,
  Plane,
  Plus,
  Trash2
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { runsApi } from '../lib/api/client';
import { useMultipleRunsData } from '../lib/hooks/use-api-data';
import { invalidateAllApiData } from '../lib/react-query-client';
import { type Run, type RunStatus } from '../lib/schema';
import { pollingService } from '../lib/services/polling-service';

function Runs() {
  const queryClient = useQueryClient();

  // Query for runs from API
  const {
    data: runs = [],
    isLoading: runsLoading,
    isError: runsError,
    refetch: refetchRuns,
  } = useQuery({
    queryKey: ['runs'],
    queryFn: () => runsApi.getRuns(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const runsApiData = useMultipleRunsData(runs);

  // Mutation for updating run status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RunStatus }) =>
      runsApi.updateRunStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    },
    onError: error => {
      console.error('Failed to update run status:', error);
    },
  });

  // Mutation for deleting run
  const deleteRunMutation = useMutation({
    mutationFn: (id: string) => runsApi.deleteRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    },
    onError: error => {
      console.error('Failed to delete run:', error);
    },
  });

  const refreshAllData = () => {
    invalidateAllApiData();
    runsApiData.refetchAll();
    refetchRuns();
  };

  const handleUpdateStatus = (id: string, status: RunStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleDeleteRun = (id: string) => {
    if (window.confirm('Are you sure you want to delete this run?')) {
      deleteRunMutation.mutate(id);
    }
  };

  const refreshRunData = (run: Run) => {
    const runData = runsApiData.data.find(data => data.run.id === run.id);
    if (runData) {
      queryClient.invalidateQueries({
        queryKey: ['flight-status', run.flightNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ['traffic-data', run.pickupLocation, run.dropoffLocation],
      });
    }
  };

  const getStatusColor = (status: RunStatus) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (runsLoading) {
    return (
      <div className='space-y-6'>
        <div>
          <h2 className='text-2xl font-bold text-foreground'>Current Runs</h2>
          <p className='text-muted-foreground mt-1'>Loading your runs...</p>
        </div>
        <Card>
          <CardContent className='p-8 text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
            <p className='text-muted-foreground'>
              Loading runs from database...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (runsError) {
    return (
      <div className='space-y-6'>
        <div>
          <h2 className='text-2xl font-bold text-foreground'>Current Runs</h2>
          <p className='text-muted-foreground mt-1'>Failed to load runs</p>
        </div>
        <Card className='border-destructive'>
          <CardContent className='p-8 text-center'>
            <AlertCircle className='h-16 w-16 text-destructive mx-auto mb-6' />
            <p className='text-destructive text-lg mb-4'>
              Failed to load runs from database
            </p>
            <Button onClick={() => refetchRuns()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className='space-y-6'>
        <div>
          <h2 className='text-2xl font-bold text-foreground'>Current Runs</h2>
          <p className='text-muted-foreground mt-1'>
            Manage your pickup & dropoff runs
          </p>
        </div>
        <Card className='bg-accent/50 border rounded-md'>
          <CardContent className='p-8 text-center'>
            <Plane className='h-16 w-16 text-muted-foreground mx-auto mb-6' />
            <p className='text-muted-foreground text-lg mb-4'>
              No runs scheduled. Add your first run to get started!
            </p>
            <Link to='/add'>
              <Button className='mt-2'>
                <Plus className='h-4 w-4' />
                Add Your First Run
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-foreground'>Current Runs</h2>
          <p className='text-muted-foreground mt-1'>
            {runs.length} run{runs.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>
      </div>

      {/* API Loading Indicator */}
      {runsApiData.isFetching && (
        <div className='bg-primary/5 border border-primary/20 rounded-lg p-4'>
          <div className='flex items-center gap-2'>
            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-primary'></div>
            <p className='text-primary text-sm'>
              Fetching latest flight and traffic data...
            </p>
          </div>
        </div>
      )}

      <div className='grid gap-4'>
        {runsApiData.data.map(
          ({ run, flightStatus, trafficData, isLoading, isError }) => (
            <Card key={run.id} className='w-full'>
              <CardHeader className='pb-3'>
                <div className='flex items-start justify-between'>
                  <div>
                    <CardTitle className='text-lg'>
                      {run.flightNumber}
                      {isLoading && (
                        <span className='ml-2 inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-primary'></span>
                      )}
                      {isError && (
                        <span className='ml-2 text-destructive text-sm'>
                          ⚠️
                        </span>
                      )}
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
                      onClick={() => handleDeleteRun(run.id)}
                      disabled={deleteRunMutation.isPending}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                  <div className='space-y-3'>
                    <div className='flex items-center gap-2'>
                      <Clock className='h-4 w-4 text-muted-foreground flex-shrink-0' />
                      <span className='text-sm font-medium'>
                        {new Date(run.scheduledTime).toLocaleString()}
                      </span>
                    </div>
                    <div className='flex items-start gap-2'>
                      <MapPin className='h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5' />
                      <span className='text-sm'>
                        {run.type === 'pickup' ? 'Pickup' : 'Dropoff'} •{' '}
                        {run.pickupLocation} → {run.dropoffLocation}
                      </span>
                    </div>
                    {run.notes && (
                      <div className='flex items-start gap-2'>
                        <FileText className='h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5' />
                        <span className='text-sm text-muted-foreground'>
                          {run.notes}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className='space-y-3'>
                    {flightStatus && (
                      <div className='flex items-center gap-2'>
                        <Plane className='h-4 w-4 text-muted-foreground flex-shrink-0' />
                        <span className='text-sm'>
                          Flight: {flightStatus.status}
                          {flightStatus.delay && flightStatus.delay > 0 && (
                            <span className='text-destructive ml-1'>
                              (+{flightStatus.delay} min)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {trafficData && (
                      <div className='flex items-start gap-2'>
                        <Navigation className='h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5' />
                        <span className='text-sm'>
                          Traffic: {trafficData.duration} min •{' '}
                          {trafficData.distance} •{' '}
                          <span
                            className={
                              trafficData.status === 'heavy'
                                ? 'text-red-600 dark:text-red-400'
                                : trafficData.status === 'moderate'
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-green-600 dark:text-green-400'
                            }
                          >
                            {trafficData.status}
                          </span>
                        </span>
                      </div>
                    )}
                    {trafficData?.incidents &&
                      trafficData.incidents.length > 0 && (
                        <div className='flex items-center gap-2'>
                          <AlertCircle className='h-4 w-4 text-orange-500 dark:text-orange-400 flex-shrink-0' />
                          <span className='text-sm text-orange-600 dark:text-orange-400'>
                            {trafficData.incidents.length} incident(s)
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                <div className='flex flex-wrap gap-2 mt-4'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => refreshRunData(run)}
                    disabled={isLoading}
                    className='min-w-0'
                  >
                    {isLoading ? 'Loading...' : 'Refresh Data'}
                  </Button>
                  {run.status === 'scheduled' && (
                    <Button
                      size='sm'
                      onClick={() => handleUpdateStatus(run.id, 'active')}
                      disabled={updateStatusMutation.isPending}
                      className='min-w-0'
                    >
                      Start Run
                    </Button>
                  )}
                  {run.status === 'active' && (
                    <Button
                      size='sm'
                      variant='secondary'
                      onClick={() => handleUpdateStatus(run.id, 'completed')}
                      disabled={updateStatusMutation.isPending}
                      className='min-w-0'
                    >
                      Complete Run
                    </Button>
                  )}
                  {run.status === 'active' && (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => pollingService.triggerPoll()}
                      className='min-w-0'
                    >
                      Manual Poll
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/runs')({
  component: Runs,
});
