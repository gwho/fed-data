import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, KeyIndicatorsData } from '../shared/types';

/**
 * Custom hook for loading and managing key economic indicators
 *
 * **Special Pattern: No `isActive` Parameter**
 *
 * Unlike other domain hooks, this hook loads **immediately on component mount** regardless
 * of which section the user is viewing. This is intentional because:
 * 1. Key indicators appear in the always-visible "Interest Rates" section at the top of the page
 * 2. Preloading improves perceived performance — data is ready when the user first sees the page
 * 3. These are the most frequently accessed metrics (CPI, unemployment, interest rates)
 *
 * **Special Logic: CPI Yearly Aggregation**
 *
 * CPI data is aggregated to show only January values for each year (lines 47-60):
 * - Fetch 3 years of monthly CPI data
 * - Group by year, take only the January (month 0) value for each year
 * - This creates a compact yearly view instead of 36 monthly data points
 *
 * **Series Fetched (8 total):**
 * - `CPIAUCSL` - Consumer Price Index for All Urban Consumers: All Items (Index 1982-1984=100) — **3 years**
 * - `UNRATE` - Unemployment Rate (%) — **1 year**
 * - `GS10` - 10-Year Treasury Constant Maturity Rate (%) — **1 year**
 * - `TB3MS` - 3-Month Treasury Bill Secondary Market Rate (%) — **1 year**
 * - `FEDFUNDS` - Federal Funds Effective Rate (%) — **1 year**
 * - `MORTGAGE30US` - 30-Year Fixed Rate Mortgage Average (%) — **1 year**
 * - `A191RL1Q225SBEA` - Real Gross Domestic Product (Quarterly, % change) — **1 year**
 * - `SP500` - S&P 500 Index — **1 year**
 *
 * **Data Format:**
 * - CPI: Yearly values (e.g., "2023", "2024", "2025")
 * - GDP: Quarterly formatting (e.g., "Q1 '24", "Q2 '24")
 * - All others: Monthly formatting (e.g., "Jan", "Feb")
 *
 * **Caching:** Uses `getFredSeriesCached` for performance
 *
 * @returns Object containing key indicator data, loading state, and error state
 *          (no isActive parameter — always loads on mount)
 *
 * @example
 * ```tsx
 * // In a component that's always visible (e.g., header, top section)
 * const keyIndicators = useKeyIndicatorsData();
 *
 * if (keyIndicators.loading) return <LoadingSpinner />;
 * if (keyIndicators.error) return <ErrorMessage error={keyIndicators.error} />;
 *
 * return (
 *   <InterestRatesSection
 *     cpi={keyIndicators.data.cpi}
 *     tenYearData={keyIndicators.data.tenYear}
 *     threeMonthData={keyIndicators.data.threeMonth}
 *     fedFundsData={keyIndicators.data.fedFunds}
 *     mortgageData={keyIndicators.data.mortgage}
 *     loading={keyIndicators.loading}
 *     error={keyIndicators.error}
 *   />
 * );
 * ```
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
