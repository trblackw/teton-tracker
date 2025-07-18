import { createFileRoute } from '@tanstack/react-router';
import { Car, Clock, MapPin, Users } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  useIsUserAdmin,
  useUserOrganization,
} from '../lib/hooks/use-organizations';

export const Route = createFileRoute('/drivers')({
  component: DriversPage,
});

function DriversPage() {
  const { data: organization } = useUserOrganization();
  const { isAdmin } = useIsUserAdmin(organization?.id);

  // Redirect non-admins
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-6 max-w-full overflow-hidden">
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You must be an administrator to view driver information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Drivers</h1>
        </div>
        <p className="text-muted-foreground">
          View and manage active runs for all organization drivers
        </p>
      </div>

      {/* Driver Cards */}
      <div className="grid gap-6">
        {/* Example Driver 1 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">John Smith</CardTitle>
                  <CardDescription>Driver • Online</CardDescription>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                2 Active Runs
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Active Run 1 */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">AA 1234 Pickup</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>Hotel Jackson → JAC Airport</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>Departure: 2:30 PM</span>
                  </div>
                </div>
              </div>

              {/* Active Run 2 */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-green-600" />
                    <span className="font-medium">DL 5678 Dropoff</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    Scheduled
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>JAC Airport → Four Seasons</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>Arrival: 4:15 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Driver 2 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Sarah Johnson</CardTitle>
                  <CardDescription>Driver • Online</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                No Active Runs
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active runs assigned</p>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for more drivers */}
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              Real Driver Data Coming Soon
            </h3>
            <p className="text-muted-foreground text-sm">
              This view will show actual organization members and their assigned
              runs
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
