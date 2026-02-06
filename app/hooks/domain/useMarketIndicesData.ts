import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { mergeSeriesByDate } from '@/app/utils/chartHelpers';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, MarketIndicesData } from '../shared/types';

/**
 * Custom hook for loading and managing stock market indices data
 *
 * Fetches 7 market-related series from FRED API and merges them into 3 multi-series charts
 * plus 1 standalone VIX series. Uses **3-year date range** to capture market cycles and trends.
 *
 * **Why 3 Years Instead of 1?**
 * Stock market data benefits from longer historical context:
 * - Market cycles often span 1-2 years
 * - Credit spreads show trends over longer periods
 * - Comparing current levels to 3-year averages provides better context
 * - 1 year of stock data can be misleading if it only captures a bull or bear phase
 *
 * **Series Fetched (7 total → 3 merged charts + 1 standalone):**
 *
 * **Chart 1 - Equity Indices:**
 * - `SP500` - S&P 500 Index
 * - `NASDAQCOM` - NASDAQ Composite Index
 * - `DJIA` - Dow Jones Industrial Average
 *
 * **Chart 2 - Volatility (standalone):**
 * - `VIXCLS` - CBOE Volatility Index: VIX (market fear gauge)
 *
 * **Chart 3 - Credit Spreads:**
 * - `BAA10Y` - Moody's Seasoned Baa Corporate Bond Yield Relative to 10-Year Treasury (%)
 * - `AAA10Y` - Moody's Seasoned Aaa Corporate Bond Yield Relative to 10-Year Treasury (%)
 *
 * **Chart 4 - Market Breadth:**
 * - `SP500` - S&P 500 Index (reused from Chart 1)
 * - `NYA` - NYSE Composite Index
 *
 * **Data Format:** All series use ISO date format (YYYY-MM-DD) required by `mergeSeriesByDate`
 * **Date Range:** Last 36 months (3 years) from current date
 * **Caching:** Uses `getFredSeriesCached` for performance
 *
 * @param isActive - Whether the market indices section is currently visible
 * @returns Object containing 3 merged chart datasets + VIX standalone, loading state, and error state
 *
 * @example
 * ```tsx
 * const marketIndices = useMarketIndicesData(activeSection === 'market-indices');
 *
 * if (marketIndices.loading) return <LoadingSpinner />;
 * if (marketIndices.error) return <ErrorMessage error={marketIndices.error} />;
 *
 * return (
 *   <>
 *     <LineChart data={marketIndices.data.equityIndices}>
 *       <Line dataKey="sp500" name="S&P 500" />
 *       <Line dataKey="nasdaq" name="NASDAQ" />
 *       <Line dataKey="dow" name="Dow Jones" />
 *     </LineChart>
 *     <LineChart data={marketIndices.data.vix}>
 *       <Line dataKey="value" name="VIX" />
 *     </LineChart>
 *   </>
 * );
 * ```
 */
export function useMarketIndicesData(isActive: boolean): DomainHookResult<MarketIndicesData> {
  const [data, setData] = useState<MarketIndicesData>({
    equityIndices: [],
    vix: [],
    creditSpread: [],
    breadth: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { threeYearsAgo } = useDateRange();
  const { formatIsoDate } = useDataFormatter();

  useEffect(() => {
    if (!isActive) return;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [sp500Series, nasdaqSeries, dowSeries, vixSeries, baaSeries, aaaSeries, nyaSeries] =
          await Promise.all([
            getFredSeriesCached('SP500', threeYearsAgo),
            getFredSeriesCached('NASDAQCOM', threeYearsAgo),
            getFredSeriesCached('DJIA', threeYearsAgo),
            getFredSeriesCached('VIXCLS', threeYearsAgo),
            getFredSeriesCached('BAA10Y', threeYearsAgo),
            getFredSeriesCached('AAA10Y', threeYearsAgo),
            getFredSeriesCached('NYA', threeYearsAgo),
          ]);

        const equityIndices = mergeSeriesByDate([
          { key: 'sp500', data: formatIsoDate(sp500Series) },
          { key: 'nasdaq', data: formatIsoDate(nasdaqSeries) },
          { key: 'dow', data: formatIsoDate(dowSeries) },
        ]);

        const creditSpread = mergeSeriesByDate([
          { key: 'baa', data: formatIsoDate(baaSeries) },
          { key: 'aaa', data: formatIsoDate(aaaSeries) },
        ]);

        const breadth = mergeSeriesByDate([
          { key: 'sp500', data: formatIsoDate(sp500Series) },
          { key: 'nyse', data: formatIsoDate(nyaSeries) },
        ]);

        setData({
          equityIndices,
          vix: formatIsoDate(vixSeries),
          creditSpread,
          breadth,
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load market indices data'));
        console.error('Error loading market indices data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isActive, threeYearsAgo, formatIsoDate]);

  return { data, loading, error };
}
