'use client';

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

interface CompositeSignalCardProps {
  signal: SignalResult;
}

/**
 * Get background gradient based on interpretation
 */
function getGradientClass(interpretation: SignalResult['interpretation']): string {
  switch (interpretation) {
    case 'strong_bullish':
      return 'from-green-500 to-green-600';
    case 'bullish':
      return 'from-green-400 to-green-500';
    case 'neutral':
      return 'from-gray-400 to-gray-500';
    case 'bearish':
      return 'from-red-400 to-red-500';
    case 'strong_bearish':
      return 'from-red-500 to-red-600';
    default:
      return 'from-gray-400 to-gray-500';
  }
}

/**
 * Format interpretation for display
 */
function formatInterpretation(interpretation: string): string {
  return interpretation.replace('_', ' ').toUpperCase();
}

/**
 * Extract bullish and bearish factors from explanation
 */
function extractFactors(explanation: string): { bullish: string[]; bearish: string[] } {
  const bullish: string[] = [];
  const bearish: string[] = [];

  // Extract bullish factors
  const bullishMatch = explanation.match(/Bullish factors?:\s*([^.]+)/i);
  if (bullishMatch) {
    bullish.push(...bullishMatch[1].split(',').map(s => s.trim()).filter(Boolean));
  }

  // Extract bearish factors
  const bearishMatch = explanation.match(/Bearish factors?:\s*([^.]+)/i);
  if (bearishMatch) {
    bearish.push(...bearishMatch[1].split(',').map(s => s.trim()).filter(Boolean));
  }

  return { bullish, bearish };
}

export default function CompositeSignalCard({ signal }: CompositeSignalCardProps) {
  const gradientClass = getGradientClass(signal.interpretation);
  const { bullish, bearish } = extractFactors(signal.explanation);

  // Extract contributions from indicators
  const contributions = {
    rate: signal.indicators.rateContribution ?? 0,
    volatility: signal.indicators.volatilityContribution ?? 0,
    credit: signal.indicators.creditContribution ?? 0,
    housing: signal.indicators.housingContribution ?? 0,
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r ${gradientClass} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{signal.name}</h2>
          <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium text-white">
            {formatInterpretation(signal.interpretation)}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="p-6">
        {/* Large value display */}
        <div className="text-center mb-4">
          <div className="text-5xl font-bold text-gray-900">
            {signal.value > 0 ? '+' : ''}{signal.value.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Confidence: {Math.round(signal.confidence * 100)}%
          </div>
        </div>

        {/* Large gauge */}
        <div className="mb-6">
          <SignalGauge value={signal.value} size="lg" />
        </div>

        {/* Explanation */}
        <p className="text-gray-600 text-center mb-6">
          {signal.explanation.split('.')[0]}.
        </p>

        {/* Factors */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Bullish factors */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-green-800 mb-2">Bullish Factors</h4>
            {bullish.length > 0 ? (
              <ul className="space-y-1">
                {bullish.map((factor, i) => (
                  <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">+</span>
                    <span className="capitalize">{factor}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-600 italic">None currently</p>
            )}
          </div>

          {/* Bearish factors */}
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-red-800 mb-2">Bearish Factors</h4>
            {bearish.length > 0 ? (
              <ul className="space-y-1">
                {bearish.map((factor, i) => (
                  <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">-</span>
                    <span className="capitalize">{factor}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-red-600 italic">None currently</p>
            )}
          </div>
        </div>

        {/* Component contributions */}
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Signal Contributions</h4>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(contributions).map(([key, value]) => {
              const numValue = typeof value === 'number' ? value : 0;
              return (
                <div key={key} className="text-center">
                  <div className={`text-lg font-semibold ${numValue > 0 ? 'text-green-600' : numValue < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {numValue > 0 ? '+' : ''}{numValue.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{key}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
