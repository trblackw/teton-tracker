import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Filter,
  Plane,
  Search,
  Settings,
  Trash2,
  X,
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
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { notificationsApi } from '../lib/api/client';
import { useTimezoneFormatters } from '../lib/hooks/use-timezone';
import { type Notification, type NotificationType } from '../lib/schema';
import { toasts } from '../lib/toast';

const NOTIFICATION_TYPES: {
  value: NotificationType;
  label: string;
  icon: React.ComponentType<any>;
}[] = [
  { value: 'flight_update', label: 'Flight Updates', icon: Plane },
  { value: 'traffic_alert', label: 'Traffic Alerts', icon: Clock },
  { value: 'run_reminder', label: 'Run Reminders', icon: Bell },
  { value: 'status_change', label: 'Status Changes', icon: CheckCircle },
  { value: 'system', label: 'System', icon: Settings },
];

function Notifications() {
  const queryClient = useQueryClient();
  const { formatScheduleTime } = useTimezoneFormatters();

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>(
    'all'
  );
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at'>(
    'created_at'
  );
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Collapsible state
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  // Query for notifications
  const {
    data: notifications = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      'notifications',
      searchTerm,
      filterType,
      filterRead,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      notificationsApi.getNotifications({
        search: searchTerm || undefined,
        type: filterType === 'all' ? undefined : [filterType],
        isRead: filterRead === 'all' ? undefined : filterRead === 'read',
        orderBy: sortBy,
        orderDirection: sortOrder,
        limit: 100,
      }),
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  // Query for notification stats
  const { data: stats } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: () => notificationsApi.getNotificationStats(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Mutation for marking notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) =>
      notificationsApi.markNotificationAsRead(id, isRead),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      toasts.success(
        'Notification updated',
        'Notification status updated successfully'
      );
    },
    onError: error => {
      console.error('Failed to update notification:', error);
      toasts.error('Failed to update notification', 'Please try again');
    },
  });

  // Mutation for marking all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      toasts.success(
        'All notifications marked as read',
        'All notifications have been marked as read'
      );
    },
    onError: error => {
      console.error('Failed to mark all notifications as read:', error);
      toasts.error('Failed to mark all as read', 'Please try again');
    },
  });

  // Mutation for deleting notifications
  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      toasts.success('Notification deleted', 'Notification has been deleted');
    },
    onError: error => {
      console.error('Failed to delete notification:', error);
      toasts.error('Failed to delete notification', 'Please try again');
    },
  });

  const handleMarkAsRead = (id: string, isRead: boolean) => {
    markAsReadMutation.mutate({ id, isRead });
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDeleteNotification = (id: string) => {
    deleteNotificationMutation.mutate(id);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterRead('all');
    setSortBy('created_at');
    setSortOrder('DESC');
  };

  const getNotificationTypeInfo = (type: NotificationType) => {
    return (
      NOTIFICATION_TYPES.find(t => t.value === type) || NOTIFICATION_TYPES[0]
    );
  };

  const getNotificationIcon = (notification: Notification) => {
    const typeInfo = getNotificationTypeInfo(notification.type);
    const Icon = typeInfo.icon;
    return <Icon className="h-4 w-4" />;
  };

  const getNotificationTypeColor = (type: NotificationType) => {
    switch (type) {
      case 'flight_update':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'traffic_alert':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'run_reminder':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'status_change':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'system':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 sm:px-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Notifications
            </h2>
            <p className="text-muted-foreground mt-1">
              Loading your notifications...
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading notifications...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 px-4 sm:px-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Notifications
            </h2>
            <p className="text-muted-foreground mt-1">
              Failed to load notifications
            </p>
          </div>
        </div>
        <Card className="border-destructive">
          <CardContent className="p-8 text-center">
            <Bell className="h-16 w-16 text-destructive mx-auto mb-6" />
            <p className="text-destructive text-lg mb-4">
              Failed to load notifications
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
          <p className="text-muted-foreground mt-1">
            Manage your notifications and alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats && stats.unread > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>
      <Link to="/settings" className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="border-blue-600 text-blue-600 hover:bg-blue-700 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <Settings className="h-4 w-4" />
          Notification Settings
        </Button>
      </Link>
      {/* Stats - Combined into single card */}
      {stats && (
        <Card>
          <CardContent className="px-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col items-center justify-start gap-1">
                <div className="flex items-center gap-2">
                  <Bell className="size-4 text-primary" />
                  <p className="text-sm font-medium">Total</p>
                </div>
                <p className="text-2xl font-bold block">{stats.total}</p>
              </div>
              <div className="flex flex-col items-center justify-start gap-1">
                <div className="flex items-center gap-2">
                  <Circle className="size-4 text-amber-500" />
                  <p className="text-sm font-medium">Unread</p>
                </div>
                <p className="text-2xl font-bold block">{stats.unread}</p>
              </div>
              <div className="flex flex-col items-center justify-start gap-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-4 text-green-500" />
                  <p className="text-sm font-medium">Read</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats.total - stats.unread}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collapsible Search and Filters */}
      <Card className="pb-2 pt-3">
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 mb-1">
                <Filter className="h-5 w-5" />
                Search & Filter
                {(searchTerm ||
                  filterType !== 'all' ||
                  filterRead !== 'all') && (
                  <span className="text-sm font-normal text-muted-foreground">
                    (
                    {[
                      searchTerm && `"${searchTerm}"`,
                      filterType !== 'all' &&
                        NOTIFICATION_TYPES.find(t => t.value === filterType)
                          ?.label,
                      filterRead !== 'all' && filterRead,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                    )
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Search and filter notifications by type, status, or content
              </CardDescription>
            </div>
            {isFilterExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {isFilterExpanded && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <CardContent className="pt-0 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search notifications..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select
                  value={filterType}
                  onValueChange={value =>
                    setFilterType(value as NotificationType | 'all')
                  }
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="min-w-0 w-auto max-w-[200px]"
                    sideOffset={4}
                  >
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="flight_update">
                      Flight Updates
                    </SelectItem>
                    <SelectItem value="traffic_alert">
                      Traffic Alerts
                    </SelectItem>
                    <SelectItem value="run_reminder">Run Reminders</SelectItem>
                    <SelectItem value="status_change">
                      Status Changes
                    </SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filterRead}
                  onValueChange={value =>
                    setFilterRead(value as 'all' | 'read' | 'unread')
                  }
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="min-w-0 w-auto max-w-[150px]"
                    sideOffset={4}
                  >
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSortBy(
                      sortBy === 'created_at' ? 'updated_at' : 'created_at'
                    )
                  }
                  className="w-full sm:w-auto"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="sm:hidden">Sort</span>
                  <span className="hidden sm:inline">
                    Sort by {sortBy === 'created_at' ? 'Created' : 'Updated'}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full sm:w-auto text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </div>
        )}
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <p className="text-muted-foreground text-lg mb-4">
                {searchTerm || filterType !== 'all' || filterRead !== 'all'
                  ? 'No notifications match your search criteria'
                  : 'No notifications yet'}
              </p>
              {searchTerm || filterType !== 'all' || filterRead !== 'all' ? (
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          notifications.map(notification => (
            <Card
              key={notification.id}
              className={`${!notification.isRead ? 'border-primary/20 bg-primary/5' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">
                            {notification.title}
                          </h3>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getNotificationTypeColor(notification.type)}`}
                          >
                            {getNotificationTypeInfo(notification.type).label}
                          </Badge>
                          {!notification.isRead && (
                            <Badge variant="default" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            {formatScheduleTime(
                              notification.createdAt?.toISOString?.() || ''
                            )}
                          </span>
                          {notification.flightNumber && (
                            <span className="flex items-center gap-1">
                              <Plane className="h-3 w-3" />
                              {notification.flightNumber}
                            </span>
                          )}
                          {notification.pickupLocation && (
                            <span className="truncate">
                              📍 {notification.pickupLocation}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleMarkAsRead(
                              notification.id,
                              !notification.isRead
                            )
                          }
                          disabled={markAsReadMutation.isPending}
                        >
                          {notification.isRead ? (
                            <Circle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeleteNotification(notification.id)
                          }
                          disabled={deleteNotificationMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/notifications')({
  component: Notifications,
});
