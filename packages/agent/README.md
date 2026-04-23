# @mariozechner/pi-agent

**Professional AI Agent Library** | v1.0.0 | Apache-2.0

A lightweight wrapper that aggregates `@mariozechner/pi-agent-core` and `@mariozechner/pi-coding-agent` into a single, easy-to-use package. Provides a simplified factory for creating agents and an event bus for decoupled UI integration. Zero direct TUI dependencies—the agent is pure business logic.

## ✨ Features

- Unified re-exports from core and coding-agent
- Simple `createAgent()` factory
- Event bus for communication with any UI (TUI, web, etc.)
- Full TypeScript support
- Peer dependency on `@mariozechner/pi-tui` for UI types (optional)

## 📦 Installation

```bash
npm install @mariozechner/pi-agent
# Peer deps (if using TUI)
npm install @mariozechner/pi-tui @mariozechner/pi-coding-agent
```

## 🚀 Quick Start

```typescript
import { createAgent } from "@mariozechner/pi-agent";

const agent = await createAgent({
  cwd: process.cwd(),
  tools: ["read", "edit", "bash", "grep", "find", "ls"],
});

// Listen to events
agent.on("message:assistant", (event) => {
  console.log("Assistant:", event.content);
});

agent.on("tool:result", (event) => {
  console.log(`Tool ${event.toolName}:`, event.result);
});

// Send a message
await agent.sendMessage("Hello, agent!");

// Shutdown
await agent.shutdown();
```

## 🏗 Architecture

```
Your App (TUI or other)
        ↑↓ events
    EventBus (from pi-coding-agent)
        ↑↓
    @mariozechner/pi-agent (this package)
        ├─ factory → Agent { sendMessage, shutdown, on }
        ├─ re-exports → Core, CodingAgent, AI
        └─ bus → EventSubscriber
```

## 📚 API

### `createAgent(config?: AgentConfig): Promise<Agent>`

Creates an agent with sensible defaults.

**AgentConfig:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cwd` | `string` | `process.cwd()` | Working directory |
| `tools` | `string[]` | all built-in | Tool names |
| `extensions` | `string[]` | `[]` | Extension paths |
| `skills` | `string[]` | `[]` | Skill paths |
| `sessionDir` | `string` | `./.agent/sessions` | Session storage |
| `eventBus` | `EventBus` | auto-created | Shared event bus |

**Returns `Agent`:**

- `sendMessage(content: string): Promise<void>` – send user message (text only)
- `sendMessageWithImages(content: string, images: any[]): Promise<void>` – multimodal
- `shutdown(): Promise<void>` – dispose resources
- `on(eventType: string, handler: (event:any)=>void): () => void` – subscribe, returns unsubscribe
- `session: AgentSession` – underlying session from pi-coding-agent
- `bus: EventBus` – event bus instance

### `createSimpleAgent(options?: Partial<AgentConfig>): Promise<Agent>`

Convenience: enables common tools (read, edit, bash, grep, find, ls).

### Re-exports

All exports from the underlying packages are available:

- **`@mariozechner/pi-coding-agent`** – `AgentSession`, `UserMessageComponent`, `ThemeManager`, `initTheme`, `createBashTool`, etc.
- **`@mariozechner/pi-agent-core`** under `Core` namespace – `Core.Agent`, `Core.AgentLoop`, `Core.Proxy`, etc.
- **`@mariozechner/pi-ai`** – `Model`, `streamSimple`, `ImageContent`, etc.
- **Types from `@mariozechner/pi-tui`** – `Component`, `Focusable` (for UI component contracts)

## 🔌 Events

Agent sessions emit events you can listen to via `agent.on(...)`. Event types follow the `AgentSessionEvent` union from pi-coding-agent. Common ones:

| Event Type | Description | Payload |
|------------|-------------|---------|
| `message:user` | User message sent | `{ content, messageId }` |
| `message:assistant` | Assistant response | `{ content, messageId }` |
| `message:tool` | Tool result message | `{ content, toolName, messageId }` |
| `tool:call` | Tool invocation started | `{ toolName, callId, input }` |
| `tool:result` | Tool finished | `{ toolName, callId, result, durationMs }` |
| `tokens:update` | Usage updated | `{ inputTokens, outputTokens, totalTokens, contextPercent }` |
| `thinking:start` / `thinking:end` | Model reasoning state | `{ level }` |
| `model:change` | Model switched | `{ modelId, provider, reasoning }` |
| `session:compact` | Context compaction | `{ removedEntries, newContextTokens }` |

See pi-coding-agent source for the full `AgentSessionEvent` union.

## 🎯 Limitations & Future Work

- **Model resolution**: `model` as string is not yet resolved to a `Model` object. To use a specific model, you'll need to integrate `ModelRegistry` (future version).
- **Advanced callbacks**: Lifecycle callbacks (`onMessage`, `onTool`) are replaced by the generic `agent.on(...)` bus subscription.
- **Minimal wrapper**: This package is intentionally thin—it re-exports existing functionality and offers a small factory. For full feature control, use the underlying packages directly.

## 🧪 Testing

```bash
cd packages/agent
npm test
```

## 🏗️ Building

```bash
npm run build
```

Output goes to `dist/` with TypeScript declarations.

## 📄 License

Apache-2.0 – See LICENSE file in the monorepo.

## 🤝 Contributing

See CONTRIBUTING.md in the monorepo root.

## 🔗 Related Packages

- `@mariozechner/pi-tui` – Terminal UI engine
- `@mariozechner/pi-tui-professional` – Pre-built professional TUI components (Chat, Footer, Editor)
- `@mariozechner/pi-coding-agent` – High-level agent business logic and UI components
- `@mariozechner/pi-agent-core` – Core agent abstractions (Agent, AgentLoop)
- `@mariozechner/pi-ai` – AI model utilities and image handling
