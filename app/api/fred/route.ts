/**
 * FRED API Proxy Endpoint
 *
 * This route acts as a secure proxy between the client and the FRED API.
 * The API key is kept server-side and never exposed to the browser.
 *
 * GET /api/fred?series=FEDFUNDS
 * GET /api/fred?series=FEDFUNDS&start=2024-01-01
 *
 * @see docs/API_SECURITY.md for security documentation
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side FRED API key (never exposed to client)
 * Falls back to NEXT_PUBLIC_ version for backward compatibility during migration
 */
const FRED_API_KEY =
  process.env.FRED_API_KEY || process.env.NEXT_PUBLIC_FRED_API_KEY || '';

const FRED_API_BASE = 'https://api.stlouisfed.org/fred';

/**
 * Whitelist of allowed FRED series IDs
 * This prevents abuse by limiting which series can be requested
 */
const ALLOWED_SERIES = new Set([
  // Key Indicators
  'CPIAUCSL',
  'UNRATE',
  'GS10',
  'TB3MS',
  'FEDFUNDS',
  'A191RL1Q225SBEA',
  'SP500',

  // Inflation
  'CPILFESL',
  'PCEPI',
  'PCEPILFE',
  'CPIUFDSL',
  'CPIENGSL',
  'CUSR0000SAH',
  'CPIMEDSL',

  // Markets
  'NASDAQCOM',
  'DJIA',
  'VIXCLS',
  'BAA10Y',
  'AAA10Y',
  'NYA',

  // Employment
  'CIVPART',
  'PAYEMS',
  'ICSA',
  'AHETPI',

  // Economic Growth
  'A191RP1Q027SBEA',
  'INDPRO',
  'RSAFS',
  'TCU',

  // Exchange Rates
  'DTWEXBGS',
  'DEXUSEU',
  'DEXUSUK',
  'DEXJPUS',
  'DEXCHUS',
  'DEXMXUS',
  'DEXINUS',
  'DEXCAUS',
  'DEXUSAL',

  // Housing
  'CSUSHPISA',
  'HOUST',
  'PERMIT',
  'MORTGAGE30US',
  'FIXHAI',
  'HSN1F',
  'EXHOSLUSM495S',

  // Consumer
  'PCE',
  'PCEDG',
  'PCESV',
  'RSFSDP',
  'GAFO',
  'PSAVERT',
  'DSPI',
  'UMCSENT',
  'CSCICP03USM665S',
]);

/**
 * Simple in-memory rate limiting
 * In production, use Redis or a proper rate limiting service
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count };
}

/**
 * GET /api/fred
 *
 * Query Parameters:
 * - series: Required. FRED series ID (e.g., "FEDFUNDS", "UNRATE")
 * - start: Optional. Start date for observations (YYYY-MM-DD format)
 *
 * Response:
 * - 200: Success with FRED data
 * - 400: Missing or invalid series parameter
 * - 403: Series not in whitelist
 * - 429: Rate limit exceeded
 * - 500: FRED API error
 */
export async function GET(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limit
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: 60,
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const seriesId = searchParams.get('series');
    const startDate = searchParams.get('start');

    // Validate series parameter
    if (!seriesId) {
      return NextResponse.json(
        {
          error: 'Missing required parameter',
          message: 'The "series" query parameter is required',
          example: '/api/fred?series=FEDFUNDS',
        },
        { status: 400 }
      );
    }

    // Check if series is in whitelist
    if (!ALLOWED_SERIES.has(seriesId.toUpperCase())) {
      return NextResponse.json(
        {
          error: 'Series not allowed',
          message: `Series "${seriesId}" is not in the allowed list`,
          hint: 'Contact administrator to add new series',
        },
        { status: 403 }
      );
    }

    // Check if API key is configured
    if (!FRED_API_KEY || FRED_API_KEY === 'your_fred_api_key_here') {
      return NextResponse.json(
        {
          error: 'API key not configured',
          message: 'FRED API key is not set on the server',
          usingSampleData: true,
        },
        { status: 503 }
      );
    }

    // Build FRED API request
    const params = new URLSearchParams({
      series_id: seriesId.toUpperCase(),
      api_key: FRED_API_KEY,
      file_type: 'json',
    });

    if (startDate) {
      params.append('observation_start', startDate);
    }

    // Fetch from FRED API
    const response = await fetch(
      `${FRED_API_BASE}/series/observations?${params}`,
      {
        headers: {
          'User-Agent': 'FedData-Dashboard/1.0',
        },
        // Cache for 1 hour on the edge
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      console.error(`FRED API error: ${response.status} for series ${seriesId}`);
      return NextResponse.json(
        {
          error: 'FRED API error',
          message: `Failed to fetch data for series ${seriesId}`,
          status: response.status,
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Transform and filter the data
    const observations = data.observations
      ?.filter((obs: { value: string }) => obs.value !== '.')
      .map((obs: { date: string; value: string }) => ({
        date: obs.date,
        value: obs.value,
      }));

    return NextResponse.json(
      {
        series: seriesId.toUpperCase(),
        observations: observations || [],
        count: observations?.length || 0,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Error in FRED API proxy:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/fred
 *
 * Returns API documentation and list of allowed series
 */
export async function OPTIONS() {
  return NextResponse.json({
    name: 'FRED Data API Proxy',
    version: '1.0.0',
    description: 'Secure proxy for FRED (Federal Reserve Economic Data) API',
    endpoints: {
      'GET /api/fred?series=<id>': 'Fetch observations for a FRED series',
      'GET /api/fred?series=<id>&start=<date>': 'Fetch observations from start date',
    },
    allowedSeries: Array.from(ALLOWED_SERIES).sort(),
    rateLimit: {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
    },
    documentation: '/docs/API_SECURITY.md',
  });
}
