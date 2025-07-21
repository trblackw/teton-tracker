import { reportTemplatesApi } from '@/lib/api/report-templates-api';
import { runsApi } from '@/lib/api/runs-api';
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
import { AlertTriangle, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import PageWrapper from '../components/ui/page-wrapper';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { StickyHeader } from '../components/ui/sticky-header';
import {
  defaultReportTemplateFields,
  type DefaultReportConfigFields,
  type ReportTemplate,
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

  // Fetch report templates
  const {
    data: reportTemplates = [],
    isLoading: templatesLoading,
    error: templatesError,
  } = useQuery({
    queryKey: ['report-templates'],
    queryFn: reportTemplatesApi.getReportTemplates,
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

  // Group selected runs by their report template
  const runsByTemplate = useMemo(() => {
    const grouped = new Map<
      string,
      { template: ReportTemplate | null; runs: Run[] }
    >();

    selectedRuns.forEach(run => {
      const template =
        reportTemplates.find(t => t.id === run.reportTemplateId) || null;
      const templateId = template?.id || 'unknown';

      if (!grouped.has(templateId)) {
        grouped.set(templateId, { template, runs: [] });
      }
      grouped.get(templateId)!.runs.push(run);
    });

    return grouped;
  }, [selectedRuns, reportTemplates]);

  // Check if there are multiple templates
  const hasMultipleTemplates = runsByTemplate.size > 1;
  const templateInfo = useMemo(() => {
    if (runsByTemplate.size === 0) {
      return { type: 'none' as const };
    } else if (runsByTemplate.size === 1) {
      const templateGroups = Array.from(runsByTemplate.values());
      const templateGroup = templateGroups[0];
      return {
        type: 'single' as const,
        template: templateGroup.template,
        count: templateGroup.runs.length,
      };
    } else {
      return {
        type: 'multiple' as const,
        templates: Array.from(runsByTemplate.values()),
        totalRuns: selectedRuns.length,
      };
    }
  }, [runsByTemplate, selectedRuns.length]);

  // Calculate stats - use filtered runs when date range is selected, otherwise all past runs
  const statsRuns = selectedRange?.from ? filteredRuns : pastRuns;
  const totalRuns = statsRuns.length;

  const completedRuns = statsRuns.filter(run => run.status === 'completed');
  const averageDuration =
    completedRuns.length > 0
      ? Math.round(
          completedRuns.reduce(
            (sum, run) => sum + (run.actualDuration || run.estimatedDuration),
            0
          ) / completedRuns.length
        )
      : 0;

  const totalPrice = statsRuns.reduce(
    (sum, run) => sum + parseInt(run.price),
    0
  );

  // Handle field selection toggle (no longer needed but keeping for compatibility)
  const toggleField = (field: DefaultReportConfigFields) => {
    // Field selection is now handled by report templates
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

    if (templateInfo.type === 'none') {
      toasts.error('No report template found for selected runs');
      return;
    }

    const fromDate = selectedRange?.from
      ? format(selectedRange.from, 'yyyy-MM-dd')
      : 'unknown';
    const toDate = selectedRange?.to
      ? format(selectedRange.to, 'yyyy-MM-dd')
      : fromDate;

    if (templateInfo.type === 'single') {
      // Single template - generate one CSV
      const template = templateInfo.template;
      const fields =
        template?.columnConfig?.map(
          col => col.field as DefaultReportConfigFields
        ) || defaultReportTemplateFields;
      const csvContent = generateCSV(selectedRuns, fields);
      const templateName = template?.name
        ? `-${template.name.replace(/\s+/g, '-').toLowerCase()}`
        : '';
      const filename = `runs-report${templateName}-${fromDate}-to-${toDate}.csv`;

      downloadCSV(csvContent, filename);
      toasts.success(`Exported ${selectedRuns.length} runs to ${filename}`);
    } else {
      // Multiple templates - generate separate CSV for each
      let totalExported = 0;
      templateInfo.templates.forEach((templateGroup, index) => {
        const template = templateGroup.template;
        const runs = templateGroup.runs;
        const fields =
          template?.columnConfig?.map(
            col => col.field as DefaultReportConfigFields
          ) || defaultReportTemplateFields;
        const csvContent = generateCSV(runs, fields);
        const templateName = template?.name
          ? `-${template.name.replace(/\s+/g, '-').toLowerCase()}`
          : `-unknown-template-${index + 1}`;
        const filename = `runs-report${templateName}-${fromDate}-to-${toDate}.csv`;

        downloadCSV(csvContent, filename);
        totalExported += runs.length;
      });

      toasts.success(
        `Exported ${totalExported} runs across ${templateInfo.templates.length} CSV files`
      );
    }
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
        'bg-emerald-200 text-primary-foreground font-medium hover:bg-primary/90',
      range_end:
        'bg-emerald-100 text-primary-foreground font-medium hover:bg-primary/90',
      range_middle:
        'bg-emerald-100/80 text-primary font-medium hover:bg-primary/30',
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
      templatesLoading
    );
  }, [selectedRange, selectedRuns, isLoading, templatesLoading]);

  if (error || templatesError) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-destructive">
            {error
              ? 'Failed to load runs data'
              : 'Failed to load report templates'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper>
      <StickyHeader
        title="Reports"
        subtitle="Select a date range to generate & export detailed reports of your past airport runs"
      />

      {/* Quick Stats Cards */}
      <div className="grid gap-3 md:grid-cols-1 mb-4">
        <Card>
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
          <CardFooter className="text-xs text-blue-400 flex justify-center items-center">
            {selectedRange?.from
              ? `${format(selectedRange.from, 'MMM d, yyyy')}${
                  selectedRange.to
                    ? ` - ${format(selectedRange.to, 'MMM d, yyyy')}`
                    : ''
                }`
              : pastRuns.length > 0
                ? `${format(
                    parseISO(
                      pastRuns.sort(
                        (a, b) =>
                          parseISO(a.scheduledTime).getTime() -
                          parseISO(b.scheduledTime).getTime()
                      )[0].scheduledTime
                    ),
                    'MMM d, yyyy'
                  )} - ${format(new Date(), 'MMM d, yyyy')}`
                : 'No runs available'}
          </CardFooter>
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
                disabled={isLoading || templatesLoading}
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
          </CardContent>
        </Card>

        {!exportDisabled && (
          <Card className="mb-3">
            <CardHeader>
              <CardTitle>Generate Report</CardTitle>
              <CardDescription>
                Export run reports for selected timeframe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {templateInfo.type === 'single' && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Report Template:</h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {templateInfo.template?.name || 'Default Template'}
                      </span>
                      <span className="text-sm text-muted-foreground/60">
                        {templateInfo.count} runs
                      </span>
                    </div>
                    {templateInfo.template?.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {templateInfo.template.description}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-1">
                      Fields:{' '}
                      {templateInfo.template?.columnConfig?.map(col => (
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-400/10 text-blue-400"
                        >
                          {col.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {templateInfo.type === 'multiple' && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    <AlertTriangle className="size-4" /> Multiple Report
                    Templates Detected:
                  </h4>
                  <div className="space-y-2">
                    {templateInfo.templates.map((templateGroup, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {templateGroup.template?.name ||
                              `Unknown Template ${index + 1}`}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {templateGroup.runs.length} runs
                          </span>
                        </div>
                        {templateGroup.template?.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {templateGroup.template.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Multiple CSV files will be generated - one for each
                      template ({templateInfo.templates.length} files total)
                    </p>
                  </div>
                </div>
              )}

              {templateInfo.type === 'none' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    No report template found for the selected runs. Please
                    select runs with valid templates.
                  </p>
                </div>
              )}

              <Button
                onClick={handleExportCSV}
                disabled={exportDisabled || templateInfo.type === 'none'}
                className="w-full bg-emerald-400 hover:bg-emerald-400/90 text-white"
              >
                <Download className="size-4" strokeWidth={2} />
                {templateInfo.type === 'multiple'
                  ? `Export ${templateInfo.templates.length} CSV Reports`
                  : 'Export CSV Report'}
              </Button>

              {!selectedRange?.from && (
                <p className="text-xs text-muted-foreground text-center">
                  Select a date range to enable export
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
    </PageWrapper>
  );
}

export const Route = createFileRoute('/reports')({
  component: Reports,
});
