'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import ChartCard from '../ChartCard';
import {
  CHART_COLORS,
  CHART_MARGINS,
  CHART_HEIGHT,
  CHART_DOT_RADIUS,
} from '../../constants/chartConfig';
import type { ChartData, MergedDataPoint } from '../../utils/chartHelpers';

export interface SeriesConfig {
  dataKey: string;
  name: string;
  color: string;
  strokeWidth?: number;
  dotRadius?: number;
  /** e.g. "5 5" for a dashed line */
  strokeDasharray?: string;
}

export interface ReferenceLineConfig {
  y: number;
  label: string;
  color?: string;
  dashed?: boolean;
}

export interface LineChartCardProps {
  title: string;
  data: ChartData[] | MergedDataPoint[];
  series: SeriesConfig[];
  loading: boolean;
  error: Error | null;
  height?: number;
  /** Recharts domain tuple, e.g. ['dataMin - 10', 'dataMax + 10'] or [0, 100]. */
  domain?: [number | string, number | string];
  yTickFormatter?: (value: number) => string;
  xTickFormatter?: (date: string) => string;
  referenceLines?: ReferenceLineConfig[];
}

/**
 * Reusable chart card for single-series and multi-series line charts.
 *
 * Covers the two most common chart families in page.tsx:
 * - **Single series** — one `<Line>` with `dataKey="value"`
 * - **Multi-series same axis** — 2-4 `<Line>` elements on a single Y-axis
 *
 * For dual-axis charts or charts requiring CustomTooltip, use the
 * recharts primitives directly inside a `<ChartCard>`.
 *
 * @example
 * // Single series
 * <LineChartCard
 *   title="CPI — last three years"
 *   data={keyIndicators.data.cpi}
 *   series={[{ dataKey: 'value', name: 'CPI Index', color: CHART_COLORS.TEAL }]}
 *   domain={['dataMin - 10', 'dataMax + 10']}
 *   loading={keyIndicators.loading}
 *   error={keyIndicators.error}
 * />
 *
 * @example
 * // Multi-series with reference line
 * <LineChartCard
 *   title="Core vs Headline CPI"
 *   data={inflation.data.cpiComparison}
 *   series={[
 *     { dataKey: 'core', name: 'Core CPI', color: CHART_COLORS.TEAL },
 *     { dataKey: 'headline', name: 'Headline CPI', color: CHART_COLORS.RED },
 *   ]}
 *   referenceLines={[{ y: 2, label: '2% Target', dashed: true }]}
 *   loading={inflation.loading}
 *   error={inflation.error}
 * />
 */
export default function LineChartCard({
  title,
  data,
  series,
  loading,
  error,
  height,
  domain,
  yTickFormatter,
  xTickFormatter,
  referenceLines,
}: LineChartCardProps) {
  return (
    <ChartCard title={title} loading={loading} error={error}>
      <ResponsiveContainer width="100%" height={height ?? CHART_HEIGHT}>
        <LineChart data={data} margin={CHART_MARGINS}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={xTickFormatter} />
          <YAxis domain={domain} tickFormatter={yTickFormatter} />
          <Tooltip />
          <Legend />
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              stroke={s.color}
              strokeWidth={s.strokeWidth ?? 2}
              name={s.name}
              dot={{ r: s.dotRadius ?? CHART_DOT_RADIUS }}
              strokeDasharray={s.strokeDasharray}
            />
          ))}
          {referenceLines?.map((rl) => (
            <ReferenceLine
              key={`${rl.y}-${rl.label}`}
              y={rl.y}
              stroke={rl.color ?? CHART_COLORS.SLATE}
              strokeDasharray={rl.dashed ? '3 3' : undefined}
              label={rl.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
