import { useQuery } from '@tanstack/react-query';
import { runsApi } from '../api/client';

export function useCurrentRunsCount() {
  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: () => runsApi.getRuns(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Filter for current runs (scheduled or active)
  const currentRunsCount = runs.filter(
    run => run.status === 'scheduled' || run.status === 'active'
  ).length;

  return currentRunsCount;
}
