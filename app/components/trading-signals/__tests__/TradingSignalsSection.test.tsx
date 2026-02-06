import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TradingSignalsSection from '../TradingSignalsSection';

describe('TradingSignalsSection', () => {
  const mockSignalsData = {
    signals: {
      rate: {
        name: 'Interest Rate Signal',
        value: 0.5,
        interpretation: 'bullish' as const,
        confidence: 0.75,
        explanation: 'Rates are favorable',
        indicators: { rate1: 4.5, rate2: 4.7 },
        updatedAt: '2026-02-06T13:00:00Z',
      },
      volatility: {
        name: 'Volatility Signal',
        value: -0.3,
        interpretation: 'bearish' as const,
        confidence: 0.65,
        explanation: 'High volatility',
        indicators: { vix: 25.5 },
        updatedAt: '2026-02-06T13:00:00Z',
      },
      credit: {
        name: 'Credit Signal',
        value: 0.2,
        interpretation: 'neutral' as const,
        confidence: 0.55,
        explanation: 'Credit spreads stable',
        indicators: { spread: 1.5 },
        updatedAt: '2026-02-06T13:00:00Z',
      },
      housing: {
        name: 'Housing Signal',
        value: 0.8,
        interpretation: 'strong_bullish' as const,
        confidence: 0.85,
        explanation: 'Housing market strong',
        indicators: { starts: 1500 },
        updatedAt: '2026-02-06T13:00:00Z',
      },
      composite: {
        name: 'Composite Signal',
        value: 0.4,
        interpretation: 'bullish' as const,
        confidence: 0.7,
        explanation: 'Overall positive outlook',
        indicators: { overall: 0.4 },
        updatedAt: '2026-02-06T13:00:00Z',
      },
    },
    meta: {
      calculatedAt: '2026-02-06T13:00:00Z',
      version: '1.0.0',
    },
  };

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('inactive state', () => {
    it('does not fetch data when isActive is false', () => {
      render(<TradingSignalsSection isActive={false} />);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('shows "No signal data available" when inactive', () => {
      render(<TradingSignalsSection isActive={false} />);
      expect(screen.getByText('No signal data available')).toBeDefined();
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when fetching data', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => mockSignalsData,
                } as Response),
              100
            )
          )
      );

      render(<TradingSignalsSection isActive={true} />);

      expect(screen.getByText('Calculating signals...')).toBeDefined();
      
      await waitFor(() => {
        expect(screen.queryByText('Calculating signals...')).toBeNull();
      });
    });

    it('hides loading spinner after data loads', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockSignalsData,
      } as Response);

      render(<TradingSignalsSection isActive={true} />);

      await waitFor(() => {
        expect(screen.queryByText('Calculating signals...')).toBeNull();
      });
    });
  });

  describe('successful data fetching', () => {
    beforeEach(() => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockSignalsData,
      } as Response);
    });

    it('fetches data from /api/signals when active', async () => {
      render(<TradingSignalsSection isActive={true} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/signals');
      });
    });

    it('displays the composite signal', async () => {
      render(<TradingSignalsSection isActive={true} />);

      await waitFor(() => {
        expect(screen.getByText('Composite Signal')).toBeDefined();
      });
    });

    it('displays all four individual signals', async () => {
      render(<TradingSignalsSection isActive={true} />);

      await waitFor(() => {
        expect(screen.getByText('Interest Rate Signal')).toBeDefined();
        expect(screen.getByText('Volatility Signal')).toBeDefined();
        expect(screen.getByText('Credit Signal')).toBeDefined();
        expect(screen.getByText('Housing Signal')).toBeDefined();
      });
    });

    it('displays calculated time in header', async () => {
      render(<TradingSignalsSection isActive={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Calculated at/)).toBeDefined();
      });
    });

    it('displays API version in footer', async () => {
      render(<TradingSignalsSection isActive={true} />);

      await waitFor(() => {
        expect(screen.getByText(/API Version 1.0.0/)).toBeDefined();
      });
    });
  });

  describe('error handling', () => {
    it('shows error message when fetch fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      render(<TradingSignalsSection isActive={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeDefined();
        expect(screen.getByText(/Network error/)).toBeDefined();
      });
    });

    it('shows error message when API returns non-ok status', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      render(<TradingSignalsSection isActive={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeDefined();
        expect(screen.getByText(/HTTP error: 500/)).toBeDefined();
      });
    });

    it('displays "Try Again" button on error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'));

      render(<TradingSignalsSection isActive={true} />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeDefined();
      });
    });

    it('retries fetch when "Try Again" button is clicked', async () => {
      const user = userEvent.setup();
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSignalsData,
        } as Response);

      render(<TradingSignalsSection isActive={true} />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeDefined();
      });

      const tryAgainButton = screen.getByText('Try Again');
      await user.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByText('Composite Signal')).toBeDefined();
      });
    });
  });

  describe('refresh functionality', () => {
    beforeEach(() => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockSignalsData,
      } as Response);
    });

    it('displays refresh button after data loads', async () => {
      render(<TradingSignalsSection isActive={true} />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeDefined();
      });
    });

    it('refetches data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<TradingSignalsSection isActive={true} />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeDefined();
      });

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('shows "Refreshing..." text while refetching', async () => {
      const user = userEvent.setup();
      let resolveFirstFetch: (value: Response) => void;
      let resolveSecondFetch: (value: Response) => void;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveFirstFetch = resolve;
            })
        )
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveSecondFetch = resolve;
            })
        );

      render(<TradingSignalsSection isActive={true} />);

      // Resolve first fetch
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
      resolveFirstFetch!({
        ok: true,
        json: async () => mockSignalsData,
      } as Response);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeDefined();
      });

      // Click refresh
      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      // Should show "Refreshing..." while second fetch is pending
      await waitFor(() => {
        expect(screen.getByText('Refreshing...')).toBeDefined();
      });

      // Resolve second fetch
      resolveSecondFetch!({
        ok: true,
        json: async () => mockSignalsData,
      } as Response);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeDefined();
      });
    });
  });

  describe('no data state', () => {
    it('shows "No signal data available" when data is null after becoming active', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => null,
      } as Response);

      render(<TradingSignalsSection isActive={true} />);

      await waitFor(() => {
        expect(screen.getByText('No signal data available')).toBeDefined();
      });
    });
  });
});
