'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import SignalCard from './SignalCard';
import CompositeSignalCard from './CompositeSignalCard';

/**
 * Signal result from the API
 */
interface SignalResult {
  name: string;
  value: number;
  interpretation: 'strong_bearish' | 'bearish' | 'neutral' | 'bullish' | 'strong_bullish';
  confidence: number;
  explanation: string;
  indicators: Record<string, number | null>;
  updatedAt: string;
}

/**
 * Full response from /api/signals
 */
interface SignalsResponse {
  signals: {
    rate: SignalResult;
    volatility: SignalResult;
    credit: SignalResult;
    housing: SignalResult;
    composite: SignalResult;
  };
  meta: {
    calculatedAt: string;
    version: string;
  };
}

interface TradingSignalsSectionProps {
  isActive: boolean;
}

export default function TradingSignalsSection({ isActive }: TradingSignalsSectionProps) {
  const [data, setData] = useState<SignalsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch signals when section becomes active
  useEffect(() => {
    if (!isActive) return;

    async function fetchSignals() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/signals');
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch signals:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch signals');
      } finally {
        setLoading(false);
      }
    }

    fetchSignals();
  }, [isActive]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/signals');
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch signals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch signals');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-600">Calculating signals...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">No signal data available</p>
      </div>
    );
  }

  const { signals, meta } = data;

  return (
    <div className="max-w-[2100px]">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Trading Signals</h2>
          <p className="text-sm text-gray-500">
            Calculated at {new Date(meta.calculatedAt).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Composite signal - full width */}
      <div className="mb-6">
        <CompositeSignalCard signal={signals.composite} />
      </div>

      {/* Individual signals - 2x2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SignalCard signal={signals.rate} />
        <SignalCard signal={signals.volatility} />
        <SignalCard signal={signals.credit} />
        <SignalCard signal={signals.housing} />
      </div>

      {/* API info footer */}
      <div className="mt-6 text-center text-xs text-gray-400">
        API Version {meta.version} | Signals based on FRED economic data
      </div>
    </div>
  );
}
