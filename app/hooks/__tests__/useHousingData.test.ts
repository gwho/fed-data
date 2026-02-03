import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHousingData } from '../domain/useHousingData';
import * as fredApi from '@/app/lib/fredApi';

vi.mock('@/app/lib/fredApi');

describe('useHousingData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Inactive State', () => {
    it('should not load data or call API when inactive', () => {
      const { result } = renderHook(() => useHousingData(false));

      expect(result.current.loading).toBe(false);
      expect(result.current.data.homePrice).toEqual([]);
      expect(result.current.data.housingStarts).toEqual([]);
      expect(result.current.data.buildingPermits).toEqual([]);
      expect(result.current.data.mortgageRate).toEqual([]);
      expect(result.current.data.affordability).toEqual([]);
      expect(result.current.data.newHomeSales).toEqual([]);
      expect(result.current.data.existingHomeSales).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(fredApi.getFredSeriesCached).not.toHaveBeenCalled();
    });
  });

  describe('Active State', () => {
    it('should fetch all 7 housing series with correct IDs', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      renderHook(() => useHousingData(true));

      await waitFor(() => {
        expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(7);
      });

      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('CSUSHPISA', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('HOUST', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('PERMIT', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('MORTGAGE30US', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('FIXHAI', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('HSN1F', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('EXHOSLUSM495S', expect.any(String));
    });

    it('should populate all 7 data fields on success', async () => {
      const mockData = [{ date: '2024-03-01', value: '312.45' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useHousingData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.homePrice).toHaveLength(1);
      expect(result.current.data.housingStarts).toHaveLength(1);
      expect(result.current.data.buildingPermits).toHaveLength(1);
      expect(result.current.data.mortgageRate).toHaveLength(1);
      expect(result.current.data.affordability).toHaveLength(1);
      expect(result.current.data.newHomeSales).toHaveLength(1);
      expect(result.current.data.existingHomeSales).toHaveLength(1);
      expect(result.current.error).toBeNull();
    });

    it('should format dates as short month names and parse values', async () => {
      const mockData = [{ date: '2024-03-01', value: '312.45' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useHousingData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.homePrice[0].date).toBe('Mar');
      expect(result.current.data.homePrice[0].value).toBe(312.45);
    });
  });

  describe('Error Handling', () => {
    it('should capture Error instances', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue(new Error('API timeout'));

      const { result } = renderHook(() => useHousingData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('API timeout');
    });

    it('should wrap non-Error rejections', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue(404);

      const { result } = renderHook(() => useHousingData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to load housing data');
    });
  });
});
