/**
 * CustomTooltip Component
 * 
 * A reusable tooltip for Recharts that:
 * - Shows formatted date at the top
 * - Displays each series with proper units
 * - Hides null/missing values
 * - Supports custom formatters per series
 */

import { formatTooltipDate } from '../utils/chartHelpers';

export interface TooltipFormatter {
  [key: string]: (value: number) => string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | null;
    dataKey: string;
    color: string;
  }>;
  label?: string;
  formatters?: TooltipFormatter;
}

export function CustomTooltip({ active, payload, label, formatters }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
      {/* Date header */}
      <p className="font-semibold text-gray-900 mb-2 text-sm">
        {label ? formatTooltipDate(label) : ''}
      </p>
      
      {/* Series values */}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          // Skip null/missing values
          if (entry.value == null) return null;
          
          // Apply custom formatter if provided, otherwise use default
          const formatter = formatters?.[entry.dataKey];
          const formattedValue = formatter 
            ? formatter(entry.value)
            : entry.value.toFixed(2);

          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium text-gray-900">{formattedValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
