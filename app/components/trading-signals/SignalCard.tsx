'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SignalGauge from './SignalGauge';

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

interface SignalCardProps {
  signal: SignalResult;
  showIndicators?: boolean;
}

/**
 * Get styling based on interpretation
 */
function getInterpretationStyles(interpretation: SignalResult['interpretation']) {
  const styles = {
    strong_bullish: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-500',
      badge: 'bg-green-500 text-white',
    },
    bullish: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-400',
      badge: 'bg-green-400 text-white',
    },
    neutral: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-400',
      badge: 'bg-gray-400 text-white',
    },
    bearish: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-400',
      badge: 'bg-red-400 text-white',
    },
    strong_bearish: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-500',
      badge: 'bg-red-500 text-white',
    },
  };
  return styles[interpretation] || styles.neutral;
}

/**
 * Format interpretation for display
 */
function formatInterpretation(interpretation: string): string {
  return interpretation.replace('_', ' ').toUpperCase();
}

/**
 * Format indicator key for display
 */
function formatIndicatorKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/3m/gi, '3M')
    .replace(/Yoy/gi, 'YoY')
    .replace(/20day/gi, '20-Day')
    .trim();
}

/**
 * Format indicator value for display
 */
function formatIndicatorValue(key: string, value: number | null): string {
  if (value === null) return 'N/A';

  // Percentage values
  if (key.toLowerCase().includes('rate') ||
      key.toLowerCase().includes('yield') ||
      key.toLowerCase().includes('slope') ||
      key.toLowerCase().includes('spread') ||
      key.toLowerCase().includes('change') ||
      key.toLowerCase().includes('yoy')) {
    return `${value.toFixed(2)}%`;
  }

  // Index values
  if (key.toLowerCase().includes('index') ||
      key.toLowerCase().includes('vix') ||
      key.toLowerCase().includes('ma')) {
    return value.toFixed(1);
  }

  // Housing starts (thousands)
  if (key.toLowerCase().includes('starts')) {
    return `${value.toLocaleString()}K`;
  }

  return value.toFixed(2);
}

/**
 * Format time ago
 */
function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export default function SignalCard({ signal, showIndicators = true }: SignalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const styles = getInterpretationStyles(signal.interpretation);

  const indicatorEntries = Object.entries(signal.indicators).filter(
    ([key]) => !key.toLowerCase().includes('weight') && !key.toLowerCase().includes('contribution')
  );

  return (
    <div className={`bg-white rounded-lg border-l-4 ${styles.border} shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800">{signal.name}</h3>
          <span className={`px-2 py-1 rounded text-xs font-medium ${styles.badge}`}>
            {formatInterpretation(signal.interpretation)}
          </span>
        </div>

        {/* Value and Gauge */}
        <div className="mb-3">
          <div className="text-3xl font-bold text-center text-gray-900 mb-1">
            {signal.value > 0 ? '+' : ''}{signal.value.toFixed(2)}
          </div>
          <SignalGauge value={signal.value} size="sm" showLabels={false} />
        </div>

        {/* Explanation */}
        <p className="text-sm text-gray-600 mb-3">{signal.explanation}</p>

        {/* Confidence and Time */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Confidence: {Math.round(signal.confidence * 100)}%</span>
          <span>{formatTimeAgo(signal.updatedAt)}</span>
        </div>
      </div>

      {/* Expandable Indicators Section */}
      {showIndicators && indicatorEntries.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <span>Indicators ({indicatorEntries.length})</span>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {expanded && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="space-y-2">
                {indicatorEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-600">{formatIndicatorKey(key)}</span>
                    <span className="font-medium text-gray-800">
                      {formatIndicatorValue(key, value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
