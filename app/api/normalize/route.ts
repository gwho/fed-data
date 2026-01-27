/**
 * Data Normalization API Endpoint
 *
 * This endpoint merges multiple FRED time series into a single aligned dataset.
 * It handles series with different frequencies (daily, monthly, quarterly) and
 * fills gaps using the specified method.
 *
 * POST /api/normalize
 *
 * Request Body:
 * {
 *   "series": [
 *     { "seriesId": "FEDFUNDS", "key": "fedFunds" },
 *     { "seriesId": "UNRATE", "key": "unemployment" }
 *   ],
 *   "config": {
 *     "fillMethod": "forward",  // or "linear", "none"
 *     "innerJoin": false         // optional, defaults to false
 *   },
 *   "dateRange": {               // optional
 *     "start": "2023-01-01",
 *     "end": "2024-01-01"
 *   }
 * }
 *
 * Response:
 * {
 *   "data": [
 *     { "date": "2023-01-01", "fedFunds": "4.33", "unemployment": "3.5" },
 *     ...
 *   ],
 *   "seriesInfo": [
 *     { "key": "fedFunds", "originalFrequency": "daily", "originalCount": 250, "filledCount": 0 },
 *     { "key": "unemployment", "originalFrequency": "monthly", "originalCount": 12, "filledCount": 238 }
 *   ],
 *   "dateRange": { "start": "2023-01-01", "end": "2023-12-31" }
 * }
 *
 * @see docs/DATA_NORMALIZATION.md for comprehensive documentation
 * @see app/lib/dataUtils.ts for the underlying normalization functions
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  NormalizeRequestSchema,
  MergedSeriesResultSchema,
  type NormalizeRequest,
} from '@/app/lib/schemas/normalization';
import { mergeMultipleSeries } from '@/app/lib/dataUtils';
import { getFredSeries } from '@/app/lib/fredApi';

// =============================================================================
// Rate Limiting (simple in-memory implementation)
// =============================================================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute (normalization is expensive)

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

// =============================================================================
// Whitelist of allowed series (same as /api/fred for consistency)
// =============================================================================

const ALLOWED_SERIES = new Set([
  // Key Indicators
  'CPIAUCSL', 'UNRATE', 'GS10', 'TB3MS', 'FEDFUNDS', 'A191RL1Q225SBEA', 'SP500',
  // Inflation
  'CPILFESL', 'PCEPI', 'PCEPILFE', 'CPIUFDSL', 'CPIENGSL', 'CUSR0000SAH', 'CPIMEDSL',
  // Markets
  'NASDAQCOM', 'DJIA', 'VIXCLS', 'BAA10Y', 'AAA10Y', 'NYA',
  // Employment
  'CIVPART', 'PAYEMS', 'ICSA', 'AHETPI',
  // Economic Growth
  'A191RP1Q027SBEA', 'INDPRO', 'RSAFS', 'TCU',
  // Exchange Rates
  'DTWEXBGS', 'DEXUSEU', 'DEXUSUK', 'DEXJPUS', 'DEXCHUS', 'DEXMXUS', 'DEXINUS', 'DEXCAUS', 'DEXUSAL',
  // Housing
  'CSUSHPISA', 'HOUST', 'PERMIT', 'MORTGAGE30US', 'FIXHAI', 'HSN1F', 'EXHOSLUSM495S',
  // Consumer
  'PCE', 'PCEDG', 'PCESV', 'RSFSDP', 'GAFO', 'PSAVERT', 'DSPI',
  // Credit & Banking
  'BUSLOANS', 'TOTALSL', 'DRCCLACBS', 'DRSFRMACBS', 'BAMLC0A0CM',
  // Money Supply
  'M1SL', 'M2SL', 'BOGMBASE',
]);

// =============================================================================
// Helper Functions
// =============================================================================

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function createErrorResponse(
  message: string,
  status: number,
  details?: z.ZodError['issues']
) {
  return NextResponse.json(
    {
      error: message,
      ...(details && { details }),
    },
    { status }
  );
}

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIP = getClientIP(request);
  if (!checkRateLimit(clientIP)) {
    return createErrorResponse(
      'Rate limit exceeded. Maximum 20 requests per minute.',
      429
    );
  }

  try {
    // Parse request body
    const body = await request.json();

    // Validate request with Zod
    const parseResult = NormalizeRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse(
        'Invalid request body',
        400,
        parseResult.error.issues
      );
    }

    const validatedRequest: NormalizeRequest = parseResult.data;

    // Check all series are in whitelist
    for (const { seriesId } of validatedRequest.series) {
      if (!ALLOWED_SERIES.has(seriesId)) {
        return createErrorResponse(
          `Series '${seriesId}' is not in the allowed list`,
          400
        );
      }
    }

    // Fetch all requested series in parallel
    const seriesPromises = validatedRequest.series.map(async ({ seriesId, key }) => {
      try {
        const data = await getFredSeries(seriesId);
        return { key, data, error: null };
      } catch (error) {
        return {
          key,
          data: [],
          error: `Failed to fetch series ${seriesId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    });

    const seriesResults = await Promise.all(seriesPromises);

    // Check for fetch errors
    const errors = seriesResults.filter((r) => r.error);
    if (errors.length > 0) {
      return createErrorResponse(
        `Failed to fetch some series: ${errors.map((e) => e.error).join('; ')}`,
        502
      );
    }

    // Prepare series data for merging
    const seriesData = seriesResults.map(({ key, data }) => ({ key, data }));

    // Merge series using the dataUtils function
    let result = mergeMultipleSeries(seriesData, {
      fillMethod: validatedRequest.config.fillMethod,
      innerJoin: validatedRequest.config.innerJoin,
    });

    // Filter by date range if specified
    if (validatedRequest.dateRange) {
      const { start, end } = validatedRequest.dateRange;
      result = {
        ...result,
        data: result.data.filter((point) => {
          return point.date >= start && point.date <= end;
        }),
        dateRange: {
          start:
            result.data.find((p) => p.date >= start)?.date || start,
          end:
            result.data.filter((p) => p.date <= end).pop()?.date || end,
        },
      };
    }

    // Validate output with Zod (ensures response matches schema)
    const validatedResult = MergedSeriesResultSchema.parse(result);

    return NextResponse.json(validatedResult);
  } catch (error) {
    // Handle Zod validation errors from output validation
    if (error instanceof z.ZodError) {
      console.error('Output validation failed:', error.issues);
      return createErrorResponse(
        'Internal error: Output validation failed',
        500,
        error.issues
      );
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Handle other errors
    console.error('Normalize API error:', error);
    return createErrorResponse(
      'Internal server error',
      500
    );
  }
}

// =============================================================================
// OPTIONS Handler (for CORS and API documentation)
// =============================================================================

export async function OPTIONS() {
  return NextResponse.json(
    {
      methods: ['POST', 'OPTIONS'],
      description: 'Merge multiple FRED time series into aligned dataset',
      requestFormat: {
        series: [
          { seriesId: 'FRED series ID (e.g., FEDFUNDS)', key: 'output key name' },
        ],
        config: {
          fillMethod: 'forward | linear | none',
          innerJoin: 'boolean (optional, default false)',
        },
        dateRange: {
          start: 'YYYY-MM-DD (optional)',
          end: 'YYYY-MM-DD (optional)',
        },
      },
      responseFormat: {
        data: [{ date: 'YYYY-MM-DD', key1: 'value', key2: 'value' }],
        seriesInfo: [
          {
            key: 'string',
            originalFrequency: 'daily | monthly | quarterly | ...',
            originalCount: 'number',
            filledCount: 'number',
          },
        ],
        dateRange: { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' },
      },
      allowedSeries: Array.from(ALLOWED_SERIES).slice(0, 10),
      rateLimits: {
        maxRequestsPerMinute: RATE_LIMIT_MAX_REQUESTS,
      },
    },
    {
      headers: {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
