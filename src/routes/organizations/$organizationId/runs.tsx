import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Clock,
  FileText,
  Filter,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { ExpandableActionsDrawer } from '../../../components/ui/expandable-actions-drawer';
import { Input } from '../../../components/ui/input';
import PageWrapper from '../../../components/ui/page-wrapper';
import { RunCard } from '../../../components/ui/run-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { StickyHeader } from '../../../components/ui/sticky-header';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../components/ui/tabs';
import { useOrgRunsApi } from '../../../lib/hooks';
import { useMultipleRunsData } from '../../../lib/hooks/use-api-data';
import { useTimezoneFormatters } from '../../../lib/hooks/use-timezone';
import { queryKeys } from '../../../lib/react-query-client';
import { type Run, type RunStatus } from '../../../lib/schema';
import { toasts } from '../../../lib/toast';

function Runs() {
  const queryClient = useQueryClient();
  const { formatTime } = useTimezoneFormatters();
  const navigate = useNavigate();
  const runsApi = useOrgRunsApi();

  // Tab state
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [runToDelete, setRunToDelete] = useState<string | null>(null);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAirline, setSelectedAirline] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('scheduledTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Query for runs from API
  const {
    data: runs = [],
    isLoading: runsLoading,
    isError: runsError,
    refetch: refetchRuns,
  } = useQuery({
    queryKey: queryKeys.runs(),
    queryFn: () => runsApi.getRuns(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const runsApiData = useMultipleRunsData(runs);

  // Helper function to filter runs based on search and filters
  const filterRuns = (runsToFilter: Run[]) => {
    let filtered = runsToFilter;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        run =>
          run.flightNumber.toLowerCase().includes(searchLower) ||
          run.airline.toLowerCase().includes(searchLower) ||
          run.pickupLocation.toLowerCase().includes(searchLower) ||
          run.dropoffLocation.toLowerCase().includes(searchLower) ||
          run.departure.toLowerCase().includes(searchLower) ||
          run.reservationId.toLowerCase().includes(searchLower) ||
          (run.billTo && run.billTo.toLowerCase().includes(searchLower)) ||
          run.arrival.toLowerCase().includes(searchLower) ||
          (run.notes && run.notes.toLowerCase().includes(searchLower))
      );
    }

    // Apply status filter
    if (selectedStatus) {
      filtered = filtered.filter(run => run.status === selectedStatus);
    }

    // Apply type filter
    if (selectedType) {
      filtered = filtered.filter(run => run.type === selectedType);
    }

    // Apply airline filter
    if (selectedAirline) {
      filtered = filtered.filter(run => run.airline === selectedAirline);
    }

    return filtered;
  };

  // Helper function to sort runs
  const sortRuns = (runsToSort: Run[]) => {
    return [...runsToSort].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'scheduledTime':
          aValue = new Date(a.scheduledTime);
          bValue = new Date(b.scheduledTime);
          break;
        case 'createdAt':
          aValue = a.createdAt || new Date(0);
          bValue = b.createdAt || new Date(0);
          break;
        case 'updatedAt':
          aValue = a.updatedAt || new Date(0);
          bValue = b.updatedAt || new Date(0);
          break;
        case 'completedAt':
          aValue = a.completedAt || new Date(0);
          bValue = b.completedAt || new Date(0);
          break;
        case 'price':
          aValue = parseInt(a.price);
          bValue = parseInt(b.price);
          break;
        case 'estimatedDuration':
          aValue = a.estimatedDuration;
          bValue = b.estimatedDuration;
          break;
        case 'actualDuration':
          aValue = a.actualDuration || 0;
          bValue = b.actualDuration || 0;
          break;
        case 'flightNumber':
          aValue = a.flightNumber.toLowerCase();
          bValue = b.flightNumber.toLowerCase();
          break;
        case 'airline':
          aValue = a.airline.toLowerCase();
          bValue = b.airline.toLowerCase();
          break;
        default:
          aValue = a.scheduledTime;
          bValue = b.scheduledTime;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Filter and sort runs based on tab
  const baseCurrentRuns = runs.filter(
    run => run.status === 'scheduled' || run.status === 'active'
  );
  const basePastRuns = runs.filter(
    run => run.status === 'completed' || run.status === 'cancelled'
  );

  const currentRuns = sortRuns(filterRuns(baseCurrentRuns));
  const pastRuns = sortRuns(filterRuns(basePastRuns));

  // Get available filter options based on current tab
  const activeRuns = selectedStatus === 'all' ? baseCurrentRuns : basePastRuns;
  const availableAirlines = Array.from(
    new Set(activeRuns.map(run => run.airline))
  ).sort();
  const availableStatuses = Array.from(
    new Set(activeRuns.map(run => run.status))
  ).sort();
  const availableTypes = Array.from(
    new Set(activeRuns.map(run => run.type))
  ).sort();

  // Clear filters when switching tabs
  const handleTabChange = (value: string) => {
    const newTab = value as 'current' | 'past';
    setActiveTab(newTab);
    setSelectedStatus('');
    setSearchTerm('');
    setSortBy('scheduledTime');
    setSortOrder('asc');
  };

  // Mutation for updating run status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RunStatus }) =>
      runsApi.updateRunStatus(id, status),
    onSuccess: async (updatedRun: Run | null) => {
      if (updatedRun) {
        // Update the cache immediately with the updated run data
        queryClient.setQueryData(
          queryKeys.runs(),
          (oldData: Run[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.map((run: Run) =>
              run.id === updatedRun.id ? updatedRun : run
            );
          }
        );
      }
      // Also invalidate to ensure consistency
      await queryClient.invalidateQueries({ queryKey: queryKeys.runs() });
    },
    onError: error => {
      console.error('Failed to update run status:', error);
    },
  });

  // Mutation for deleting runs
  const deleteRunMutation = useMutation({
    mutationFn: runsApi.deleteRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs() });
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
    queryClient.invalidateQueries({ queryKey: queryKeys.runs() });
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

  // Search content for drawer
  const SearchContent = () => (
    <div>
      <Input
        type="text"
        placeholder={`Search ${selectedStatus === 'all' ? 'all' : 'past'} runs...`}
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full"
        autoFocus
      />
    </div>
  );

  // Filter content for drawer
  const FilterContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Airline Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Airline</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                value={selectedAirline}
                onValueChange={setSelectedAirline}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All airlines" />
                </SelectTrigger>
                <SelectContent>
                  {availableAirlines.map(airline => (
                    <SelectItem key={airline} value={airline}>
                      {airline}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAirline && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedAirline('')}
                title="Clear airline filter"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Status Filter */}
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
                        <Badge
                          className={`text-xs ${getStatusColor(status as RunStatus)}`}
                        >
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
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Type</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedType && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedType('')}
                title="Clear type filter"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Sort Options */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Sort by</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduledTime">Scheduled Time</SelectItem>
                  <SelectItem value="createdAt">Created</SelectItem>
                  <SelectItem value="updatedAt">Updated</SelectItem>
                  {selectedStatus === 'past' && (
                    <SelectItem value="completedAt">Completed</SelectItem>
                  )}
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="estimatedDuration">
                    Est. Duration
                  </SelectItem>
                  {selectedStatus === 'past' && (
                    <SelectItem value="actualDuration">
                      Actual Duration
                    </SelectItem>
                  )}
                  <SelectItem value="flightNumber">Flight Number</SelectItem>
                  <SelectItem value="airline">Airline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'asc' ? (
                <ArrowUp className="size-4" />
              ) : (
                <ArrowDown className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Clear All Filters Button */}
      {(searchTerm ||
        selectedStatus !== 'all' ||
        selectedAirline ||
        selectedType) && (
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setSelectedStatus('all');
              setSelectedAirline('');
              setSelectedType('');
            }}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );

  const getTabHeader = () => {
    if (selectedStatus === 'all') {
      return {
        title: 'All Runs',
        subtitle: 'Manage all runs',
      };
    } else {
      return {
        title: 'Past Runs',
        subtitle: 'View completed & cancelled runs',
      };
    }
  };

  const renderEmptyState = (tab: 'current' | 'past') => {
    if (tab === 'current') {
      return (
        <Card className="text-center">
          <CardContent>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium text-foreground">
                  No current runs
                </h3>
              </div>
              <Link to="/add">
                <Button className="bg-highlight hover:bg-highlight/90 text-white">
                  <Plus className="h-4 w-4" strokeWidth={3} />
                  Schedule Run
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      );
    } else {
      return (
        <Card className="text-center ">
          <CardContent>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium text-foreground">
                  No past runs
                </h3>
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
      <Card className="text-center ">
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

  if (runsApiData.isLoading) {
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <p className="text-primary text-sm">
          Fetching latest flight and traffic data...
        </p>
      </div>
    </div>;
  }

  return (
    <PageWrapper>
      <StickyHeader title={title} subtitle={subtitle} />
      <div className="space-y-3">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
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

          {/* Search & Filter Actions */}
          <ExpandableActionsDrawer
            disabled={
              runsApiData.isLoading ||
              (activeTab === 'current' && !currentRuns.length) ||
              (activeTab === 'past' && !pastRuns.length)
            }
            actions={[
              {
                id: 'search',
                icon: <Search className="h-4 w-4" />,
                label: 'Search Runs',
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
                  [selectedAirline, selectedStatus, selectedType].filter(
                    Boolean
                  ).length || undefined,
                showHeader: false, // Minimal filter with no header
              },
            ]}
          />
          <TabsContent value="current" className="space-y-4">
            {currentRuns.length === 0 ? (
              // Check if it's due to filtering
              (searchTerm ||
                selectedAirline ||
                selectedStatus ||
                selectedType) &&
              baseCurrentRuns.length > 0 ? (
                <Card className="text-center ">
                  <CardContent>
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        <Search className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-medium text-foreground">
                          No matching runs found
                        </h3>
                        <p className="text-muted-foreground max-w-md">
                          No current runs match your search criteria. Try
                          adjusting your filters.
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedAirline('');
                          setSelectedStatus('');
                          setSelectedType('');
                        }}
                        variant="outline"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                renderEmptyState('current')
              )
            ) : (
              <div className="grid gap-4">
                {runsApiData.data
                  .filter(({ run }) =>
                    currentRuns.some(currentRun => currentRun.id === run.id)
                  )
                  .map(({ run, flightStatus, trafficData }) => (
                    <RunCard
                      key={run.id}
                      run={run}
                      runsLoading={runsApiData.isLoading}
                      runsError={runsApiData.isError}
                      trafficData={trafficData}
                      handleStopRun={handleStopRun}
                      handleEditRun={handleEditRun}
                      refreshRunData={refreshRunData}
                      flightStatus={flightStatus}
                      formatTime={formatTime}
                    />
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastRuns.length === 0 ? (
              // Check if it's due to filtering
              (searchTerm ||
                selectedAirline ||
                selectedStatus ||
                selectedType) &&
              basePastRuns.length > 0 ? (
                <Card className="text-center ">
                  <CardContent>
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        <Search className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-medium text-foreground">
                          No matching runs found
                        </h3>
                        <p className="text-muted-foreground max-w-md">
                          No past runs match your search criteria. Try adjusting
                          your filters.
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedAirline('');
                          setSelectedStatus('');
                          setSelectedType('');
                        }}
                        variant="outline"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                renderEmptyState('past')
              )
            ) : (
              <div className="grid gap-4">
                {runsApiData.data
                  .filter(({ run }) =>
                    pastRuns.some(pastRun => pastRun.id === run.id)
                  )
                  .map(({ run, flightStatus, trafficData }) => (
                    <RunCard
                      key={run.id}
                      run={run}
                      runsLoading={runsApiData.isLoading}
                      runsError={runsApiData.isError}
                      trafficData={trafficData}
                      handleStopRun={handleStopRun}
                      handleEditRun={handleEditRun}
                      refreshRunData={refreshRunData}
                      flightStatus={flightStatus}
                    />
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}

export const Route = createFileRoute('/organizations/$organizationId/runs')({
  component: Runs,
});
