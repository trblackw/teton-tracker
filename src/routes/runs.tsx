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
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { runsApi } from '../lib/api/client';
import { useMultipleRunsData } from '../lib/hooks/use-api-data';
import { useTimezoneFormatters } from '../lib/hooks/use-timezone';
import { type Run, type RunStatus } from '../lib/schema';
import { pollingService } from '../lib/services/polling-service';
import { toasts } from '../lib/toast';

function Runs() {
  const queryClient = useQueryClient();
  const { formatScheduleTime } = useTimezoneFormatters();

  // Tab state
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');

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

  // Filter runs based on tab
  const currentRuns = runs.filter(
    run => run.status === 'scheduled' || run.status === 'active'
  );

  const pastRuns = runs.filter(
    run => run.status === 'completed' || run.status === 'cancelled'
  );

  const activeRuns = activeTab === 'current' ? currentRuns : pastRuns;

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

  // Mutation for deleting runs
  const deleteRunMutation = useMutation({
    mutationFn: runsApi.deleteRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      toasts.success('Run deleted', 'The run has been successfully removed.');
    },
    onError: error => {
      console.error('Failed to delete run:', error);
      toasts.error(
        'Failed to delete run',
        'Please try again or contact support if the problem persists.'
      );
    },
  });

  const refreshAllData = () => {
    queryClient.invalidateQueries({ queryKey: ['runs'] });
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

  const getTabHeader = () => {
    const count = activeRuns.length;
    const tabName = activeTab === 'current' ? 'Current' : 'Past';
    return {
      title: `${tabName} Runs`,
      subtitle:
        count === 0
          ? `No ${activeTab} runs`
          : `${count} ${activeTab} run${count !== 1 ? 's' : ''}`,
    };
  };

  const renderEmptyState = () => {
    if (activeTab === 'current') {
      return (
        <Card className="bg-accent/50">
          <CardContent className="p-8 text-center">
            <Plane className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <p className="text-muted-foreground text-lg mb-4">
              No current runs scheduled. Add your first run to get started!
            </p>
            <Link to="/add">
              <Button className="mt-2 bg-green-500 hover:bg-green-600 text-white">
                <Plus className="h-4 w-4" />
                Add Your First Run
              </Button>
            </Link>
          </CardContent>
        </Card>
      );
    } else {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Plane className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <p className="text-muted-foreground text-lg mb-4">
              No completed or cancelled runs yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Completed runs will appear here for your records.
            </p>
          </CardContent>
        </Card>
      );
    }
  };

  if (runsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Runs</h2>
          <p className="text-muted-foreground mt-1">Loading your runs...</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading runs...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (runsError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Runs</h2>
          <p className="text-muted-foreground mt-1">Failed to load runs</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
            <p className="text-destructive text-lg mb-4">
              Failed to load runs from database
            </p>
            <Button onClick={() => refetchRuns()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { title, subtitle } = getTabHeader();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshAllData}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Link to="/add">
            <Button className="bg-green-500 hover:bg-green-600 text-white">
              Add Run
            </Button>
          </Link>
        </div>
      </div>

      {/* API Loading Indicator */}
      {runsApiData.isLoading && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <p className="text-primary text-sm">
              Fetching latest flight and traffic data...
            </p>
          </div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={value => setActiveTab(value as 'current' | 'past')}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current" className="mb-1">
            Current ({currentRuns.length})
          </TabsTrigger>
          <TabsTrigger value="past">Past ({pastRuns.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {currentRuns.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="grid gap-4">
              {runsApiData.data
                .filter(({ run }) =>
                  currentRuns.some(currentRun => currentRun.id === run.id)
                )
                .map(({ run, flightStatus, trafficData }) => (
                  <Card key={run.id} className="w-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {run.flightNumber}
                            {runsApiData.isLoading && (
                              <span className="ml-2 inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></span>
                            )}
                            {runsApiData.isError && (
                              <span className="ml-2 text-destructive text-sm">
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
                            onClick={() => handleDeleteRun(run.id)}
                            disabled={deleteRunMutation.isPending}
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
                            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium">
                              {formatScheduleTime(run.scheduledTime)}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <span className="text-sm">
                              {run.type === 'pickup' ? 'Pickup' : 'Dropoff'} •{' '}
                              {run.pickupLocation} → {run.dropoffLocation}
                            </span>
                          </div>
                          {run.notes && (
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-muted-foreground">
                                {run.notes}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {flightStatus && (
                            <div className="flex items-center gap-2">
                              <Plane className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm">
                                Flight: {flightStatus.status}
                                {flightStatus.delay &&
                                  flightStatus.delay > 0 && (
                                    <span className="text-destructive ml-1">
                                      (+{flightStatus.delay} min)
                                    </span>
                                  )}
                              </span>
                            </div>
                          )}
                          {trafficData && (
                            <div className="flex items-start gap-2">
                              <Navigation className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <span className="text-sm">
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
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                                <span className="text-sm text-orange-600 dark:text-orange-400">
                                  {trafficData.incidents.length} incident(s)
                                </span>
                              </div>
                            )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refreshRunData(run)}
                          disabled={runsApiData.isLoading}
                          className="min-w-0"
                        >
                          {runsApiData.isLoading
                            ? 'Loading...'
                            : 'Refresh Data'}
                        </Button>
                        {run.status === 'scheduled' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(run.id, 'active')}
                            disabled={updateStatusMutation.isPending}
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
                              handleUpdateStatus(run.id, 'completed')
                            }
                            disabled={updateStatusMutation.isPending}
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
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastRuns.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="grid gap-4">
              {runsApiData.data
                .filter(({ run }) =>
                  pastRuns.some(pastRun => pastRun.id === run.id)
                )
                .map(({ run, flightStatus, trafficData }) => (
                  <Card key={run.id} className="w-full opacity-75">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {run.flightNumber}
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
                            onClick={() => handleDeleteRun(run.id)}
                            disabled={deleteRunMutation.isPending}
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
                            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium">
                              {formatScheduleTime(run.scheduledTime)}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <span className="text-sm">
                              {run.type === 'pickup' ? 'Pickup' : 'Dropoff'} •{' '}
                              {run.pickupLocation} → {run.dropoffLocation}
                            </span>
                          </div>
                          {run.notes && (
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-muted-foreground">
                                {run.notes}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {flightStatus && (
                            <div className="flex items-center gap-2">
                              <Plane className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm">
                                Flight: {flightStatus.status}
                                {flightStatus.delay &&
                                  flightStatus.delay > 0 && (
                                    <span className="text-destructive ml-1">
                                      (+{flightStatus.delay} min)
                                    </span>
                                  )}
                              </span>
                            </div>
                          )}
                          {trafficData && (
                            <div className="flex items-start gap-2">
                              <Navigation className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <span className="text-sm">
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
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                                <span className="text-sm text-orange-600 dark:text-orange-400">
                                  {trafficData.incidents.length} incident(s)
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute('/runs')({
  component: Runs,
});
