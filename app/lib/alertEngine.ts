/**
 * Alert Evaluation Engine
 *
 * Core logic for evaluating trading signal alerts.
 *
 * KEY CONCEPTS:
 * - Edge-triggered: Only fires when crossing threshold, not while above/below
 * - Cooldown: After firing, ignores for N minutes to prevent spam
 * - Pure evaluation: Core logic is pure functions for easy testing
 *
 * EVALUATION FLOW:
 * 1. Check if alert is enabled and matches signal type
 * 2. Check if alert is in cooldown period
 * 3. Check if condition is met (edge detection)
 * 4. Create trigger event and update alert state
 *
 * @see app/lib/schemas/alerts.ts for type definitions
 */

import {
  AlertConfig,
  AlertTrigger,
  AlertCondition,
} from './schemas/alerts';

// =============================================================================
// Types
// =============================================================================

/**
 * Signal snapshot for evaluation
 */
export interface SignalSnapshot {
  type: string;
  value: number;
}

/**
 * Result of evaluating a single alert
 */
export interface EvaluationResult {
  /** Trigger event if alert fired, null otherwise */
  trigger: AlertTrigger | null;
  /** Updated alert config (with new previousValue and possibly lastTriggeredAt) */
  updatedAlert: AlertConfig;
}

/**
 * Result of evaluating all alerts
 */
export interface BatchEvaluationResult {
  /** All triggers that fired */
  triggers: AlertTrigger[];
  /** All alerts with updated state */
  updatedAlerts: AlertConfig[];
}

// =============================================================================
// Interpretation Mapping
// =============================================================================

/**
 * Signal interpretation buckets
 *
 * Used for 'any_change' condition to detect when signal moves
 * between interpretation categories.
 */
type Interpretation = 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';

/**
 * Get interpretation bucket for a signal value
 *
 * Matches the interpretation logic in tradingSignals.ts
 */
function getInterpretation(value: number): Interpretation {
  if (value >= 0.6) return 'strong_bullish';
  if (value >= 0.2) return 'bullish';
  if (value <= -0.6) return 'strong_bearish';
  if (value <= -0.2) return 'bearish';
  return 'neutral';
}

// =============================================================================
// Cooldown Logic
// =============================================================================

/**
 * Check if an alert is currently in cooldown period
 *
 * An alert enters cooldown immediately after firing and stays there
 * for `cooldownMinutes` minutes.
 *
 * @param alert - Alert configuration
 * @param now - Current time (injectable for testing)
 * @returns true if alert is in cooldown, false otherwise
 */
export function isInCooldown(alert: AlertConfig, now: Date = new Date()): boolean {
  if (!alert.lastTriggeredAt) {
    return false;
  }

  const lastTrigger = new Date(alert.lastTriggeredAt);
  const cooldownMs = (alert.cooldownMinutes ?? 5) * 60 * 1000;
  const cooldownEnd = new Date(lastTrigger.getTime() + cooldownMs);

  return now < cooldownEnd;
}

/**
 * Get remaining cooldown time in seconds
 *
 * @param alert - Alert configuration
 * @param now - Current time
 * @returns Seconds remaining in cooldown, or 0 if not in cooldown
 */
