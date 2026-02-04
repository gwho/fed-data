import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEconomicGrowthData } from '../domain/useEconomicGrowthData';
import * as fredApi from '@/app/lib/fredApi';

vi.mock('@/app/lib/fredApi');

describe('useEconomicGrowthData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Inactive State', () => {
    it('should not load data or call API when inactive', () => {
      const { result } = renderHook(() => useEconomicGrowthData(false));

      expect(result.current.loading).toBe(false);
      expect(result.current.data.realGdp).toEqual([]);
      expect(result.current.data.nominalGdp).toEqual([]);
      expect(result.current.data.industrialProd).toEqual([]);
      expect(result.current.data.retailSales).toEqual([]);
      expect(result.current.data.capacityUtil).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(fredApi.getFredSeriesCached).not.toHaveBeenCalled();
    });
  });

  describe('Active State', () => {
    it('should fetch all 5 economic growth series with correct IDs', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      renderHook(() => useEconomicGrowthData(true));

      await waitFor(() => {
        expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(5);
      });

      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('A191RL1Q225SBEA', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('A191RP1Q027SBEA', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('INDPRO', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('RSAFS', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('TCU', expect.any(String));
    });

    it('should use twoYearsAgo for GDP series and oneYearAgo for monthly series', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      renderHook(() => useEconomicGrowthData(true));

      await waitFor(() => {
        expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(5);
      });

      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const twoYearsAgoStr = twoYearsAgo.toISOString().split('T')[0];

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

      // GDP series use twoYearsAgo
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('A191RL1Q225SBEA', twoYearsAgoStr);
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('A191RP1Q027SBEA', twoYearsAgoStr);

      // Monthly series use oneYearAgo
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('INDPRO', oneYearAgoStr);
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('RSAFS', oneYearAgoStr);
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('TCU', oneYearAgoStr);
    });

    it('should format GDP as quarterly and others as monthly', async () => {
      const mockData = [{ date: '2024-03-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useEconomicGrowthData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // GDP uses quarterly format (month + year)
      expect(result.current.data.realGdp[0].date).toMatch(/Mar/);
      expect(result.current.data.realGdp[0].date).toMatch(/24/);

      // Monthly series use short month only
      expect(result.current.data.industrialProd[0].date).toBe('Mar');
    });

    it('should populate all 5 data fields on success', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useEconomicGrowthData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.realGdp).toHaveLength(1);
      expect(result.current.data.nominalGdp).toHaveLength(1);
      expect(result.current.data.industrialProd).toHaveLength(1);
      expect(result.current.data.retailSales).toHaveLength(1);
      expect(result.current.data.capacityUtil).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should capture Error instances', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useEconomicGrowthData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Server error');
    });

    it('should wrap non-Error rejections', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue(undefined);

      const { result } = renderHook(() => useEconomicGrowthData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to load economic growth data');
    });
  });
});
