import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useConsumerSpendingData } from '../domain/useConsumerSpendingData';
import * as fredApi from '@/app/lib/fredApi';

vi.mock('@/app/lib/fredApi');

describe('useConsumerSpendingData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Inactive State', () => {
    it('should not load data or call API when inactive', () => {
      const { result } = renderHook(() => useConsumerSpendingData(false));

      expect(result.current.loading).toBe(false);
      expect(result.current.data.pceChart).toEqual([]);
      expect(result.current.data.retailChart).toEqual([]);
      expect(result.current.data.savingsChart).toEqual([]);
      expect(result.current.data.sentimentChart).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(fredApi.getFredSeriesCached).not.toHaveBeenCalled();
    });
  });

  describe('Active State', () => {
    it('should fetch all 10 consumer spending series with correct IDs', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      renderHook(() => useConsumerSpendingData(true));

      await waitFor(() => {
        expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(10);
      });

      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('PCE', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('PCEDG', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('PCESV', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('RSAFS', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('RSFSDP', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('GAFO', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('PSAVERT', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('DSPI', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('UMCSENT', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('CSCICP03USM665S', expect.any(String));
    });

    it('should produce merged PCE chart with total, durables, services keys', async () => {
      const mockData = [{ date: '2024-01-01', value: '18000' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useConsumerSpendingData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.pceChart).toHaveLength(1);
      expect(result.current.data.pceChart[0]).toHaveProperty('total');
      expect(result.current.data.pceChart[0]).toHaveProperty('durables');
      expect(result.current.data.pceChart[0]).toHaveProperty('services');
    });

    it('should produce merged retail chart with total, foodServices, generalMerch keys', async () => {
      const mockData = [{ date: '2024-01-01', value: '700000' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useConsumerSpendingData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.retailChart).toHaveLength(1);
      expect(result.current.data.retailChart[0]).toHaveProperty('total');
      expect(result.current.data.retailChart[0]).toHaveProperty('foodServices');
      expect(result.current.data.retailChart[0]).toHaveProperty('generalMerch');
    });

    it('should apply transform to disposableIncome (divide by 1000)', async () => {
      const mockData = [{ date: '2024-01-01', value: '21000' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useConsumerSpendingData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.savingsChart).toHaveLength(1);
      expect(result.current.data.savingsChart[0]).toHaveProperty('disposableIncome');
      // 21000 / 1000 = 21
      expect(result.current.data.savingsChart[0]['disposableIncome']).toBe(21);
    });

    it('should produce merged sentiment chart with sentiment and confidence keys', async () => {
      const mockData = [{ date: '2024-01-01', value: '75' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useConsumerSpendingData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.sentimentChart).toHaveLength(1);
      expect(result.current.data.sentimentChart[0]).toHaveProperty('sentiment');
      expect(result.current.data.sentimentChart[0]).toHaveProperty('confidence');
    });
  });

  describe('Error Handling', () => {
    it('should capture Error instances', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue(new Error('Quota exceeded'));

      const { result } = renderHook(() => useConsumerSpendingData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Quota exceeded');
    });

    it('should wrap non-Error rejections', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue('parse error');

      const { result } = renderHook(() => useConsumerSpendingData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to load consumer spending data');
    });
  });
});
