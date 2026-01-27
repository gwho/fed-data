/**
 * Trading Signals Schemas
 *
 * Zod schemas for validating trading signal data at runtime.
 * These ensure that signal values are always within expected ranges
 * and have the correct structure.
 *
 * SIGNAL VALUE RANGE: -1 to +1
 * - -1.0: Strong bearish (risk-off)
 * - -0.5: Moderate bearish
 * -  0.0: Neutral
 * - +0.5: Moderate bullish
 * - +1.0: Strong bullish (risk-on)
 *
 * @see docs/TYPE_SAFETY_ZOD.md for tutorial
 * @see docs/SIGNALS_API.md for signal documentation
 */

import { z } from 'zod';

// =============================================================================
// Signal Interpretation Enum
// =============================================================================

/**
 * Valid signal interpretations
 *
 * These map to value ranges:
 * - strong_bearish: value <= -0.6
 * - bearish: -0.6 < value <= -0.2
 * - neutral: -0.2 < value < 0.2
 * - bullish: 0.2 <= value < 0.6
 * - strong_bullish: value >= 0.6
 */
export const SignalInterpretationSchema = z.enum([
  'strong_bearish',
  'bearish',
  'neutral',
  'bullish',
  'strong_bullish',
]);

// =============================================================================
// Signal Result Schema
// =============================================================================

/**
 * Schema for a single trading signal result
 *
 * Each signal includes:
 * - name: The signal name (e.g., "Interest Rate Signal")
 * - value: The signal strength (-1 to +1)
 * - interpretation: Human-readable interpretation category
 * - confidence: How confident we are in the signal (0 to 1)
 * - explanation: Human-readable explanation of the signal
 * - indicators: Raw indicator data used in calculation
 * - updatedAt: ISO timestamp when signal was calculated
 *
 * NOTE: This schema matches the SignalResult interface in tradingSignals.ts
 */
export const SignalResultSchema = z.object({
  // Signal name (e.g., "Interest Rate Signal")
  name: z.string().min(1, 'Signal name is required'),

  // Value must be between -1 (bearish) and +1 (bullish)
  value: z
    .number()
    .min(-1, 'Signal value cannot be less than -1')
    .max(1, 'Signal value cannot exceed 1'),

  // Human-readable interpretation
  interpretation: SignalInterpretationSchema,

  // Confidence from 0 (no confidence) to 1 (full confidence)
  confidence: z
    .number()
    .min(0, 'Confidence cannot be negative')
    .max(1, 'Confidence cannot exceed 1'),

  // Human-readable explanation of the signal
  explanation: z.string().min(1, 'Explanation is required'),

  // Raw indicator data used in calculation (values can be null)
  indicators: z.record(z.string(), z.number().nullable()),

  // ISO timestamp when signal was calculated
  updatedAt: z.string(),
});

// =============================================================================
// Full Signals Response Schema
// =============================================================================

/**
 * Schema for the complete /api/signals response
 *
 * Contains all five trading signals plus metadata.
 * NOTE: Signals are NOT nullable in full response (all calculated together)
 */
export const SignalsResponseSchema = z.object({
  signals: z.object({
    rate: SignalResultSchema,
    volatility: SignalResultSchema,
    credit: SignalResultSchema,
    housing: SignalResultSchema,
    composite: SignalResultSchema,
  }),
  meta: z.object({
    calculatedAt: z.string(), // ISO datetime string
    version: z.string(),
  }),
});

/**
 * Schema for filtered signals response (when ?type= is used)
 */
export const FilteredSignalsResponseSchema = z.object({
  signals: z.record(z.string(), SignalResultSchema.nullable()),
  meta: z.object({
    calculatedAt: z.string(),
    version: z.string(),
  }),
});

/**
 * Schema for signal type query parameter
 */
export const SignalTypeParamSchema = z.enum([
  'rate',
  'volatility',
  'credit',
  'housing',
  'composite',
]);

/**
 * Schema for validating signal query parameters
 */
export const SignalsQueryParamsSchema = z.object({
  type: z
    .string()
    .transform((val) => val.split(',').map((t) => t.trim().toLowerCase()))
    .pipe(z.array(SignalTypeParamSchema))
    .optional(),
});

// =============================================================================
// Type Inference
// =============================================================================

/**
 * TypeScript types derived from schemas
 *
 * These replace the manually-defined interfaces in tradingSignals.ts
 * Using z.infer ensures types always match validation rules.
 */
export type SignalInterpretation = z.infer<typeof SignalInterpretationSchema>;
export type SignalResult = z.infer<typeof SignalResultSchema>;
export type SignalsResponse = z.infer<typeof SignalsResponseSchema>;
export type FilteredSignalsResponse = z.infer<typeof FilteredSignalsResponseSchema>;
export type SignalType = z.infer<typeof SignalTypeParamSchema>;
export type SignalsQueryParams = z.infer<typeof SignalsQueryParamsSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate a signal result is within expected ranges
 *
 * @param signal - Signal to validate
 * @returns Validated signal or null
 */
export function validateSignalResult(signal: unknown): SignalResult | null {
  const result = SignalResultSchema.safeParse(signal);
  if (!result.success) {
    console.error('Signal validation failed:', result.error.issues);
    return null;
  }
  return result.data;
}

/**
 * Validate the full signals API response
 *
 * @param data - Raw API response
 * @returns Validated response or null
 */
export function validateSignalsResponse(data: unknown): SignalsResponse | null {
  const result = SignalsResponseSchema.safeParse(data);
  if (!result.success) {
    console.error('Signals response validation failed:', result.error.issues);
    return null;
  }
  return result.data;
}

/**
 * Check if a signal value is in the valid range
 *
 * Useful for quick checks without full schema validation
 */
export function isValidSignalValue(value: number): boolean {
  return value >= -1 && value <= 1;
}

/**
 * Get interpretation from signal value
 *
 * @param value - Signal value (-1 to 1)
 * @returns Human-readable interpretation
 */
export function getSignalInterpretation(value: number): SignalInterpretation {
  if (value <= -0.6) return 'strong_bearish';
  if (value <= -0.2) return 'bearish';
  if (value < 0.2) return 'neutral';
  if (value < 0.6) return 'bullish';
  return 'strong_bullish';
}
