/**
 * Alert Check API Route
 *
 * Frontend polling endpoint for alert evaluation.
 *
 * DESIGN:
 * - Client polls this endpoint every N seconds (e.g., 30s)
 * - Evaluates all alerts against current signal values
 * - Returns any alerts that fired during this check
 * - Updates alert state (previousValue, lastTriggeredAt)
 *
 * Endpoint:
 * - GET /api/alerts/check - Evaluate all alerts and return triggers
 *
 * @see app/lib/alertEngine.ts for evaluation logic
 */

import { NextResponse } from 'next/server';
import { AlertCheckResponseSchema } from '@/app/lib/schemas/alerts';
import { evaluateAllAlerts } from '@/app/lib/alertEngine';
import { alertStore } from '../route';

// =============================================================================
// Signal Fetching
// =============================================================================

/**
 * Fetch current signal values from the signals API
 *
 * In a real production system, you might:
 * - Cache signal values for a short period
 * - Use a message queue for signal updates
 * - Have the signals module push updates
 */
async function getCurrentSignals(): Promise<Record<string, number>> {
  try {
    // Import dynamically to avoid circular dependencies
    const { calculateAllSignals } = await import('@/app/lib/tradingSignals');
    const response = await calculateAllSignals();

    // Extract just the numeric values from the signals object
    return {
      rate: response.signals.rate?.value ?? 0,
      volatility: response.signals.volatility?.value ?? 0,
      credit: response.signals.credit?.value ?? 0,
      housing: response.signals.housing?.value ?? 0,
      composite: response.signals.composite?.value ?? 0,
    };
  } catch (error) {
    console.error('Failed to fetch signals for alert check:', error);
    // Return zeros so alerts can still be evaluated (they just won't trigger)
    return {
      rate: 0,
      volatility: 0,
      credit: 0,
      housing: 0,
      composite: 0,
    };
  }
}

// =============================================================================
// GET /api/alerts/check - Check Alerts
// =============================================================================

/**
 * Evaluate all alerts against current signals
 *
 * This endpoint:
 * 1. Fetches current signal values
 * 2. Gets all configured alerts
 * 3. Evaluates each alert (edge-detection, cooldown)
 * 4. Updates alert state in store
 * 5. Returns any alerts that fired
 *
 * @returns AlertCheckResponse with triggered alerts
 */
export async function GET(): Promise<NextResponse> {
  const now = new Date();

  try {
    // Fetch current signal values
    const signalValues = await getCurrentSignals();

    // Get all configured alerts
    const alerts = alertStore.getAll();

    // Skip if no alerts configured
    if (alerts.length === 0) {
      const response = AlertCheckResponseSchema.parse({
        triggered: [],
        checked: 0,
        timestamp: now.toISOString(),
      });
      return NextResponse.json(response);
    }

    // Evaluate all alerts
    const { triggers, updatedAlerts } = evaluateAllAlerts(
      alerts,
      signalValues,
      now
    );

    // Update alert state in store
    for (const updated of updatedAlerts) {
      alertStore.set(updated.id, updated);
    }

    // Build and validate response
    const response = AlertCheckResponseSchema.parse({
      triggered: triggers,
      checked: alerts.length,
      timestamp: now.toISOString(),
    });

    // Log triggers for debugging/monitoring
    if (triggers.length > 0) {
      console.log(
        `[Alert Check] ${triggers.length} alert(s) triggered:`,
        triggers.map((t) => ({
          alertId: t.alertId,
          signal: t.signalType,
          condition: t.condition,
          prev: t.previousValue.toFixed(3),
          curr: t.currentValue.toFixed(3),
          threshold: t.threshold,
        }))
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Alert check failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to check alerts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// Export for Internal Use
// =============================================================================

/**
 * Programmatic alert check (for use in other server-side code)
 *
 * This allows other parts of the application to trigger alert checks
 * without going through HTTP.
 */
export async function checkAlertsInternal(): Promise<{
  triggers: ReturnType<typeof evaluateAllAlerts>['triggers'];
  checked: number;
}> {
  const signalValues = await getCurrentSignals();
  const alerts = alertStore.getAll();

  if (alerts.length === 0) {
    return { triggers: [], checked: 0 };
  }

  const { triggers, updatedAlerts } = evaluateAllAlerts(
    alerts,
    signalValues,
    new Date()
  );

  // Update state
  for (const updated of updatedAlerts) {
    alertStore.set(updated.id, updated);
  }

  return { triggers, checked: alerts.length };
}
