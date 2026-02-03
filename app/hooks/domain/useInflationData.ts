import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, InflationData } from '../shared/types';

/**
 * Custom hook for loading and managing inflation data.
 *
 * Fetches 7 inflation-related series from FRED API when the section is active.
 * Data is cached using getFredSeriesCached for performance.
 *
 * **Series fetched:**
 * - CPILFESL: Core CPI (excludes food and energy)
 * - PCEPI: Personal Consumption Expenditures Price Index
 * - PCEPILFE: Core PCE (Fed's preferred inflation measure)
 * - CPIUFDSL: Food CPI
 * - CPIENGSL: Energy CPI
 * - CUSR0000SAH: Housing/Shelter CPI
 * - CPIMEDSL: Medical Care CPI
 *
 * @param isActive - Whether the inflation section is currently active
 * @returns Object containing inflation data, loading state, and error
 *
 * @example
 * ```tsx
 * const inflation = useInflationData(activeSection === 'inflation');
 *
 * if (inflation.loading) return <LoadingSpinner />;
 * if (inflation.error) return <ErrorMessage error={inflation.error} />;
 *
 * return <Chart data={inflation.data.coreCpi} />;
 * ```
 */
export function useInflationData(isActive: boolean): DomainHookResult<InflationData> {
  const [data, setData] = useState<InflationData>({
    coreCpi: [],
    pce: [],
    corePce: [],
    foodCpi: [],
    energyCpi: [],
    housingCpi: [],
    medicalCpi: [],
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
        const [coreCpi, pce, corePce, foodCpi, energyCpi, housingCpi, medicalCpi] =
          await Promise.all([
            getFredSeriesCached('CPILFESL', oneYearAgo),
            getFredSeriesCached('PCEPI', oneYearAgo),
            getFredSeriesCached('PCEPILFE', oneYearAgo),
            getFredSeriesCached('CPIUFDSL', oneYearAgo),
            getFredSeriesCached('CPIENGSL', oneYearAgo),
            getFredSeriesCached('CUSR0000SAH', oneYearAgo),
            getFredSeriesCached('CPIMEDSL', oneYearAgo),
          ]);

        setData({
          coreCpi: formatMonthly(coreCpi),
          pce: formatMonthly(pce),
          corePce: formatMonthly(corePce),
          foodCpi: formatMonthly(foodCpi),
          energyCpi: formatMonthly(energyCpi),
          housingCpi: formatMonthly(housingCpi),
          medicalCpi: formatMonthly(medicalCpi),
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load inflation data'));
        console.error('Error loading inflation data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isActive, oneYearAgo, formatMonthly]);

  return { data, loading, error };
}
