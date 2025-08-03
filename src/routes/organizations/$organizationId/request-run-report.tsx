import { createFileRoute } from '@tanstack/react-router';
import { Building2, FileText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import PageWrapper from '../../../components/ui/page-wrapper';
import { StickyHeader } from '../../../components/ui/sticky-header';
import { useCurrentUserData } from '../../../lib/hooks/use-user';

function RequestRunReport() {
  const { user } = useCurrentUserData();

  return (
    <PageWrapper>
      {/* Header */}
      <StickyHeader
        title="Request Run Report"
        subtitle="Generate detailed reports for your organization's runs"
      />

      {/* Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Run Report Generation
          </CardTitle>
          <CardDescription>
            Advanced reporting features are coming soon
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Report Generation Coming Soon
            </h3>
            <p className="text-muted-foreground mb-4">
              We're working on adding comprehensive reporting capabilities.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>🔨 Custom date range reports (planned)</p>
              <p>🔨 Driver-specific filtering (planned)</p>
              <p>🔨 Multiple export formats (planned)</p>
              <p>🔨 Automated report scheduling (planned)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Current User
          </CardTitle>
          <CardDescription>
            Report access is based on your user role
          </CardDescription>
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
              <p className="text-xs text-muted-foreground mt-4">
                Organization-based reporting will be available once organization
                features are implemented.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

export const Route = createFileRoute(
  '/organizations/$organizationId/request-run-report'
)({
  component: RequestRunReport,
});
