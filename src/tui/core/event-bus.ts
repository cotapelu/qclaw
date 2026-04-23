import type { TUEvent, TUEventHandler } from "../types/events.js";

/**
 * Simple event bus for intra-module communication.
 * Components can subscribe to events without knowing about each other.
 */
export class EventBus {
  private listeners: Map<string, Set<TUEventHandler>> = new Map();
  private onceListeners: Map<string, Set<TUEventHandler>> = new Map();

  /**
   * Subscribe to events of a specific type
   */
  on<T = any>(eventType: string, handler: TUEventHandler<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler as TUEventHandler);

    // Return unsubscribe function
    return () => this.off(eventType, handler);
  }

  /**
   * Subscribe to an event only once
   */
  once<T = any>(eventType: string, handler: TUEventHandler<T>): void {
    if (!this.onceListeners.has(eventType)) {
      this.onceListeners.set(eventType, new Set());
    }
    this.onceListeners.get(eventType)!.add(handler as TUEventHandler);
  }

  /**
   * Unsubscribe from an event
   */
  off<T = any>(eventType: string, handler: TUEventHandler<T>): void {
    this.listeners.get(eventType)?.delete(handler as TUEventHandler);
    this.onceListeners.get(eventType)?.delete(handler as TUEventHandler);
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T = any>(event: TUEvent<T>): void {
    const { type } = event;

    // Regular listeners
    this.listeners.get(type)?.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in event handler for "${type}":`, error);
      }
    });

    // Once listeners (only called once then removed)
    const onceHandlers = this.onceListeners.get(type);
    if (onceHandlers) {
      onceHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in once handler for "${type}":`, error);
        }
      });
      this.onceListeners.delete(type);
    }
  }

  /**
   * Emit an event with simplified payload (auto-wraps in TUEvent)
   */
  emitSimple<T = any>(type: string, payload?: T): void {
    this.emit<T>({
      type,
      payload,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove all listeners for a specific event type, or all listeners if no type given
   */
  clear(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
      this.onceListeners.delete(eventType);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  /**
   * Get listener count for an event type (debugging)
   */
  listenerCount(eventType: string): number {
    return (this.listeners.get(eventType)?.size || 0) + (this.onceListeners.get(eventType)?.size || 0);
  }
}

// Global singleton event bus for the TUI module
let globalEventBus: EventBus | null = null;

export function getGlobalEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}

export function resetGlobalEventBus(): void {
  globalEventBus = null;
}
