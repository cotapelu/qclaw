import { register, Counter, Histogram, Gauge } from "prom-client";

/**
 * Prometheus metrics for the agent.
 * Centralized registry and metric definitions.
 */
export class MetricsRegistry {
  private initialized = false;

  // Agent metrics
  public readonly agentRunsTotal: Counter;
  public readonly agentErrorsTotal: Counter;
  public readonly agentDurationSeconds: Histogram;
  public readonly agentTurnsTotal: Counter;

  // Tool metrics
  public readonly toolCallsTotal: Counter;
  public readonly toolErrorsTotal: Counter;
  public readonly toolDurationSeconds: Histogram;
  public readonly toolResultsTotal: Counter;

  // Token metrics
  public readonly tokensTotal: Counter;
  public readonly tokensPerModel: Gauge;

  // Cost metrics
  public readonly costTotal: Counter;
  public readonly costPerModel: Gauge;

  // Session metrics
  public readonly sessionsActive: Gauge;
  public readonly sessionsCreatedTotal: Counter;
  public readonly sessionsDeletedTotal: Counter;

  // Compaction metrics
  public readonly compactionsTotal: Counter;
  public readonly entriesCompactedTotal: Counter;

  constructor() {
    // Define metrics
    this.agentRunsTotal = new Counter({
      name: "agent_runs_total",
      help: "Total number of agent runs",
      labelNames: ["model", "status"],
    });

    this.agentErrorsTotal = new Counter({
      name: "agent_errors_total",
      help: "Total number of agent errors",
      labelNames: ["error_type", "model"],
    });

    this.agentDurationSeconds = new Histogram({
      name: "agent_duration_seconds",
      help: "Duration of agent runs",
      labelNames: ["model"],
      buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60],
    });

    this.agentTurnsTotal = new Counter({
      name: "agent_turns_total",
      help: "Total number of turns",
      labelNames: ["model"],
    });

    this.toolCallsTotal = new Counter({
      name: "tool_calls_total",
      help: "Total number of tool calls",
      labelNames: ["tool_name", "status"],
    });

    this.toolErrorsTotal = new Counter({
      name: "tool_errors_total",
      help: "Total number of tool errors",
      labelNames: ["tool_name", "error_type"],
    });

    this.toolDurationSeconds = new Histogram({
      name: "tool_duration_seconds",
      help: "Duration of tool executions",
      labelNames: ["tool_name"],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10],
    });

    this.toolResultsTotal = new Counter({
      name: "tool_results_total",
      help: "Total number of tool results (success/failure)",
      labelNames: ["tool_name", "result_type"],
    });

    this.tokensTotal = new Counter({
      name: "tokens_total",
      help: "Total tokens used",
      labelNames: ["type"], // "input", "output", "total"
    });

    this.tokensPerModel = new Gauge({
      name: "tokens_per_model",
      help: "Current token count per model",
      labelNames: ["model", "type"],
    });

    this.costTotal = new Counter({
      name: "cost_total",
      help: "Total cost in USD",
      labelNames: ["model"],
    });

    this.costPerModel = new Gauge({
      name: "cost_per_model",
      help: "Current cost per model",
      labelNames: ["model"],
    });

    this.sessionsActive = new Gauge({
      name: "sessions_active",
      help: "Number of active sessions",
    });

    this.sessionsCreatedTotal = new Counter({
      name: "sessions_created_total",
      help: "Total sessions created",
    });

    this.sessionsDeletedTotal = new Counter({
      name: "sessions_deleted_total",
      help: "Total sessions deleted",
    });

    this.compactionsTotal = new Counter({
      name: "compactions_total",
      help: "Total number of compactions",
      labelNames: ["strategy"],
    });

    this.entriesCompactedTotal = new Counter({
      name: "entries_compacted_total",
      help: "Total number of entries removed by compaction",
      labelNames: ["strategy"],
    });
  }

  /**
   * Register all metrics with the global registry
   */
  registerMetrics(): void {
    if (this.initialized) return;
    register(
      this.agentRunsTotal,
      this.agentErrorsTotal,
      this.agentDurationSeconds,
      this.agentTurnsTotal,
      this.toolCallsTotal,
      this.toolErrorsTotal,
      this.toolDurationSeconds,
      this.toolResultsTotal,
      this.tokensTotal,
      this.tokensPerModel,
      this.costTotal,
      this.costPerModel,
      this.sessionsActive,
      this.sessionsCreatedTotal,
      this.sessionsDeletedTotal,
      this.compactionsTotal,
      this.entriesCompactedTotal
    );
    this.initialized = true;
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    // prom-client doesn't have a global reset, but we can clear registry
    // This is a simplified version
    const metrics = [
      this.agentRunsTotal,
      this.agentErrorsTotal,
      this.agentDurationSeconds,
      this.agentTurnsTotal,
      this.toolCallsTotal,
      this.toolErrorsTotal,
      this.toolDurationSeconds,
      this.toolResultsTotal,
      this.tokensTotal,
      this.tokensPerModel,
      this.costTotal,
      this.costPerModel,
      this.sessionsActive,
      this.sessionsCreatedTotal,
      this.sessionsDeletedTotal,
      this.compactionsTotal,
      this.entriesCompactedTotal,
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).clientMetrics?.reset && (global as any).clientMetrics.reset();
  }

  /**
   * Get all metric names (for debugging)
   */
  getMetricNames(): string[] {
    return register.getMetricsAsArray().map(m => m.name);
  }
}

// Global singleton
let globalMetrics: MetricsRegistry | null = null;

export function getMetrics(): MetricsRegistry {
  if (!globalMetrics) {
    globalMetrics = new MetricsRegistry();
    globalMetrics.registerMetrics();
  }
  return globalMetrics;
}

export function resetMetrics(): void {
  globalMetrics = null;
  register.clear();
}
