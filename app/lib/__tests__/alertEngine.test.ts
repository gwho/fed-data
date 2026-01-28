/**
 * Alert Engine Unit Tests
 *
 * Tests for the alert evaluation engine covering:
 * - Edge-triggered condition detection
 * - Cooldown mechanism
 * - Batch evaluation
 * - Edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateAlert,
  evaluateAllAlerts,
  isInCooldown,
  getCooldownRemaining,
  checkCondition,
  SignalSnapshot,
} from '../alertEngine';
import { AlertConfig } from '../schemas/alerts';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a test alert configuration
 */
function createTestAlert(overrides: Partial<AlertConfig> = {}): AlertConfig {
  return {
    id: 'test-alert-001',
    signalType: 'composite',
    condition: 'crosses_above',
    threshold: 0.5,
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    cooldownMinutes: 5,
    ...overrides,
  };
}

/**
 * Create a fixed date for consistent testing
 */
function createTestDate(isoString: string = '2024-01-15T12:00:00.000Z'): Date {
  return new Date(isoString);
}

// =============================================================================
// checkCondition Tests
// =============================================================================

describe('checkCondition', () => {
  describe('crosses_above', () => {
    it('triggers when crossing above threshold', () => {
      // Previous: 0.4 (below), Current: 0.6 (above), Threshold: 0.5
      expect(checkCondition('crosses_above', 0.6, 0.4, 0.5)).toBe(true);
    });

    it('does not trigger when already above threshold', () => {
      // Previous: 0.6 (above), Current: 0.7 (above)
      expect(checkCondition('crosses_above', 0.7, 0.6, 0.5)).toBe(false);
    });

    it('does not trigger when moving from above to below', () => {
      // Previous: 0.6 (above), Current: 0.4 (below)
      expect(checkCondition('crosses_above', 0.4, 0.6, 0.5)).toBe(false);
    });

    it('does not trigger when staying below threshold', () => {
      // Previous: 0.3 (below), Current: 0.4 (below)
      expect(checkCondition('crosses_above', 0.4, 0.3, 0.5)).toBe(false);
    });

    it('does not trigger without previous value (first evaluation)', () => {
      expect(checkCondition('crosses_above', 0.6, null, 0.5)).toBe(false);
    });

    it('triggers when exactly at threshold then above', () => {
      // Previous: 0.5 (at), Current: 0.6 (above)
      expect(checkCondition('crosses_above', 0.6, 0.5, 0.5)).toBe(true);
    });

    it('does not trigger when going to exactly threshold', () => {
      // Previous: 0.4 (below), Current: 0.5 (at threshold)
      expect(checkCondition('crosses_above', 0.5, 0.4, 0.5)).toBe(false);
    });
  });

  describe('crosses_below', () => {
    it('triggers when crossing below threshold', () => {
      // Previous: 0.6 (above), Current: 0.4 (below), Threshold: 0.5
      expect(checkCondition('crosses_below', 0.4, 0.6, 0.5)).toBe(true);
    });

    it('does not trigger when already below threshold', () => {
      // Previous: 0.4 (below), Current: 0.3 (below)
      expect(checkCondition('crosses_below', 0.3, 0.4, 0.5)).toBe(false);
    });

    it('does not trigger when moving from below to above', () => {
      // Previous: 0.4 (below), Current: 0.6 (above)
      expect(checkCondition('crosses_below', 0.6, 0.4, 0.5)).toBe(false);
    });

    it('does not trigger without previous value', () => {
      expect(checkCondition('crosses_below', 0.4, null, 0.5)).toBe(false);
    });

    it('triggers when exactly at threshold then below', () => {
      // Previous: 0.5 (at), Current: 0.4 (below)
      expect(checkCondition('crosses_below', 0.4, 0.5, 0.5)).toBe(true);
    });
  });

  describe('any_change', () => {
    it('triggers when interpretation changes from neutral to bullish', () => {
      // 0.1 is neutral, 0.3 is bullish
      expect(checkCondition('any_change', 0.3, 0.1, 0)).toBe(true);
    });

    it('triggers when interpretation changes from bullish to strong_bullish', () => {
      // 0.3 is bullish, 0.7 is strong_bullish
      expect(checkCondition('any_change', 0.7, 0.3, 0)).toBe(true);
    });

    it('triggers when interpretation changes from neutral to bearish', () => {
      // 0.0 is neutral, -0.3 is bearish
      expect(checkCondition('any_change', -0.3, 0.0, 0)).toBe(true);
    });

    it('does not trigger when staying in same interpretation', () => {
      // 0.25 and 0.35 are both bullish
      expect(checkCondition('any_change', 0.35, 0.25, 0)).toBe(false);
    });

    it('does not trigger without previous value', () => {
      expect(checkCondition('any_change', 0.3, null, 0)).toBe(false);
    });
  });
});

