import type { TUEventHandler } from "../types/events.js";
import { getGlobalEventBus } from "./event-bus.js";

/**
 * Lifecycle states for TUI components
 */
export enum LifecycleState {
  INITIALIZED = 'initialized',
  STARTING = 'starting',
  STARTED = 'started',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  DESTROYING = 'destroying',
  DESTROYED = 'destroyed',
  ERROR = 'error',
}

/**
 * Lifecycle manager for TUI components.
 * Manages state transitions and emits lifecycle events.
 */
export class LifecycleManager {
  private state: LifecycleState = LifecycleState.INITIALIZED;
  private eventBus: ReturnType<typeof getGlobalEventBus>;
  private componentId: string;
  private error?: Error;

  constructor(componentId: string, eventBus?: ReturnType<typeof getGlobalEventBus>) {
    this.componentId = componentId;
    this.eventBus = eventBus || getGlobalEventBus();
  }

  getState(): LifecycleState {
    return this.state;
  }

  getError(): Error | undefined {
    return this.error;
  }

  /**
   * Check if component is in a running state
   */
  isRunning(): boolean {
    return this.state === LifecycleState.STARTED;
  }

  /**
   * Check if component is stopped/destroyed
   */
  isStopped(): boolean {
    return this.state === LifecycleState.STOPPED || this.state === LifecycleState.DESTROYED;
  }

  /**
   * Transition to a new state (private, use public methods)
   */
  private transition(newState: LifecycleState): void {
    const oldState = this.state;
    this.state = newState;
    this.eventBus.emitSimple('lifecycle.transition', {
      componentId: this.componentId,
      from: oldState,
      to: newState,
    });
  }

  /**
   * Initialize the component (called after construction)
   */
  async initialize(): Promise<void> {
    if (this.state !== LifecycleState.INITIALIZED) {
      throw new Error(`Cannot initialize: invalid state ${this.state}`);
    }
    this.transition(LifecycleState.STARTING);
    try {
      await this.onInitialize();
      this.transition(LifecycleState.STARTED);
    } catch (error) {
      this.error = error as Error;
      this.transition(LifecycleState.ERROR);
      throw error;
    }
  }

  /**
   * Start the component (alias for initialize, for backward compatibility)
   */
  async start(): Promise<void> {
    return this.initialize();
  }

  /**
   * Stop the component gracefully
   */
  async stop(): Promise<void> {
    if (this.state !== LifecycleState.STARTED && this.state !== LifecycleState.ERROR) {
      throw new Error(`Cannot stop: invalid state ${this.state}`);
    }
    this.transition(LifecycleState.STOPPING);
    try {
      await this.onStop();
      this.transition(LifecycleState.STOPPED);
    } catch (error) {
      this.error = error as Error;
      this.transition(LifecycleState.ERROR);
      throw error;
    }
  }

  /**
   * Destroy the component completely
   */
  async destroy(): Promise<void> {
    if (this.state === LifecycleState.DESTROYED) return;

    if (this.isRunning()) {
      await this.stop();
    }

    this.transition(LifecycleState.DESTROYING);
    try {
      await this.onDestroy();
      this.transition(LifecycleState.DESTROYED);
    } catch (error) {
      this.error = error as Error;
      this.transition(LifecycleState.ERROR);
      throw error;
    }
  }

  /**
   * Override these methods in subclasses
   */
  protected onInitialize(): Promise<void> {
    return Promise.resolve();
  }

  protected onStop(): Promise<void> {
    return Promise.resolve();
  }

  protected onDestroy(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Add event listener for lifecycle events of this component
   */
  onLifecycleEvent(handler: TUEventHandler<{ from: LifecycleState; to: LifecycleState }>): () => void {
    return this.eventBus.on('lifecycle.transition', (event) => {
      if (event.payload?.componentId === this.componentId) {
        handler(event);
      }
    });
  }
}

/**
 * Mixin helper to add lifecycle management to any class
 */
export function withLifecycle<T extends new (...args: any[]) => any>(
  Base: T,
  lifecycleIdProp: string = 'componentId'
) {
  return class extends Base {
    private _lifecycle?: LifecycleManager;

    get lifecycle(): LifecycleManager {
      if (!this._lifecycle) {
        const id = (this as any)[lifecycleIdProp] || `${Base.name}-${Math.random().toString(36).slice(2)}`;
        this._lifecycle = new LifecycleManager(id);
      }
      return this._lifecycle;
    }

    async start(): Promise<void> {
      return this.lifecycle.start();
    }

    async stop(): Promise<void> {
      return this.lifecycle.stop();
    }

    async destroy(): Promise<void> {
      return this.lifecycle.destroy();
    }

    isRunning(): boolean {
      return this._lifecycle?.isRunning() ?? false;
    }
  };
}
