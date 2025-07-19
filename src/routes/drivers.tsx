import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Car, Clock, Filter, MapPin, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { organizationsApi, runsApi } from '../lib/api/client';
import { useAppContext } from '../lib/AppContextProvider';
import { useNonAdminRedirect } from '../lib/hooks/use-non-admin-redirect';

export const Route = createFileRoute('/drivers')({
  component: DriversPage,
});

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
  const { currentUser } = useAppContext();
  const { isAdmin, organization } = useNonAdminRedirect();
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // Fetch organization members
  const {
    data: membersData,
    isLoading: membersLoading,
    error: membersError,
  } = useQuery({
    queryKey: ['organization-members', organization?.id],
    queryFn: () =>
      organizationsApi.getOrganizationMembers(
        organization!.id,
        currentUser!.id
      ),
    enabled: !!organization?.id && !!currentUser?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch all runs to calculate driver stats
  const { data: allRuns = [], isLoading: runsLoading } = useQuery({
    queryKey: ['organization-runs'],
    queryFn: runsApi.getOrganizationRuns,
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!organization?.id && !!currentUser?.id && isAdmin,
  });

  // Filter out the admin user to show only drivers
  const allDrivers = useMemo(() => {
    return (
      membersData?.members.filter(
        (member: any) => member.userId !== currentUser?.id
      ) || []
    );
  }, [membersData, currentUser?.id]);

  // Helper function to check driver availability based on runs
  const getDriverAvailability = (
    driver: { userId: string },
    filter: string
  ) => {
    const driverRuns = allRuns.filter(run => run.userId === driver.userId);
    const now = new Date();

    const activeRuns = driverRuns.filter(run => run.status === 'active');
    const scheduledRuns = driverRuns.filter(run => run.status === 'scheduled');

    // Get the next scheduled run
    const upcomingRuns = scheduledRuns
      .map(run => ({ ...run, scheduledDate: new Date(run.scheduledTime) }))
      .filter(run => run.scheduledDate > now)
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

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
            nextRun.scheduledDate.getTime() - now.getTime() >
              2 * 60 * 60 * 1000)
        );
      case 'available-4h':
        return (
          activeRuns.length === 0 &&
          (!nextRun ||
            nextRun.scheduledDate.getTime() - now.getTime() >
              4 * 60 * 60 * 1000)
        );
      case 'available-today':
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        return (
          activeRuns.length === 0 &&
          (!nextRun || nextRun.scheduledDate > endOfDay)
        );
      case 'active':
        return activeRuns.length > 0;
      case 'scheduled':
        return scheduledRuns.length > 0;
      case 'all':
      default:
        return true;
    }
  };

  // Filter drivers based on availability
  const filteredDrivers = useMemo(() => {
    return allDrivers.filter((driver: { userId: string }) =>
      getDriverAvailability(driver, availabilityFilter)
    );
  }, [allDrivers, availabilityFilter, allRuns]);

  // Helper function to get availability status text
  const getAvailabilityText = (driver: { userId: string }) => {
    const driverRuns = allRuns.filter(run => run.userId === driver.userId);
    const activeRuns = driverRuns.filter(run => run.status === 'active');
    const scheduledRuns = driverRuns.filter(run => run.status === 'scheduled');

    if (activeRuns.length > 0) {
      return { text: 'Active', variant: 'default' as const };
    }

    if (scheduledRuns.length > 0) {
      const now = new Date();
      const upcomingRuns = scheduledRuns
        .map(run => ({ ...run, scheduledDate: new Date(run.scheduledTime) }))
        .filter(run => run.scheduledDate > now)
        .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

      if (upcomingRuns.length > 0) {
        const nextRun = upcomingRuns[0];
        const hoursUntil = Math.round(
          (nextRun.scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60)
        );

        if (hoursUntil < 1) {
          return {
            text: 'Available (runs soon)',
            variant: 'secondary' as const,
          };
        } else if (hoursUntil < 4) {
          return {
            text: `Available (${hoursUntil}h)`,
            variant: 'secondary' as const,
          };
        }
      }
    }

    return { text: 'Available', variant: 'outline' as const };
  };

  if (membersLoading || runsLoading) {
    return (
      <div className="container mx-auto py-2 max-w-full overflow-hidden">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading drivers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (membersError) {
    return (
      <div className="container mx-auto py-2 max-w-full overflow-hidden">
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Error Loading Drivers</h1>
          <p className="text-muted-foreground">
            Failed to load organization members. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2 max-w-full overflow-hidden">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Drivers</h1>
        </div>
        <p className="text-muted-foreground">
          View & manage active runs for all organization drivers
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Availability:</label>
          </div>
          <Select
            value={availabilityFilter}
            onValueChange={setAvailabilityFilter}
          >
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
      </div>
      <div className="text-sm text-muted-foreground mb-2 flex justify-center">
        Showing {filteredDrivers.length} of {allDrivers.length} drivers
      </div>

      {/* Driver Cards */}
      <div className="grid gap-6">
        {filteredDrivers.map(
          (driver: {
            userId: string;
            firstName: string;
            lastName: string;
            imageUrl?: string;
          }) => {
            // Calculate stats for this driver
            const driverRuns = allRuns.filter(
              run => run.userId === driver.userId
            );
            const activeRuns = driverRuns.filter(
              run => run.status === 'active'
            );
            const scheduledRuns = driverRuns.filter(
              run => run.status === 'scheduled'
            );
            const completedRuns = driverRuns.filter(
              run => run.status === 'completed'
            );

            const availabilityStatus = getAvailabilityText(driver);

            return (
              <Link
                key={driver.userId}
                to="/driver/$driverId"
                params={{ driverId: driver.userId }}
                className="block hover:scale-[1.02] transition-transform duration-200"
              >
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {driver.imageUrl ? (
                          <img
                            src={driver.imageUrl}
                            alt={`${driver.firstName} ${driver.lastName}`}
                            className="h-10 w-10 rounded-full border"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg">
                            {driver.firstName} {driver.lastName}
                          </CardTitle>
                          <CardDescription>
                            Driver • {availabilityStatus.text}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            activeRuns.length > 0
                              ? 'default'
                              : scheduledRuns.length > 0
                                ? 'secondary'
                                : 'outline'
                          }
                          className={
                            activeRuns.length > 0
                              ? 'bg-green-100 text-green-800'
                              : scheduledRuns.length > 0
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {activeRuns.length > 0
                            ? `${activeRuns.length} Active Run${activeRuns.length !== 1 ? 's' : ''}`
                            : scheduledRuns.length > 0
                              ? `${scheduledRuns.length} Scheduled`
                              : 'No Active Runs'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {activeRuns.length > 0 ? (
                      <div className="space-y-4">
                        {activeRuns.slice(0, 2).map(run => (
                          <div
                            key={run.id}
                            className="border rounded-lg p-4 bg-muted/50"
                          >
                            <div className="flex items-center justify-between mb-2">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
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
                                  {new Date(
                                    run.scheduledTime
                                  ).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
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
                      <div className="space-y-4">
                        {scheduledRuns.slice(0, 2).map(run => (
                          <div
                            key={run.id}
                            className="border rounded-lg p-4 bg-muted/50"
                          >
                            <div className="flex items-center justify-between mb-2">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
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
                                  {new Date(
                                    run.scheduledTime
                                  ).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
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
                      <div className="text-center py-8 text-muted-foreground">
                        <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No active runs assigned</p>
                        <p className="text-xs mt-1">
                          {completedRuns.length} completed runs total
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          }
        )}

        {filteredDrivers.length === 0 && allDrivers.length > 0 && (
          <Card className="border-dashed">
            <CardContent className="text-center py-12">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                No Drivers Match Filter
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                No drivers found matching the selected availability criteria
              </p>
              <Button
                variant="outline"
                onClick={() => setAvailabilityFilter('all')}
              >
                Show All Drivers
              </Button>
            </CardContent>
          </Card>
        )}

        {allDrivers.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Drivers Found</h3>
              <p className="text-muted-foreground text-sm mb-4">
                No other organization members found to display as drivers
              </p>
              <p className="text-muted-foreground text-xs">
                Add more members to your organization in the Clerk dashboard,
                then use the seed data generator in Settings → Debug Tools to
                create sample runs
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
