/**
 * Professional AI Agent Package
 *
 * Aggregates and re-exports all functionality from:
 * - @mariozechner/pi-agent-core
 * - @mariozechner/pi-coding-agent
 * - @mariozechner/pi-ai
 * - @mariozechner/pi-tui (types only)
 *
 * Provides a unified API for building coding assistants with event-driven architecture.
 */

// Re-export everything from pi-coding-agent (high-level API)
export * from "@mariozechner/pi-coding-agent";

// Re-export core abstractions under a namespace to avoid name conflicts
export * as Core from "@mariozechner/pi-agent-core";

// Re-export AI utilities (image handling, model capabilities)
export * from "@mariozechner/pi-ai";

// Export TUI component types for compatibility (no implementation)
export type { Component, Focusable } from "@mariozechner/pi-tui";

// Our extensions
export { createEventBus, type EventBus } from "@mariozechner/pi-coding-agent";
export { EventSubscriber } from "./bus.js";
export { createAgent, createSimpleAgent, type Agent, type AgentConfig } from "./factory.js";
