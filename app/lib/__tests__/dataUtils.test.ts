/**
 * Unit Tests for Data Normalization Utilities
 *
 * These tests verify the data normalization functions in dataUtils.ts.
 * They also serve as executable documentation showing how each function works.
 *
 * Run tests: npm test
 *
 * @see docs/DATA_NORMALIZATION.md for comprehensive documentation
 * @see app/lib/dataUtils.ts for the implementation
 */

import { describe, it, expect } from 'vitest';
import {
  generateDateRange,
  detectFrequency,
  forwardFill,
  interpolateLinear,
  mergeMultipleSeries,
  getLatestAlignedValue,
} from '../dataUtils';

// =============================================================================
// generateDateRange Tests
// =============================================================================

describe('generateDateRange', () => {
  it('generates inclusive date range', () => {
    const range = generateDateRange('2024-01-01', '2024-01-05');

    expect(range).toHaveLength(5);
    expect(range[0]).toBe('2024-01-01');
    expect(range[4]).toBe('2024-01-05');
  });

  it('handles single-day range', () => {
    const range = generateDateRange('2024-01-15', '2024-01-15');

    expect(range).toHaveLength(1);
    expect(range[0]).toBe('2024-01-15');
  });

  it('handles month boundary correctly', () => {
    const range = generateDateRange('2024-01-30', '2024-02-02');

    expect(range).toEqual([
      '2024-01-30',
      '2024-01-31',
      '2024-02-01',
      '2024-02-02',
    ]);
  });

  it('handles leap year correctly', () => {
    const range = generateDateRange('2024-02-28', '2024-03-01');

    expect(range).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
  });

  it('throws error when start is after end', () => {
    expect(() => generateDateRange('2024-01-10', '2024-01-01')).toThrow(
      'Start date (2024-01-10) must be before or equal to end date (2024-01-01)'
    );
  });
});

// =============================================================================
// detectFrequency Tests
// =============================================================================

describe('detectFrequency', () => {
  it('detects daily frequency', () => {
    const data = [
      { date: '2024-01-01', value: '1' },
      { date: '2024-01-02', value: '2' },
      { date: '2024-01-03', value: '3' },
      { date: '2024-01-04', value: '4' },
      { date: '2024-01-05', value: '5' },
    ];

    expect(detectFrequency(data)).toBe('daily');
  });

  it('detects daily frequency even with weekend gaps', () => {
    // Market data often has gaps on weekends
    const data = [
      { date: '2024-01-02', value: '1' }, // Tuesday
      { date: '2024-01-03', value: '2' }, // Wednesday
      { date: '2024-01-04', value: '3' }, // Thursday
      { date: '2024-01-05', value: '4' }, // Friday
      { date: '2024-01-08', value: '5' }, // Monday (skip weekend)
      { date: '2024-01-09', value: '6' }, // Tuesday
    ];

    expect(detectFrequency(data)).toBe('daily');
  });

  it('detects weekly frequency', () => {
    const data = [
      { date: '2024-01-01', value: '1' },
      { date: '2024-01-08', value: '2' },
      { date: '2024-01-15', value: '3' },
      { date: '2024-01-22', value: '4' },
    ];

    expect(detectFrequency(data)).toBe('weekly');
  });

  it('detects monthly frequency', () => {
    const data = [
      { date: '2024-01-01', value: '1' },
      { date: '2024-02-01', value: '2' },
      { date: '2024-03-01', value: '3' },
      { date: '2024-04-01', value: '4' },
    ];

    expect(detectFrequency(data)).toBe('monthly');
  });

  it('detects quarterly frequency', () => {
    const data = [
      { date: '2024-01-01', value: '1' },
      { date: '2024-04-01', value: '2' },
      { date: '2024-07-01', value: '3' },
      { date: '2024-10-01', value: '4' },
    ];

    expect(detectFrequency(data)).toBe('quarterly');
  });

  it('detects yearly frequency', () => {
    const data = [
      { date: '2020-01-01', value: '1' },
      { date: '2021-01-01', value: '2' },
      { date: '2022-01-01', value: '3' },
      { date: '2023-01-01', value: '4' },
    ];

    expect(detectFrequency(data)).toBe('yearly');
  });

  it('returns unknown for single data point', () => {
    const data = [{ date: '2024-01-01', value: '1' }];

    expect(detectFrequency(data)).toBe('unknown');
  });

  it('returns unknown for empty array', () => {
    expect(detectFrequency([])).toBe('unknown');
  });

  it('handles unsorted data', () => {
    // Data can come in any order
    const data = [
      { date: '2024-03-01', value: '3' },
      { date: '2024-01-01', value: '1' },
      { date: '2024-02-01', value: '2' },
    ];

    expect(detectFrequency(data)).toBe('monthly');
  });
});

