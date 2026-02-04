import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMarketIndicesData } from '../domain/useMarketIndicesData';
import * as fredApi from '@/app/lib/fredApi';

vi.mock('@/app/lib/fredApi');

describe('useMarketIndicesData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Inactive State', () => {
    it('should not load data or call API when inactive', () => {
      const { result } = renderHook(() => useMarketIndicesData(false));

      expect(result.current.loading).toBe(false);
      expect(result.current.data.equityIndices).toEqual([]);
      expect(result.current.data.vix).toEqual([]);
      expect(result.current.data.creditSpread).toEqual([]);
      expect(result.current.data.breadth).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(fredApi.getFredSeriesCached).not.toHaveBeenCalled();
    });
  });

  describe('Active State', () => {
    it('should fetch all 7 market series with correct IDs', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      renderHook(() => useMarketIndicesData(true));

      await waitFor(() => {
        expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(7);
      });

      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('SP500', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('NASDAQCOM', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('DJIA', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('VIXCLS', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('BAA10Y', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('AAA10Y', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('NYA', expect.any(String));
    });

    it('should use threeYearsAgo for all series', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      renderHook(() => useMarketIndicesData(true));

      await waitFor(() => {
        expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(7);
      });

      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      const threeYearsAgoStr = threeYearsAgo.toISOString().split('T')[0];

      vi.mocked(fredApi.getFredSeriesCached).mock.calls.forEach((call) => {
        expect(call[1]).toBe(threeYearsAgoStr);
      });
    });

    it('should produce merged equity indices with sp500, nasdaq, dow keys', async () => {
      const mockData = [{ date: '2024-01-01', value: '5000' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useMarketIndicesData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.equityIndices).toHaveLength(1);
      expect(result.current.data.equityIndices[0]).toHaveProperty('sp500');
      expect(result.current.data.equityIndices[0]).toHaveProperty('nasdaq');
      expect(result.current.data.equityIndices[0]).toHaveProperty('dow');
    });

    it('should produce merged credit spread with baa and aaa keys', async () => {
      const mockData = [{ date: '2024-01-01', value: '3.5' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useMarketIndicesData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.creditSpread).toHaveLength(1);
      expect(result.current.data.creditSpread[0]).toHaveProperty('baa');
      expect(result.current.data.creditSpread[0]).toHaveProperty('aaa');
    });

    it('should produce merged breadth with sp500 and nyse keys', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useMarketIndicesData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.breadth).toHaveLength(1);
      expect(result.current.data.breadth[0]).toHaveProperty('sp500');
      expect(result.current.data.breadth[0]).toHaveProperty('nyse');
    });

    it('should keep VIX as standalone ChartData with ISO dates', async () => {
      const mockData = [{ date: '2024-06-15', value: '14.8' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useMarketIndicesData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.vix).toHaveLength(1);
      expect(result.current.data.vix[0].date).toBe('2024-06-15');
      expect(result.current.data.vix[0].value).toBe(14.8);
    });
  });

  describe('Error Handling', () => {
    it('should capture Error instances', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue(new Error('Market closed'));

      const { result } = renderHook(() => useMarketIndicesData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Market closed');
    });

    it('should wrap non-Error rejections', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue(null);

      const { result } = renderHook(() => useMarketIndicesData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to load market indices data');
    });
  });
});