// =============================================================================
// isInCooldown Tests
// =============================================================================

describe('isInCooldown', () => {
  it('returns false when lastTriggeredAt is not set', () => {
    const alert = createTestAlert({ lastTriggeredAt: undefined });
    expect(isInCooldown(alert)).toBe(false);
  });

  it('returns true when within cooldown period', () => {
    const now = createTestDate('2024-01-15T12:03:00.000Z'); // 3 minutes after trigger
    const alert = createTestAlert({
      lastTriggeredAt: '2024-01-15T12:00:00.000Z',
      cooldownMinutes: 5,
    });
    expect(isInCooldown(alert, now)).toBe(true);
  });

  it('returns false when cooldown has expired', () => {
    const now = createTestDate('2024-01-15T12:06:00.000Z'); // 6 minutes after trigger
    const alert = createTestAlert({
      lastTriggeredAt: '2024-01-15T12:00:00.000Z',
      cooldownMinutes: 5,
    });
    expect(isInCooldown(alert, now)).toBe(false);
  });

  it('returns false exactly when cooldown expires', () => {
    const now = createTestDate('2024-01-15T12:05:00.000Z'); // Exactly 5 minutes after
    const alert = createTestAlert({
      lastTriggeredAt: '2024-01-15T12:00:00.000Z',
      cooldownMinutes: 5,
    });
    expect(isInCooldown(alert, now)).toBe(false);
  });

  it('handles 1-minute cooldown', () => {
    const alert = createTestAlert({
      lastTriggeredAt: '2024-01-15T12:00:00.000Z',
      cooldownMinutes: 1,
    });

    // 30 seconds after - in cooldown
    expect(isInCooldown(alert, createTestDate('2024-01-15T12:00:30.000Z'))).toBe(true);

    // 61 seconds after - out of cooldown
    expect(isInCooldown(alert, createTestDate('2024-01-15T12:01:01.000Z'))).toBe(false);
  });
});

// =============================================================================
// getCooldownRemaining Tests
// =============================================================================

describe('getCooldownRemaining', () => {
  it('returns 0 when not in cooldown', () => {
    const alert = createTestAlert({ lastTriggeredAt: undefined });
    expect(getCooldownRemaining(alert)).toBe(0);
  });

  it('returns correct remaining seconds', () => {
    const now = createTestDate('2024-01-15T12:03:00.000Z'); // 3 minutes after
    const alert = createTestAlert({
      lastTriggeredAt: '2024-01-15T12:00:00.000Z',
      cooldownMinutes: 5,
    });
    // 5 minutes = 300 seconds, 3 minutes elapsed = 180 seconds, remaining = 120 seconds
    expect(getCooldownRemaining(alert, now)).toBe(120);
  });

  it('returns 0 when cooldown has expired', () => {
    const now = createTestDate('2024-01-15T12:10:00.000Z'); // 10 minutes after
    const alert = createTestAlert({
      lastTriggeredAt: '2024-01-15T12:00:00.000Z',
      cooldownMinutes: 5,
    });
    expect(getCooldownRemaining(alert, now)).toBe(0);
  });
});

// =============================================================================
// evaluateAlert Tests
// =============================================================================