// =============================================================================
// forwardFill Tests
// =============================================================================

describe('forwardFill', () => {
  it('carries forward last known value', () => {
    const data = [{ date: '2024-01-01', value: '3.7' }];
    const targets = ['2024-01-01', '2024-01-15', '2024-01-31'];

    const result = forwardFill(data, targets);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ date: '2024-01-01', value: '3.7' });
    expect(result[1]).toEqual({ date: '2024-01-15', value: '3.7' }); // Forward filled
    expect(result[2]).toEqual({ date: '2024-01-31', value: '3.7' }); // Forward filled
  });

  it('updates value when new data point is reached', () => {
    const data = [
      { date: '2024-01-01', value: '3.7' },
      { date: '2024-02-01', value: '3.9' },
    ];
    const targets = ['2024-01-15', '2024-02-01', '2024-02-15'];

    const result = forwardFill(data, targets);

    expect(result[0]).toEqual({ date: '2024-01-15', value: '3.7' }); // Jan value
    expect(result[1]).toEqual({ date: '2024-02-01', value: '3.9' }); // Feb value
    expect(result[2]).toEqual({ date: '2024-02-15', value: '3.9' }); // Feb value carried forward
  });

  it('returns empty string for dates before first data point', () => {
    const data = [{ date: '2024-01-15', value: '3.7' }];
    const targets = ['2024-01-01', '2024-01-10', '2024-01-15'];

    const result = forwardFill(data, targets);

    expect(result[0]).toEqual({ date: '2024-01-01', value: '' }); // Before data
    expect(result[1]).toEqual({ date: '2024-01-10', value: '' }); // Before data
    expect(result[2]).toEqual({ date: '2024-01-15', value: '3.7' }); // Exact match
  });

  it('handles empty source data', () => {
    const data: { date: string; value: string }[] = [];
    const targets = ['2024-01-01', '2024-01-02'];

    const result = forwardFill(data, targets);

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe('');
    expect(result[1].value).toBe('');
  });

  it('handles exact date matches', () => {
    const data = [
      { date: '2024-01-01', value: 'A' },
      { date: '2024-01-03', value: 'B' },
      { date: '2024-01-05', value: 'C' },
    ];
    const targets = ['2024-01-01', '2024-01-03', '2024-01-05'];

    const result = forwardFill(data, targets);

    expect(result[0]).toEqual({ date: '2024-01-01', value: 'A' });
    expect(result[1]).toEqual({ date: '2024-01-03', value: 'B' });
    expect(result[2]).toEqual({ date: '2024-01-05', value: 'C' });
  });
});

// =============================================================================
// interpolateLinear Tests
// =============================================================================

describe('interpolateLinear', () => {
  it('returns exact values for known dates', () => {
    const data = [
      { date: '2024-01-01', value: '100' },
      { date: '2024-01-10', value: '110' },
    ];
    const targets = ['2024-01-01', '2024-01-10'];

    const result = interpolateLinear(data, targets);

    expect(result[0]).toEqual({ date: '2024-01-01', value: '100' });
    expect(result[1]).toEqual({ date: '2024-01-10', value: '110' });
  });

  it('interpolates midpoint correctly', () => {
    const data = [
      { date: '2024-01-01', value: '100' },
      { date: '2024-01-11', value: '110' }, // 10 days apart
    ];
    const targets = ['2024-01-06']; // Midpoint (5 days from start)

    const result = interpolateLinear(data, targets);

    // Expected: 100 + (110-100) * (5/10) = 105
    expect(parseFloat(result[0].value)).toBeCloseTo(105, 1);
  });

  it('returns empty for dates before first data point', () => {
    const data = [
      { date: '2024-01-10', value: '100' },
      { date: '2024-01-20', value: '110' },
    ];
    const targets = ['2024-01-05'];

    const result = interpolateLinear(data, targets);

    expect(result[0].value).toBe('');
  });

  it('returns empty for dates after last data point', () => {
    const data = [
      { date: '2024-01-01', value: '100' },
      { date: '2024-01-10', value: '110' },
    ];
    const targets = ['2024-01-15'];

    const result = interpolateLinear(data, targets);

    expect(result[0].value).toBe('');
  });

  it('handles empty source data', () => {
    const data: { date: string; value: string }[] = [];
    const targets = ['2024-01-01'];

    const result = interpolateLinear(data, targets);

    expect(result[0].value).toBe('');
  });

  it('handles single data point (no interpolation possible)', () => {
    const data = [{ date: '2024-01-05', value: '100' }];
    const targets = ['2024-01-01', '2024-01-05', '2024-01-10'];

    const result = interpolateLinear(data, targets);

    expect(result[0].value).toBe(''); // Before single point
    expect(result[1].value).toBe('100'); // Exact match
    expect(result[2].value).toBe(''); // After single point
  });
});

