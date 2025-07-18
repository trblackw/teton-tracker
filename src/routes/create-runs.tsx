import { createFileRoute } from '@tanstack/react-router';
import { Calendar, Clock, MapPin, Plane, Plus, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
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

export const Route = createFileRoute('/create-runs')({
  component: CreateRunsPage,
});

function CreateRunsPage() {
  const { data: organization } = useUserOrganization();
  const { isAdmin } = useIsUserAdmin(organization?.id);

  // Redirect non-admins
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-2 max-w-full overflow-hidden">
        <div className="text-center py-12">
          <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You must be an administrator to create runs for drivers.
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
          <h1 className="text-3xl font-bold">Create Runs</h1>
        </div>
        <p className="text-muted-foreground">
          Create & assign runs to organization drivers
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">Flight Pickup</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Create a pickup run from a location to the airport
            </CardDescription>
            <Button className="w-full mt-3" variant="outline">
              Create Pickup
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Flight Dropoff</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Create a dropoff run from the airport to a destination
            </CardDescription>
            <Button className="w-full mt-3" variant="outline">
              Create Dropoff
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Batch Import</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Import multiple runs from a schedule or CSV file
            </CardDescription>
            <Button className="w-full mt-3" variant="outline">
              Import Runs
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Run Creation Activity
          </CardTitle>
          <CardDescription>
            Recently created runs and assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Example recent activity */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">
                    AA 1234 assigned to John Smith
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  2 hours ago
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Pickup run from Hotel Jackson to JAC Airport at 2:30 PM
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="font-medium">
                    DL 5678 assigned to Sarah Johnson
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  4 hours ago
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Dropoff run from JAC Airport to Four Seasons at 4:15 PM
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
