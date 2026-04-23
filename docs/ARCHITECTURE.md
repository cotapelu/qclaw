# Architecture - Pi SDK Agent

This document describes the architecture and design decisions of the Pi SDK Agent.

## Overview

The agent is built using the **Pi SDK** (`@mariozechner/pi-coding-agent`) and demonstrates production-ready structure with clear separation of concerns.

## Directory Structure

```
pi-sdk-agent/
├── src/
│   ├── index.ts          # Entry point, bootstrap
│   ├── config.ts         # Type definitions & config
│   ├── agent/
│   │   ├── core.ts       # AgentCore class - main orchestrator
│   │   ├── cli.ts        # CLI interface - user interaction
│   │   └── commands.ts   # Command registry & handlers (/new, /resume, etc.)
│   ├── tools/
│   │   └── index.ts      # Custom tools definitions
│   └── types/            # (future) custom type definitions
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
├── EXPORTS.md           # Full export reference from pi packages
└── ARCHITECTURE.md      # This file
```

## Layers

### 1. Bootstrap Layer (`src/index.ts`)

Entry point that:
- Creates `AgentCore` instance
- Handles errors & unhandled rejections
- Provides top-level async main()

### 2. Core Layer (`src/agent/core.ts`)

`AgentCore` class orchestrates everything:
- Initializes services (Auth, ModelRegistry, Settings, SessionManager, ResourceLoader)
- Creates the `AgentSession` via `createAgentSession()`
- Manages lifecycle (initialize, dispose)
- Exposes interfaces: subscribe, prompt, getSession, etc.

**Dependencies** (all from public API):
- `AuthStorage` - API key management
- `ModelRegistry` - model discovery
- `SettingsManager` - configuration
- `SessionManager` - persistence & branching
- `DefaultResourceLoader` - extensions/skills/prompts loading

### 3. CLI Layer (`src/agent/cli.ts`)

`AgentCLI` class handles:
- Readline interface for user input
- Command parsing (`/new`, `/resume`, etc.)
- Event streaming to console
- Prompt loop

### 4. Commands Layer (`src/agent/commands.ts`)

`CommandRegistry`:
- Maps command names → handler functions
- Built-in commands: new, resume, fork, sessions, skills, extensions, commands, help, reload, models
- Extensible: `register(name, handler)` to add custom commands

### 5. Tools Layer (`src/tools/index.ts`)

Custom tool definitions using `defineTool()`:
- `hello_world` - Greeting tool
- `current_datetime` - Time queries
- `system_info` - System statistics
- `list_files` - File system explorer

All tools are fully typed with TypeBox schemas.

## Data Flow

```
User Input → CLI → AgentCore.prompt() → AgentSession
                                       ↓
                               LLM via pi-ai
                                       ↓
                        Tool calls? → execute tools
                                       ↓
                                Response streaming
                                       ↓
                               Events → CLI → Console output
```

## Session Management

- **Persistence**: `SessionManager.create(cwd)` saves to `~/.pi/agent/sessions/`
- **Branching**: Use `/fork` to create branch from current leaf
- **Resume**: `/resume` switches to most recent session
- **New**: `/new` creates fresh session (triggers `sessionManager.newSession()`)

## Resource Loading

`DefaultResourceLoader` discovers:
- **Extensions**: `~/.pi/agent/extensions/`, `.pi/extensions/`
- **Skills**: `~/.pi/agent/skills/`, `.pi/skills/`, `~/.agents/skills/`
- **Prompts**: `~/.pi/agent/prompts/`, `.pi/prompts/`
- **Context**: `AGENTS.md` files walking up from cwd

These are loaded at initialization and can be hot-reloaded with `/reload`.

## Event System

Subscribe to `AgentSession` events:
- `agent_start`, `agent_end` - Agent lifecycle
- `turn_start`, `turn_end` - Turn boundary
- `message_start`, `message_end`, `message_update` - Message lifecycle
- `tool_execution_start`, `tool_execution_end` - Tool execution
- `queue_update` - Message queue status
- `compaction_start`, `compaction_end` - Context compaction
- `error` - Errors

CLI handles:
- `text_delta` → stream to stdout
- `tool_execution_start` → show tool name
- `agent_start` → show "thinking..."
- `turn_end` → separator

## Extension Points

### 1. Custom Tools
Add to `tools/index.ts` and include in `AgentCore` config.

### 2. Commands
Register in `agent/commands.ts`:
```typescript
commandRegistry.register('mycmd', async (handlers, ...args) => {
  // Do something
  return "Result";
});
```

### 3. Extensions
Create TypeScript file in `~/.pi/agent/extensions/` or use `resourceLoader` override to inject.

### 4. Skills
Markdown files in skill directories automatically loaded.

### 5. Prompt Templates
Markdown files in prompt directories accessible as slash commands.

## Settings

`SettingsManager.inMemory()` with defaults:
```typescript
{
  compaction: { enabled: true, tokens: 2000 },
  retry: { enabled: true, maxRetries: 2 },
  // ... more settings (see SettingsManager API)
}
```

To use persistent settings: `SettingsManager.create(cwd, agentDir)`

## Public API Compliance

**All imports** are from package root exports only:

```typescript
import {
  createAgentSession,
  SessionManager,
  AuthStorage,
  ModelRegistry,
  defineTool,
  DefaultResourceLoader,
  SettingsManager,
  getAgentDir,
  Type,
  // etc.
} from "@mariozechner/pi-coding-agent";
```

**Never** use:
```typescript
// ❌ Internal paths
import { AgentSession } from "@mariozechner/pi-coding-agent/src/core/agent-session";
```

This ensures compatibility when packages are published to npm.

## Error Handling

- Agent errors caught and logged to stderr
- CLI errors don't crash the agent (shown and continue)
- Unhandled rejections and uncaught exceptions logged
- Exit codes: 0 on normal quit, 1 on fatal error

## Future Improvements

- [ ] Add `/clear` to clear screen
- [ ] Add `/export` to save conversation
- [ ] Add `/import` to load conversation
- [ ] Show tool args and results more verbosely
- [ ] Add configuration file (YAML/JSON) for agent settings
- [ ] Add metrics/logging
- [ ] Support for loading multiple skill directories
- [ ] Custom LLM provider configuration via settings
- [ ] Image support in prompts
- [ ] Multi-modal output rendering

## Testing Strategy

- Use `SessionManager.inMemory()` for isolate tests
- Use faux provider from `@mariozechner/pi-ai` for deterministic tests without API keys
- Test command handlers in isolation
- Test tool execution with mock filesystem

## Performance Considerations

- Session persistence uses file I/O (async), doesn't block main thread
- Large tool results are streamed, not buffered
- Event subscriptions are lightweight
- Resource loader caches after initial load

## Dependencies

**Runtime**:
- `@mariozechner/pi-coding-agent` (main)
- `@mariozechner/pi-ai` (LLM)
- `@mariozechner/pi-agent-core` (agent runtime)
- `@sinclair/typebox` (validation)
- `minimatch` (file patterns)
- Node.js stdlib: `fs`, `path`, `readline`

**Dev**:
- `typescript`
- `tsx` (runner)
- `@types/node`

---

*This architecture is designed to be extensible, testable, and maintainable while using only public APIs.*
