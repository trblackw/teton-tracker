import { createFileRoute, Link } from '@tanstack/react-router';
import {
  Activity,
  AlertCircle,
  Clock,
  FileText,
  MapPin,
  Navigation,
  Plane,
  Trash2,
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
import { useMultipleRunsData } from '../lib/hooks/use-api-data';
import { queryClient } from '../lib/react-query-client';
import { type Run, type RunStatus } from '../lib/schema';
import { pollingService } from '../lib/services/polling-service';

function Runs() {
  const [runs, setRuns] = useState<Run[]>([]);
  const runsApiData = useMultipleRunsData(runs);

  // Load runs from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRuns = window.localStorage.getItem('airport-runs');
      if (savedRuns) {
        try {
          const parsedRuns = JSON.parse(savedRuns);
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

  if (runs.length === 0) {
    return (
      <Card>
        <CardContent className='p-8 text-center'>
          <Plane className='h-16 w-16 text-gray-400 mx-auto mb-6' />
          <p className='text-gray-500 text-lg mb-4'>
            No runs scheduled. Add your first run to get started!
          </p>
          <Link to='/add'>
            <Button className='mt-2'>
              <Activity className='h-4 w-4 mr-2' />
              Add Your First Run
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>Current Runs</h2>
          <p className='text-gray-600 mt-1'>
            {runs.length} run{runs.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>
      </div>

      {/* API Loading Indicator */}
      {runsApiData.isFetching && (
        <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
          <div className='flex items-center gap-2'>
            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600'></div>
            <p className='text-blue-800 text-sm'>
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
                        <span className='ml-2 inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600'></span>
                      )}
                      {isError && (
                        <span className='ml-2 text-red-500 text-sm'>⚠️</span>
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
                      onClick={() => deleteRun(run.id)}
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
                      <Clock className='h-4 w-4 text-gray-500 flex-shrink-0' />
                      <span className='text-sm font-medium'>
                        {new Date(run.scheduledTime).toLocaleString()}
                      </span>
                    </div>
                    <div className='flex items-start gap-2'>
                      <MapPin className='h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5' />
                      <span className='text-sm'>
                        {run.type === 'pickup' ? 'Pickup' : 'Dropoff'} •{' '}
                        {run.pickupLocation} → {run.dropoffLocation}
                      </span>
                    </div>
                    {run.notes && (
                      <div className='flex items-start gap-2'>
                        <FileText className='h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5' />
                        <span className='text-sm text-gray-600'>
                          {run.notes}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className='space-y-3'>
                    {flightStatus && (
                      <div className='flex items-center gap-2'>
                        <Plane className='h-4 w-4 text-gray-500 flex-shrink-0' />
                        <span className='text-sm'>
                          Flight: {flightStatus.status}
                          {flightStatus.delay && flightStatus.delay > 0 && (
                            <span className='text-red-600 ml-1'>
                              (+{flightStatus.delay} min)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {trafficData && (
                      <div className='flex items-start gap-2'>
                        <Navigation className='h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5' />
                        <span className='text-sm'>
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
                        <div className='flex items-center gap-2'>
                          <AlertCircle className='h-4 w-4 text-orange-500 flex-shrink-0' />
                          <span className='text-sm text-orange-600'>
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
                      onClick={() => updateRunStatus(run.id, 'active')}
                      className='min-w-0'
                    >
                      Start Run
                    </Button>
                  )}
                  {run.status === 'active' && (
                    <Button
                      size='sm'
                      variant='secondary'
                      onClick={() => updateRunStatus(run.id, 'completed')}
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

export const Route = createFileRoute()({
  component: Runs,
});
