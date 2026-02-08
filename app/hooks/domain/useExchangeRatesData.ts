import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, ExchangeRatesData } from '../shared/types';

/**
 * Custom hook for loading and managing foreign exchange rates data
 *
 * Fetches 9 currency series from FRED API when the section is active. Includes the
 * trade-weighted dollar index and 8 bilateral exchange rates against major currencies.
 *
 * **Series Fetched (9 total):**
 * - `DTWEXBGS` - Trade Weighted U.S. Dollar Index: Broad, Goods and Services (Index Jan 2006=100)
 *   - This is the baseline index measuring the dollar's strength against a basket of currencies
 * - `DEXUSEU` - U.S. / Euro Foreign Exchange Rate (Euro per U.S. Dollar)
 * - `DEXUSUK` - U.S. / U.K. Foreign Exchange Rate (British Pounds per U.S. Dollar)
 * - `DEXJPUS` - Japan / U.S. Foreign Exchange Rate (Japanese Yen per U.S. Dollar)
 * - `DEXCHUS` - China / U.S. Foreign Exchange Rate (Yuan per U.S. Dollar)
 * - `DEXMXUS` - Mexico / U.S. Foreign Exchange Rate (Pesos per U.S. Dollar)
 * - `DEXINUS` - India / U.S. Foreign Exchange Rate (Rupees per U.S. Dollar)
 * - `DEXCAUS` - Canada / U.S. Foreign Exchange Rate (Canadian Dollars per U.S. Dollar)
 * - `DEXUSAL` - Australia / U.S. Foreign Exchange Rate (Australian Dollars per U.S. Dollar)
 *
 * **Data Format:** All series use monthly formatting (e.g., "Jan", "Feb")
 * **Date Range:** Last 12 months from current date
 * **Caching:** Uses `getFredSeriesCached` for performance
 *
 * @param isActive - Whether the exchange rates section is currently visible
 * @returns Object containing exchange rate data, loading state, and error state
 *
 * @example
 * ```tsx
 * const exchangeRates = useExchangeRatesData(activeSection === 'exchange-rates');
 *
 * if (exchangeRates.loading) return <LoadingSpinner />;
 * if (exchangeRates.error) return <ErrorMessage error={exchangeRates.error} />;
 *
 * return (
 *   <>
 *     <Chart data={exchangeRates.data.dollarIndex} title="Dollar Index (DXY)" />
 *     <Chart data={exchangeRates.data.eur} title="EUR/USD" />
 *     <Chart data={exchangeRates.data.jpy} title="JPY/USD" />
 *   </>
 * );
 * ```
 */
export function useExchangeRatesData(isActive: boolean): DomainHookResult<ExchangeRatesData> {
  const [data, setData] = useState<ExchangeRatesData>({
    dollarIndex: [],
    eur: [],
    gbp: [],
    jpy: [],
    cny: [],
    mxn: [],
    inr: [],
    cad: [],
    aud: [],
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
        const [dollarIndex, eur, gbp, jpy, cny, mxn, inr, cad, aud] =
          await Promise.all([
            getFredSeriesCached('DTWEXBGS', oneYearAgo),
            getFredSeriesCached('DEXUSEU', oneYearAgo),
            getFredSeriesCached('DEXUSUK', oneYearAgo),
            getFredSeriesCached('DEXJPUS', oneYearAgo),
            getFredSeriesCached('DEXCHUS', oneYearAgo),
            getFredSeriesCached('DEXMXUS', oneYearAgo),
            getFredSeriesCached('DEXINUS', oneYearAgo),
            getFredSeriesCached('DEXCAUS', oneYearAgo),
            getFredSeriesCached('DEXUSAL', oneYearAgo),
          ]);

        setData({
          dollarIndex: formatMonthly(dollarIndex),
          eur: formatMonthly(eur),
          gbp: formatMonthly(gbp),
          jpy: formatMonthly(jpy),
          cny: formatMonthly(cny),
          mxn: formatMonthly(mxn),
          inr: formatMonthly(inr),
          cad: formatMonthly(cad),
          aud: formatMonthly(aud),
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load exchange rates data'));
        console.error('Error loading exchange rates data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isActive, oneYearAgo, formatMonthly]);

  return { data, loading, error };
}
