import { createFileRoute, useParams } from '@tanstack/react-router';
import PageWrapper from '../../../components/ui/page-wrapper';

function OrganizationPage() {
  const { organizationId } = useParams({
    from: '/organizations/$organizationId/',
  });

  return (
    <PageWrapper>
      <div className="py-6">
        <h1 className="text-2xl font-bold">Organization {organizationId}</h1>
        <p>This will contain the full organization component logic...</p>
      </div>
    </PageWrapper>
  );
}

export const Route = createFileRoute('/organizations/$organizationId/')({
  component: OrganizationPage,
});
