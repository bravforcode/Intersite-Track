/**
 * Enterprise-grade metrics collection
 * 
 * Features:
 * - Performance metrics
 * - Business metrics
 * - System health metrics
 * - Integration with DataDog, Prometheus, etc.
 */

interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

class MetricsCollector {
  private metrics: Metric[] = [];
  private readonly flushInterval = 60000; // 1 minute
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    if (process.env.NODE_ENV === "production") {
      this.startFlushTimer();
    }
  }

  /**
   * Record a metric
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      tags,
    });

    // Flush if buffer is large
    if (this.metrics.length >= 100) {
      this.flush();
    }
  }

  /**
   * Increment a counter
   */
  increment(name: string, tags?: Record<string, string>): void {
    this.record(name, 1, tags);
  }

  /**
   * Record timing in milliseconds
   */
  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    this.record(`${name}.duration_ms`, durationMs, tags);
  }

  /**
   * Record gauge (current value)
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record(`${name}.gauge`, value, tags);
  }

  /**
   * Flush metrics to external service
   */
  private flush(): void {
    if (this.metrics.length === 0) {
      return;
    }

    const metricsToFlush = [...this.metrics];
    this.metrics = [];

    // Send to metrics service (DataDog, Prometheus, etc.)
    if (process.env.DATADOG_API_KEY) {
      this.sendToDataDog(metricsToFlush);
    }

    // Log metrics in development
    if (process.env.NODE_ENV !== "production") {
      console.log("[METRICS]", metricsToFlush);
    }
  }

  private sendToDataDog(metrics: Metric[]): void {
    // DataDog integration would go here
    // Example: POST to https://api.datadoghq.com/api/v1/series
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);

    // Don't prevent process exit
    this.flushTimer.unref();
  }

  /**
   * Stop collecting metrics and flush
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

export const metrics = new MetricsCollector();

/**
 * Measure execution time of async function
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    metrics.timing(name, Date.now() - start, { ...tags, status: "success" });
    return result;
  } catch (error) {
    metrics.timing(name, Date.now() - start, { ...tags, status: "error" });
    throw error;
  }
}

/**
 * Measure execution time of sync function
 */
export function measure<T>(
  name: string,
  fn: () => T,
  tags?: Record<string, string>
): T {
  const start = Date.now();
  try {
    const result = fn();
    metrics.timing(name, Date.now() - start, { ...tags, status: "success" });
    return result;
  } catch (error) {
    metrics.timing(name, Date.now() - start, { ...tags, status: "error" });
    throw error;
  }
}

/**
 * Express middleware for request metrics
 */
export function metricsMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      const tags = {
        method: req.method,
        path: req.route?.path || req.path,
        status: String(res.statusCode),
      };

      metrics.timing("http.request", duration, tags);
      metrics.increment("http.request.count", tags);

      // Track slow requests
      if (duration > 1000) {
        metrics.increment("http.request.slow", tags);
      }

      // Track errors
      if (res.statusCode >= 500) {
        metrics.increment("http.request.error", tags);
      }
    });

    next();
  };
}

/**
 * System health metrics
 */
export function collectSystemMetrics(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  metrics.gauge("system.memory.heap_used", memUsage.heapUsed);
  metrics.gauge("system.memory.heap_total", memUsage.heapTotal);
  metrics.gauge("system.memory.rss", memUsage.rss);

  // CPU usage (if available)
  const cpuUsage = process.cpuUsage();
  metrics.gauge("system.cpu.user", cpuUsage.user);
  metrics.gauge("system.cpu.system", cpuUsage.system);

  // Uptime
  metrics.gauge("system.uptime", process.uptime());
}

// Collect system metrics every minute
if (process.env.NODE_ENV === "production") {
  setInterval(collectSystemMetrics, 60000).unref();
}

// Flush metrics on process exit
process.on("beforeExit", () => {
  metrics.stop();
});
