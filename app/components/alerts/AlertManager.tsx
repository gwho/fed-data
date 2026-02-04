'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, Trash2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

/**
 * Alert configuration from API
 */
interface AlertConfig {
  id: string;
  signalType: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  createdAt: string;
  cooldownMinutes: number;
  lastTriggeredAt?: string;
  previousValue?: number;
}

/**
 * Alert trigger event
 */
interface AlertTrigger {
  alertId: string;
  signalType: string;
  previousValue: number;
  currentValue: number;
  threshold: number;
  condition: string;
  triggeredAt: string;
  acknowledged: boolean;
}

/**
 * Response from /api/alerts/check
 */
interface AlertCheckResponse {
  triggered: AlertTrigger[];
  checked: number;
  timestamp: string;
}

/**
 * Signal types available for alerting
 */
const SIGNAL_TYPES = [
  { value: 'composite', label: 'Composite' },
  { value: 'rate', label: 'Rate' },
  { value: 'volatility', label: 'Volatility' },
  { value: 'credit', label: 'Credit' },
  { value: 'housing', label: 'Housing' },
];

/**
 * Alert conditions (edge-triggered)
 */
const CONDITIONS = [
  { value: 'crosses_above', label: 'Crosses Above' },
  { value: 'crosses_below', label: 'Crosses Below' },
  { value: 'any_change', label: 'Any Change' },
];

/**
 * Format condition for display
 */
