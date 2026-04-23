/**
 * Event Bus Adapter for Agent-TUI Communication
 *
 * This module provides a lightweight event bus abstraction that allows
 * the agent core to communicate with UI packages (like TUI) without
 * direct dependencies.
 *
 * Features:
 * - Type-safe event subscriptions
 * - Async event handling
 * - Event bubbling support
 * - Debug/tracing capabilities
 */

import { createEventBus, type EventBus, type EventBusController } from "@mariozechner/pi-coding-agent";

/**
 * Standardized event types for agent-to-UI communication.
 * These events are emitted by the agent and can be consumed by any UI package.
 */
export interface AgentLifecycleEvent {
  type: "agent:start" | "agent:stop" | "agent:error";
  timestamp: number;
  agentId: string;
  payload?: Record<string, unknown>;
}

export interface MessageEvent {
  type: "message:user" | "message:assistant" | "message:tool";
  timestamp: number;
  content: string;
  metadata?: Record<string, unknown>;
  messageId?: string;
}

export interface ToolCallEvent {
  type: "tool:call" | "tool:result";
  timestamp: number;
  toolName: string;
  callId: string;
  input?: unknown;
  result?: unknown;
  error?: string;
  durationMs?: number;
}

export interface ThinkingEvent {
  type: "thinking:start" | "thinking:update" | "thinking:end";
  timestamp: number;
  level?: "low" | "medium" | "high" | "xhigh" | "off";
  content?: string;
}

export interface TokenUsageEvent {
  type: "tokens:update";
  timestamp: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  contextPercent: number;
}

export interface ModelChangeEvent {
  type: "model:change";
  timestamp: number;
  modelId: string;
  provider: string;
  reasoning: boolean;
  thinkingLevel?: string;
}

export interface SessionEvent {
  type: "session:save" | "session:load" | "session:fork" | "session:compact";
  timestamp: number;
  sessionId?: string;
  cwd: string;
  reason?: string;
}

/**
 * Union type of all agent events
 */
export type AgentEvent =
  | AgentLifecycleEvent
  | MessageEvent
  | ToolCallEvent
  | ThinkingEvent
  | TokenUsageEvent
  | ModelChangeEvent
  | SessionEvent;

/**
 * Event handler function type
 */
export type EventHandler<T extends AgentEvent = AgentEvent> = (event: T) => void | Promise<void>;

/**
 * Event subscriber with automatic cleanup
 */
export class EventSubscriber {
  private bus: EventBus;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private unsubscribes: Map<string, Set<() => void>> = new Map();

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  /**
   * Subscribe to an event type
   * @returns Unsubscribe function
   */
  subscribe<T extends AgentEvent>(
    eventType: T["type"],
    handler: EventHandler<T>
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
      this.unsubscribes.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);

    // Subscribe to the underlying event bus
    const unsubscribe = this.bus.on(eventType, (data) => this.dispatch(eventType, data));
    this.unsubscribes.get(eventType)!.add(unsubscribe);

    return () => this.unsubscribe(eventType, handler);
  }

  /**
   * Unsubscribe from an event type
   */
  unsubscribe<T extends AgentEvent>(
    eventType: T["type"],
    handler: EventHandler<T>
  ): void {
    this.handlers.get(eventType)?.delete(handler as EventHandler);
    // Also unsubscribe from the bus if no handlers left
    const handlers = this.handlers.get(eventType);
    if (!handlers || handlers.size === 0) {
      const unsubs = this.unsubscribes.get(eventType);
      if (unsubs) {
        for (const unsubscribe of unsubs) {
          unsubscribe();
        }
        this.unsubscribes.delete(eventType);
      }
    }
  }

  /**
   * Unsubscribe all handlers
   */
  unsubscribeAll(): void {
    for (const unsubs of this.unsubscribes.values()) {
      for (const unsubscribe of unsubs) {
        unsubscribe();
      }
    }
    this.handlers.clear();
    this.unsubscribes.clear();
  }

  private dispatch(eventType: string, data: unknown): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data as AgentEvent);
        } catch (error) {
          console.error(`Event handler error for ${eventType}:`, error);
        }
      }
    }
  }
}

/**
 * Re-export the underlying event bus from coding-agent for advanced usage
 */
export { createEventBus, type EventBus as CodingAgentEventBus, type EventBusController };
