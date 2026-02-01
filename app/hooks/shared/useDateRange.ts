import { useMemo } from 'react';

/**
 * Custom hook for calculating common date ranges used in FRED data fetching.
 *
 * Memoizes date calculations to prevent recalculation on every render and
 * keeps date strings stable for useEffect dependencies.
 *
 * @returns Object containing commonly used date range strings in ISO format
 *
 * @example
 * ```tsx
 * const { oneYearAgo, twoYearsAgo } = useDateRange();
 *
 * const data = await getFredSeriesCached('FEDFUNDS', oneYearAgo);
 * ```
 */
export function useDateRange() {
  return useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    return {
      oneYearAgo: oneYearAgo.toISOString().split('T')[0],
      twoYearsAgo: twoYearsAgo.toISOString().split('T')[0],
      threeYearsAgo: threeYearsAgo.toISOString().split('T')[0],
    };
  }, []);
}
