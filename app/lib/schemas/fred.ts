/**
 * FRED API Response Schemas
 *
 * These Zod schemas validate data at RUNTIME, catching errors that
 * TypeScript alone cannot catch. TypeScript types disappear after
 * compilation - Zod schemas persist and actively validate data.
 *
 * KEY CONCEPT: Single Source of Truth
 * Instead of defining interfaces separately, we define Zod schemas
 * and INFER the TypeScript types from them. This ensures types and
 * validation are always in sync.
 *
 * @see docs/TYPE_SAFETY_ZOD.md for comprehensive tutorial
 *
 * @example
 * // Validate API response
 * const result = FredApiResponseSchema.safeParse(apiData);
 * if (result.success) {
 *   // result.data is fully typed AND validated
 *   console.log(result.data.observations);
 * } else {
 *   // result.error contains detailed validation errors
 *   console.error(result.error.issues);
 * }
 */

import { z } from 'zod';

// =============================================================================
// FRED Data Schemas
// =============================================================================

/**
 * Schema for a single FRED data observation
 *
 * FRED API returns dates as 'YYYY-MM-DD' strings and values as strings
 * (even for numeric data). This schema validates the format.
 *
 * Note: We keep value as string to match FRED's format exactly.
 * Use FredObservationWithNumberSchema if you need numeric values.
 */
export const FredObservationSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  value: z.string(),
});

/**
 * Schema with value transformed to number
 *
 * Use this when you need numeric values for calculations.
 * Handles FRED's '.' placeholder for missing data.
 */
export const FredObservationWithNumberSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.string().transform((val) => {
    // FRED uses '.' for missing values
    if (val === '.') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }),
});

/**
 * Schema for our internal /api/fred proxy response
 *
 * This is the shape returned by app/api/fred/route.ts
 */
export const FredApiResponseSchema = z.object({
  series: z.string().min(1, 'Series ID is required'),
  observations: z.array(FredObservationSchema),
  count: z.number().int().nonnegative(),
});

/**
 * Schema for FRED API query parameters
 *
 * Validates incoming requests to our /api/fred endpoint
 */
export const FredQueryParamsSchema = z.object({
  series: z
    .string()
    .min(1, 'Series ID is required')
    .max(50, 'Series ID too long')
    .regex(/^[A-Z0-9_]+$/i, 'Series ID contains invalid characters'),
  start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD')
    .optional(),
});

/**
 * Schema for API error responses
 */
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  status: z.number().optional(),
});

// =============================================================================
// Type Inference
// =============================================================================

/**
 * TypeScript types inferred from schemas
 *
 * IMPORTANT: These types are derived from the schemas above.
 * Never define them separately! This ensures types and validation
 * are always in sync.
 *
 * @example
 * // This type is guaranteed to match FredObservationSchema
 * const obs: FredObservation = { date: '2024-01-01', value: '3.7' };
 */
export type FredObservation = z.infer<typeof FredObservationSchema>;
export type FredObservationWithNumber = z.infer<typeof FredObservationWithNumberSchema>;
export type FredApiResponse = z.infer<typeof FredApiResponseSchema>;
export type FredQueryParams = z.infer<typeof FredQueryParamsSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Safely parse FRED API response with detailed error handling
 *
 * @param data - Raw data from API response
 * @returns Parsed data or null with logged errors
 *
 * @example
 * const response = await fetch('/api/fred?series=FEDFUNDS');
 * const json = await response.json();
 * const validated = parseFredResponse(json);
 * if (validated) {
 *   // Use validated.observations safely
 * }
 */
export function parseFredResponse(data: unknown): FredApiResponse | null {
  const result = FredApiResponseSchema.safeParse(data);

  if (!result.success) {
    console.error('FRED API response validation failed:', result.error.issues);
    return null;
  }

  return result.data;
}

/**
 * Validate FRED query parameters from URL search params
 *
 * @param params - URLSearchParams or plain object
 * @returns Validated params or throws ZodError
 */
export function validateFredQueryParams(
  params: URLSearchParams | Record<string, string>
): FredQueryParams {
  const obj =
    params instanceof URLSearchParams
      ? {
          series: params.get('series') ?? undefined,
          start: params.get('start') ?? undefined,
        }
      : params;

  return FredQueryParamsSchema.parse(obj);
}
