import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { mergeSeriesByDate } from '@/app/utils/chartHelpers';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, MarketIndicesData } from '../shared/types';

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
