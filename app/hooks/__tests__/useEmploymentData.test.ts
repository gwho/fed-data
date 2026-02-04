import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEmploymentData } from '../domain/useEmploymentData';
import * as fredApi from '@/app/lib/fredApi';

vi.mock('@/app/lib/fredApi');

describe('useEmploymentData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Inactive State', () => {
    it('should not load data or call API when inactive', () => {
      const { result } = renderHook(() => useEmploymentData(false));

      expect(result.current.loading).toBe(false);
      expect(result.current.data.laborForce).toEqual([]);
      expect(result.current.data.payrolls).toEqual([]);
      expect(result.current.data.initialClaims).toEqual([]);
      expect(result.current.data.hourlyEarnings).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(fredApi.getFredSeriesCached).not.toHaveBeenCalled();
    });
  });

  describe('Active State', () => {
    it('should fetch all 4 employment series with correct IDs', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      renderHook(() => useEmploymentData(true));

      await waitFor(() => {
        expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(4);
      });

      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('CIVPART', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('PAYEMS', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('ICSA', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('AHETPI', expect.any(String));
    });

    it('should populate all 4 data fields on success', async () => {
      const mockData = [{ date: '2024-01-01', value: '62.5' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useEmploymentData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.laborForce).toHaveLength(1);
      expect(result.current.data.payrolls).toHaveLength(1);
      expect(result.current.data.initialClaims).toHaveLength(1);
      expect(result.current.data.hourlyEarnings).toHaveLength(1);
      expect(result.current.error).toBeNull();
    });

    it('should format dates as short month names', async () => {
      const mockData = [
        { date: '2024-01-01', value: '100' },
        { date: '2024-06-01', value: '101' },
      ];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useEmploymentData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.laborForce[0].date).toBe('Jan');
      expect(result.current.data.laborForce[1].date).toBe('Jun');
    });

    it('should use oneYearAgo date range', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      renderHook(() => useEmploymentData(true));

      await waitFor(() => {
        expect(fredApi.getFredSeriesCached).toHaveBeenCalled();
      });

      const dateParam = vi.mocked(fredApi.getFredSeriesCached).mock.calls[0][1];
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      expect(dateParam).toBe(oneYearAgo.toISOString().split('T')[0]);
    });
  });

  describe('Error Handling', () => {
    it('should capture Error instances', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEmploymentData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network error');
    });

    it('should wrap non-Error rejections', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue('timeout');

      const { result } = renderHook(() => useEmploymentData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to load employment data');
    });
  });
});
