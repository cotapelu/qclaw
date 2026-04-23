import type {
  CreateAgentSessionOptions,
  AgentSession,
  AgentSessionEvent,
  SessionStats,
  Model,
} from "@mariozechner/pi-coding-agent";
import { getModel } from "@mariozechner/pi-ai";
import type { Config } from "../config/index.js";
import { AgentSessionWrapper } from "./session/wrapper.js";
import { ResourceManager } from "./resources/index.js";
import { ExtensionManager, builtinExtension } from "./extensions/index.js";
import { EventBus } from "../tui/core/event-bus.js";
import { Logger, LogLevel } from "./observability/logger.js";
import { getMetrics } from "./observability/metrics.js";

/**
 * AgentFacade - High-level orchestrator for the agent system.
 *
 * This is the main entry point for the application. It composes:
 * - Config management
 * - Resource loading (extensions, skills, prompts)
 * - Extension management
 * - Agent session (via pi-coding-agent)
 * - Observability (metrics, logging)
 * - Event bus for decoupled communication
 *
 * All components are independent and communicate via EventBus.
 */
export class AgentFacade {
  private config: Config;
  private eventBus: EventBus;
  private logger: Logger;
  private resourceManager!: ResourceManager;
  private extensionManager!: ExtensionManager;
  private sessionWrapper!: AgentSessionWrapper;
  private agentSession!: AgentSession;
  private metrics = getMetrics();
  private _started = false;

  constructor(config: Config) {
    this.config = config;
    this.eventBus = new EventBus();
    this.logger = this.createLogger();

    this.setupEventHandlers();
  }

  private createLogger(): Logger {
    const logLevel = process.env.LOG_LEVEL as LogLevel || LogLevel.INFO;
    return new Logger({ level: logLevel, prefix: "AgentFacade" });
  }

  private setupEventHandlers(): void {
    // Log all events in debug mode
    this.eventBus.on('*', (event) => {
      this.logger.debug(`Event: ${event.type}`, event.payload);
    });

    // Error handling
    this.eventBus.on('agent.error', (event) => {
      this.logger.error('Agent error', event.payload);
    });

    this.eventBus.on('session.error', (event) => {
      this.logger.error('Session error', event.payload);
    });
  }

  /**
   * Initialize the agent system
   */
  async initialize(): Promise<void> {
    if (this._started) {
      throw new Error("Agent already started");
    }

    this.logger.info('Initializing agent', { cwd: process.cwd() });

    try {
      // 1. Initialize resource manager
      this.resourceManager = new ResourceManager(
        process.cwd(),
        this.config.agent.dir,
        this.eventBus
      );
      const resources = await this.resourceManager.loadAll();
      this.logger.info('Resources loaded', {
        extensions: resources.extensions.length,
        skills: resources.skills.length,
        prompts: resources.prompts.length,
      });

      // 2. Initialize extension manager
      this.extensionManager = new ExtensionManager(this.eventBus);
      await this.extensionManager.loadExtensions(
        process.cwd(),
        this.config.agent.dir
      );
      this.logger.info('Extensions loaded', {
        count: this.extensionManager.getCount(),
        names: this.extensionManager.getNames(),
      });

      // 3. Create session wrapper
      this.sessionWrapper = new AgentSessionWrapper({}, this.eventBus);

      // 4. Create AgentSession options
      const sessionOptions = this.buildSessionOptions(resources);

      // 5. Create the actual session
      await this.sessionWrapper.createSession(sessionOptions);
      this.agentSession = this.sessionWrapper.getSession()!;

      // 6. Subscribe to session events for metrics
      this.setupMetricsHandlers();

      this._started = true;
      this.metrics.sessionsActive.inc();
      this.metrics.sessionsCreatedTotal.inc();

      this.logger.info('Agent initialized successfully');
      this.eventBus.emitSimple('agent.initialized');
    } catch (error) {
      this.logger.error('Failed to initialize agent', { error });
      this.eventBus.emitSimple('agent.initializationError', { error });
      throw error;
    }
  }

