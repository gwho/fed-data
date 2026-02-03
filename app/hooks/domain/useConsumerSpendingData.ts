import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { mergeSeriesByDate } from '@/app/utils/chartHelpers';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, ConsumerSpendingData } from '../shared/types';

export function useConsumerSpendingData(isActive: boolean): DomainHookResult<ConsumerSpendingData> {
  const [data, setData] = useState<ConsumerSpendingData>({
    pceChart: [],
    retailChart: [],
    savingsChart: [],
    sentimentChart: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { oneYearAgo } = useDateRange();
  const { formatIsoDate } = useDataFormatter();

  useEffect(() => {
    if (!isActive) return;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [pceTotal, pceDurable, pceServices, totalRetail, foodServices, generalMerch, savingRate, dispIncome, sentiment, confidence] =
          await Promise.all([
            getFredSeriesCached('PCE', oneYearAgo),
            getFredSeriesCached('PCEDG', oneYearAgo),
            getFredSeriesCached('PCESV', oneYearAgo),
            getFredSeriesCached('RSAFS', oneYearAgo),
            getFredSeriesCached('RSFSDP', oneYearAgo),
            getFredSeriesCached('GAFO', oneYearAgo),
            getFredSeriesCached('PSAVERT', oneYearAgo),
            getFredSeriesCached('DSPI', oneYearAgo),
            getFredSeriesCached('UMCSENT', oneYearAgo),
            getFredSeriesCached('CSCICP03USM665S', oneYearAgo),
          ]);

        const pceChart = mergeSeriesByDate([
          { key: 'total', data: formatIsoDate(pceTotal) },
          { key: 'durables', data: formatIsoDate(pceDurable) },
          { key: 'services', data: formatIsoDate(pceServices) },
        ]);

        const retailChart = mergeSeriesByDate([
          { key: 'total', data: formatIsoDate(totalRetail) },
          { key: 'foodServices', data: formatIsoDate(foodServices) },
          { key: 'generalMerch', data: formatIsoDate(generalMerch) },
        ]);

        const savingsChart = mergeSeriesByDate([
          { key: 'savingRate', data: formatIsoDate(savingRate) },
          {
            key: 'disposableIncome',
            data: formatIsoDate(dispIncome),
            transform: (v: number) => v / 1000,
          },
        ]);

        const sentimentChart = mergeSeriesByDate([
          { key: 'sentiment', data: formatIsoDate(sentiment) },
          { key: 'confidence', data: formatIsoDate(confidence) },
        ]);

        setData({ pceChart, retailChart, savingsChart, sentimentChart });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load consumer spending data'));
        console.error('Error loading consumer spending data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isActive, oneYearAgo, formatIsoDate]);

  return { data, loading, error };
}
