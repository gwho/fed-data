import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { mergeSeriesByDate } from '@/app/utils/chartHelpers';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, ConsumerSpendingData } from '../shared/types';

/**
 * Custom hook for loading and managing consumer spending data
 *
 * Fetches 10 spending-related series from FRED API and merges them into 4 multi-series charts.
 * Uses `mergeSeriesByDate` to align series with different observation dates on the same chart.
 *
 * **Why mergeSeriesByDate?**
 * Consumer spending metrics come from different sources with different publication schedules:
 * - PCE (Personal Consumption Expenditures) is published monthly
 * - Retail sales may have revisions at different dates
 * - Sentiment surveys are typically mid-month
 *
 * `mergeSeriesByDate` ensures all series in a chart share the same date keys, filling gaps
 * where needed. This prevents Recharts errors and creates clean multi-line visualizations.
 *
 * **Series Fetched (10 total → 4 merged charts):**
 *
 * **Chart 1 - PCE by Category:**
 * - `PCE` - Personal Consumption Expenditures Total (billions of dollars)
 * - `PCEDG` - PCE Durable Goods (billions of dollars)
 * - `PCESV` - PCE Services (billions of dollars)
 *
 * **Chart 2 - Retail Sales by Category:**
 * - `RSAFS` - Retail and Food Services Total (millions of dollars)
 * - `RSFSDP` - Food Services and Drinking Places (millions of dollars)
 * - `GAFO` - General Merchandise Stores (millions of dollars)
 *
 * **Chart 3 - Savings Rate vs Disposable Income:**
 * - `PSAVERT` - Personal Saving Rate (%)
 * - `DSPI` - Disposable Personal Income (billions of dollars, **÷1000 to scale to trillions**)
 *
 * **Chart 4 - Consumer Sentiment:**
 * - `UMCSENT` - University of Michigan Consumer Sentiment Index (Index 1966:Q1=100)
 * - `CSCICP03USM665S` - OECD Consumer Confidence Index (Amplitude Adjusted)
 *
 * **Transform Functions:**
 * - Disposable income is divided by 1000 (billions → trillions) to fit on the same chart
 *   scale as the saving rate percentage. Without this transform, the income line (~18,000
 *   billion) would dwarf the saving rate (3-5%) and make the chart unreadable.
 *
 * **Data Format:** All series use ISO date format (YYYY-MM-DD) required by `mergeSeriesByDate`
 * **Date Range:** Last 12 months from current date
 * **Caching:** Uses `getFredSeriesCached` for performance
 *
 * @param isActive - Whether the consumer spending section is currently visible
 * @returns Object containing 4 merged chart datasets, loading state, and error state
 *
 * @example
 * ```tsx
 * const spending = useConsumerSpendingData(activeSection === 'consumer-spending');
 *
 * if (spending.loading) return <LoadingSpinner />;
 * if (spending.error) return <ErrorMessage error={spending.error} />;
 *
 * // Each chart is an array of MergedDataPoint with aligned dates
 * return (
 *   <LineChart data={spending.data.pceChart}>
 *     <Line dataKey="total" name="Total PCE" />
 *     <Line dataKey="durables" name="Durable Goods" />
 *     <Line dataKey="services" name="Services" />
 *   </LineChart>
 * );
 * ```
 */
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
            // Convert billions → trillions (÷1000) to fit on same Y-axis scale as saving rate %
            // Without this, disposable income (~18,000 billion) would dwarf saving rate (3-5%)
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