  /**
   * Build CreateAgentSessionOptions from config and resources
   */
  private buildSessionOptions(resources: any): CreateAgentSessionOptions {
    const options: CreateAgentSessionOptions = {
      cwd: process.cwd(),
      agentDir: this.config.agent.dir,
    };

    // Model
    if (this.config.agent.model) {
      options.model = await getModel(this.config.agent.model);
    }

    // Thinking level
    if (this.config.agent.thinkingLevel) {
      options.thinkingLevel = this.config.agent.thinkingLevel;
    }

    // Tools allowlist
    if (this.config.agent.tools && this.config.agent.tools.length > 0) {
      options.tools = this.config.agent.tools;
    }

    // Custom tools (from registry + builtin)
    const customTools = this.gatherCustomTools();
    if (customTools.length > 0) {
      options.customTools = customTools;
    }

    return options;
  }

  /**
   * Gather custom tools from registry and builtin extension
   */
  private gatherCustomTools(): any[] {
    const tools: any[] = [];

    // Builtin tools
    // (builtin extension is loaded separately via extensions system)
    // But if we want them as customTools, we'd add them here
    // However, builtinExtension uses defineTool which is already compatible
    // We could register them in extension manager, not here

    return tools;
  }

  /**
   * Setup metrics event handlers
   */
  private setupMetricsHandlers(): void {
    this.sessionWrapper.on('agent.start', () => {
      this.metrics.agentRunsTotal.inc({ model: this.getCurrentModel()?.id || "unknown" });
    });

    this.sessionWrapper.on('agent.end', (event: any) => {
      this.metrics.agentRunsTotal.inc({ model: this.getCurrentModel()?.id || "unknown", status: "completed" });
    });

    this.sessionWrapper.on('tool.execution.start', (event: any) => {
      this.metrics.toolCallsTotal.inc({ tool_name: event.payload.toolName, status: "started" });
    });

    this.sessionWrapper.on('tool.execution.end', (event: any) => {
      this.metrics.toolCallsTotal.inc({ tool_name: event.payload.toolName, status: "completed" });
      this.metrics.toolResultsTotal.inc({ tool_name: event.payload.toolName, result_type: "success" });
    });

    this.sessionWrapper.on('tool.execution.error', (event: any) => {
      this.metrics.toolErrorsTotal.inc({ tool_name: event.payload.toolName, error_type: "error" });
      this.metrics.toolResultsTotal.inc({ tool_name: event.payload.toolName, result_type: "failure" });
    });

    // TODO: token usage, cost
  }

  // Public API

  /**
   * Send a prompt to the agent
   */
  async prompt(text: string): Promise<void> {
    this.validateStarted();
    this.logger.info('Prompt received', { length: text.length });
    await this.sessionWrapper.prompt(text);
  }

  /**
   * Abort current operation
   */
  async abort(): Promise<void> {
    await this.sessionWrapper.abort();
    this.logger.info('Agent aborted');
  }

  /**
   * Subscribe to agent events
   */
  on(event: string, handler: (event: any) => void): () => void {
    return this.eventBus.on(event, handler);
  }

  /**
   * Get session statistics
   */
  getStats(): SessionStats | null {
    return this.agentSession?.getStats() || null;
  }

  /**
   * Get current model
   */
  getCurrentModel(): Model | null {
    return this.agentSession?.getModel() || null;
  }

  /**
   * Update setting
   */
  async updateSetting(key: string, value: any): Promise<void> {
    await this.agentSession?.updateSetting(key, value);
  }

  /**
   * Get settings
   */
  getSettings(): any {
    return this.agentSession?.getSettings() || null;
  }

  /**
   * Get session manager
   */
  getSessionManager(): any {
    return this.agentSession?.getSessionManager() || null;
  }

  /**
   * Get resource loader
   */
  getResourceLoader(): any {
    return this.resourceManager.getLoader();
  }

  /**
   * Get extension manager
   */
  getExtensionManager(): ExtensionManager {
    return this.extensionManager;
  }

  /**
   * Get event bus
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Get logger
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * Get config
   */
  getConfig(): Config {
    return this.config;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down agent');
    this.metrics.sessionsActive.dec();

    try {
      await this.sessionWrapper?.dispose();
      await this.extensionManager?.dispose();
      this.eventBus.clear();
      this.logger.info('Agent shut down complete');
    } catch (error) {
      this.logger.error('Error during shutdown', { error });
      throw error;
    }
  }

  /**
   * Check if started
   */
  isStarted(): boolean {
    return this._started;
  }

  private validateStarted(): void {
    if (!this._started) {
      throw new Error("Agent not started. Call initialize() first.");
    }
  }
}
