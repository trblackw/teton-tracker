import { useOrganization } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  endOfDay,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  FileText,
  Send,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '../components/ui/button';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { useAppContext } from '../lib/AppContextProvider';
import { runsApi } from '../lib/api/client';
import {
  useIsUserAdmin,
  useUserOrganization,
} from '../lib/hooks/use-organizations';
import { type Run } from '../lib/schema';
import { toasts } from '../lib/toast';

export const Route = createFileRoute('/request-run-report')({
  component: RequestRunReportPage,
});

// Helper function to group runs by date
function groupRunsByDate(runs: Run[]): Record<string, Run[]> {
  const groups: Record<string, Run[]> = {};

  runs.forEach(run => {
    const date = format(parseISO(run.scheduledTime), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(run);
  });

  return groups;
}

// Placeholder function for sending report request SMS to all drivers
async function sendReportRequestToDrivers(
  driverIds: string[],
  startDate: Date,
  endDate: Date
): Promise<void> {
  console.log('📱 Sending report request SMS to drivers:', {
    driverIds,
    startDate,
    endDate,
  });

  // Placeholder Twilio logic - replace with actual implementation
  const dateRange =
    format(startDate, 'MMM d') +
    (startDate.getTime() !== endDate.getTime()
      ? ` - ${format(endDate, 'MMM d')}`
      : '');
  const message = `Hi! Please send a summary report of your runs for ${dateRange}. Include total runs, revenue, and any notable incidents. Reply to this message. - Teton Tracker Admin`;

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // In real implementation, this would call your Twilio service for each driver
  // for (const driverId of driverIds) {
  //   await twilioService.sendSMS(driverPhoneNumber, message);
  // }

  console.log('✅ Report request SMS sent to all drivers successfully');
}

function RequestRunReportPage() {
  const { currentUser } = useAppContext();
  const { data: organization } = useUserOrganization();
  const { isAdmin } = useIsUserAdmin(organization?.id);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);

  // Get organization members using Clerk client-side hook
  const { organization: currentOrg } = useOrganization();

  // Extract driver IDs from organization members (exclude current admin user)
  const driverIds = useMemo(() => {
    if (!currentOrg || !currentUser?.id) return [];

    // TODO: Replace with proper Clerk organization member fetching
    // Options for proper implementation:
    // 1. Use a server-side API endpoint that fetches organization members
    // 2. Use Clerk's organization member hooks if available in your Clerk version
    // 3. Use useOrganizationList with member management capabilities

    // For now, using placeholder driver IDs to prevent the "process is not defined" error
    // In production, you'd fetch these from your organization members
    const placeholderDriverIds = [
      'user_placeholder_1',
      'user_placeholder_2',
      'user_placeholder_3',
    ].filter(id => id !== currentUser.id);

    return placeholderDriverIds;
  }, [currentOrg, currentUser?.id]);

  // Redirect non-admins
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-2 max-w-full overflow-hidden">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You must be an administrator to request driver reports.
          </p>
        </div>
      </div>
    );
  }

  // Fetch all runs from API
  const {
    data: allRuns = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['organization-runs'],
    queryFn: runsApi.getOrganizationRuns,
    enabled: !!currentUser?.id && !!organization?.id && isAdmin,
  });

  // Group runs by date for calendar indicators
  const runsByDate = useMemo(() => groupRunsByDate(allRuns), [allRuns]);

  // Get runs within selected date range
  const filteredRuns = useMemo(() => {
    if (!selectedRange?.from) return [];

    const fromDate = startOfDay(selectedRange.from);
    const toDate = selectedRange?.to
      ? endOfDay(selectedRange.to)
      : endOfDay(selectedRange.from);

    return allRuns.filter(run => {
      const runDate = parseISO(run.scheduledTime);
      return isWithinInterval(runDate, { start: fromDate, end: toDate });
    });
  }, [allRuns, selectedRange]);

  // Filter for driver runs only (exclude admin runs)
  const driverRuns = useMemo(() => {
    // In a real implementation, you'd filter by actual driver user IDs
    // For now, we'll include all runs as placeholder
    return filteredRuns;
  }, [filteredRuns]);

  // Calculate metrics for the selected period
  const totalDriverRuns = driverRuns.length;
  const completedDriverRuns = driverRuns.filter(
    run => run.status === 'completed'
  );
  const totalRevenue = driverRuns.reduce(
    (sum, run) => sum + parseInt(run.price),
    0
  );
  const uniqueDrivers = new Set(driverRuns.map(run => run.userId)).size;

  // Handle request report submission
  const handleRequestReport = async () => {
    if (!selectedRange?.from) {
      toasts.error(
        'Please select a date range',
        'You must select a date range to request a report for.'
      );
      return;
    }

    if (driverRuns.length === 0) {
      toasts.error(
        'No runs found',
        'No driver runs found in the selected date range.'
      );
      return;
    }

    setSendingRequest(true);
    try {
      // Use the driverIds from the hook instead of fetching server-side
      if (driverIds.length === 0) {
        toasts.error(
          'No drivers found',
          'No drivers found in your organization.'
        );
        return;
      }

      await sendReportRequestToDrivers(
        driverIds,
        selectedRange.from,
        selectedRange.to || selectedRange.from
      );

      toasts.success(
        'Report request sent',
        `SMS sent to ${driverIds.length} drivers requesting reports for the selected period`
      );
    } catch (error) {
      console.error('Failed to send report request:', error);
      toasts.error(
        'Failed to send request',
        'Could not send report request. Please try again.'
      );
    } finally {
      setSendingRequest(false);
    }
  };

  // Custom day renderer with run indicators and click handlers
  const dayModifiers = useMemo(() => {
    const modifiers: Record<string, Date[]> = {};

    Object.entries(runsByDate).forEach(([dateStr, dayRuns]) => {
      if (dayRuns.length > 0) {
        const date = parseISO(`${dateStr}T00:00:00`);
        const key = `runs-${dayRuns.length}`;
        if (!modifiers[key]) modifiers[key] = [];
        modifiers[key].push(date);
      }
    });

    return modifiers;
  }, [runsByDate]);

  // Custom day modifiers styling
  const dayModifiersClassNames = useMemo(() => {
    const classNames: Record<string, string> = {
      today: 'text-blue-500 font-semibold',
      range_start:
        'bg-yellow-200 text-primary-foreground font-medium hover:bg-primary/90',
      range_end:
        'bg-yellow-100 text-primary-foreground font-medium hover:bg-primary/90',
      range_middle:
        'bg-yellow-100/80 text-primary font-medium hover:bg-primary/30',
    };

    // Style for days with runs
    for (let i = 1; i <= 20; i++) {
      classNames[`runs-${i}`] =
        'relative after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:transform after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary';
    }

    return classNames;
  }, []);

  // Handle day click
  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayRuns = runsByDate[dateStr];

    if (dayRuns && dayRuns.length > 0) {
      setSelectedDay(date);
      setPopoverOpen(true);
    }
  };

  // Get runs for selected day
  const selectedDayRuns = useMemo(() => {
    if (!selectedDay) return [];
    const dateStr = format(selectedDay, 'yyyy-MM-dd');
    return runsByDate[dateStr] || [];
  }, [selectedDay, runsByDate]);

  if (error) {
    return (
      <div className="container mx-auto py-2 max-w-full overflow-hidden">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Error Loading Data</h1>
          <p className="text-muted-foreground">
            Failed to load runs data. Please try again.
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
          <FileText className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Request Run Report</h1>
        </div>
        <p className="text-muted-foreground">
          Select a date range and request detailed run reports from all drivers
          via SMS
        </p>
      </div>

      {/* Condensed Analytics Card */}
      {selectedRange?.from && (
        <Card className="mb-4 p-3">
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CalendarIcon className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Total Runs
                  </span>
                </div>
                <div className="text-sm font-bold">{totalDriverRuns}</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Active Drivers
                  </span>
                </div>
                <div className="text-sm font-bold">{uniqueDrivers}</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <FileText className="h-3 w-3 text-purple-600" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Completed
                  </span>
                </div>
                <div className="text-sm font-bold">
                  {completedDriverRuns.length}
                </div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-orange-600 text-xs font-bold">$</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Revenue
                  </span>
                </div>
                <div className="text-sm font-bold">
                  ${totalRevenue.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar and Report Request */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Date Range</CardTitle>
            <CardDescription>
              Choose the period for which you want to request driver reports.
              Dots indicate days with runs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center relative">
              <CalendarComponent
                mode="range"
                selected={selectedRange}
                onSelect={setSelectedRange}
                onDayClick={handleDayClick}
                numberOfMonths={1}
                className="rounded-md border bg-accent"
                disabled={isLoading}
                modifiers={dayModifiers}
                modifiersClassNames={dayModifiersClassNames}
                classNames={{
                  today: 'text-foreground font-semibold',
                }}
                style={
                  {
                    '--rdp-accent-color': 'hsl(var(--chart-2))',
                    '--rdp-accent-background-color': 'hsl(var(--chart-2))',
                    '--rdp-range-start-color': 'hsl(var(--primary-foreground))',
                    '--rdp-range-start-background': 'hsl(var(--destructive))',
                    '--rdp-range-end-color': 'hsl(var(--primary-foreground))',
                    '--rdp-range-end-background': 'hsl(var(--destructive))',
                    '--rdp-range-middle-background-color':
                      'hsl(var(--destructive))',
                    '--rdp-range-middle-color': 'hsl(var(--destructive))',
                    '--rdp-selected-border': 'none',
                  } as React.CSSProperties
                }
              />

              {/* Popover for day details */}
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <div className="absolute" style={{ top: -1000 }} />
                </PopoverTrigger>
                <PopoverContent className="w-80" align="center">
                  {selectedDay && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <h4 className="font-medium">
                          {format(selectedDay, 'PPPP')}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedDayRuns.length} run
                          {selectedDayRuns.length !== 1 ? 's' : ''} on this day
                        </p>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedDayRuns.map(run => (
                          <div key={run.id} className="p-2 bg-muted rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                                  {run.flightNumber}
                                </span>
                                <span className="text-sm font-medium">
                                  {run.airline}
                                </span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                ${run.price}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {run.departure} → {run.arrival} • {run.type}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {format(parseISO(run.scheduledTime), 'p')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {selectedRange?.from && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Selected Range:</p>
                <p className="text-sm text-muted-foreground">
                  {format(selectedRange.from, 'PPP')}
                  {selectedRange.to && ` - ${format(selectedRange.to, 'PPP')}`}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {driverRuns.length} driver run
                  {driverRuns.length !== 1 ? 's' : ''} found
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedRange?.from && (
          <Card>
            <CardHeader>
              <CardTitle>Request Driver Reports</CardTitle>
              <CardDescription>
                Send SMS requests to all drivers asking for detailed reports of
                their runs during the selected period
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Report will request:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Summary of runs completed during the period</li>
                  <li>• Total revenue generated</li>
                  <li>• Any incidents or notable events</li>
                  <li>• Vehicle maintenance or fuel costs</li>
                  <li>• Customer feedback or special requests</li>
                </ul>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Send className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800">SMS Preview:</p>
                    <p className="text-blue-700 mt-1 italic">
                      "Hi! Please send a summary report of your runs for{' '}
                      {format(selectedRange.from, 'MMM d')}
                      {selectedRange.to &&
                      selectedRange.to.getTime() !==
                        selectedRange.from.getTime()
                        ? ` - ${format(selectedRange.to, 'MMM d')}`
                        : ''}
                      . Include total runs, revenue, and any notable incidents.
                      Reply to this message. - Teton Tracker Admin"
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleRequestReport}
                disabled={
                  !selectedRange?.from ||
                  driverRuns.length === 0 ||
                  sendingRequest
                }
                className="w-full"
              >
                {sendingRequest ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending SMS Requests...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Report Request to All Drivers
                  </>
                )}
              </Button>

              {!selectedRange?.from && (
                <p className="text-xs text-muted-foreground text-center">
                  Select a date range to enable report request
                </p>
              )}

              {driverRuns.length === 0 && selectedRange?.from && (
                <p className="text-xs text-destructive text-center">
                  No driver runs found in selected period
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
