import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Car, Clock, Filter, MapPin, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import {
  ExpandableActionsDrawer,
  type DrawerAction,
} from '../../../components/ui/expandable-actions-drawer';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import PageWrapper from '../../../components/ui/page-wrapper';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { StickyHeader } from '../../../components/ui/sticky-header';
import { useUser, useUserOrganization } from '../../../lib/auth-client';
import { useOrgRunsApi } from '../../../lib/hooks';
import { useNonAdminRedirect } from '../../../lib/hooks/use-non-admin-redirect';
import { useCurrentOrgId } from '../../../lib/hooks/use-org-navigation';
import { queryKeys } from '../../../lib/react-query-client';

// Availability filter options
const AVAILABILITY_FILTERS = [
  { value: 'all', label: 'All Drivers' },
  { value: 'available', label: 'Now' },
  { value: 'available-1h', label: 'in 1 Hour' },
  { value: 'available-2h', label: 'in 2 Hours' },
  { value: 'available-4h', label: 'in 4 Hours' },
  { value: 'available-today', label: 'Today' },
  { value: 'active', label: 'Currently Active' },
  { value: 'scheduled', label: 'Has Scheduled Runs' },
];

function DriversPage() {
  const queryClient = useQueryClient();
  const { data: organization } = useUserOrganization();
  const { user: currentUser } = useUser();
  const { isAdmin, isLoading } = useNonAdminRedirect();
  const runsApi = useOrgRunsApi();
  const organizationId = useCurrentOrgId();

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Use organization members instead of separate API call
  const membersData = organization?.members;

  // Filter out current user from drivers list (admin shouldn't drive)
  const drivers = useMemo(() => {
    return (
      membersData?.filter((member: any) => member.userId !== currentUser?.id) ||
      []
    );
  }, [membersData, currentUser?.id]);

  // Fetch all runs to calculate driver stats
  const { data: allRuns = [], isLoading: runsLoading } = useQuery({
    queryKey: queryKeys.organizationRuns(organizationId),
    queryFn: () => runsApi.getOrganizationRuns(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!organizationId && !!currentUser?.id && isAdmin,
  });

  // Filter and search drivers
  const filteredDrivers = useMemo(() => {
    let filtered = drivers;

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((member: any) =>
        `${member.user?.name || ''}`.toLowerCase().includes(search)
      );
    }

    // Apply availability filter
    filtered = filtered.filter((member: any) =>
      getDriverAvailability(member, filterStatus)
    );

    return filtered;
  }, [drivers, searchTerm, filterStatus, allRuns]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
  };

  // Create drawer actions
  const drawerActions: DrawerAction[] = [
    {
      id: 'search',
      icon: <Search className="h-4 w-4" />,
      label: 'Search Drivers',
      showHeader: false,
      content: (
        <div className="space-y-3">
          <div>
            <Label
              htmlFor="driver-search-input"
              className="text-sm font-medium"
            >
              Search by driver name
            </Label>
            <Input
              id="driver-search-input"
              type="text"
              placeholder="Type to search drivers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="mt-1"
            />
          </div>
          {searchTerm && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {filteredDrivers.length} driver
                {filteredDrivers.length !== 1 ? 's' : ''} found
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'filter-availability',
      icon: <Filter className="h-4 w-4" />,
      label: 'Filter by Availability',
      badge: filterStatus !== 'all' ? '●' : undefined,
      showHeader: false,
      content: (
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Filter by driver availability
            </Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABILITY_FILTERS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filterStatus !== 'all' && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Filtering by{' '}
                {AVAILABILITY_FILTERS.find(
                  f => f.value === filterStatus
                )?.label.toLowerCase()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      ),
    },
  ];

  // Helper function to get driver availability info for display
  const getDriverAvailabilityInfo = (member: any) => {
    const isAvailable = getDriverAvailability(member, 'available');
    const isBusy = getDriverAvailability(member, 'busy');

    if (isBusy) {
      return { text: 'Busy', variant: 'destructive' as const };
    } else if (isAvailable) {
      return { text: 'Available', variant: 'default' as const };
    } else {
      return { text: 'Scheduled', variant: 'secondary' as const };
    }
  };

  // Helper function to check driver availability based on runs
  const getDriverAvailability = (member: any, filter: string) => {
    const driverRuns = allRuns.filter(
      (run: any) => run.createdById === member.user?.id
    );
    const now = new Date();

    const activeRuns = driverRuns.filter((run: any) => run.status === 'active');
    const scheduledRuns = driverRuns.filter(
      (run: any) => run.status === 'scheduled'
    );

    // Get the next scheduled run
    const upcomingRuns = scheduledRuns
      .map((run: any) => ({
        ...run,
        scheduledDate: new Date(run.scheduledTime),
      }))
      .filter((run: any) => run.scheduledDate > now)
      .sort(
        (a: any, b: any) =>
          a.scheduledDate.getTime() - b.scheduledDate.getTime()
      );

    const nextRun = upcomingRuns[0];

    switch (filter) {
      case 'available':
        return activeRuns.length === 0;
      case 'available-1h':
        return (
          activeRuns.length === 0 &&
          (!nextRun ||
            nextRun.scheduledDate.getTime() - now.getTime() > 60 * 60 * 1000)
        );
      case 'available-2h':
        return (
          activeRuns.length === 0 &&
          (!nextRun ||
            nextRun.scheduledDate.getTime() - now.getTime() > 120 * 60 * 1000)
        );
      case 'busy':
        return activeRuns.length > 0;
      case 'upcoming':
        return (
          nextRun &&
          nextRun.scheduledDate.getTime() - now.getTime() <= 60 * 60 * 1000
        );
      default:
        return true;
    }
  };

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center ">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading drivers...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!organization) {
    return (
      <PageWrapper>
        <div className="text-center ">
          <Users className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">
            Error Loading Organization
          </h1>
          <p className="text-muted-foreground">
            Failed to load organization details. Please try again.
          </p>
        </div>
      </PageWrapper>
    );
  }

  if (!currentUser) {
    return (
      <PageWrapper>
        <div className="text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
          <p className="text-muted-foreground">
            You must be logged in to view drivers.
          </p>
        </div>
      </PageWrapper>
    );
  }

  const filtersApplied = searchTerm || filterStatus !== 'all';

  return (
    <PageWrapper>
      <StickyHeader title="Drivers" subtitle="View & manage active runs">
        <ExpandableActionsDrawer
          actions={drawerActions}
          disabled={!drivers.length}
          onClearAll={filtersApplied ? clearFilters : undefined}
          rightContent={
            filtersApplied ? (
              <div className="text-sm text-muted-foreground">
                Showing {filteredDrivers.length} of {drivers.length} drivers
              </div>
            ) : undefined
          }
        />
        {!filtersApplied && (
          <div className="text-xs text-muted-foreground/50 flex justify-center">
            Showing {filteredDrivers.length} of {drivers.length} drivers
          </div>
        )}
      </StickyHeader>

      {/* Driver Cards */}
      <div className="grid gap-6">
        {filteredDrivers.map((member: any) => {
          const driver = member.user; // Extract the user object from the member

          // Calculate stats for this driver
          const driverRuns = allRuns.filter(
            (run: any) => run.createdById === driver?.id
          );
          const activeRuns = driverRuns.filter(
            (run: any) => run.status === 'active'
          );
          const scheduledRuns = driverRuns.filter(
            (run: any) => run.status === 'scheduled'
          );
          const completedRuns = driverRuns.filter(
            (run: any) => run.status === 'completed'
          );

          // Get next upcoming run
          const upcomingRuns = scheduledRuns
            .map((run: any) => ({
              ...run,
              scheduledDate: new Date(run.scheduledTime),
            }))
            .filter((run: any) => run.scheduledDate > new Date())
            .sort(
              (a: any, b: any) =>
                a.scheduledDate.getTime() - b.scheduledDate.getTime()
            );

          const nextRun = upcomingRuns[0];
          const availabilityInfo = getDriverAvailabilityInfo(member);

          return (
            <Card key={member.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  {/* Driver Info */}
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {driver?.name || 'Unknown Driver'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {driver?.email || 'No email'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                        <Badge
                          variant={availabilityInfo.variant}
                          className="text-xs"
                        >
                          {availabilityInfo.text}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {activeRuns.length} Active
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {scheduledRuns.length} Scheduled
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {completedRuns.length} Completed
                      </span>
                    </div>
                  </div>
                </div>
                {/* Runs */}
                <div className="mt-4">
                  {activeRuns.length > 0 ? (
                    <div className="space-y-3">
                      {activeRuns.slice(0, 2).map(run => (
                        <div
                          key={run.id}
                          className="border rounded-lg p-3 bg-muted/50"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-green-600" />
                              <span className="font-medium">
                                {run.flightNumber}{' '}
                                {run.type === 'pickup' ? 'Pickup' : 'Dropoff'}
                              </span>
                            </div>
                            <Badge className="bg-green-100 text-green-800">
                              Active
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {run.pickupLocation} → {run.dropoffLocation}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>
                                {new Date(
                                  run.scheduledTime
                                ).toLocaleDateString()}{' '}
                                at{' '}
                                {new Date(run.scheduledTime).toLocaleTimeString(
                                  [],
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {activeRuns.length > 2 && (
                        <p className="text-sm text-muted-foreground text-center">
                          +{activeRuns.length - 2} more active runs
                        </p>
                      )}
                    </div>
                  ) : scheduledRuns.length > 0 ? (
                    <div className="space-y-3">
                      {scheduledRuns.slice(0, 2).map(run => (
                        <div
                          key={run.id}
                          className="border rounded-lg p-3 bg-muted/50"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">
                                {run.flightNumber}{' '}
                                {run.type === 'pickup' ? 'Pickup' : 'Dropoff'}
                              </span>
                            </div>
                            <Badge className="bg-blue-100 text-blue-800">
                              Scheduled
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {run.pickupLocation} → {run.dropoffLocation}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>
                                {new Date(
                                  run.scheduledTime
                                ).toLocaleDateString()}{' '}
                                at{' '}
                                {new Date(run.scheduledTime).toLocaleTimeString(
                                  [],
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {scheduledRuns.length > 2 && (
                        <p className="text-sm text-muted-foreground text-center">
                          +{scheduledRuns.length - 2} more scheduled runs
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Car className="h-6 w-6 mx-auto mb-1 opacity-50" />
                      <p>No active runs assigned</p>
                      <p className="text-xs mt-1">
                        {completedRuns.length} completed runs total
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredDrivers.length === 0 && drivers.length > 0 && (
          <Card className="border-dashed">
            <CardContent className="text-center ">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                No Drivers Match Criteria
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                No drivers found matching the search and filter criteria
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {drivers.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Drivers Found</h3>
              <p className="text-muted-foreground text-sm mb-4">
                No other organization members found to display as drivers
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}

export const Route = createFileRoute('/organizations/$organizationId/drivers')({
  component: DriversPage,
});
