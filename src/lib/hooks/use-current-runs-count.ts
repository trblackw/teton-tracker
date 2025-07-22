import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../react-query-client';
import { useOrgRunsApi } from './index';
import { useCurrentOrgId } from './use-org-navigation';

export function useCurrentRunsCount() {
  const runsApi = useOrgRunsApi();
  const organizationId = useCurrentOrgId();

  const { data: runs = [] } = useQuery({
    queryKey: queryKeys.runs(organizationId),
    queryFn: () => runsApi.getRuns(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!organizationId, // Only fetch when we have an organization
  });

  // Filter for current runs (scheduled or active)
  const currentRunsCount = runs.filter(
    run => run.status === 'scheduled' || run.status === 'active'
  ).length;

  return currentRunsCount;
}
