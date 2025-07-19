import { formatDistanceToNow, isPast } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  DollarSignIcon,
  Edit,
  FileText,
  Hash,
  MapPin,
  Navigation,
  Plane,
  ReceiptText,
} from 'lucide-react';
import type {
  FlightStatus,
  Run,
  RunStatus,
  TrafficData,
} from '../../lib/schema';
import { formatScheduleTime } from '../../lib/timezone';
import { Badge } from './badge';
import { Button } from './button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './card';
import { RefreshButton } from './refresh-button';

interface RunCardProps {
  run: Run;
  runsLoading: boolean;
  runsError: boolean;
  handleStopRun: (run: Run) => void;
  handleEditRun: (run: Run) => void;
  refreshRunData: (run: Run) => void;
  trafficData?: TrafficData;
  flightStatus?: FlightStatus;
}

export function RunCard({
  run,
  runsLoading,
  runsError,
  trafficData,
  handleStopRun,
  handleEditRun,
  refreshRunData,
  flightStatus,
}: RunCardProps) {
  const isPastRun = isPast(run.scheduledTime) || run.status === 'completed';

  const runCardClassName = `w-full hover:shadow-md transition-shadow ${isPastRun ? 'opacity-75' : ''}`;

  return (
    <Card key={run.id} className={runCardClassName}>
      <CardHeader className="pb-1">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {run.flightNumber}
              {runsLoading && (
                <span className="ml-2 inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></span>
              )}
              {runsError && (
                <span className="ml-2 text-destructive text-sm">
                  <AlertTriangle className="size-4" />
                </span>
              )}
            </CardTitle>
            <CardDescription>{run.airline}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Badge className={`${getStatusColor(run.status)} mr-2`}>
              {run.status}
            </Badge>

            {run.status === 'active' && !isPastRun && (
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  handleStopRun(run);
                }}
                className="text-blue-600 hover:text-blue-700"
                title="Complete run"
              >
                <CheckCircle className="size-4" />
              </Button>
            )}

            {!isPastRun && (
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
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 w-full justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {run.reservation_id}
                </span>
              </div>
              {run.billTo && (
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  {run.billTo}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium">
                  {formatScheduleTime(run.scheduledTime)}
                </span>
              </div>
              <div className="flex items-start">
                <DollarSignIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-sm">{run.price}</span>
              </div>
            </div>
            <RunPickupDropoff run={run} />

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
            {flightStatus && !isPastRun && (
              <div className="flex items-center gap-2 text-blue-400">
                <Plane className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm text-blue-400">
                  Flight:{' '}
                  <span className="font-semibold">{flightStatus.status}</span>
                  {flightStatus.delay && flightStatus.delay > 0 && (
                    <span className="text-red-600 ml-1">
                      (+{flightStatus.delay} min)
                    </span>
                  )}
                </span>
              </div>
            )}
            {trafficData && !isPastRun && (
              <div className="flex items-start gap-2 text-green-400">
                <Navigation className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="text-sm">
                  Traffic:{' '}
                  <span className="font-semibold">
                    {trafficData.duration} min
                  </span>{' '}
                  /{' '}
                  <span className="font-semibold">{trafficData.distance}</span>{' '}
                  /{' '}
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
            {!isPastRun && run.updatedAt instanceof Date && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Last updated: <br />
                  {formatDistanceToNow(run.updatedAt, {
                    addSuffix: true,
                  })}
                </span>
                <RefreshButton
                  onRefresh={() => refreshRunData(run)}
                  // variant="outline"
                  size="sm"
                  onClick={e => e.stopPropagation()}
                  className="text-muted-foreground"
                  title="Refresh data"
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RunPickupDropoff({ run }: { run: Run }) {
  return (
    <div className="flex items-start gap-2 mt-4">
      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="text-sm flex items-center gap-2 justify-between">
        <span className="font-medium text-muted-foreground">
          {run.pickupLocation}
        </span>
        <ArrowRight className="size-4 min-w-4" />{' '}
        <span className="font-medium text-muted-foreground">
          {run.dropoffLocation}
        </span>
      </div>
    </div>
  );
}

function getStatusColor(status: RunStatus) {
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
}
