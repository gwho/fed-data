/**
 * Unit Tests for useInflationData Hook
 *
 * Tests verify the inflation data loading hook behaves correctly across
 * different scenarios: inactive state, active loading, error handling, etc.
 *
 * Run tests: npm test useInflationData
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useInflationData } from '../domain/useInflationData';
import * as fredApi from '@/app/lib/fredApi';

// Mock the fredApi module
vi.mock('@/app/lib/fredApi');

describe('useInflationData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Inactive State', () => {
    it('should not load data when inactive', () => {
      const { result } = renderHook(() => useInflationData(false));

      expect(result.current.loading).toBe(false);
      expect(result.current.data.coreCpi).toEqual([]);
      expect(result.current.data.pce).toEqual([]);
      expect(result.current.data.corePce).toEqual([]);
      expect(result.current.data.foodCpi).toEqual([]);
      expect(result.current.data.energyCpi).toEqual([]);
      expect(result.current.data.housingCpi).toEqual([]);
      expect(result.current.data.medicalCpi).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(fredApi.getFredSeriesCached).not.toHaveBeenCalled();
    });

    it('should not make API calls when inactive', () => {
      renderHook(() => useInflationData(false));

      expect(fredApi.getFredSeriesCached).not.toHaveBeenCalled();
    });
  });

  describe('Active State - Successful Loading', () => {
    it('should load data when active', async () => {
      const mockData = [
        { date: '2024-01-01', value: '310.326' },
        { date: '2024-02-01', value: '311.054' },
      ];

      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useInflationData(true));

      // Initially loading
      expect(result.current.loading).toBe(true);

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify data is loaded
      expect(result.current.data.coreCpi).toHaveLength(2);
      expect(result.current.data.coreCpi[0].date).toBe('Jan');
      expect(result.current.data.coreCpi[0].value).toBe(310.326);
      expect(result.current.data.coreCpi[1].date).toBe('Feb');
      expect(result.current.data.coreCpi[1].value).toBe(311.054);
      expect(result.current.error).toBeNull();
    });

    it('should fetch all 7 inflation series', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      renderHook(() => useInflationData(true));

      await waitFor(() => {
        expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(7);
      });

      // Verify all 7 series are fetched
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('CPILFESL', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('PCEPI', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('PCEPILFE', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('CPIUFDSL', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('CPIENGSL', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('CUSR0000SAH', expect.any(String));
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledWith('CPIMEDSL', expect.any(String));
    });

    it('should populate all 7 data fields', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useInflationData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // All 7 fields should have data
      expect(result.current.data.coreCpi).toHaveLength(1);
      expect(result.current.data.pce).toHaveLength(1);
      expect(result.current.data.corePce).toHaveLength(1);
      expect(result.current.data.foodCpi).toHaveLength(1);
      expect(result.current.data.energyCpi).toHaveLength(1);
      expect(result.current.data.housingCpi).toHaveLength(1);
      expect(result.current.data.medicalCpi).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockError = new Error('API failure');
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue(mockError);

      const { result } = renderHook(() => useInflationData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.data.coreCpi).toEqual([]);
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValue('String error');

      const { result } = renderHook(() => useInflationData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to load inflation data');
    });

    it('should clear previous error on successful retry', async () => {
      const mockError = new Error('API failure');
      vi.mocked(fredApi.getFredSeriesCached).mockRejectedValueOnce(mockError);

      const { result, rerender } = renderHook(
        ({ active }) => useInflationData(active),
        { initialProps: { active: true } }
      );

      // Wait for error
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Mock successful response
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      // Reactivate to trigger retry
      rerender({ active: false });
      rerender({ active: true });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data.coreCpi).toHaveLength(1);
    });
  });

  describe('Data Formatting', () => {
    it('should format dates as short month names', async () => {
      const mockData = [
        { date: '2024-01-01', value: '100' },
        { date: '2024-02-01', value: '101' },
        { date: '2024-03-01', value: '102' },
      ];

      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useInflationData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.coreCpi[0].date).toBe('Jan');
      expect(result.current.data.coreCpi[1].date).toBe('Feb');
      expect(result.current.data.coreCpi[2].date).toBe('Mar');
    });

    it('should parse string values to numbers', async () => {
      const mockData = [
        { date: '2024-01-01', value: '310.326' },
        { date: '2024-02-01', value: '311.054' },
      ];

      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result } = renderHook(() => useInflationData(true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.coreCpi[0].value).toBe(310.326);
      expect(result.current.data.coreCpi[1].value).toBe(311.054);
      expect(typeof result.current.data.coreCpi[0].value).toBe('number');
    });
  });

  describe('Activation/Deactivation', () => {
    it('should not reload data when switching from active to inactive', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { result, rerender } = renderHook(
        ({ active }) => useInflationData(active),
        { initialProps: { active: true } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(7);

      // Deactivate
      rerender({ active: false });

      // Should not trigger new API calls
      expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(7);

      // Data should be retained
      expect(result.current.data.coreCpi).toHaveLength(1);
    });

    it('should reload data when switching from inactive to active', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      const { rerender } = renderHook(
        ({ active }) => useInflationData(active),
        { initialProps: { active: false } }
      );

      // Initially inactive - no calls
      expect(fredApi.getFredSeriesCached).not.toHaveBeenCalled();

      // Activate
      rerender({ active: true });

      await waitFor(() => {
        expect(fredApi.getFredSeriesCached).toHaveBeenCalledTimes(7);
      });
    });
  });

  describe('Date Range', () => {
    it('should fetch data from one year ago', async () => {
      const mockData = [{ date: '2024-01-01', value: '100' }];
      vi.mocked(fredApi.getFredSeriesCached).mockResolvedValue(mockData);

      renderHook(() => useInflationData(true));

      await waitFor(() => {
        expect(fredApi.getFredSeriesCached).toHaveBeenCalled();
      });

      // Verify date parameter matches YYYY-MM-DD format
      const dateParam = vi.mocked(fredApi.getFredSeriesCached).mock.calls[0][1];
      expect(dateParam).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify it's approximately one year ago (within 2 days tolerance)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const expectedDate = oneYearAgo.toISOString().split('T')[0];

      expect(dateParam).toBe(expectedDate);
    });
  });
});
