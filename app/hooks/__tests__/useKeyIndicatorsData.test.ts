import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useKeyIndicatorsData } from '../domain/useKeyIndicatorsData';
import * as fredApi from '@/app/lib/fredApi';

vi.mock('@/app/lib/fredApi');

describe('useKeyIndicatorsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mount Behavior', () => {
    it('should start in loading state', () => {
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue([]);

      const { result } = renderHook(() => useKeyIndicatorsData());

      expect(result.current.loading).toBe(true);
    });

    it('should load data on mount without any activation flag', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      renderHook(() => useKeyIndicatorsData());

      await waitFor(() => {
        expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(8);
      });
    });

    it('should fetch all 8 key indicator series with correct IDs', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      renderHook(() => useKeyIndicatorsData());

      await waitFor(() => {
        expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(8);
      });

      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('CPIAUCSL', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('UNRATE', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('A191RL1Q225SBEA', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('SP500', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('GS10', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('TB3MS', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('FEDFUNDS', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('MORTGAGE30US', expect.any(String));
    });

    it('should use threeYearsAgo for CPI and oneYearAgo for other series', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      renderHook(() => useKeyIndicatorsData());

      await waitFor(() => {
        expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(8);
      });

      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      const threeYearsAgoStr = threeYearsAgo.toISOString().split('T')[0];

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('CPIAUCSL', threeYearsAgoStr);
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('UNRATE', oneYearAgoStr);
    });
  });

  describe('CPI Yearly Formatting', () => {
    it('should group CPI by year taking January values only', async () => {
      // CPI mock: multiple months, only January should be kept per year
      vi.mocked(fredApi.getFredSeriesCached).mockImplementation((seriesId) => {
        if (seriesId === 'CPIAUCSL') {
          return Promise.resolve([
            { date: '2023-01-01', value: '305.0' },
            { date: '2023-06-01', value: '306.0' }, // should be ignored
            { date: '2024-01-01', value: '310.5' },
            { date: '2024-07-01', value: '312.0' }, // should be ignored
          ]);
        }
        return Promise.resolve([{ date: '2024-01-01', value: '100' }]);
      });

      const { result } = renderHook(() => useKeyIndicatorsData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have exactly 2 entries (2023 and 2024)
      expect(result.current.data.cpi).toHaveLength(2);
      expect(result.current.data.cpi[0].date).toBe('2023');
      expect(result.current.data.cpi[0].value).toBe(305.0);
      expect(result.current.data.cpi[1].date).toBe('2024');
      expect(result.current.data.cpi[1].value).toBe(310.5);
    });
  });

  describe('Data Formatting', () => {
    it('should format GDP as quarterly and most fields as monthly', async () => {
      const mockData = [{ date: '2024-03-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockImplementation((seriesId) => {
        if (seriesId === 'CPIAUCSL') {
          return Promise.resolve([{ date: '2024-01-01', value: '310' }]);
        }
        return Promise.resolve(mockData);
      });

      const { result } = renderHook(() => useKeyIndicatorsData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // GDP uses quarterly format (month + year)
      expect(result.current.data.gdp[0].date).toMatch(/Mar/);
      expect(result.current.data.gdp[0].date).toMatch(/24/);

      // Monthly fields use short month
      expect(result.current.data.unemployment[0].date).toBe('Mar');
      expect(result.current.data.tenYear[0].date).toBe('Mar');
    });

    it('should populate all 8 data fields on success', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockImplementation((seriesId) => {
        if (seriesId === 'CPIAUCSL') {
          return Promise.resolve([{ date: '2024-01-01', value: '310' }]);
        }
        return Promise.resolve([{ date: '2024-01-01', value: '100' }]);
      });

      const { result } = renderHook(() => useKeyIndicatorsData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.cpi).toHaveLength(1);
      expect(result.current.data.unemployment).toHaveLength(1);
      expect(result.current.data.tenYear).toHaveLength(1);
      expect(result.current.data.threeMonth).toHaveLength(1);
      expect(result.current.data.fedFunds).toHaveLength(1);
      expect(result.current.data.mortgage).toHaveLength(1);
      expect(result.current.data.gdp).toHaveLength(1);
      expect(result.current.data.sp500).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should capture Error instances', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useKeyIndicatorsData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Fetch failed');
    });

    it('should wrap non-Error rejections', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue('connection reset');

      const { result } = renderHook(() => useKeyIndicatorsData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to load key indicators');
    });
  });
});
