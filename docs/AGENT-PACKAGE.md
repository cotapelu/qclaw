# Agent Package Overview

## @mariozechner/pi-agent

The `@mariozechner/pi-agent` package is the core business logic layer for building AI coding assistants. It aggregates and re-exports functionality from `@mariozechner/pi-agent-core` and `@mariozechner/pi-coding-agent`, providing a unified API that is completely decoupled from any UI framework.

## Purpose

- **Business Logic Only**: The agent handles LLM interaction, tool execution, session management, compaction, extensions, skills, and everything needed for the "brain" of a coding assistant.
- **UI Agnostic**: Zero direct dependency on TUI, web, or any presentation layer. Communication happens via an event bus.
- **Composable**: Can be used with `@mariozechner/pi-tui-professional`, a web UI, or even headless scripts.
- **Production-Ready**: Built on battle-tested libraries with comprehensive error handling and logging.

## Architecture

```
┌─────────────────────────────────────────────┐
│         UI Layer (TUI, Web, CLI)            │
│  - Components, Input, Rendering             │
├─────────────────────────────────────────────┤
│            Event Bus (decoupling)           │
├─────────────────────────────────────────────┤
│         @mariozechner/pi-agent              │
│  - createAgent(), EventSubscriber           │
│  - Re-exports: Core, CodingAgent, AI        │
├─────────────────────────────────────────────┤
│  @mariozechner/pi-coding-agent (re-export) │
│  - AgentSession, Tools, Session Manager    │
│  - UI Components (for TUI packages)        │
├─────────────────────────────────────────────┤
│  @mariozechner/pi-agent-core (re-export)   │
│  - Agent, AgentLoop, Proxy abstractions    │
├─────────────────────────────────────────────┤
│  @mariozechner/pi-ai (re-export)           │
│  - Model capabilities, image handling      │
└─────────────────────────────────────────────┘
```

## Key Exports

### Factory Functions

- `createAgent(config?: AgentConfig): Promise<Agent>` – Main entry point
- `createSimpleAgent(options?: Partial<AgentConfig>): Promise<Agent>` – Quick setup with common tools

### Event Bus Utilities

- `createEventBus(): EventBus` – Create a new event bus (from pi-coding-agent)
- `EventSubscriber` – Helper for type-safe subscriptions with automatic cleanup

### Re-Exports

- **Everything from `@mariozechner/pi-coding-agent`**: `AgentSession`, `UserMessageComponent`, `CustomEditor`, `initTheme`, `createBashTool`, `compact`, etc.
- **Core abstractions under `Core` namespace**: `Core.Agent`, `Core.AgentLoop`, `Core.Proxy`, etc.
- **AI utilities**: `streamSimple`, `Model`, `ImageContent`, etc.
- **TUI types**: `Component`, `Focusable` (for interface contracts)

## Agent Interface

```typescript
interface Agent {
  session: AgentSession;          // Underlying session from pi-coding-agent
  bus: EventBus;                 // Event bus instance
  sendMessage(content: string): Promise<void>;
  sendMessageWithImages(content: string, images: any[]): Promise<void>;
  shutdown(): Promise<void>;
  on(eventType: string, handler: (event: any) => void): () => void;  // unsubscribe
}
```

## Usage Patterns

### 1. Basic Headless Agent

```typescript
import { createAgent } from "@mariozechner/pi-agent";

const agent = await createAgent({
  cwd: process.cwd(),
  tools: ["read", "edit", "bash", "grep"],
});

agent.on("message:assistant", (event) => {
  console.log("Assistant:", event.content);
});

await agent.sendMessage("Hello!");
await agent.shutdown();
```

### 2. Agent with Shared Event Bus

```typescript
import { createAgent, createEventBus } from "@mariozechner/pi-agent";

const bus = createEventBus();

// Create multiple agents sharing the same bus
const agent1 = await createAgent({ eventBus: bus });
const agent2 = await createAgent({ eventBus: bus });

bus.subscribe("message:assistant", (event) => {
  // Handle messages from any agent
});

await agent1.sendMessage("Task 1");
await agent2.sendMessage("Task 2");
```

### 3. Agent + TUI Integration

