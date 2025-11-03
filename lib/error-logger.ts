/**
 * Centralized Error Logging and Monitoring
 * Tracks errors, performance issues, and system health
 */

export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface ErrorLog {
  id: string;
  timestamp: Date;
  severity: ErrorSeverity;
  category: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  contactId?: string;
  resolved: boolean;
}

// In-memory error store (use database in production)
const errorLogs: ErrorLog[] = [];
const maxLogs = 1000;

/**
 * Log an error with context
 */
export function logError(
  error: Error | string,
  category: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context?: Record<string, any>
): void {
  const errorLog: ErrorLog = {
    id: generateId(),
    timestamp: new Date(),
    severity,
    category,
    message: typeof error === "string" ? error : error.message,
    stack: typeof error === "string" ? undefined : error.stack,
    context,
    userId: context?.userId,
    contactId: context?.contactId,
    resolved: false,
  };

  errorLogs.unshift(errorLog);

  // Trim to max size
  if (errorLogs.length > maxLogs) {
    errorLogs.splice(maxLogs);
  }

  // Console log for development
  console.error(`[${severity}] ${category}:`, errorLog.message, context);

  // Critical errors should alert admins
  if (severity === ErrorSeverity.CRITICAL) {
    alertAdmins(errorLog);
  }
}

/**
 * Get recent error logs
 */
export function getErrorLogs(
  filters?: {
    severity?: ErrorSeverity;
    category?: string;
    resolvedOnly?: boolean;
    limit?: number;
  }
): ErrorLog[] {
  let filtered = errorLogs;

  if (filters?.severity) {
    filtered = filtered.filter((log) => log.severity === filters.severity);
  }

  if (filters?.category) {
    filtered = filtered.filter((log) => log.category === filters.category);
  }

  if (filters?.resolvedOnly !== undefined) {
    filtered = filtered.filter((log) => log.resolved === filters.resolvedOnly);
  }

  const limit = filters?.limit || 100;
  return filtered.slice(0, limit);
}

/**
 * Mark error as resolved
 */
export function resolveError(errorId: string): boolean {
  const error = errorLogs.find((log) => log.id === errorId);
  if (error) {
    error.resolved = true;
    return true;
  }
  return false;
}

/**
 * Get error statistics
 */
export function getErrorStats(): {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byCategory: Record<string, number>;
  unresolved: number;
} {
  const stats = {
    total: errorLogs.length,
    bySeverity: {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    },
    byCategory: {} as Record<string, number>,
    unresolved: 0,
  };

  for (const log of errorLogs) {
    stats.bySeverity[log.severity]++;
    stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    if (!log.resolved) {
      stats.unresolved++;
    }
  }

  return stats;
}

/**
 * Alert admins about critical errors
 */
async function alertAdmins(error: ErrorLog): Promise<void> {
  console.error("🚨 CRITICAL ERROR ALERT:", error);

  // Send admin notification via API endpoint
  try {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "CRITICAL_ERROR",
        title: `Critical Error: ${error.category}`,
        message: `${error.message}\n\nContext: ${JSON.stringify(error.context)}`,
        severity: "HIGH",
      }),
    });
  } catch (notifyError) {
    console.error("Failed to send admin alert:", notifyError);
  }
}


/**
 * Generate unique ID
 */
function generateId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Performance monitoring
 */
interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
}

const performanceMetrics: PerformanceMetric[] = [];
const maxMetrics = 1000;

/**
 * Track operation performance
 */
export async function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  let success = true;

  try {
    const result = await fn();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = Date.now() - start;

    performanceMetrics.unshift({
      operation,
      duration,
      timestamp: new Date(),
      success,
    });

    if (performanceMetrics.length > maxMetrics) {
      performanceMetrics.splice(maxMetrics);
    }

    // Warn on slow operations (>2 seconds)
    if (duration > 2000) {
      console.warn(`⚠️ Slow operation: ${operation} took ${duration}ms`);
    }
  }
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(operation?: string): {
  count: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  successRate: number;
} {
  let metrics = performanceMetrics;

  if (operation) {
    metrics = metrics.filter((m) => m.operation === operation);
  }

  if (metrics.length === 0) {
    return {
      count: 0,
      avgDuration: 0,
      maxDuration: 0,
      minDuration: 0,
      successRate: 0,
    };
  }

  const durations = metrics.map((m) => m.duration);
  const successes = metrics.filter((m) => m.success).length;

  return {
    count: metrics.length,
    avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    maxDuration: Math.max(...durations),
    minDuration: Math.min(...durations),
    successRate: (successes / metrics.length) * 100,
  };
}
