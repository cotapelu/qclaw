import type { AgentSession, AgentSessionConfig, CreateAgentSessionOptions } from "@mariozechner/pi-coding-agent";
import { createAgentSession } from "@mariozechner/pi-coding-agent";
import { EventBus, LifecycleManager } from "../../tui/core/index.js";
import type { AgentEvent, AgentStartEvent, TurnEndEvent, AgentErrorEvent } from "@mariozechner/pi-coding-agent";

/**
 * Wrapper around pi-coding-agent's AgentSession with event-driven architecture.
 * Adds lifecycle management and re-emits AgentSession events on the EventBus.
 */
export class AgentSessionWrapper {
  private session: AgentSession;
  private lifecycle: LifecycleManager;
  private eventBus: EventBus;
  private unsubscribeSession?: () => void;
  private _disposed = false;

  constructor(
    options: CreateAgentSessionOptions,
    eventBus?: EventBus
  ) {
    this.eventBus = eventBus || new EventBus();
    this.lifecycle = new LifecycleManager('agent-session', this.eventBus);
  }

  /**
   * Initialize the agent session (async)
   */
  async initialize(): Promise<void> {
    await this.lifecycle.initialize();

    try {
      // Note: We'll create the actual session when first needed (lazy)
      // Or we can create it here if options are provided
      // For now, assume create() is called separately
    } catch (error) {
      this.lifecycle.transition(LifecycleState.ERROR);
      throw error;
    }
  }

  /**
   * Create the actual AgentSession instance
   */
  async createSession(options: CreateAgentSessionOptions): Promise<AgentSession> {
    if (this.session) {
      return this.session;
    }

    this.eventBus.emitSimple('session.creating', { options });

    try {
      const result = await createAgentSession(options);
      this.session = result.session;

      // Subscribe to session events and re-emit on EventBus
      this.unsubscribeSession = this.session.subscribe((event: AgentEvent) => {
        this.handleSessionEvent(event);
      });

      this.eventBus.emitSimple('session.created', { sessionId: this.session.getSessionManager().getCurrentBranch() });

      return this.session;
    } catch (error) {
      this.eventBus.emitSimple('session.error', { error });
      throw error;
    }
  }

  /**
   * Handle AgentSession events and re-emit on EventBus
   */
  private handleSessionEvent(event: AgentEvent): void {
    switch (event.type) {
      case 'agent_start':
        this.eventBus.emitSimple('agent.start', event as AgentStartEvent);
        break;
      case 'turn_end':
        this.eventBus.emitSimple('turn.end', event as TurnEndEvent);
        break;
      case 'agent_end':
        this.eventBus.emitSimple('agent.end', event);
        break;
      case 'error':
        this.eventBus.emitSimple('agent.error', event as AgentErrorEvent);
        break;
      case 'message_update':
        this.eventBus.emitSimple('message.update', event);
        break;
      case 'tool_execution_start':
        this.eventBus.emitSimple('tool.execution.start', event);
        break;
      case 'tool_execution_end':
        this.eventBus.emitSimple('tool.execution.end', event);
        break;
      case 'tool_execution_error':
        this.eventBus.emitSimple('tool.execution.error', event);
        break;
      case 'session_start':
        this.eventBus.emitSimple('session.start', event);
        break;
      case 'session_end':
        this.eventBus.emitSimple('session.end', event);
        break;
      case 'session_before_compact':
        this.eventBus.emitSimple('session.beforeCompact', event);
        break;
      case 'session_compact':
        this.eventBus.emitSimple('session.compact', event);
        break;
      case 'annotation_added':
        this.eventBus.emitSimple('annotation.added', event);
        break;
      default:
        // Emit all events generically
        this.eventBus.emitSimple(`agent.${event.type}`, event);
    }
  }

  /**
   * Get the underlying AgentSession
   */
  getSession(): AgentSession | null {
    return this.session;
  }

  /**
   * Prompt the agent (delegates to session)
   */
  async prompt(text: string): Promise<void> {
    if (!this.session) {
      throw new Error("Session not created. Call createSession() first.");
    }
    this.eventBus.emitSimple('agent.prompt', { text });
    await this.session.prompt(text);
  }

  /**
   * Abort current operation
   */
  async abort(): Promise<void> {
    await this.session?.abort();
    this.eventBus.emitSimple('agent.abort');
  }

  /**
   * Subscribe to events (via EventBus)
   */
  on<T = any>(eventType: string, handler: (event: any) => void): () => void {
    return this.eventBus.on(eventType, handler);
  }

  /**
   * Get lifecycle manager
   */
  getLifecycle(): LifecycleManager {
    return this.lifecycle;
  }

  /**
   * Get event bus
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Dispose session and cleanup
   */
  async dispose(): Promise<void> {
    if (this._disposed) return;

    this.eventBus.emitSimple('session.disposing');

    try {
      await this.lifecycle.stop();

      if (this.unsubscribeSession) {
        this.unsubscribeSession();
      }

      await this.session?.dispose();
      this.session = null;

      this._disposed = true;
      this.eventBus.emitSimple('session.disposed');
    } catch (error) {
      this.eventBus.emitSimple('session.disposeError', { error });
      throw error;
    }
  }

  /**
   * Check if disposed
   */
  isDisposed(): boolean {
    return this._disposed;
  }
}