describe('evaluateAlert', () => {
  it('skips disabled alerts', () => {
    const alert = createTestAlert({ enabled: false, previousValue: 0.3 });
    const signal: SignalSnapshot = { type: 'composite', value: 0.6 };

    const result = evaluateAlert(alert, signal);

    expect(result.trigger).toBeNull();
    expect(result.updatedAlert).toEqual(alert); // Unchanged
  });

  it('skips alerts for wrong signal type', () => {
    const alert = createTestAlert({ signalType: 'rate', previousValue: 0.3 });
    const signal: SignalSnapshot = { type: 'composite', value: 0.6 };

    const result = evaluateAlert(alert, signal);

    expect(result.trigger).toBeNull();
    expect(result.updatedAlert).toEqual(alert); // Unchanged
  });

  it('triggers when condition is met', () => {
    const now = createTestDate();
    const alert = createTestAlert({
      condition: 'crosses_above',
      threshold: 0.5,
      previousValue: 0.3, // Below threshold
    });
    const signal: SignalSnapshot = { type: 'composite', value: 0.6 }; // Above threshold

    const result = evaluateAlert(alert, signal, now);

    expect(result.trigger).not.toBeNull();
    expect(result.trigger?.alertId).toBe(alert.id);
    expect(result.trigger?.previousValue).toBe(0.3);
    expect(result.trigger?.currentValue).toBe(0.6);
    expect(result.trigger?.condition).toBe('crosses_above');
    expect(result.updatedAlert.lastTriggeredAt).toBe(now.toISOString());
    expect(result.updatedAlert.previousValue).toBe(0.6);
  });

  it('does not trigger when condition is not met', () => {
    const alert = createTestAlert({
      condition: 'crosses_above',
      threshold: 0.5,
      previousValue: 0.3, // Below threshold
    });
    const signal: SignalSnapshot = { type: 'composite', value: 0.4 }; // Still below

    const result = evaluateAlert(alert, signal);

    expect(result.trigger).toBeNull();
    expect(result.updatedAlert.previousValue).toBe(0.4); // Updated
    expect(result.updatedAlert.lastTriggeredAt).toBeUndefined(); // Not triggered
  });

  it('blocks trigger during cooldown', () => {
    const now = createTestDate('2024-01-15T12:02:00.000Z'); // 2 minutes after last trigger
    const alert = createTestAlert({
      condition: 'crosses_above',
      threshold: 0.5,
      previousValue: 0.3,
      lastTriggeredAt: '2024-01-15T12:00:00.000Z',
      cooldownMinutes: 5,
    });
    const signal: SignalSnapshot = { type: 'composite', value: 0.6 };

    const result = evaluateAlert(alert, signal, now);

    expect(result.trigger).toBeNull();
    expect(result.updatedAlert.previousValue).toBe(0.6); // Still updated
    expect(result.updatedAlert.lastTriggeredAt).toBe('2024-01-15T12:00:00.000Z'); // Unchanged
  });

  it('triggers after cooldown expires', () => {
    const now = createTestDate('2024-01-15T12:10:00.000Z'); // 10 minutes after last trigger
    const alert = createTestAlert({
      condition: 'crosses_above',
      threshold: 0.5,
      previousValue: 0.3,
      lastTriggeredAt: '2024-01-15T12:00:00.000Z',
      cooldownMinutes: 5,
    });
    const signal: SignalSnapshot = { type: 'composite', value: 0.6 };

    const result = evaluateAlert(alert, signal, now);

    expect(result.trigger).not.toBeNull();
    expect(result.updatedAlert.lastTriggeredAt).toBe(now.toISOString());
  });

  it('does not trigger on first evaluation (no previous value)', () => {
    const alert = createTestAlert({
      condition: 'crosses_above',
      threshold: 0.5,
      previousValue: undefined, // No previous value
    });
    const signal: SignalSnapshot = { type: 'composite', value: 0.6 };

    const result = evaluateAlert(alert, signal);

    expect(result.trigger).toBeNull();
    expect(result.updatedAlert.previousValue).toBe(0.6); // Now has previous value
  });
});

// =============================================================================
// evaluateAllAlerts Tests
// =============================================================================

