import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, KeyIndicatorsData } from '../shared/types';

/**
 * Custom hook for loading key indicator data.
 * Unlike other domain hooks, this one loads on mount (no isActive parameter)
 * because key indicators are always pre-fetched for the dashboard overview.
 */
export function useKeyIndicatorsData(): DomainHookResult<KeyIndicatorsData> {
  const [data, setData] = useState<KeyIndicatorsData>({
    cpi: [],
    unemployment: [],
    tenYear: [],
    threeMonth: [],
    fedFunds: [],
    mortgage: [],
    gdp: [],
    sp500: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { oneYearAgo, threeYearsAgo } = useDateRange();
  const { formatMonthly, formatQuarterly } = useDataFormatter();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [cpi, unemployment, gdp, sp500, tenYear, threeMonth, fedFunds, mortgage] =
          await Promise.all([
            getFredSeriesCached('CPIAUCSL', threeYearsAgo),
            getFredSeriesCached('UNRATE', oneYearAgo),
            getFredSeriesCached('A191RL1Q225SBEA', oneYearAgo),
            getFredSeriesCached('SP500', oneYearAgo),
            getFredSeriesCached('GS10', oneYearAgo),
            getFredSeriesCached('TB3MS', oneYearAgo),
            getFredSeriesCached('FEDFUNDS', oneYearAgo),
            getFredSeriesCached('MORTGAGE30US', oneYearAgo),
          ]);

        // CPI: group by year, take January value for each year
        const cpiByYear = new Map<string, number>();
        cpi.forEach((d) => {
          const date = new Date(d.date);
          const year = date.getFullYear().toString();
          const month = date.getMonth();
          if (month === 0 && !cpiByYear.has(year)) {
            cpiByYear.set(year, parseFloat(d.value));
          }
        });

        const cpiData = Array.from(cpiByYear.entries())
          .map(([year, value]) => ({ date: year, value }))
          .sort((a, b) => parseInt(a.date) - parseInt(b.date));

        setData({
          cpi: cpiData,
          unemployment: formatMonthly(unemployment),
          tenYear: formatMonthly(tenYear),
          threeMonth: formatMonthly(threeMonth),
          fedFunds: formatMonthly(fedFunds),
          mortgage: formatMonthly(mortgage),
          gdp: formatQuarterly(gdp),
          sp500: formatMonthly(sp500),
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load key indicators'));
        console.error('Error loading key indicators:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [oneYearAgo, threeYearsAgo, formatMonthly, formatQuarterly]);

  return { data, loading, error };
}
