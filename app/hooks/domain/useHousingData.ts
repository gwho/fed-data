import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, HousingData } from '../shared/types';

export function useHousingData(isActive: boolean): DomainHookResult<HousingData> {
  const [data, setData] = useState<HousingData>({
    homePrice: [],
    housingStarts: [],
    buildingPermits: [],
    mortgageRate: [],
    affordability: [],
    newHomeSales: [],
    existingHomeSales: [],
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
        const [homePrice, housingStarts, permits, mortgageRate, affordability, newSales, existingSales] =
          await Promise.all([
            getFredSeriesCached('CSUSHPISA', oneYearAgo),
            getFredSeriesCached('HOUST', oneYearAgo),
            getFredSeriesCached('PERMIT', oneYearAgo),
            getFredSeriesCached('MORTGAGE30US', oneYearAgo),
            getFredSeriesCached('FIXHAI', oneYearAgo),
            getFredSeriesCached('HSN1F', oneYearAgo),
            getFredSeriesCached('EXHOSLUSM495S', oneYearAgo),
          ]);

        setData({
          homePrice: formatMonthly(homePrice),
          housingStarts: formatMonthly(housingStarts),
          buildingPermits: formatMonthly(permits),
          mortgageRate: formatMonthly(mortgageRate),
          affordability: formatMonthly(affordability),
          newHomeSales: formatMonthly(newSales),
          existingHomeSales: formatMonthly(existingSales),
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load housing data'));
        console.error('Error loading housing data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isActive, oneYearAgo, formatMonthly]);

  return { data, loading, error };
}
