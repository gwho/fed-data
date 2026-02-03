import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExchangeRatesData } from '../domain/useExchangeRatesData';
import * as fredApi from '@/app/lib/fredApi';

vi.mock('@/app/lib/fredApi');

describe('useExchangeRatesData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Inactive State', () => {
    it('should not load data or call API when inactive', () => {
      const { result } = renderHook(() => useExchangeRatesData(false));

      expect(result.current.loading).toBe(false);
      expect(result.current.data.dollarIndex).toEqual([]);
      expect(result.current.data.eur).toEqual([]);
      expect(result.current.data.gbp).toEqual([]);
      expect(result.current.data.jpy).toEqual([]);
      expect(result.current.data.cny).toEqual([]);
      expect(result.current.data.mxn).toEqual([]);
      expect(result.current.data.inr).toEqual([]);
      expect(result.current.data.cad).toEqual([]);
      expect(result.current.data.aud).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(fredApi.getFredSeriesCached).not.toHaveBeenCalled();
    });
  });

  describe('Active State', () => {
    it('should fetch all 9 exchange rate series with correct IDs', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      renderHook(() => useExchangeRatesData(true));

      await waitFor(() => {
        expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(9);
      });

      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('DTWEXBGS', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('DEXUSEU', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('DEXUSUK', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('DEXJPUS', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('DEXCHUS', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('DEXMXUS', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('DEXINUS', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('DEXCAUS', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('DEXUSAL', expect.any(String));
    });

    it('should populate all 9 data fields on success', async () => {
      const mockData = [{ date: '2024-01-01', value: '0.91' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useExchangeRatesData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.dollarIndex).toHaveLength(1);
      expect(result.current.data.eur).toHaveLength(1);
      expect(result.current.data.gbp).toHaveLength(1);
      expect(result.current.data.jpy).toHaveLength(1);
      expect(result.current.data.cny).toHaveLength(1);
      expect(result.current.data.mxn).toHaveLength(1);
      expect(result.current.data.inr).toHaveLength(1);
      expect(result.current.data.cad).toHaveLength(1);
      expect(result.current.data.aud).toHaveLength(1);
      expect(result.current.error).toBeNull();
    });

    it('should format dates as short month names', async () => {
      const mockData = [
        { date: '2024-04-01', value: '0.93' },
        { date: '2024-12-01', value: '0.95' },
      ];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useExchangeRatesData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.eur[0].date).toBe('Apr');
      expect(result.current.data.eur[1].date).toBe('Dec');
    });
  });

  describe('Error Handling', () => {
    it('should capture Error instances', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue(new Error('Rate limited'));

      const { result } = renderHook(() => useExchangeRatesData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Rate limited');
    });

    it('should wrap non-Error rejections', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue({ code: 500 });

      const { result } = renderHook(() => useExchangeRatesData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to load exchange rates data');
    });
  });
});
