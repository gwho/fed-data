/**
 * Alerts API Route
 *
 * CRUD operations for managing signal alerts.
 *
 * Endpoints:
 * - GET /api/alerts - List all alerts
 * - POST /api/alerts - Create a new alert
 * - DELETE /api/alerts?id=<uuid> - Delete an alert
 *
 * @see app/lib/schemas/alerts.ts for type definitions
 * @see app/api/alerts/check/route.ts for alert evaluation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  AlertConfig,
  AlertConfigSchema,
  CreateAlertSchema,
  AlertsListResponseSchema,
} from '@/app/lib/schemas/alerts';

// =============================================================================
// In-Memory Alert Store
// =============================================================================

/**
 * Alert storage (in-memory for now, replace with database in production)
 *
 * This is a simple Map-based store. In production, you'd use:
 * - PostgreSQL with Prisma
 * - Redis for fast lookups
 * - Or a dedicated time-series database
 */
class AlertStore {
  private alerts: Map<string, AlertConfig> = new Map();

  getAll(): AlertConfig[] {
    return Array.from(this.alerts.values());
  }

  get(id: string): AlertConfig | undefined {
    return this.alerts.get(id);
  }

  set(id: string, alert: AlertConfig): void {
    this.alerts.set(id, alert);
  }

  delete(id: string): boolean {
    return this.alerts.delete(id);
  }

  count(): number {
    return this.alerts.size;
  }
}

// Singleton store instance (shared across requests)
export const alertStore = new AlertStore();

// =============================================================================
// GET /api/alerts - List All Alerts
// =============================================================================

/**
 * List all configured alerts
 *
 * @returns AlertsListResponse with all alerts and count
 */
export async function GET(): Promise<NextResponse> {
  try {
    const alerts = alertStore.getAll();

    const response = AlertsListResponseSchema.parse({
      alerts,
      count: alerts.length,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to list alerts:', error);
    return NextResponse.json(
      { error: 'Failed to list alerts' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/alerts - Create Alert
// =============================================================================

/**
 * Create a new alert
 *
 * Request body:
 * {
 *   signalType: 'composite' | 'rate' | 'volatility' | 'credit' | 'housing',
 *   condition: 'crosses_above' | 'crosses_below' | 'any_change',
 *   threshold: number (-1 to 1),
 *   enabled?: boolean (default: true),
 *   cooldownMinutes?: number (default: 5, max: 1440)
 * }
 *
 * @returns Created AlertConfig with generated id and createdAt
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate request body
    const validated = CreateAlertSchema.parse(body);

    // Create full alert config with generated fields
    const alert: AlertConfig = AlertConfigSchema.parse({
      ...validated,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    });

    // Store the alert
    alertStore.set(alert.id, alert);

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid alert configuration',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Failed to create alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/alerts?id=<uuid> - Delete Alert
// =============================================================================

/**
 * Delete an alert by ID
 *
 * Query params:
 * - id: UUID of alert to delete
 *
 * @returns Success message or error
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidResult = z.string().uuid().safeParse(id);
    if (!uuidResult.success) {
      return NextResponse.json(
        { error: 'Invalid alert ID format' },
        { status: 400 }
      );
    }

    // Check if alert exists
    const alert = alertStore.get(id);
    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Delete the alert
    alertStore.delete(id);

    return NextResponse.json({
      success: true,
      message: `Alert ${id} deleted`,
    });
  } catch (error) {
    console.error('Failed to delete alert:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/alerts?id=<uuid> - Update Alert
// =============================================================================

/**
 * Update an existing alert
 *
 * Query params:
 * - id: UUID of alert to update
 *
 * Request body: Partial alert config (only fields to update)
 *
 * @returns Updated AlertConfig
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidResult = z.string().uuid().safeParse(id);
    if (!uuidResult.success) {
      return NextResponse.json(
        { error: 'Invalid alert ID format' },
        { status: 400 }
      );
    }

    // Check if alert exists
    const existingAlert = alertStore.get(id);
    if (!existingAlert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Only allow updating certain fields
    const updateSchema = z.object({
      enabled: z.boolean().optional(),
      threshold: z.number().min(-1).max(1).optional(),
      cooldownMinutes: z.number().int().min(1).max(1440).optional(),
    });

    const updates = updateSchema.parse(body);

    // Merge updates with existing alert
    const updatedAlert: AlertConfig = {
      ...existingAlert,
      ...updates,
    };

    // Validate the full alert
    AlertConfigSchema.parse(updatedAlert);

    // Store the updated alert
    alertStore.set(id, updatedAlert);

    return NextResponse.json(updatedAlert);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Failed to update alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}
