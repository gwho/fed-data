/**
 * Schema Exports
 *
 * Central export point for all Zod schemas and their inferred types.
 *
 * USAGE:
 * ```typescript
 * import {
 *   FredApiResponseSchema,
 *   SignalResultSchema,
 *   type FredApiResponse,
 *   type SignalResult,
 * } from '@/app/lib/schemas';
 * ```
 *
 * @see docs/TYPE_SAFETY_ZOD.md for comprehensive tutorial
 */

// =============================================================================
// FRED API Schemas
// =============================================================================

export {
  // Schemas
  FredObservationSchema,
  FredObservationWithNumberSchema,
  FredApiResponseSchema,
  FredQueryParamsSchema,
  ApiErrorSchema,
  // Types
  type FredObservation,
  type FredObservationWithNumber,
  type FredApiResponse,
  type FredQueryParams,
  type ApiError,
  // Helpers
  parseFredResponse,
  validateFredQueryParams,
} from './fred';

// =============================================================================
// Trading Signals Schemas
// =============================================================================

export {
  // Schemas
  SignalInterpretationSchema,
  SignalResultSchema,
  SignalsResponseSchema,
  FilteredSignalsResponseSchema,
  SignalTypeParamSchema,
  SignalsQueryParamsSchema,
  // Types
  type SignalInterpretation,
  type SignalResult,
  type SignalsResponse,
  type FilteredSignalsResponse,
  type SignalType,
  type SignalsQueryParams,
  // Helpers
  validateSignalResult,
  validateSignalsResponse,
  isValidSignalValue,
  getSignalInterpretation,
} from './signals';