// =============================================================================
// mergeMultipleSeries Tests
// =============================================================================

describe('mergeMultipleSeries', () => {
  it('merges two series with forward fill', () => {
    const vixDaily = [
      { date: '2024-01-01', value: '14.8' },
      { date: '2024-01-02', value: '15.1' },
      { date: '2024-01-03', value: '14.9' },
    ];
    const unemploymentMonthly = [{ date: '2024-01-01', value: '3.7' }];

    const result = mergeMultipleSeries(
      [
        { key: 'vix', data: vixDaily },
        { key: 'unemployment', data: unemploymentMonthly },
      ],
      { fillMethod: 'forward' }
    );

    expect(result.data).toHaveLength(3);
    expect(result.data[0]).toEqual({
      date: '2024-01-01',
      vix: '14.8',
      unemployment: '3.7',
    });
    expect(result.data[1]).toEqual({
      date: '2024-01-02',
      vix: '15.1',
      unemployment: '3.7', // Forward filled
    });
    expect(result.data[2]).toEqual({
      date: '2024-01-03',
      vix: '14.9',
      unemployment: '3.7', // Forward filled
    });
  });

  it('reports series metadata correctly', () => {
    const dailyData = [
      { date: '2024-01-01', value: '1' },
      { date: '2024-01-02', value: '2' },
      { date: '2024-01-03', value: '3' },
    ];
    const monthlyData = [{ date: '2024-01-01', value: 'A' }];

    const result = mergeMultipleSeries(
      [
        { key: 'daily', data: dailyData },
        { key: 'monthly', data: monthlyData },
      ],
      { fillMethod: 'forward' }
    );

    expect(result.seriesInfo).toHaveLength(2);

    const dailyInfo = result.seriesInfo.find((s) => s.key === 'daily');
    expect(dailyInfo?.originalFrequency).toBe('daily');
    expect(dailyInfo?.originalCount).toBe(3);
    expect(dailyInfo?.filledCount).toBe(0); // All original dates present

    const monthlyInfo = result.seriesInfo.find((s) => s.key === 'monthly');
    expect(monthlyInfo?.originalFrequency).toBe('unknown'); // Single point
    expect(monthlyInfo?.originalCount).toBe(1);
    expect(monthlyInfo?.filledCount).toBe(2); // Two dates filled
  });

  it('uses innerJoin to keep only common dates', () => {
    const seriesA = [
      { date: '2024-01-01', value: 'A1' },
      { date: '2024-01-02', value: 'A2' },
      { date: '2024-01-03', value: 'A3' },
    ];
    const seriesB = [
      { date: '2024-01-02', value: 'B2' }, // Only Jan 2
    ];

    const result = mergeMultipleSeries(
      [
        { key: 'a', data: seriesA },
        { key: 'b', data: seriesB },
      ],
      { fillMethod: 'none', innerJoin: true }
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({
      date: '2024-01-02',
      a: 'A2',
      b: 'B2',
    });
  });

  it('handles empty input', () => {
    const result = mergeMultipleSeries([], { fillMethod: 'forward' });

    expect(result.data).toEqual([]);
    expect(result.seriesInfo).toEqual([]);
    expect(result.dateRange).toEqual({ start: '', end: '' });
  });

  it('handles series with no data', () => {
    const result = mergeMultipleSeries(
      [{ key: 'empty', data: [] }],
      { fillMethod: 'forward' }
    );

    expect(result.data).toEqual([]);
  });

  it('reports correct date range', () => {
    const result = mergeMultipleSeries(
      [
        {
          key: 'series',
          data: [
            { date: '2024-01-05', value: '1' },
            { date: '2024-01-10', value: '2' },
            { date: '2024-01-15', value: '3' },
          ],
        },
      ],
      { fillMethod: 'forward' }
    );

    expect(result.dateRange).toEqual({
      start: '2024-01-05',
      end: '2024-01-15',
    });
  });
});

// =============================================================================
// getLatestAlignedValue Tests
// =============================================================================

describe('getLatestAlignedValue', () => {
  it('returns the most recent value', () => {
    const data = [
      { date: '2024-01-01', value: 'old' },
      { date: '2024-01-15', value: 'newer' },
      { date: '2024-01-31', value: 'newest' },
    ];

    const result = getLatestAlignedValue(data);

    expect(result).toEqual({ date: '2024-01-31', value: 'newest' });
  });

  it('skips empty values to find latest non-empty', () => {
    const data = [
      { date: '2024-01-01', value: 'has value' },
      { date: '2024-01-15', value: '' }, // Empty
      { date: '2024-01-31', value: '' }, // Empty
    ];

    const result = getLatestAlignedValue(data);

    expect(result).toEqual({ date: '2024-01-01', value: 'has value' });
  });

  it('returns null for empty array', () => {
    expect(getLatestAlignedValue([])).toBeNull();
  });

  it('returns null when all values are empty', () => {
    const data = [
      { date: '2024-01-01', value: '' },
      { date: '2024-01-02', value: '' },
    ];

    expect(getLatestAlignedValue(data)).toBeNull();
  });
});

// =============================================================================
// Integration Tests (Real-world scenarios)
// =============================================================================

describe('Integration: Real-world scenarios', () => {
  it('merges VIX (daily) with Unemployment (monthly) correctly', () => {
    // Simulate real FRED data patterns
    const vix = [
      { date: '2024-01-02', value: '12.45' }, // Market opens Jan 2
      { date: '2024-01-03', value: '13.21' },
      { date: '2024-01-04', value: '12.89' },
      { date: '2024-01-05', value: '14.02' },
      // Weekend gap
      { date: '2024-01-08', value: '13.56' },
    ];

    const unemployment = [
      { date: '2024-01-01', value: '3.7' }, // Monthly release (before VIX data starts)
    ];

    const result = mergeMultipleSeries(
      [
        { key: 'vix', data: vix },
        { key: 'unemployment', data: unemployment },
      ],
      { fillMethod: 'forward' }
    );

    // Union of dates includes Jan 1 (unemployment only) + Jan 2-8 (VIX dates)
    // Total: 6 data points
    expect(result.data.length).toBe(6);

    // VIX dates (Jan 2 onwards) should have both values
    const vixDates = result.data.filter((p) => p.date >= '2024-01-02');
    vixDates.forEach((point) => {
      expect(point.unemployment).toBe('3.7');
      expect(point.vix).toBeTruthy();
    });

    // Jan 1 has unemployment but null VIX (VIX data doesn't start until Jan 2)
    const jan1 = result.data.find((p) => p.date === '2024-01-01');
    expect(jan1?.unemployment).toBe('3.7');
    expect(jan1?.vix).toBeNull(); // No VIX data before Jan 2

    // Check metadata
    const vixInfo = result.seriesInfo.find((s) => s.key === 'vix');
    expect(vixInfo?.originalFrequency).toBe('daily');

    const unemploymentInfo = result.seriesInfo.find(
      (s) => s.key === 'unemployment'
    );
    expect(unemploymentInfo?.filledCount).toBeGreaterThan(0);
  });

  it('demonstrates the bug that forward-fill solves', () => {
    /**
     * THE BUG: Index-based merging
     *
     * If you merge by array index instead of by date,
     * you get completely wrong data!
     */
    const daily = [
      { date: '2024-01-01', value: 'D1' },
      { date: '2024-01-02', value: 'D2' },
      { date: '2024-01-03', value: 'D3' },
    ];
    const monthly = [
      { date: '2024-01-01', value: 'M-Jan' },
      { date: '2024-02-01', value: 'M-Feb' }, // This is FEBRUARY, not Jan 2!
    ];

    // BUGGY approach: index-based merge (DON'T DO THIS)
    const buggyResult = daily.map((d, i) => ({
      date: d.date,
      daily: d.value,
      monthly: monthly[i]?.value || null,
    }));

    // Bug: Jan 2 shows "M-Feb" (February's value!)
    expect(buggyResult[1].monthly).toBe('M-Feb'); // WRONG!

    // CORRECT approach: date-aware merge with forward-fill
    const correctResult = mergeMultipleSeries(
      [
        { key: 'daily', data: daily },
        { key: 'monthly', data: monthly },
      ],
      { fillMethod: 'forward' }
    );

    // Correct: Jan 2 shows "M-Jan" (January's value, forward-filled)
    const jan2Point = correctResult.data.find((p) => p.date === '2024-01-02');
    expect(jan2Point?.monthly).toBe('M-Jan'); // CORRECT!
  });
});
