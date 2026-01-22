'use client';

/**
 * SignalGauge Component
 *
 * Visual gauge showing signal value on a -1 to +1 scale.
 * Color gradient: Red (bearish) → Yellow (neutral) → Green (bullish)
 */

interface SignalGaugeProps {
  value: number;  // -1 to 1
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

export default function SignalGauge({ value, size = 'md', showLabels = true }: SignalGaugeProps) {
  // Clamp value between -1 and 1
  const clampedValue = Math.max(-1, Math.min(1, value));

  // Convert value (-1 to 1) to percentage (0 to 100)
  const percentage = ((clampedValue + 1) / 2) * 100;

  // Size configurations
  const sizes = {
    sm: { height: 'h-2', text: 'text-xs', padding: 'py-1' },
    md: { height: 'h-3', text: 'text-sm', padding: 'py-2' },
    lg: { height: 'h-4', text: 'text-base', padding: 'py-3' },
  };

  const { height, text, padding } = sizes[size];

  return (
    <div className={`w-full ${padding}`}>
      {/* Gauge bar */}
      <div className="relative">
        {/* Background gradient bar */}
        <div
          className={`w-full ${height} rounded-full overflow-hidden`}
          style={{
            background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)',
          }}
        />

        {/* Marker indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-300"
          style={{ left: `${percentage}%` }}
        >
          <div className="w-4 h-4 bg-white border-2 border-gray-800 rounded-full shadow-md" />
        </div>

        {/* Center line marker */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 bg-gray-600 opacity-50"
          style={{ height: size === 'lg' ? '16px' : size === 'md' ? '12px' : '8px' }}
        />
      </div>

      {/* Labels */}
      {showLabels && (
        <div className={`flex justify-between mt-1 ${text} text-gray-500`}>
          <span>-1</span>
          <span>0</span>
          <span>+1</span>
        </div>
      )}
    </div>
  );
}
