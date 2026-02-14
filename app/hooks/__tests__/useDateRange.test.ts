import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDateRange } from '../shared/useDateRange';

describe('useDateRange', () => {
  it('returns ISO-formatted date strings (YYYY-MM-DD)', () => {
    const { result } = renderHook(() => useDateRange());
    expect(result.current.oneYearAgo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.twoYearsAgo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.threeYearsAgo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('oneYearAgo is approximately 365 days before today', () => {
    const { result } = renderHook(() => useDateRange());
    const diffMs = Date.now() - new Date(result.current.oneYearAgo).getTime();
    const days = diffMs / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThanOrEqual(364);
    expect(days).toBeLessThanOrEqual(367);
  });

  it('twoYearsAgo is approximately 730 days before today', () => {
    const { result } = renderHook(() => useDateRange());
    const diffMs = Date.now() - new Date(result.current.twoYearsAgo).getTime();
    const days = diffMs / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThanOrEqual(729);
    expect(days).toBeLessThanOrEqual(733);
  });

  it('threeYearsAgo is approximately 1095 days before today', () => {
    const { result } = renderHook(() => useDateRange());
    const diffMs = Date.now() - new Date(result.current.threeYearsAgo).getTime();
    const days = diffMs / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThanOrEqual(1093);
    expect(days).toBeLessThanOrEqual(1098);
  });

  it('threeYearsAgo < twoYearsAgo < oneYearAgo (chronological order)', () => {
    const { result } = renderHook(() => useDateRange());
    expect(result.current.threeYearsAgo < result.current.twoYearsAgo).toBe(true);
    expect(result.current.twoYearsAgo < result.current.oneYearAgo).toBe(true);
  });

  it('all dates are in the past', () => {
    const { result } = renderHook(() => useDateRange());
    const today = new Date().toISOString().split('T')[0];
    expect(result.current.oneYearAgo < today).toBe(true);
    expect(result.current.twoYearsAgo < today).toBe(true);
    expect(result.current.threeYearsAgo < today).toBe(true);
  });

  it('returns stable references across re-renders (memoized)', () => {
    const { result, rerender } = renderHook(() => useDateRange());
    const first = result.current;
    rerender();
    expect(result.current.oneYearAgo).toBe(first.oneYearAgo);
    expect(result.current.twoYearsAgo).toBe(first.twoYearsAgo);
    expect(result.current.threeYearsAgo).toBe(first.threeYearsAgo);
  });
});
