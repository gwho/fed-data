import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, HousingData } from '../shared/types';

/**
 * Custom hook for loading and managing housing market data
 *
 * Fetches 7 housing-related series from FRED API when the section is active.
 * Covers home prices, construction activity, mortgage rates, and sales volume.
 *
 * **Series Fetched (7 total):**
 * - `CSUSHPISA` - S&P/Case-Shiller U.S. National Home Price Index (seasonally adjusted, Index Jan 2000=100)
 * - `HOUST` - Housing Starts: Total New Privately Owned Housing Units Started (thousands of units)
 * - `PERMIT` - New Private Housing Units Authorized by Building Permits (thousands of units)
 * - `MORTGAGE30US` - 30-Year Fixed Rate Mortgage Average in the United States (%)
 * - `FIXHAI` - Housing Affordability Index (higher values = less affordable)
 * - `HSN1F` - New One Family Houses Sold: United States (thousands)
 * - `EXHOSLUSM495S` - Existing Home Sales (thousands of units)
 *
 * **Data Format:** All series use monthly formatting (e.g., "Jan", "Feb")
 * **Date Range:** Last 12 months from current date
 * **Caching:** Uses `getFredSeriesCached` for performance
 *
 * @param isActive - Whether the housing section is currently visible
 * @returns Object containing housing data, loading state, and error state
 *
 * @example
 * ```tsx
 * const housing = useHousingData(activeSection === 'housing');
 *
 * if (housing.loading) return <LoadingSpinner />;
 * if (housing.error) return <ErrorMessage error={housing.error} />;
 *
 * return (
 *   <>
 *     <Chart data={housing.data.homePrice} title="Home Price Index" />
 *     <Chart data={housing.data.housingStarts} title="Housing Starts" />
 *     <Chart data={housing.data.mortgageRate} title="30-Year Mortgage Rate" />
 *   </>
 * );
 * ```
 */
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