function formatCondition(condition: string): string {
  return condition.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format timestamp for display
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Check if alert is in cooldown
 */
function isInCooldown(alert: AlertConfig): boolean {
  if (!alert.lastTriggeredAt) return false;
  const lastTrigger = new Date(alert.lastTriggeredAt);
  const cooldownMs = alert.cooldownMinutes * 60 * 1000;
  const cooldownEnd = new Date(lastTrigger.getTime() + cooldownMs);
  return new Date() < cooldownEnd;
}

/**
 * AlertManager Component
 *
 * Manages trading signal alerts with:
 * - Create/delete alerts
 * - Frontend polling for triggers
 * - Display triggered alerts
 * - Cooldown status
 */
export function AlertManager() {
  // Alert configurations
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);

  // Recent triggers
  const [triggers, setTriggers] = useState<AlertTrigger[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Polling state
  const [polling, setPolling] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  // New alert form
  const [newAlert, setNewAlert] = useState({
    signalType: 'composite',
    condition: 'crosses_above',
    threshold: 0.5,
    cooldownMinutes: 5,
  });

  // Error state
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all alerts from API
   */
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      if (!res.ok) throw new Error('Failed to fetch alerts');
      const data = await res.json();
      setAlerts(data.alerts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check alerts for triggers (polling)
   */
  const checkAlerts = useCallback(async () => {
    if (alerts.length === 0) return;

    try {
      const res = await fetch('/api/alerts/check');
      if (!res.ok) throw new Error('Failed to check alerts');
      const data: AlertCheckResponse = await res.json();

      // Update last check time
      setLastCheck(data.timestamp);

      // Add new triggers to the list
      if (data.triggered.length > 0) {
        setTriggers((prev) => [...data.triggered, ...prev].slice(0, 50)); // Keep last 50
      }

      // Refresh alerts to get updated state
      await fetchAlerts();
    } catch (err) {
      console.error('Alert check failed:', err);
    }
  }, [alerts.length, fetchAlerts]);

  /**
   * Create a new alert
   */
  const createAlert = async () => {
    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlert),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create alert');
      }

      const alert = await res.json();
      setAlerts((prev) => [...prev, alert]);

      // Reset form
      setNewAlert({
        signalType: 'composite',
        condition: 'crosses_above',
        threshold: 0.5,
        cooldownMinutes: 5,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alert');
    } finally {
      setCreating(false);
    }
  };

  /**
   * Delete an alert
   */
  const deleteAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete alert');
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete alert');
    }
  };

  /**
   * Toggle polling
   */
  const togglePolling = () => {
    setPolling((prev) => !prev);
  };

  /**
   * Acknowledge a trigger
   */
  const acknowledgeTrigger = (alertId: string, triggeredAt: string) => {
    setTriggers((prev) =>
      prev.map((t) =>
        t.alertId === alertId && t.triggeredAt === triggeredAt
          ? { ...t, acknowledged: true }
          : t
      )
    );
  };

  // Fetch alerts on mount
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Polling interval
  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(checkAlerts, 30000); // 30 seconds
    checkAlerts(); // Initial check

    return () => clearInterval(interval);
  }, [polling, checkAlerts]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-500" />
          Signal Alerts
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{alerts.length} alerts</span>
          <button
            onClick={togglePolling}
            className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${
              polling
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Clock className="w-3 h-3" />
            {polling ? 'Polling' : 'Paused'}
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Create Alert Form */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h3 className="font-medium text-gray-700">Create New Alert</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Signal</label>
            <select
              value={newAlert.signalType}
              onChange={(e) =>
                setNewAlert({ ...newAlert, signalType: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {SIGNAL_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Condition</label>
            <select
              value={newAlert.condition}
              onChange={(e) =>
                setNewAlert({ ...newAlert, condition: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {CONDITIONS.map((cond) => (
                <option key={cond.value} value={cond.value}>
                  {cond.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Threshold</label>
            <input
              type="number"
              value={newAlert.threshold}
              onChange={(e) =>
                setNewAlert({
                  ...newAlert,
                  threshold: parseFloat(e.target.value) || 0,
                })
              }
              min="-1"
              max="1"
              step="0.1"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Cooldown (min)
            </label>
            <input
              type="number"
              value={newAlert.cooldownMinutes}
              onChange={(e) =>
                setNewAlert({
                  ...newAlert,
                  cooldownMinutes: parseInt(e.target.value) || 5,
                })
              }
              min="1"
              max="1440"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          onClick={createAlert}
          disabled={creating}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm flex items-center gap-1 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {creating ? 'Creating...' : 'Create Alert'}
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-700">Active Alerts</h3>
        {alerts.length === 0 ? (
          <p className="text-gray-500 text-sm">No alerts configured.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const inCooldown = isInCooldown(alert);
              return (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-3 flex items-center justify-between ${
                    inCooldown ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-medium capitalize">
                        {alert.signalType}
                      </span>
                      <span className="text-gray-500 mx-2">
                        {formatCondition(alert.condition)}
                      </span>
                      <span className="text-blue-600 font-mono">
                        {alert.threshold.toFixed(2)}
                      </span>
                    </div>
                    {inCooldown && (
                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                        Cooldown
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                    title="Delete alert"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Triggers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-700">Recent Triggers</h3>
          {lastCheck && (
            <span className="text-xs text-gray-400">
              Last check: {formatTime(lastCheck)}
            </span>
          )}
        </div>
        {triggers.length === 0 ? (
          <p className="text-gray-500 text-sm">No alerts triggered yet.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {triggers.map((trigger, idx) => (
              <div
                key={`${trigger.alertId}-${trigger.triggeredAt}-${idx}`}
                className={`border rounded-lg p-3 ${
                  trigger.acknowledged
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-orange-300 bg-orange-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        trigger.acknowledged ? 'text-gray-400' : 'text-orange-500'
                      }`}
                    />
                    <span className="font-medium capitalize">
                      {trigger.signalType}
                    </span>
                    <span className="text-gray-500">
                      {formatCondition(trigger.condition)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTime(trigger.triggeredAt)}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  <span className="font-mono">
                    {trigger.previousValue.toFixed(3)}
                  </span>
                  <span className="mx-1">→</span>
                  <span className="font-mono font-medium">
                    {trigger.currentValue.toFixed(3)}
                  </span>
                  <span className="text-gray-400 ml-2">
                    (threshold: {trigger.threshold.toFixed(2)})
                  </span>
                </div>
                {!trigger.acknowledged && (
                  <button
                    onClick={() =>
                      acknowledgeTrigger(trigger.alertId, trigger.triggeredAt)
                    }
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Acknowledge
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AlertManager;