export function getCooldownRemaining(alert: AlertConfig, now: Date = new Date()): number {
  if (!alert.lastTriggeredAt) {
    return 0;
  }

  const lastTrigger = new Date(alert.lastTriggeredAt);
  const cooldownMs = (alert.cooldownMinutes ?? 5) * 60 * 1000;
  const cooldownEnd = new Date(lastTrigger.getTime() + cooldownMs);

  const remainingMs = cooldownEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

// =============================================================================
// Condition Checking
// =============================================================================

/**
 * Check if an alert condition is met (edge-triggered)
 *
 * This function implements edge detection - it only returns true
 * when the condition CHANGES from false to true (crossing the threshold).
 *
 * @param condition - Alert condition type
 * @param current - Current signal value
 * @param previous - Previous signal value (null if first evaluation)
 * @param threshold - Threshold for crossing conditions
 * @returns true if condition is newly met
 */
export function checkCondition(
  condition: AlertCondition,
  current: number,
  previous: number | null,
  threshold: number
): boolean {
  switch (condition) {
    case 'crosses_above':
      // Edge: was at or below threshold, now above
      // Requires previous value for edge detection
      return previous !== null && previous <= threshold && current > threshold;

    case 'crosses_below':
      // Edge: was at or above threshold, now below
      return previous !== null && previous >= threshold && current < threshold;

    case 'any_change':
      // Interpretation bucket changed
      return previous !== null &&
        getInterpretation(current) !== getInterpretation(previous);

    default:
      // TypeScript exhaustiveness check - ensures all cases are handled
      return condition satisfies never;
  }
}

// =============================================================================
// Single Alert Evaluation
// =============================================================================

/**
 * Evaluate a single alert against a signal snapshot
 *
 * This is a pure function that:
 * 1. Checks if alert should be evaluated (enabled, correct signal type)
 * 2. Checks if alert is in cooldown
 * 3. Checks if condition is met
 * 4. Returns trigger event and updated alert state
 *
 * @param alert - Alert configuration to evaluate
 * @param signal - Current signal snapshot
 * @param now - Current time (injectable for testing)
 * @returns Evaluation result with optional trigger and updated alert
 */
export function evaluateAlert(
  alert: AlertConfig,
  signal: SignalSnapshot,
  now: Date = new Date()
): EvaluationResult {
  // Skip if alert is disabled
  if (!alert.enabled) {
    return { trigger: null, updatedAlert: alert };
  }

  // Skip if wrong signal type
  if (alert.signalType !== signal.type) {
    return { trigger: null, updatedAlert: alert };
  }

  // Check cooldown: was it triggered recently?
  if (isInCooldown(alert, now)) {
    // Still update previousValue to maintain edge detection state
    return {
      trigger: null,
      updatedAlert: { ...alert, previousValue: signal.value },
    };
  }

  // Get previous value for edge detection
  const previousValue = alert.previousValue ?? null;

  // Check if condition is met
  const shouldTrigger = checkCondition(
    alert.condition,
    signal.value,
    previousValue,
    alert.threshold
  );

  if (!shouldTrigger) {
    // Condition not met - update previousValue only
    return {
      trigger: null,
      updatedAlert: { ...alert, previousValue: signal.value },
    };
  }

  // TRIGGER! Create trigger event
  const trigger: AlertTrigger = {
    alertId: alert.id,
    signalType: alert.signalType,
    previousValue: previousValue ?? signal.value,
    currentValue: signal.value,
    threshold: alert.threshold,
    condition: alert.condition,
    triggeredAt: now.toISOString(),
    acknowledged: false,
  };

  // Update alert state with new previousValue and lastTriggeredAt
  const updatedAlert: AlertConfig = {
    ...alert,
    previousValue: signal.value,
    lastTriggeredAt: now.toISOString(),
  };

  return { trigger, updatedAlert };
}

// =============================================================================
// Batch Evaluation
// =============================================================================

/**
 * Evaluate all alerts against current signal values
 *
 * This function evaluates each alert against the appropriate signal
 * and returns all triggers plus updated alert states.
 *
 * @param alerts - Array of alert configurations
 * @param signals - Record of signal type to current value
 * @param now - Current time (injectable for testing)
 * @returns Batch evaluation result
 */
export function evaluateAllAlerts(
  alerts: AlertConfig[],
  signals: Record<string, number>,
  now: Date = new Date()
): BatchEvaluationResult {
  const triggers: AlertTrigger[] = [];
  const updatedAlerts: AlertConfig[] = [];

  for (const alert of alerts) {
    // Get signal value for this alert's signal type
    const signalValue = signals[alert.signalType];

    // Skip if signal not available
    if (signalValue === undefined) {
      updatedAlerts.push(alert);
      continue;
    }

    // Evaluate this alert
    const { trigger, updatedAlert } = evaluateAlert(
      alert,
      { type: alert.signalType, value: signalValue },
      now
    );

    if (trigger) {
      triggers.push(trigger);
    }
    updatedAlerts.push(updatedAlert);
  }

  return { triggers, updatedAlerts };
}
