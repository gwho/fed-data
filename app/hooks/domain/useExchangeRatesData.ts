import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, ExchangeRatesData } from '../shared/types';

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
