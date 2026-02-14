import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDataFormatter } from '../shared/useDataFormatter';

// Use mid-month dates to avoid UTC midnight → local-date boundary issues.
const sampleData = [
  { date: '2024-01-15', value: '310.326' },
  { date: '2024-06-15', value: '315.000' },
];

describe('useDataFormatter', () => {
  describe('formatMonthly', () => {
    it('formats date as short month name ("Jan", "Jun", …)', () => {
      const { result } = renderHook(() => useDataFormatter());
      const formatted = result.current.formatMonthly(sampleData);
      expect(formatted[0].date).toBe('Jan');
      expect(formatted[1].date).toBe('Jun');
    });

    it('parses value string to number', () => {
      const { result } = renderHook(() => useDataFormatter());
      const formatted = result.current.formatMonthly(sampleData);
      expect(formatted[0].value).toBe(310.326);
      expect(formatted[1].value).toBe(315);
    });

    it('preserves array length', () => {
      const { result } = renderHook(() => useDataFormatter());
      expect(result.current.formatMonthly(sampleData)).toHaveLength(2);
    });

    it('returns an empty array for empty input', () => {
      const { result } = renderHook(() => useDataFormatter());
      expect(result.current.formatMonthly([])).toEqual([]);
    });

    it('returns a stable function reference across re-renders (useCallback)', () => {
      const { result, rerender } = renderHook(() => useDataFormatter());
      const first = result.current.formatMonthly;
      rerender();
      expect(result.current.formatMonthly).toBe(first);
    });
  });

  describe('formatQuarterly', () => {
    it('includes short month and 2-digit year (e.g. "Jan \'24")', () => {
      const { result } = renderHook(() => useDataFormatter());
      const formatted = result.current.formatQuarterly(sampleData);
      // Check month abbreviation and 2-digit year are both present
      expect(formatted[0].date).toMatch(/Jan/);
      expect(formatted[0].date).toMatch(/24/);
    });

    it('parses value string to number', () => {
      const { result } = renderHook(() => useDataFormatter());
      const formatted = result.current.formatQuarterly(sampleData);
      expect(typeof formatted[0].value).toBe('number');
      expect(formatted[0].value).toBe(310.326);
    });

    it('preserves array length', () => {
      const { result } = renderHook(() => useDataFormatter());
      expect(result.current.formatQuarterly(sampleData)).toHaveLength(2);
    });

    it('returns a stable function reference across re-renders (useCallback)', () => {
      const { result, rerender } = renderHook(() => useDataFormatter());
      const first = result.current.formatQuarterly;
      rerender();
      expect(result.current.formatQuarterly).toBe(first);
    });
  });

  describe('formatIsoDate', () => {
    it('preserves the ISO date string unchanged (YYYY-MM-DD)', () => {
      const { result } = renderHook(() => useDataFormatter());
      const formatted = result.current.formatIsoDate(sampleData);
      expect(formatted[0].date).toBe('2024-01-15');
      expect(formatted[1].date).toBe('2024-06-15');
    });

    it('parses value string to number', () => {
      const { result } = renderHook(() => useDataFormatter());
      const formatted = result.current.formatIsoDate(sampleData);
      expect(formatted[0].value).toBe(310.326);
    });

    it('preserves array length', () => {
      const { result } = renderHook(() => useDataFormatter());
      expect(result.current.formatIsoDate(sampleData)).toHaveLength(2);
    });

    it('returns a stable function reference across re-renders (useCallback)', () => {
      const { result, rerender } = renderHook(() => useDataFormatter());
      const first = result.current.formatIsoDate;
      rerender();
      expect(result.current.formatIsoDate).toBe(first);
    });
  });

  it('all three formatters are independent stable references', () => {
    const { result, rerender } = renderHook(() => useDataFormatter());
    const { formatMonthly, formatQuarterly, formatIsoDate } = result.current;
    rerender();
    expect(result.current.formatMonthly).toBe(formatMonthly);
    expect(result.current.formatQuarterly).toBe(formatQuarterly);
    expect(result.current.formatIsoDate).toBe(formatIsoDate);
  });
});
