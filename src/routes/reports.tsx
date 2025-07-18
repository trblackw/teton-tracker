import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  endOfDay,
  format,
  isBefore,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfToday,
} from 'date-fns';
import { Download } from 'lucide-react';
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
import { runsApi } from '../lib/api/client';
import {
  defaultReportTemplateFields,
  type DefaultReportConfigFields,
  type Run,
} from '../lib/schema';
import { toasts } from '../lib/toast';

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

// Helper function to generate CSV content
function generateCSV(runs: Run[], fields: DefaultReportConfigFields[]): string {
  const headers = fields.map(field => {
    switch (field) {
      case 'flightNumber':
        return 'Flight Number';
      case 'airline':
        return 'Airline';
      case 'departure':
        return 'Departure';
      case 'arrival':
        return 'Arrival';
      case 'pickupLocation':
        return 'Pickup Location';
      case 'type':
        return 'Type';
      case 'dropoffLocation':
        return 'Dropoff Location';
      case 'price':
        return 'Price';
      default:
        return field;
    }
  });

  const rows = runs.map(run => {
    return fields.map(field => {
      const value = run[field];
      // Handle any commas in the data by wrapping in quotes
      const stringValue = String(value || '');
      return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
    });
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// Helper function to download CSV
function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function Reports() {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedFields, setSelectedFields] = useState<
    DefaultReportConfigFields[]
  >(defaultReportTemplateFields);
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());

  // Fetch all runs
  const {
    data: allRuns = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['runs'],
    queryFn: runsApi.getRuns,
  });

  // Filter to only past runs (before today)
  const pastRuns = useMemo(() => {
    const today = startOfToday();
    return allRuns.filter(run => {
      const runDate = parseISO(run.scheduledTime);
      return isBefore(runDate, today);
    });
  }, [allRuns]);

  // Group past runs by date for calendar indicators
  const runsByDate = useMemo(() => groupRunsByDate(pastRuns), [pastRuns]);

  // Get runs within selected date range
  const filteredRuns = useMemo(() => {
    if (!selectedRange?.from) return [];

    const fromDate = startOfDay(selectedRange.from);
    const toDate = selectedRange?.to
      ? endOfDay(selectedRange.to)
      : endOfDay(selectedRange.from);

    const runsInRange = pastRuns.filter(run => {
      const runDate = parseISO(run.scheduledTime);
      return isWithinInterval(runDate, { start: fromDate, end: toDate });
    });

    // Auto-select all runs when date range changes
    setSelectedRunIds(new Set(runsInRange.map(run => run.id)));

    return runsInRange;
  }, [pastRuns, selectedRange]);

  // Get only the runs that are selected for export
  const selectedRuns = useMemo(() => {
    return filteredRuns.filter(run => selectedRunIds.has(run.id));
  }, [filteredRuns, selectedRunIds]);

  // Calculate stats
  const totalRuns = pastRuns.length;

  const completedRuns = pastRuns.filter(run => run.status === 'completed');
  const averageDuration =
    completedRuns.length > 0
      ? Math.round(
          completedRuns.reduce(
            (sum, run) => sum + (run.actualDuration || run.estimatedDuration),
            0
          ) / completedRuns.length
        )
      : 0;

  const totalPrice = pastRuns.reduce(
    (sum, run) => sum + parseInt(run.price),
    0
  );

  // Handle field selection toggle
  const toggleField = (field: DefaultReportConfigFields) => {
    setSelectedFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  // Handle run selection toggle
  const toggleRun = (runId: string) => {
    setSelectedRunIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(runId)) {
        newSet.delete(runId);
      } else {
        newSet.add(runId);
      }
      return newSet;
    });
  };

  // Toggle all runs
  const toggleAllRuns = () => {
    if (selectedRunIds.size === filteredRuns.length) {
      setSelectedRunIds(new Set());
    } else {
      setSelectedRunIds(new Set(filteredRuns.map(run => run.id)));
    }
  };

  // Handle CSV export with selected fields and runs
  const handleExportCSV = () => {
    if (selectedRuns.length === 0) {
      toasts.error('No runs selected for export');
      return;
    }

    if (selectedFields.length === 0) {
      toasts.error('Please select at least one field to export');
      return;
    }

    const csvContent = generateCSV(selectedRuns, selectedFields);
    const fromDate = selectedRange?.from
      ? format(selectedRange.from, 'yyyy-MM-dd')
      : 'unknown';
    const toDate = selectedRange?.to
      ? format(selectedRange.to, 'yyyy-MM-dd')
      : fromDate;
    const filename = `runs-report-${fromDate}-to-${toDate}.csv`;

    downloadCSV(csvContent, filename);
    toasts.success(`Exported ${selectedRuns.length} runs to ${filename}`);
  };

  // Custom day renderer with run indicators and click handlers
  // Get modifiers for days with runs
  const dayModifiers = useMemo(() => {
    const modifiers: Record<string, Date[]> = {};
    const today = startOfToday();

    Object.entries(runsByDate).forEach(([dateStr, dayRuns]) => {
      if (dayRuns.length > 0) {
        const date = parseISO(`${dateStr}T00:00:00`);
        if (isBefore(date, today)) {
          const key = `runs-${dayRuns.length}`;
          if (!modifiers[key]) modifiers[key] = [];
          modifiers[key].push(date);
        }
      }
    });

    return modifiers;
  }, [runsByDate]);

  // Custom day modifiers styling - improved range and run indicators
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

    // Style for days with runs - these will layer with range styles
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
    const today = startOfToday();

    if (dayRuns && dayRuns.length > 0 && isBefore(date, today)) {
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

  const exportDisabled = useMemo(() => {
    return (
      !selectedRange?.from ||
      selectedRuns.length === 0 ||
      isLoading ||
      selectedFields.length === 0
    );
  }, [selectedRange, selectedRuns, isLoading, selectedFields]);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-destructive">Failed to load runs data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Select a date range to generate and export detailed reports of your
          past airport runs
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Overview</CardTitle>
            <CardDescription>
              Key metrics for all your past runs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{totalRuns}</div>
                <p className="text-xs text-muted-foreground">Total Runs</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  ${totalPrice.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total Price</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {averageDuration > 0 ? `${averageDuration}m` : '-'}
                </div>
                <p className="text-xs text-muted-foreground">Avg Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar and Report Generation */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Range of Runs</CardTitle>
            <CardDescription>
              Click dates with run indicators to see details. Only past runs are
              shown.
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
                  today: 'text-foreground font-semibold', // Override the default blue styling
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
                  {filteredRuns.length} run
                  {filteredRuns.length !== 1 ? 's' : ''} found,{' '}
                  {selectedRuns.length} selected
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {!exportDisabled && (
          <Card>
            <CardHeader>
              <CardTitle>Generate Report</CardTitle>
              <CardDescription>
                Export detailed CSV reports for the selected date range
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Report includes:</h4>
                <div className="space-y-2">
                  {defaultReportTemplateFields.map(field => (
                    <label
                      key={field}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field)}
                        onChange={() => toggleField(field)}
                        className="rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                      />
                      <span className="text-sm text-muted-foreground">
                        {field === 'flightNumber' && 'Flight Number'}
                        {field === 'airline' && 'Airline'}
                        {field === 'departure' && 'Departure Airport'}
                        {field === 'arrival' && 'Arrival Airport'}
                        {field === 'pickupLocation' && 'Pickup Location'}
                        {field === 'type' && 'Run Type (Pickup/Dropoff)'}
                        {field === 'dropoffLocation' && 'Dropoff Location'}
                        {field === 'price' && 'Price'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleExportCSV}
                disabled={exportDisabled}
                className="w-full bg-primary"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV Report
              </Button>

              {!selectedRange?.from && (
                <p className="text-xs text-muted-foreground text-center">
                  Select a date range to enable export
                </p>
              )}

              {selectedFields.length === 0 && (
                <p className="text-xs text-destructive text-center">
                  Select at least one field to export
                </p>
              )}

              {selectedRuns.length === 0 && filteredRuns.length > 0 && (
                <p className="text-xs text-destructive text-center">
                  Select at least one run to export
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Selected Runs Preview */}
      {filteredRuns.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Selected Runs Preview</CardTitle>
                <CardDescription>
                  Choose which runs to include in the report (
                  {selectedRuns.length} of {filteredRuns.length} selected)
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={toggleAllRuns}>
                {selectedRunIds.size === filteredRuns.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredRuns.slice(0, 20).map(run => (
                <label
                  key={run.id}
                  className="flex items-center gap-3 p-2 bg-muted rounded-lg text-sm cursor-pointer hover:bg-muted/80 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedRunIds.has(run.id)}
                    onChange={() => toggleRun(run.id)}
                    className="rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <div className="flex items-center justify-start gap-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                        {run.flightNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{run.type}</span>
                      <span>${run.price}</span>
                      <span>
                        {format(parseISO(run.scheduledTime), 'MMM d')}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
              {filteredRuns.length > 20 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  ... and {filteredRuns.length - 20} more runs (all{' '}
                  {selectedRunIds.size === filteredRuns.length
                    ? 'selected'
                    : 'can be selected'}
                  )
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export const Route = createFileRoute('/reports')({
  component: Reports,
});
