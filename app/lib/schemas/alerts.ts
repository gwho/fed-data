/**
 * Alert System Schemas
 *
 * Zod schemas for the trading signal alert system.
 *
 * DESIGN DECISIONS:
 * - Edge-triggered: Alerts fire only when conditions CHANGE (cross threshold)
 * - Cooldown: After firing, alerts wait N minutes before re-arming
 * - Frontend polling: Client polls /api/alerts/check for triggered alerts
 *
 * @see docs/TYPE_SAFETY_ZOD.md for Zod tutorial
 */

import { z } from 'zod';
import { SignalTypeParamSchema } from './signals';

// =============================================================================
// Alert Condition Schema
// =============================================================================

/**
 * Alert conditions - EDGE-TRIGGERED only
 *
 * Unlike level-triggered alerts (which fire continuously while true),
 * edge-triggered alerts fire only when the condition CHANGES:
 *
 * - crosses_above: Signal was at/below threshold, now above
 * - crosses_below: Signal was at/above threshold, now below
 * - any_change: Signal interpretation category changed
 */
export const AlertConditionSchema = z.enum([
  'crosses_above',  // Signal was ≤ threshold, now > threshold
  'crosses_below',  // Signal was ≥ threshold, now < threshold
  'any_change',     // Interpretation changed (e.g., bullish → bearish)
]);

// =============================================================================
// Alert Configuration Schema
// =============================================================================

/**
 * Schema for creating/updating an alert configuration
 *
 * The alert tracks:
 * - What signal to watch (signalType)
 * - What condition triggers it (condition + threshold)
 * - Cooldown to prevent spam (cooldownMinutes)
 * - State for edge detection (previousValue, lastTriggeredAt)
 */
export const AlertConfigSchema = z.object({
  // Unique identifier
  id: z.string().uuid(),

  // Which signal to monitor
  signalType: SignalTypeParamSchema,

  // Trigger condition (edge-triggered)
  condition: AlertConditionSchema,

  // Threshold for crosses_above/crosses_below (-1 to +1)
  threshold: z.number().min(-1).max(1),

  // Whether alert is active
  enabled: z.boolean().default(true),

  // When alert was created
  createdAt: z.string().datetime(),

  // Cooldown period in minutes (prevents re-firing too quickly)
  cooldownMinutes: z.number().int().min(1).max(1440).default(5),

  // When alert last fired (for cooldown calculation)
  lastTriggeredAt: z.string().datetime().optional(),

  // Previous signal value (for edge detection)
  previousValue: z.number().optional(),
});

/**
 * Schema for creating a new alert (without system-generated fields)
 */
export const CreateAlertSchema = z.object({
  signalType: SignalTypeParamSchema,
  condition: AlertConditionSchema,
  threshold: z.number().min(-1).max(1),
  enabled: z.boolean().default(true),
  cooldownMinutes: z.number().int().min(1).max(1440).default(5),
});

// =============================================================================
// Alert Trigger Schema
// =============================================================================

/**
 * Schema for a triggered alert event
 *
 * Created when an alert condition is met. Contains the snapshot of
 * values at the time of trigger for audit/debugging.
 */
export const AlertTriggerSchema = z.object({
  // Reference to the alert that fired
  alertId: z.string().uuid(),

  // Signal that triggered it
  signalType: SignalTypeParamSchema,

  // Values at time of trigger
  previousValue: z.number(),
  currentValue: z.number(),
  threshold: z.number(),
  condition: AlertConditionSchema,

  // When it fired
  triggeredAt: z.string().datetime(),

  // Whether user has seen/acknowledged this trigger
  acknowledged: z.boolean().default(false),
});

// =============================================================================
// API Response Schemas
// =============================================================================

/**
 * Response from GET /api/alerts
 */
export const AlertsListResponseSchema = z.object({
  alerts: z.array(AlertConfigSchema),
  count: z.number().int().nonnegative(),
});

/**
 * Response from GET /api/alerts/check (frontend polling)
 *
 * Contains any alerts that fired during this check cycle.
 */
export const AlertCheckResponseSchema = z.object({
  // Alerts that fired during this check
  triggered: z.array(AlertTriggerSchema),

  // How many alerts were evaluated
  checked: z.number().int().nonnegative(),

  // When check was performed
  timestamp: z.string().datetime(),
});

// =============================================================================
// Type Exports
// =============================================================================

export type AlertCondition = z.infer<typeof AlertConditionSchema>;
export type AlertConfig = z.infer<typeof AlertConfigSchema>;
export type CreateAlert = z.infer<typeof CreateAlertSchema>;
export type AlertTrigger = z.infer<typeof AlertTriggerSchema>;
export type AlertsListResponse = z.infer<typeof AlertsListResponseSchema>;
export type AlertCheckResponse = z.infer<typeof AlertCheckResponseSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate a create alert request
 */
export function validateCreateAlert(data: unknown): CreateAlert | null {
  const result = CreateAlertSchema.safeParse(data);
  if (!result.success) {
    console.error('Create alert validation failed:', result.error.issues);
    return null;
  }
  return result.data;
}

/**
 * Validate an alert configuration
 */
export function validateAlertConfig(data: unknown): AlertConfig | null {
  const result = AlertConfigSchema.safeParse(data);
  if (!result.success) {
    console.error('Alert config validation failed:', result.error.issues);
    return null;
  }
  return result.data;
}
