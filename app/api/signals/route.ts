/**
 * Trading Signals API Endpoint
 *
 * GET /api/signals - Returns all trading signals
 * GET /api/signals?type=rate - Returns specific signal
 * GET /api/signals?type=rate,volatility - Returns multiple signals
 *
 * @see docs/SIGNALS_API.md for full documentation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateAllSignals,
  getSignalByType,
  SignalResult,
  SignalsResponse,
} from '@/app/lib/tradingSignals';

/**
 * Valid signal types that can be requested
 */
const VALID_SIGNAL_TYPES = ['rate', 'volatility', 'credit', 'housing', 'composite'];

/**
 * GET /api/signals
 *
 * Query Parameters:
 * - type: Optional. Comma-separated list of signal types to return.
 *         Valid values: rate, volatility, credit, housing, composite
 *         If not provided, returns all signals.
 *
 * Response:
 * - 200: Success with signal data
 * - 400: Invalid signal type requested
 * - 500: Server error during calculation
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const typeParam = searchParams.get('type');

    // If no type specified, return all signals
    if (!typeParam) {
      const signals = await calculateAllSignals();
      return NextResponse.json(signals, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      });
    }

    // Parse requested signal types
    const requestedTypes = typeParam.split(',').map(t => t.trim().toLowerCase());

    // Validate all requested types
    const invalidTypes = requestedTypes.filter(t => !VALID_SIGNAL_TYPES.includes(t));
    if (invalidTypes.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid signal type(s)',
          invalidTypes,
          validTypes: VALID_SIGNAL_TYPES,
        },
        { status: 400 }
      );
    }

    // Fetch requested signals in parallel
    const signalPromises = requestedTypes.map(async (type) => {
      const signal = await getSignalByType(type);
      return { type, signal };
    });

    const results = await Promise.all(signalPromises);

    // Build response object
    const signals: Record<string, SignalResult | null> = {};
    for (const { type, signal } of results) {
      signals[type] = signal;
    }

    const response: Partial<SignalsResponse> & { signals: Record<string, SignalResult | null> } = {
      signals,
      meta: {
        calculatedAt: new Date().toISOString(),
        version: '1.0.0',
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Error calculating signals:', error);

    return NextResponse.json(
      {
        error: 'Failed to calculate signals',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/signals
 *
 * Returns API information and supported signal types
 */
export async function OPTIONS() {
  return NextResponse.json({
    name: 'FRED Trading Signals API',
    version: '1.0.0',
    description: 'Calculate trading signals from FRED economic indicators',
    endpoints: {
      'GET /api/signals': 'Returns all trading signals',
      'GET /api/signals?type=<type>': 'Returns specific signal(s)',
    },
    validTypes: VALID_SIGNAL_TYPES,
    signalRange: {
      min: -1,
      max: 1,
      interpretation: {
        '-1.0': 'Strong bearish (risk-off)',
        '-0.5': 'Moderate bearish',
        '0.0': 'Neutral',
        '0.5': 'Moderate bullish',
        '1.0': 'Strong bullish (risk-on)',
      },
    },
    documentation: '/docs/SIGNALS_API.md',
  });
}