describe('evaluateAllAlerts', () => {
  it('evaluates multiple alerts', () => {
    const now = createTestDate();
    const alerts = [
      createTestAlert({
        id: 'alert-1',
        signalType: 'composite',
        threshold: 0.5,
        previousValue: 0.3,
      }),
      createTestAlert({
        id: 'alert-2',
        signalType: 'rate',
        threshold: 0.3,
        previousValue: 0.2,
      }),
    ];
    const signals = {
      composite: 0.6, // Triggers alert-1
      rate: 0.4, // Triggers alert-2
    };

    const result = evaluateAllAlerts(alerts, signals, now);

    expect(result.triggers).toHaveLength(2);
    expect(result.updatedAlerts).toHaveLength(2);
    expect(result.triggers.find((t) => t.alertId === 'alert-1')).toBeDefined();
    expect(result.triggers.find((t) => t.alertId === 'alert-2')).toBeDefined();
  });

  it('handles missing signal types', () => {
    const alerts = [
      createTestAlert({
        id: 'alert-1',
        signalType: 'composite',
        previousValue: 0.3,
      }),
      createTestAlert({
        id: 'alert-2',
        signalType: 'volatility', // No signal provided
        previousValue: 0.3,
      }),
    ];
    const signals = {
      composite: 0.6,
      // volatility not provided
    };

    const result = evaluateAllAlerts(alerts, signals);

    // Only composite alert should be evaluated and trigger
    expect(result.triggers).toHaveLength(1);
    expect(result.triggers[0].signalType).toBe('composite');
    // volatility alert should be included but unchanged
    expect(result.updatedAlerts).toHaveLength(2);
  });

  it('returns empty triggers when no conditions met', () => {
    const alerts = [
      createTestAlert({
        id: 'alert-1',
        threshold: 0.5,
        previousValue: 0.3,
      }),
    ];
    const signals = { composite: 0.4 }; // Below threshold

    const result = evaluateAllAlerts(alerts, signals);

    expect(result.triggers).toHaveLength(0);
    expect(result.updatedAlerts).toHaveLength(1);
    expect(result.updatedAlerts[0].previousValue).toBe(0.4);
  });

  it('handles empty alerts array', () => {
    const result = evaluateAllAlerts([], { composite: 0.6 });

    expect(result.triggers).toHaveLength(0);
    expect(result.updatedAlerts).toHaveLength(0);
  });

  it('handles empty signals object', () => {
    const alerts = [createTestAlert({ previousValue: 0.3 })];
    const result = evaluateAllAlerts(alerts, {});

    expect(result.triggers).toHaveLength(0);
    expect(result.updatedAlerts).toHaveLength(1);
    expect(result.updatedAlerts[0].previousValue).toBe(0.3); // Unchanged
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('edge cases', () => {
  it('handles negative thresholds', () => {
    const alert = createTestAlert({
      condition: 'crosses_below',
      threshold: -0.3,
      previousValue: -0.2, // Above threshold
    });
    const signal: SignalSnapshot = { type: 'composite', value: -0.4 }; // Below threshold

    const result = evaluateAlert(alert, signal);

    expect(result.trigger).not.toBeNull();
  });

  it('handles extreme values', () => {
    const alert = createTestAlert({
      condition: 'crosses_above',
      threshold: 0.99,
      previousValue: 0.98,
    });
    const signal: SignalSnapshot = { type: 'composite', value: 1.0 };

    const result = evaluateAlert(alert, signal);

    expect(result.trigger).not.toBeNull();
  });

  it('handles zero threshold', () => {
    const alert = createTestAlert({
      condition: 'crosses_above',
      threshold: 0,
      previousValue: -0.1,
    });
    const signal: SignalSnapshot = { type: 'composite', value: 0.1 };

    const result = evaluateAlert(alert, signal);

    expect(result.trigger).not.toBeNull();
  });

  it('preserves alert properties through evaluation', () => {
    const alert = createTestAlert({
      id: 'unique-id-123',
      signalType: 'credit',
      cooldownMinutes: 15,
      createdAt: '2024-01-01T00:00:00.000Z',
      previousValue: 0.3,
    });
    const signal: SignalSnapshot = { type: 'credit', value: 0.6 };

    const result = evaluateAlert(alert, signal);

    expect(result.updatedAlert.id).toBe('unique-id-123');
    expect(result.updatedAlert.signalType).toBe('credit');
    expect(result.updatedAlert.cooldownMinutes).toBe(15);
    expect(result.updatedAlert.createdAt).toBe('2024-01-01T00:00:00.000Z');
  });
});
