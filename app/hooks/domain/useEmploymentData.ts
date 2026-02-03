import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, EmploymentData } from '../shared/types';

export function useEmploymentData(isActive: boolean): DomainHookResult<EmploymentData> {
  const [data, setData] = useState<EmploymentData>({
    laborForce: [],
    payrolls: [],
    initialClaims: [],
    hourlyEarnings: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { oneYearAgo } = useDateRange();
  const { formatMonthly } = useDataFormatter();

  useEffect(() => {
    if (!isActive) return;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [laborForce, payrolls, initialClaims, hourlyEarnings] =
          await Promise.all([
            getFredSeriesCached('CIVPART', oneYearAgo),
            getFredSeriesCached('PAYEMS', oneYearAgo),
            getFredSeriesCached('ICSA', oneYearAgo),
            getFredSeriesCached('AHETPI', oneYearAgo),
          ]);

        setData({
          laborForce: formatMonthly(laborForce),
          payrolls: formatMonthly(payrolls),
          initialClaims: formatMonthly(initialClaims),
          hourlyEarnings: formatMonthly(hourlyEarnings),
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load employment data'));
        console.error('Error loading employment data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isActive, oneYearAgo, formatMonthly]);

  return { data, loading, error };
}
