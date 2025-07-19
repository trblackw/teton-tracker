import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Car,
  Clock,
  DollarSign,
  Filter,
  MapPin,
  MessageCircle,
  Search,
  Send,
  Users,
} from 'lucide-react';
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
  ExpandableActionsDrawer,
  type DrawerAction,
} from '../components/ui/expandable-actions-drawer';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { MultiSelect } from '../components/ui/multi-select';
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
import { type Run } from '../lib/schema';
import { toasts } from '../lib/toast';

export const Route = createFileRoute('/driver/$driverId')({
  component: DriverDetailPage,
});

// Placeholder function for sending status request SMS
async function sendStatusRequestSMS(
  driverId: string,
  runId: string,
  flightNumber: string
): Promise<void> {
  console.log('📱 Sending status request SMS:', {
    driverId,
    runId,
    flightNumber,
  });

  // Placeholder Twilio logic - replace with actual implementation
  const message = `Hi! Can you provide a status update for run ${flightNumber}? Reply with your current status. - Teton Tracker`;

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // In real implementation, this would call your Twilio service
  // await twilioService.sendSMS(driverPhoneNumber, message);

  console.log('✅ Status request SMS sent successfully');
}

function DriverDetailPage() {
  const { driverId } = Route.useParams();
  const { currentUser } = useAppContext();
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [sendingStatus, setSendingStatus] = useState(false);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const { isAdmin, organization } = useNonAdminRedirect('/runs');

  // Fetch organization members to get driver information
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['organization-members', organization?.id],
    queryFn: () =>
      organizationsApi.getOrganizationMembers(
        organization!.id,
        currentUser!.id
      ),
    enabled: !!organization?.id && !!currentUser?.id && isAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Find the specific driver
  const driver = membersData?.members.find(
    (member: any) => member.userId === driverId
  );
  const driverName = driver
    ? `${driver.firstName} ${driver.lastName}`
    : 'Unknown Driver';

  // Fetch all runs for the organization
  const {
    data: allRuns = [],
    isLoading: runsLoading,
    isError: runsError,
  } = useQuery({
    queryKey: ['organization-runs'],
    queryFn: () => runsApi.getOrganizationRuns(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!organization?.id && isAdmin,
  });

  // Filter runs for this specific driver
  const driverRuns = allRuns.filter((run: Run) => run.userId === driverId);

  // Get unique locations for filter options
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    driverRuns.forEach((run: Run) => {
      locations.add(run.pickupLocation);
      locations.add(run.dropoffLocation);
    });
    return Array.from(locations).sort();
  }, [driverRuns]);

  // Apply search and filters
  const filteredDriverRuns = useMemo(() => {
    let filtered = driverRuns;

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (run: Run) =>
          run.flightNumber.toLowerCase().includes(search) ||
          run.pickupLocation.toLowerCase().includes(search) ||
          run.dropoffLocation.toLowerCase().includes(search) ||
          run.notes?.toLowerCase().includes(search)
      );
    }

    // Apply location filter
    if (selectedLocations.length > 0) {
      filtered = filtered.filter(
        (run: Run) =>
          selectedLocations.includes(run.pickupLocation) ||
          selectedLocations.includes(run.dropoffLocation)
      );
    }

    return filtered;
  }, [driverRuns, searchTerm, selectedLocations]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedLocations([]);
  };

  // Create drawer actions
  const drawerActions: DrawerAction[] = [
    {
      id: 'search',
      icon: <Search className="h-4 w-4" />,
      label: 'Search Runs',
      showHeader: false,
      content: (
        <div className="space-y-3">
          <div>
            <Label htmlFor="search-input" className="text-sm font-medium">
              Search flights, locations, or notes
            </Label>
            <Input
              id="search-input"
              type="text"
              placeholder="Type to search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="mt-1"
            />
          </div>
          {searchTerm && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {filteredDriverRuns.length} result
                {filteredDriverRuns.length !== 1 ? 's' : ''} found
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
      id: 'filter-location',
      icon: <Filter className="h-4 w-4" />,
      label: 'Filter by Location',
      badge:
        selectedLocations.length > 0 ? selectedLocations.length : undefined,
      showHeader: false,
      content: (
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Filter by pickup or dropoff location
            </Label>
            <MultiSelect
              options={uniqueLocations}
              selected={selectedLocations}
              onSelectionChange={setSelectedLocations}
              placeholder="Select locations..."
              emptyMessage="No locations found."
              maxDisplay={2}
            />
          </div>
          {selectedLocations.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedLocations.length} location
                {selectedLocations.length !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLocations([])}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      ),
    },
  ];

  // Calculate metrics
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyRuns = driverRuns.filter((run: Run) => {
    const runDate = new Date(run.scheduledTime);
    return (
      runDate.getMonth() === currentMonth &&
      runDate.getFullYear() === currentYear
    );
  });

  const activeRuns = driverRuns.filter((run: Run) => run.status === 'active');
  const scheduledRuns = driverRuns.filter(
    (run: Run) => run.status === 'scheduled'
  );
  const lastScheduledRun = scheduledRuns.sort(
    (a: Run, b: Run) =>
      new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
  )[0];

  const handleSendStatusRequest = async () => {
    if (!selectedRunId) {
      toasts.error(
        'Please select a run',
        'You must select a run to request status for.'
      );
      return;
    }

    const selectedRun = activeRuns.find((run: Run) => run.id === selectedRunId);
    if (!selectedRun) {
      toasts.error('Run not found', 'The selected run could not be found.');
      return;
    }

    setSendingStatus(true);
    try {
      await sendStatusRequestSMS(
        driverId,
        selectedRunId,
        selectedRun.flightNumber
      );
      toasts.success(
        'Status request sent',
        `SMS sent to driver for run ${selectedRun.flightNumber}`
      );
      setSelectedRunId(''); // Reset selection
    } catch (error) {
      console.error('Failed to send status request:', error);
      toasts.error(
        'Failed to send request',
        'Could not send status update request. Please try again.'
      );
    } finally {
      setSendingStatus(false);
    }
  };

  if (runsLoading || membersLoading) {
    return (
      <div className="container mx-auto py-2 max-w-full overflow-hidden">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading driver details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (runsError) {
    return (
      <div className="container mx-auto py-2 max-w-full overflow-hidden">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Error Loading Data</h1>
          <p className="text-muted-foreground">
            Failed to load driver runs. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const filteredApplied = searchTerm || selectedLocations.length > 0;

  return (
    <div className="container mx-auto py-1 max-w-full overflow-hidden">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/drivers"
          className="flex items-center gap-2 mb-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Drivers
        </Link>
        <div className="flex items-center justify-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-3xl font-bold">{driverName}</h1>
        </div>
      </div>

      {/* Condensed Metrics Card */}
      <Card className="mb-4 p-3">
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calendar className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium text-muted-foreground">
                  This Month
                </span>
              </div>
              <div className="text-lg font-bold">{monthlyRuns.length}</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Activity className="h-3 w-3 text-green-600" />
                <span className="text-xs font-medium text-muted-foreground">
                  Active
                </span>
              </div>
              <div className="text-sm font-bold">{activeRuns.length}</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="h-3 w-3 text-orange-600" />
                <span className="text-xs font-medium text-muted-foreground">
                  Next Scheduled
                </span>
              </div>
              {lastScheduledRun ? (
                <div className="text-sm font-bold">
                  {lastScheduledRun.flightNumber}
                </div>
              ) : (
                <div className="text-sm font-bold text-muted-foreground">
                  None
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Car className="h-3 w-3 text-purple-600" />
                <span className="text-xs font-medium text-muted-foreground">
                  Total Runs
                </span>
              </div>
              <div className="text-sm font-bold">{driverRuns.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Check Section */}
      {activeRuns.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Check Run Status
            </CardTitle>
            <CardDescription>
              Send a status update request to the driver via SMS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Select value={selectedRunId} onValueChange={setSelectedRunId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an active run..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeRuns.map((run: Run) => (
                      <SelectItem key={run.id} value={run.id}>
                        {run.flightNumber} -{' '}
                        {run.type === 'pickup' ? 'Pickup' : 'Dropoff'} at{' '}
                        {new Date(run.scheduledTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSendStatusRequest}
                disabled={!selectedRunId || sendingStatus}
                className="flex items-center gap-2"
              >
                {sendingStatus ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Status Request
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Active Runs Message */}
      {activeRuns.length === 0 && (
        <Card className="mb-8 border-dashed">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="font-medium mb-1">No Active Runs</h3>
            <p className="text-sm text-muted-foreground">
              This driver currently has no active runs to check status for.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Driver Runs List */}
      <Card>
        <CardContent>
          {/* Search and Filter Actions */}
          <div className="mb-6">
            <ExpandableActionsDrawer
              actions={drawerActions}
              className="mb-4"
              onClearAll={filteredApplied ? clearFilters : undefined}
            />
          </div>

          {filteredDriverRuns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {searchTerm || selectedLocations.length > 0 ? (
                <div>
                  <p className="mb-2">No runs match your current filters</p>
                </div>
              ) : (
                <p>No runs found for this driver</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDriverRuns.map((run: Run) => (
                <div key={run.id} className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Car
                        className={`h-4 w-4 ${
                          run.status === 'active'
                            ? 'text-green-600'
                            : run.status === 'scheduled'
                              ? 'text-blue-600'
                              : run.status === 'completed'
                                ? 'text-gray-600'
                                : 'text-red-600'
                        }`}
                      />
                      <span className="font-medium">{run.flightNumber}</span>
                      <span className="text-sm text-muted-foreground">
                        {run.type === 'pickup' ? 'Pickup' : 'Dropoff'}
                      </span>
                    </div>
                    <Badge
                      className={
                        run.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : run.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : run.status === 'completed'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                      }
                    >
                      {run.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 min-w-4" />
                      <span>
                        {run.pickupLocation} → {run.dropoffLocation}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 min-w-4" />
                      <span>
                        {new Date(run.scheduledTime).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium flex items-center gap-2">
                        <DollarSign className="size-4 min-w-4" />
                        {run.price}
                      </span>
                    </div>
                  </div>
                  {run.notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      {run.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
