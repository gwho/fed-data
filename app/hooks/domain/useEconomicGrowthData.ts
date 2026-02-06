import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, EconomicGrowthData } from '../shared/types';

/**
 * Custom hook for loading and managing economic growth data
 *
 * Fetches 5 growth-related series from FRED API when the section is active. Uses **mixed
 * date ranges** because quarterly and monthly series have different data density requirements.
 *
 * **Why Different Date Ranges?**
 * - **Quarterly series** (GDP): Only 4 data points per year → need 2 years (8 points) to show meaningful trends
 * - **Monthly series** (Industrial Production, Retail, Capacity): 12 points per year → 1 year (12 points) is sufficient
 *
 * **Series Fetched (5 total):**
 * - `A191RL1Q225SBEA` - Real Gross Domestic Product (Quarterly, % change from previous period) — **2 years**
 * - `A191RP1Q027SBEA` - Real Gross Domestic Product (Quarterly, billions of chained 2017 dollars) — **2 years**
 * - `INDPRO` - Industrial Production: Total Index (Monthly, Index 2017=100) — **1 year**
 * - `RSAFS` - Advance Retail Sales: Retail and Food Services, Total (Monthly, millions of dollars) — **1 year**
 * - `TCU` - Capacity Utilization: Total Industry (Monthly, % of capacity) — **1 year**
 *
 * **Data Format:**
 * - Quarterly series use quarterly formatting (e.g., "Q1 '24", "Q2 '24")
 * - Monthly series use monthly formatting (e.g., "Jan", "Feb")
 *
 * **Caching:** Uses `getFredSeriesCached` for performance
 *
 * @param isActive - Whether the economic growth section is currently visible
 * @returns Object containing economic growth data, loading state, and error state
 *
 * @example
 * ```tsx
 * const economicGrowth = useEconomicGrowthData(activeSection === 'economic-growth');
 *
 * if (economicGrowth.loading) return <LoadingSpinner />;
 * if (economicGrowth.error) return <ErrorMessage error={economicGrowth.error} />;
 *
 * return (
 *   <>
 *     <Chart data={economicGrowth.data.realGdp} title="Real GDP Growth" />
 *     <Chart data={economicGrowth.data.industrialProd} title="Industrial Production" />
 *     <Chart data={economicGrowth.data.retailSales} title="Retail Sales" />
 *   </>
 * );
 * ```
 */
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
