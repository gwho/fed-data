import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, EconomicGrowthData } from '../shared/types';

export function useEconomicGrowthData(isActive: boolean): DomainHookResult<EconomicGrowthData> {
  const [data, setData] = useState<EconomicGrowthData>({
    realGdp: [],
    nominalGdp: [],
    industrialProd: [],
    retailSales: [],
    capacityUtil: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { oneYearAgo, twoYearsAgo } = useDateRange();
  const { formatMonthly, formatQuarterly } = useDataFormatter();

  useEffect(() => {
    if (!isActive) return;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [realGdp, nominalGdp, industrialProd, retailSales, capacityUtil] =
          await Promise.all([
            getFredSeriesCached('A191RL1Q225SBEA', twoYearsAgo),
            getFredSeriesCached('A191RP1Q027SBEA', twoYearsAgo),
            getFredSeriesCached('INDPRO', oneYearAgo),
            getFredSeriesCached('RSAFS', oneYearAgo),
            getFredSeriesCached('TCU', oneYearAgo),
          ]);

        setData({
          realGdp: formatQuarterly(realGdp),
          nominalGdp: formatQuarterly(nominalGdp),
          industrialProd: formatMonthly(industrialProd),
          retailSales: formatMonthly(retailSales),
          capacityUtil: formatMonthly(capacityUtil),
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load economic growth data'));
        console.error('Error loading economic growth data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isActive, oneYearAgo, twoYearsAgo, formatMonthly, formatQuarterly]);

  return { data, loading, error };
}
