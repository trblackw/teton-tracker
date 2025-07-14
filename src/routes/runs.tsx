import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Clock10,
  Edit,
  FileText,
  MapPin,
  Navigation,
  Plane,
  Play,
  Plus,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { RefreshButton } from '../components/ui/refresh-button';
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
import { toasts } from '../lib/toast';

function Runs() {
  const queryClient = useQueryClient();
  const { formatScheduleTime } = useTimezoneFormatters();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [runToDelete, setRunToDelete] = useState<string | null>(null);

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
      toasts.success('Run deleted', 'The run has been deleted successfully.');
      setDeleteDialogOpen(false);
      setRunToDelete(null);
    },
    onError: error => {
      console.error('Failed to delete run:', error);
      toasts.error('Failed to delete run', 'Please try again.');
    },
  });

  // Data refresh handlers
  const refreshAllData = () => {
    refetchRuns();
    queryClient.invalidateQueries({ queryKey: ['runs'] });
  };

  const handleUpdateStatus = (id: string, status: RunStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleStartRun = (run: Run) => {
    handleUpdateStatus(run.id, 'active');
    toasts.success('Run started', `${run.flightNumber} run is now active.`);
  };

  const handleStopRun = (run: Run) => {
    handleUpdateStatus(run.id, 'completed');
    toasts.success(
      'Run completed',
      `${run.flightNumber} run has been completed.`
    );
  };

  const handleDeleteRun = (id: string) => {
    setRunToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (runToDelete) {
      deleteRunMutation.mutate(runToDelete);
    }
  };

  const handleEditRun = (run: Run) => {
    navigate({ to: '/add', search: { edit: run.id } });
  };

  const refreshRunData = (run: Run) => {
    queryClient.invalidateQueries({
      queryKey: ['flight-status', run.flightNumber],
    });
    queryClient.invalidateQueries({
      queryKey: ['traffic-data', run.pickupLocation, run.dropoffLocation],
    });
  };

  const getStatusColor = (status: RunStatus) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTabHeader = () => {
    if (activeTab === 'current') {
      return {
        title: 'Current Runs',
        subtitle: 'View and manage your scheduled and active runs',
      };
    } else {
      return {
        title: 'Past Runs',
        subtitle: 'View your completed and cancelled runs',
      };
    }
  };

  const renderEmptyState = () => {
    if (activeTab === 'current') {
      return (
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium text-foreground">
                  No current runs
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Schedule your first run to get started tracking flights and
                  managing your transportation services.
                </p>
              </div>
              <Link to="/add">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Run
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      );
    } else {
      return (
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium text-foreground">
                  No past runs
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Completed and cancelled runs will appear here.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  if (runsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-80 bg-muted rounded animate-pulse mt-2" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="w-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-48 bg-muted rounded animate-pulse mt-2" />
                  </div>
                  <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-muted rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (runsError) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-medium text-foreground">
                Error loading runs
              </h3>
              <p className="text-muted-foreground max-w-md">
                Unable to load your runs. Please try again.
              </p>
            </div>
            <Button onClick={refreshAllData} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
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
          <RefreshButton onRefresh={refreshAllData} />
          <Link to="/add">
            <Button className="bg-green-600 hover:bg-green-700 text-white">
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
          <TabsTrigger value="current">
            Current{' '}
            <span className="text-sm text-muted-foreground ml-1">
              ({currentRuns.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="past">
            Past{' '}
            <span className="text-sm text-muted-foreground ml-1">
              ({pastRuns.length})
            </span>
          </TabsTrigger>
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
                  <Card
                    key={run.id}
                    className="w-full cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleEditRun(run)}
                  >
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
                          <CardDescription>{run.airline}</CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge
                            className={`${getStatusColor(run.status)} mr-2`}
                          >
                            {run.status}
                          </Badge>

                          {/* Start/Stop Controls */}
                          {run.status === 'scheduled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                handleStartRun(run);
                              }}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Start run"
                            >
                              <Play className="size-4" />
                            </Button>
                          )}

                          {run.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                handleStopRun(run);
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Complete run"
                            >
                              <CheckCircle className="size-4" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              handleEditRun(run);
                            }}
                            className="text-muted-foreground"
                            title="Edit run"
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteRun(run.id);
                            }}
                            disabled={deleteRunMutation.isPending}
                            title="Delete run"
                          >
                            <Trash2 className="size-4 text-destructive" />
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
                          <div className="flex items-center gap-2">
                            <Clock10 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">
                              Est. {run.estimatedDuration} min
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
                                    <span className="text-red-600 ml-1">
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
                                    trafficData.status === 'good'
                                      ? 'text-green-600'
                                      : trafficData.status === 'moderate'
                                        ? 'text-yellow-600'
                                        : 'text-red-600'
                                  }
                                >
                                  {trafficData.status}
                                </span>
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              ${run.price}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                refreshRunData(run);
                              }}
                              className="text-muted-foreground"
                              title="Refresh data"
                            >
                              <RefreshButton
                                onRefresh={() => refreshRunData(run)}
                              />
                            </Button>
                          </div>
                        </div>
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
                          <CardDescription>{run.airline}</CardDescription>
                        </div>
                        <div className="flex items-center">
                          <Badge
                            className={`${getStatusColor(run.status)} mr-2`}
                          >
                            {run.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteRun(run.id);
                            }}
                            disabled={deleteRunMutation.isPending}
                            title="Delete run"
                          >
                            <Trash2 className="size-4 text-destructive" />
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
                          <div className="flex items-center gap-2">
                            <Clock10 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">
                              Est. {run.estimatedDuration} min
                              {run.actualDuration && (
                                <span className="ml-1">
                                  • Actual: {run.actualDuration} min
                                </span>
                              )}
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
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              ${run.price}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Run</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this run? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteRunMutation.isPending}
            >
              {deleteRunMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute('/runs')({
  component: Runs,
});
