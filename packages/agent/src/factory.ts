/**
 * Factory functions for creating agent instances with simple API.
 */

import { createEventBus, createAgentSession, type EventBus } from "@mariozechner/pi-coding-agent";
import type { AgentSession } from "@mariozechner/pi-coding-agent";
import type { Model } from "@mariozechner/pi-ai";

/**
 * Basic configuration for creating an agent
 */
export interface AgentConfig {
  /** Working directory (default: process.cwd()) */
  cwd?: string;
  /** Model identifier (e.g., "claude-3-opus" or "anthropic/claude-3-opus:high") */
  model?: string;
  /** Tools to enable (default: all built-in) */
  tools?: string[];
  /** Extensions to load */
  extensions?: string[];
  /** Skills to load */
  skills?: string[];
  /** Session storage directory */
  sessionDir?: string;
  /** Custom event bus (auto-created if not provided) */
  eventBus?: EventBus;
  /** Pre-configured session manager (for advanced use like session switching) */
  sessionManager?: any;
}

/**
 * Agent instance with simplified API
 */
export interface Agent {
  /** The underlying AgentSession */
  session: AgentSession;
  /** Event bus for communication */
  bus: EventBus;
  /** Send a user message (text only) */
  sendMessage(content: string): Promise<void>;
  /** Send a message with images (multimodal) */
  sendMessageWithImages(content: string, images: any[]): Promise<void>;
  /** Shutdown the agent gracefully */
  shutdown(): Promise<void>;
  /** Subscribe to events */
  on(eventType: string, handler: (event: any) => void): () => void;
}

/**
 * Resolve a model string identifier to a Model object using ModelRegistry.
 * Supports formats:
 * - "claude-3-opus"
 * - "anthropic/claude-3-opus"
 * - "claude-3-opus:high" (with thinking level suffix)
 *
 * @param modelString - The model string from user/config
 * @param modelRegistry - The ModelRegistry to query
 * @returns Resolved Model or undefined if not found
 */
async function resolveModelFromString(modelString: string, modelRegistry: any): Promise<Model<any> | undefined> {
  // Parse out thinking level if present (e.g., "model:high")
  const [idPart, thinkingLevel] = modelString.split(":");
  const modelId = idPart;

  // Get all available models
  try {
    const allModels = await modelRegistry.listModels();

    // Try exact match first
    let found = allModels.find((m: any) => m.id === modelId);
    if (found) {
      return found as Model<any>;
    }

    // Try match with provider prefix (e.g., "anthropic/claude-3-opus" -> "claude-3-opus")
    if (modelId.includes("/")) {
      const simpleId = modelId.split("/").pop();
      found = allModels.find((m: any) => m.id === simpleId);
      if (found) {
        return found as Model<any>;
      }
    }

    // Try match by partial (contains)
    found = allModels.find((m: any) => m.id.includes(modelId) || modelId.includes(m.id));
    if (found) {
      return found as Model<any>;
    }
  } catch (e) {
    console.warn("Failed to query model registry:", e);
  }

  return undefined;
}

/**
 * Create an agent with the given configuration.
 *
 * @example
 * ```typescript
 * const agent = await createAgent({
 *   model: "claude-3-opus",
 *   tools: ["read", "edit", "bash"],
 * });
 *
 * agent.on("message:assistant", (event) => {
 *   console.log("Assistant:", event.content);
 * });
 *
 * await agent.sendMessage("Hello");
 * await agent.shutdown();
 * ```
 */
export async function createAgent(config: AgentConfig = {}): Promise<Agent> {
  const {
    cwd = process.cwd(),
    model,
    tools,
    extensions,
    skills,
    sessionDir,
    eventBus: providedBus,
  } = config;

  // Build options for createAgentSession
  const options: any = {
    cwd,
    tools,
    extensions,
    skills,
    sessionDir,
    sessionManager: config.sessionManager,
  };

  // Create session first to get access to ModelRegistry
  const result = await createAgentSession(options);
  const session = result.session;
  const bus = providedBus ?? createEventBus();

  // Resolve model string to Model object if provided
  if (model && typeof model === "string") {
    try {
      const modelRegistry = (session as any).modelRegistry;
      if (modelRegistry) {
        const resolved = await resolveModelFromString(model, modelRegistry);
        if (resolved) {
          // Set model on session (this is a simplified approach)
          // Ideally, createAgentSession would accept a resolved Model object
          // Since it doesn't easily, we set directly on session state
          const agent = (session as any).agent;
          if (agent) {
            agent.state.model = resolved;
            console.log(`Model set to ${resolved.id}`);
          }
        } else {
          console.warn(`Model '${model}' not found in registry. Using default.`);
        }
      }
    } catch (e) {
      console.warn("Failed to resolve model:", e);
    }
  }

  // Forward AgentSession events to our bus
  const unsubscribeSession = session.subscribe((event: any) => {
    bus.emit(event.type, event);
  });

  return {
    session,
    bus,
    async sendMessage(content: string): Promise<void> {
      await session.sendUserMessage(content);
    },
    async sendMessageWithImages(content: string, images: any[]): Promise<void> {
      await session.sendUserMessage(
        [{ type: "text", text: content }, ...images.map((img) => ({ type: "image", ...img }))]
      );
    },
    async shutdown(): Promise<void> {
      unsubscribeSession();
      session.dispose();
    },
    on: (eventType: string, handler: (event: any) => void) => {
      return bus.on(eventType, handler);
    },
  };
}

/**
 * Create a simple agent with minimal configuration.
 *
 * @example
 * ```typescript
 * const agent = await createSimpleAgent({ model: "claude-3-sonnet" });
 * await agent.sendMessage("List files.");
 * ```
 */
export async function createSimpleAgent(options?: Partial<AgentConfig>): Promise<Agent> {
  return createAgent({
    cwd: process.cwd(),
    tools: ["read", "edit", "bash", "grep", "find", "ls"],
    ...options,
  });
}
