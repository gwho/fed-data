/**
 * Data Normalization Schemas
 *
 * Zod schemas for validating data normalization requests and responses.
 * These schemas match the types defined in dataUtils.ts and provide
 * runtime validation for the /api/normalize endpoint.
 *
 * @see docs/DATA_NORMALIZATION.md for comprehensive tutorial
 * @see app/lib/dataUtils.ts for the normalization utilities
 *
 * WHY VALIDATE NORMALIZATION DATA?
 * ---------------------------------
 * Data normalization combines multiple time series with different frequencies.
 * Invalid input (wrong date formats, missing series IDs) can cause subtle bugs
 * that only manifest when comparing data from misaligned dates.
 *
 * Example: If a date string "2024/01/15" slips through (wrong format),
 * the forward-fill algorithm might fail silently, returning empty values
 * instead of properly filled data.
 */

import { z } from 'zod';

// =============================================================================
// Basic Type Schemas (match dataUtils.ts types)
// =============================================================================

/**
 * Data frequency classification
 *
 * FRED data comes at various frequencies:
 * - daily: VIX, Treasury yields, Fed Funds Rate
 * - weekly: Initial jobless claims
 * - monthly: CPI, Unemployment, Housing starts
 * - quarterly: GDP growth
 * - yearly: Annual revisions
 *
 * The 'unknown' value handles irregular or insufficient data.
 */
export const DataFrequencySchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'unknown',
]);

/**
 * Methods for filling gaps when aligning time series
 *
 * - forward: Last Observation Carried Forward (LOCF)
 *   Best for: Economic indicators (unemployment stays same until re-measured)
 *
 * - linear: Linear interpolation between known points
 *   Best for: Continuously-changing data (stock prices, exchange rates)
 *
 * - none: Leave gaps as null (no filling)
 *   Best for: When you need to know exactly where data is missing
 */
export const FillMethodSchema = z.enum(['forward', 'linear', 'none']);

// =============================================================================
// Configuration Schemas
// =============================================================================

/**
 * Configuration for merging multiple series
 */
export const MergeConfigSchema = z.object({
  /** How to fill missing values when aligning series */
  fillMethod: FillMethodSchema,
  /** If true, only include dates where ALL series have data (intersection) */
  innerJoin: z.boolean().optional().default(false),
});

/**
 * Optional date range for filtering merged results
 */
export const DateRangeSchema = z.object({
  /** Start date in YYYY-MM-DD format */
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD format'),
  /** End date in YYYY-MM-DD format */
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD format'),
}).refine(
  (data) => data.start <= data.end,
  { message: 'Start date must be before or equal to end date' }
);

// =============================================================================
// Output Schemas (match dataUtils.ts return types)
// =============================================================================

/**
 * A single data point in merged output
 *
 * The date is always present; other keys are dynamic based on the
 * series keys provided in the request.
 *
 * Example:
 * { date: '2024-01-15', fedFunds: '5.33', unemployment: '3.7' }
 */
export const MergedDataPointSchema = z.object({
  /** Date in YYYY-MM-DD format */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).catchall(z.union([z.string(), z.number(), z.null()]));

/**
 * Metadata about a series after merging
 *
 * This helps you understand what happened during normalization:
 * - originalFrequency: What frequency was detected
 * - originalCount: How many original data points
 * - filledCount: How many values were filled in (not original)
 */
export const SeriesInfoSchema = z.object({
  /** Key used to identify this series in the merged output */
  key: z.string().min(1, 'Series key is required'),
  /** Detected frequency of the original data */
  originalFrequency: DataFrequencySchema,
  /** Number of original data points */
  originalCount: z.number().int().nonnegative(),
  /** Number of values that were filled (not from original data) */
  filledCount: z.number().int().nonnegative(),
});

/**
 * Complete result from merging multiple series
 */
export const MergedSeriesResultSchema = z.object({
  /** Array of merged data points, one per date */
  data: z.array(MergedDataPointSchema),
  /** Metadata about each series in the merge */
  seriesInfo: z.array(SeriesInfoSchema),
  /** The date range covered by the merged data */
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

// =============================================================================
// API Request/Response Schemas
// =============================================================================

/**
 * Single series specification for normalization request
 */
export const SeriesSpecSchema = z.object({
  /** FRED series ID (e.g., 'FEDFUNDS', 'UNRATE') */
  seriesId: z.string().min(1, 'Series ID is required'),
  /** Key to use for this series in the merged output */
  key: z.string().min(1, 'Series key is required')
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Key must start with letter and contain only alphanumeric characters and underscores'),
});

/**
 * Request body for POST /api/normalize
 *
 * @example
 * {
 *   "series": [
 *     { "seriesId": "FEDFUNDS", "key": "fedFunds" },
 *     { "seriesId": "UNRATE", "key": "unemployment" }
 *   ],
 *   "config": { "fillMethod": "forward" }
 * }
 */
export const NormalizeRequestSchema = z.object({
  /** Array of series to merge (1-10 series) */
  series: z.array(SeriesSpecSchema)
    .min(1, 'At least one series is required')
    .max(10, 'Maximum 10 series allowed'),
  /** Configuration for how to merge the series */
  config: MergeConfigSchema,
  /** Optional date range to filter results */
  dateRange: DateRangeSchema.optional(),
}).refine(
  (data) => {
    // Ensure all keys are unique
    const keys = data.series.map((s) => s.key);
    return new Set(keys).size === keys.length;
  },
  { message: 'All series keys must be unique' }
);

/**
 * Response body for POST /api/normalize
 */
export const NormalizeResponseSchema = MergedSeriesResultSchema;

/**
 * Error response for normalization API
 */
export const NormalizeErrorSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string(),
  })).optional(),
});

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type DataFrequency = z.infer<typeof DataFrequencySchema>;
export type FillMethod = z.infer<typeof FillMethodSchema>;
export type MergeConfig = z.infer<typeof MergeConfigSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type MergedDataPoint = z.infer<typeof MergedDataPointSchema>;
export type SeriesInfo = z.infer<typeof SeriesInfoSchema>;
export type MergedSeriesResult = z.infer<typeof MergedSeriesResultSchema>;
export type SeriesSpec = z.infer<typeof SeriesSpecSchema>;
export type NormalizeRequest = z.infer<typeof NormalizeRequestSchema>;
export type NormalizeResponse = z.infer<typeof NormalizeResponseSchema>;
export type NormalizeError = z.infer<typeof NormalizeErrorSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validate a normalize request, returning either the validated data or errors
 *
 * @param data - Raw request data
 * @returns { success: true, data } or { success: false, error }
 *
 * @example
 * const result = validateNormalizeRequest(req.body);
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 * const { series, config } = result.data;
 */
export function validateNormalizeRequest(data: unknown) {
  return NormalizeRequestSchema.safeParse(data);
}

/**
 * Validate merged series result before returning to client
 *
 * @param data - Merged series result from dataUtils
 * @returns Validated result (throws on invalid)
 */
export function validateMergedResult(data: unknown): MergedSeriesResult {
  return MergedSeriesResultSchema.parse(data);
}
