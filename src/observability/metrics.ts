import * as client from 'prom-client';

// Singleton registry
let registry: client.Registry | null = null;

// Metric instances
export let agentRequestsTotal: client.Counter<string> | null = null;
export let agentErrorsTotal: client.Counter<string> | null = null;
export let toolCallsTotal: client.Counter<string> | null = null;
export let sessionDurationSeconds: client.Histogram<string> | null = null;
export let tokenUsageTotal: client.Gauge<string> | null = null;
export let modelRequestsTotal: client.Counter<string> | null = null;

export function initMetrics(): void {
  if (registry) return;

  registry = new client.Registry();

  agentRequestsTotal = new client.Counter({
    name: 'qclaw_requests_total',
    help: 'Total number of requests processed by the agent',
    labelNames: ['method', 'status'],
  });
  (agentRequestsTotal as any).registers = [registry];

  agentErrorsTotal = new client.Counter({
    name: 'qclaw_errors_total',
    help: 'Total number of errors encountered',
    labelNames: ['type', 'component'],
  });
  (agentErrorsTotal as any).registers = [registry];

  toolCallsTotal = new client.Counter({
    name: 'qclaw_tool_calls_total',
    help: 'Total number of tool executions',
    labelNames: ['tool_name'],
  });
  (toolCallsTotal as any).registers = [registry];

  sessionDurationSeconds = new client.Histogram({
    name: 'qclaw_session_duration_seconds',
    help: 'Duration of agent sessions in seconds',
    labelNames: ['status'],
    // @ts-ignore
    buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  });
  (sessionDurationSeconds as any).registers = [registry];

  tokenUsageTotal = new client.Gauge({
    name: 'qclaw_tokens_total',
    help: 'Current token usage',
    labelNames: ['type'],
  });
  (tokenUsageTotal as any).registers = [registry];

  modelRequestsTotal = new client.Counter({
    name: 'qclaw_model_requests_total',
    help: 'Number of requests to LLM models',
    labelNames: ['provider', 'model_id'],
  });
  (modelRequestsTotal as any).registers = [registry];

  // Default Node.js metrics
  client.collectDefaultMetrics({ register: registry });
}

export async function getMetricsString(): Promise<string> {
  if (!registry) return '# Metrics not initialized';
  return await registry.metrics();
}

export function resetMetrics(): void {
  registry?.resetMetrics();
}

// Helper to increment counters safely
export function incRequest(method: string, status: string = 'success'): void {
  agentRequestsTotal?.inc({ method, status } as any);
}

export function incError(type: string, component: string): void {
  agentErrorsTotal?.inc({ type, component } as any);
}

export function incToolCall(toolName: string): void {
  toolCallsTotal?.inc({ tool_name: toolName } as any);
}

export function observeSession(status: string, seconds: number): void {
  if (sessionDurationSeconds) {
    // @ts-ignore
    sessionDurationSeconds.observe(seconds, { status } as any);
  }
}

export function setTokens(type: 'prompt' | 'completion' | 'total', count: number): void {
  if (tokenUsageTotal) {
    // @ts-ignore
    tokenUsageTotal.set(count, { type } as any);
  }
}

export function incModelRequest(provider: string, modelId: string): void {
  modelRequestsTotal?.inc({ provider, model_id: modelId } as any);
}
