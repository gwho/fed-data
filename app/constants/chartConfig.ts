/**
 * Centralized chart configuration constants.
 *
 * Used by `LineChartCard` and other chart components to avoid
 * scattering inline hex strings, margin objects, and magic numbers
 * across `page.tsx`.
 */

/** Named color palette for chart series (Tailwind CSS shades). */
export const CHART_COLORS = {
  TEAL:    '#0d9488',  // teal-600
  AMBER:   '#f59e0b',  // amber-500
  GREEN:   '#16a34a',  // green-600
  BLUE:    '#3b82f6',  // blue-500
  RED:     '#dc2626',  // red-600
  PURPLE:  '#8b5cf6',  // violet-500
  VIOLET:  '#9333ea',  // purple-600
  PINK:    '#ec4899',  // pink-500
  CYAN:    '#0ea5e9',  // sky-500
  EMERALD: '#10b981',  // emerald-500
  SCARLET: '#ef4444',  // red-500
  ORANGE:  '#f97316',  // orange-500
  SLATE:   '#64748b',  // slate-500
} as const;

export type ChartColor = typeof CHART_COLORS[keyof typeof CHART_COLORS];

/** Standard margin applied to all LineChart instances. */
export const CHART_MARGINS = { top: 20, right: 30, left: 20, bottom: 20 } as const;

/** Standard chart height in pixels. */
export const CHART_HEIGHT = 400 as const;

/** Standard dot radius for data points. */
export const CHART_DOT_RADIUS = 4 as const;
