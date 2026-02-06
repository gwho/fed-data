import { useState, useEffect } from 'react';
import { getFredSeriesCached } from '@/app/lib/fredApi';
import { useDateRange } from '../shared/useDateRange';
import { useDataFormatter } from '../shared/useDataFormatter';
import { DomainHookResult, EmploymentData } from '../shared/types';

/**
 * Custom hook for loading and managing employment data
 *
 * Fetches 4 employment-related series from FRED API when the section is active.
 * Covers labor force participation, job creation, unemployment claims, and wage growth.
 *
 * **Series Fetched (4 total):**
 * - `CIVPART` - Civilian Labor Force Participation Rate (%)
 * - `PAYEMS` - All Employees, Total Nonfarm (thousands of persons)
 * - `ICSA` - Initial Claims (weekly, thousands)
 * - `AHETPI` - Average Hourly Earnings of Production & Nonsupervisory Employees ($/hour)
 *
 * **Data Format:** All series use monthly formatting (e.g., "Jan", "Feb")
 * **Date Range:** Last 12 months from current date
 * **Caching:** Uses `getFredSeriesCached` for performance
 *
 * @param isActive - Whether the employment section is currently visible
 * @returns Object containing employment data, loading state, and error state
 *
 * @example
 * ```tsx
 * const employment = useEmploymentData(activeSection === 'employment');
 *
 * if (employment.loading) return <LoadingSpinner />;
 * if (employment.error) return <ErrorMessage error={employment.error} />;
 *
 * return (
 *   <>
 *     <Chart data={employment.data.laborForce} title="Labor Force Participation" />
 *     <Chart data={employment.data.payrolls} title="Nonfarm Payrolls" />
 *     <Chart data={employment.data.initialClaims} title="Initial Jobless Claims" />
 *     <Chart data={employment.data.hourlyEarnings} title="Hourly Earnings" />
 *   </>
 * );
 * ```
 */
export function useEmploymentData(isActive: boolean): DomainHookResult<EmploymentData> {
  const [data, setData] = useState<EmploymentData>({
    laborForce: [],
    payrolls: [],
    initialClaims: [],
    hourlyEarnings: [],
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
        const [laborForce, payrolls, initialClaims, hourlyEarnings] =
          await Promise.all([
            getFredSeriesCached('CIVPART', oneYearAgo),
            getFredSeriesCached('PAYEMS', oneYearAgo),
            getFredSeriesCached('ICSA', oneYearAgo),
            getFredSeriesCached('AHETPI', oneYearAgo),
          ]);

        setData({
          laborForce: formatMonthly(laborForce),
          payrolls: formatMonthly(payrolls),
          initialClaims: formatMonthly(initialClaims),
          hourlyEarnings: formatMonthly(hourlyEarnings),
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load employment data'));
        console.error('Error loading employment data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isActive, oneYearAgo, formatMonthly]);

  return { data, loading, error };
}
