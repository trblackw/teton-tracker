import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Building2, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { useCurrentUserData } from '../lib/hooks/use-user';

function OrganizationPage() {
  const { user } = useCurrentUserData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Organization Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your organization profile and settings
          </p>
        </div>
      </div>

      {/* Organization Management */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Profile
            </CardTitle>
            <CardDescription>
              Organization management features are coming soon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Organization Features Coming Soon
              </h3>
              <p className="text-muted-foreground mb-4">
                We're working on adding comprehensive organization management
                features.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>✓ User authentication (completed)</p>
                <p>🔨 Organization creation and management (in progress)</p>
                <p>🔨 Team member invitations (planned)</p>
                <p>🔨 Role-based permissions (planned)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current User
            </CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent>
            {user && (
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Name:</span>{' '}
                  <span className="text-sm text-muted-foreground">
                    {user.name}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Email:</span>{' '}
                  <span className="text-sm text-muted-foreground">
                    {user.email}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Joined:</span>{' '}
                  <span className="text-sm text-muted-foreground">
                    {user.createdAt?.toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/organization')({
  component: OrganizationPage,
});