```typescript
import { TUI, ProcessTerminal } from "@mariozechner/pi-tui";
import { ThemeManager, ChatContainer, CustomEditor, FooterComponent } from "@mariozechner/pi-tui-professional";
import { createAgent, createEventBus } from "@mariozechner/pi-agent";

async function main() {
  const terminal = new ProcessTerminal();
  const tui = new TUI(terminal);

  const theme = ThemeManager.getInstance();
  theme.initialize("auto");

  const bus = createEventBus();
  const agent = await createAgent({
    model: "claude-3-opus",
    eventBus: bus,
  });

  // Build UI
  const chat = new ChatContainer({ themeManager: theme });
  const editor = new CustomEditor(tui, theme, { placeholder: "Ask..." });
  const footer = new FooterComponent(theme, { cwd: process.cwd() });

  tui.addChild(chat);
  tui.addChild(editor);
  tui.addChild(footer);

  // Wire UI events to agent
  tui.onInput = (data) => {
    if (data === "\r") {
      const input = editor.getValue();
      editor.clear();
      agent.sendMessage(input);
    }
  };

  // Wire agent events to UI
  bus.subscribe("message:assistant", (event) => {
    const msg = new AssistantMessageComponent(event.content, false, theme);
    chat.addMessage(msg);
    tui.requestRender();
  });

  bus.subscribe("tokens:update", (usage) => {
    footer.setTokenUsage(usage.totalTokens);
  });

  tui.start();
}
```

## Event Types

The agent emits events from `AgentSessionEvent` union. Common events:

| Event Type            | Payload                                      |
|-----------------------|----------------------------------------------|
| `message:user`        | `{ content, messageId }`                     |
| `message:assistant`   | `{ content, messageId }`                     |
| `message:tool`        | `{ content, toolName, messageId }`           |
| `tool:call`           | `{ toolName, callId, input }`                |
| `tool:result`         | `{ toolName, callId, result, durationMs }`   |
| `tokens:update`       | `{ inputTokens, outputTokens, totalTokens, contextPercent }` |
| `thinking:start`      | `{ level?: string }`                         |
| `thinking:end`        | `{}`                                         |
| `model:change`        | `{ modelId, provider, reasoning }`           |
| `session:compact`     | `{ removedEntries, newContextTokens }`       |

See `llm-context/pi-mono/packages/coding-agent/src/core/agent-session.ts` for full type definitions.

## Configuration Options

```typescript
interface AgentConfig {
  cwd?: string;               // Working directory (default: process.cwd())
  model?: string;             // Model identifier (future: will resolve to Model object)
  tools?: string[];           // Tool names to enable (default: all built-in)
  extensions?: string[];      // Paths to extension files
  skills?: string[];          // Paths to skill directories
  sessionDir?: string;        // Session storage location
  eventBus?: EventBus;        // Shared event bus (auto-created if not provided)
}
```

## Comparison with Direct Usage

| Approach                      | When to Use                                          |
|-------------------------------|------------------------------------------------------|
| `@mariozechner/pi-agent`      | Quick start, simplified API, decoupled architecture |
| `@mariozechner/pi-coding-agent` directly | Full control, advanced features, custom integrations |
| `@mariozechner/pi-agent-core` | Lowest-level agent abstractions, research/experimentation |

## Testing

```bash
cd packages/agent
npm test        # Run sanity + integration tests
npm run build   # Build to dist/
```

## Examples

See `packages/agent/examples/`:

- `basic-usage.ts` – Simple agent creation, event listening, message sending
- `event-bus-pattern.ts` – Advanced event bus usage with EventSubscriber

## Limitations & Future Work

- **Model Resolution**: Currently, string model identifiers are not resolved to `Model` objects. For advanced use, access `session.modelRegistry` from the underlying session to resolve models manually.
- **Advanced Lifecycle**: For fine-grained control over session lifecycle (compaction, branching, etc.), use `session` directly (it's the full `AgentSession` from pi-coding-agent).
- **Extension Management**: Extensions and skills are loaded automatically from paths. For dynamic loading, use the extension APIs directly.

## Related Packages

- `@mariozechner/pi-tui` – Low-level terminal UI engine
- `@mariozechner/pi-tui-professional` – Pre-built professional UI components (Chat, Footer, Editor)
- `@mariozechner/pi-coding-agent` – The core agent logic (re-exported by this package)
- `@mariozechner/pi-agent-core` – Core agent abstractions (re-exported as `Core`)

## License

Apache-2.0
