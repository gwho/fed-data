import { describe, it, expect } from 'vitest';
import {
  mergeSeriesByDate,
  formatTrillions,
  formatBillions,
  formatPercent,
  formatIndex,
  formatDateTick,
  formatTooltipDate,
} from '../chartHelpers';

// ---------------------------------------------------------------------------
// mergeSeriesByDate
// ---------------------------------------------------------------------------

describe('mergeSeriesByDate', () => {
  it('returns empty array for empty input', () => {
    expect(mergeSeriesByDate([])).toEqual([]);
  });

  it('aligns two series that share all dates', () => {
    const result = mergeSeriesByDate([
      { key: 'a', data: [{ date: '2024-01-01', value: 100 }, { date: '2024-02-01', value: 200 }] },
      { key: 'b', data: [{ date: '2024-01-01', value: 10 },  { date: '2024-02-01', value: 20 }] },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: '2024-01-01', a: 100, b: 10 });
    expect(result[1]).toEqual({ date: '2024-02-01', a: 200, b: 20 });
  });

  it('fills missing dates with null, not zero', () => {
    const result = mergeSeriesByDate([
      { key: 'a', data: [{ date: '2024-01-01', value: 100 }, { date: '2024-02-01', value: 200 }] },
      { key: 'b', data: [{ date: '2024-01-01', value: 10 }] },  // no Feb entry
    ]);
    expect(result).toHaveLength(2);
    expect(result[1].b).toBeNull();
    expect(result[1].a).toBe(200);
  });

  it('includes dates present in only one series', () => {
    const result = mergeSeriesByDate([
      { key: 'a', data: [{ date: '2024-01-01', value: 1 }] },
      { key: 'b', data: [{ date: '2024-03-01', value: 3 }] },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: '2024-01-01', a: 1, b: null });
    expect(result[1]).toEqual({ date: '2024-03-01', a: null, b: 3 });
  });

  it('applies transform function to values before merging', () => {
    const result = mergeSeriesByDate([
      { key: 'income', data: [{ date: '2024-01-01', value: 18000 }], transform: (v) => v / 1000 },
    ]);
    expect(result[0].income).toBe(18);
  });

  it('sorts output chronologically by ISO date', () => {
    const result = mergeSeriesByDate([
      { key: 'a', data: [
        { date: '2024-03-01', value: 3 },
        { date: '2024-01-01', value: 1 },
        { date: '2024-02-01', value: 2 },
      ]},
    ]);
    expect(result[0].date).toBe('2024-01-01');
    expect(result[1].date).toBe('2024-02-01');
    expect(result[2].date).toBe('2024-03-01');
  });

  it('handles a single series with no transform', () => {
    const result = mergeSeriesByDate([
      { key: 'x', data: [{ date: '2024-01-01', value: 42 }] },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ date: '2024-01-01', x: 42 });
  });

  it('deduplicates dates that appear in multiple series', () => {
    // Both series share the same date — result should have one row, not two
    const result = mergeSeriesByDate([
      { key: 'a', data: [{ date: '2024-01-01', value: 1 }] },
      { key: 'b', data: [{ date: '2024-01-01', value: 2 }] },
    ]);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// formatTrillions
// ---------------------------------------------------------------------------

describe('formatTrillions', () => {
  it('formats a value in trillions with $ prefix and T suffix', () => {
    expect(formatTrillions(18234.5)).toBe('$18.2T');
  });

  it('returns "N/A" for null', () => {
    expect(formatTrillions(null)).toBe('N/A');
  });

  it('returns "N/A" for undefined', () => {
    expect(formatTrillions(undefined)).toBe('N/A');
  });

  it('handles zero', () => {
    expect(formatTrillions(0)).toBe('$0.0T');
  });
});

// ---------------------------------------------------------------------------
// formatBillions
// ---------------------------------------------------------------------------

describe('formatBillions', () => {
  it('formats a value in billions with $ prefix and B suffix', () => {
    expect(formatBillions(93234)).toBe('$93.2B');
  });

  it('returns "N/A" for null', () => {
    expect(formatBillions(null)).toBe('N/A');
  });

  it('returns "N/A" for undefined', () => {
    expect(formatBillions(undefined)).toBe('N/A');
  });
});

// ---------------------------------------------------------------------------
// formatPercent
// ---------------------------------------------------------------------------

describe('formatPercent', () => {
  it('appends % and formats to one decimal place', () => {
    expect(formatPercent(4.5)).toBe('4.5%');
  });

  it('formats integer as x.0%', () => {
    expect(formatPercent(5)).toBe('5.0%');
  });

  it('returns "N/A" for null', () => {
    expect(formatPercent(null)).toBe('N/A');
  });

  it('returns "N/A" for undefined', () => {
    expect(formatPercent(undefined)).toBe('N/A');
  });
});

// ---------------------------------------------------------------------------
// formatIndex
// ---------------------------------------------------------------------------

describe('formatIndex', () => {
  it('formats to one decimal place with no suffix', () => {
    expect(formatIndex(79.2)).toBe('79.2');
  });

  it('formats integer as x.0', () => {
    expect(formatIndex(100)).toBe('100.0');
  });

  it('returns "N/A" for null', () => {
    expect(formatIndex(null)).toBe('N/A');
  });

  it('returns "N/A" for undefined', () => {
    expect(formatIndex(undefined)).toBe('N/A');
  });
});

// ---------------------------------------------------------------------------
// formatDateTick
// ---------------------------------------------------------------------------

describe('formatDateTick', () => {
  it('passes through already-formatted short month names unchanged', () => {
    expect(formatDateTick('Jan')).toBe('Jan');
    expect(formatDateTick('Dec')).toBe('Dec');
  });

  it('converts ISO date to "Mon YYYY" format', () => {
    expect(formatDateTick('2024-01-15')).toBe('Jan 2024');
    expect(formatDateTick('2024-12-15')).toBe('Dec 2024');
  });
});

// ---------------------------------------------------------------------------
// formatTooltipDate
// ---------------------------------------------------------------------------

describe('formatTooltipDate', () => {
  it('converts ISO date to full month name and year', () => {
    const result = formatTooltipDate('2024-01-15');
    expect(result).toContain('January');
    expect(result).toContain('2024');
  });

  it('passes through non-ISO strings unchanged', () => {
    expect(formatTooltipDate('Jan')).toBe('Jan');
  });
});
