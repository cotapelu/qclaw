# Professional Coding Agent Architecture Guide

## Core Philosophy

**Two layers exist**:

1. **`pi-agent-core`** - Low-level agent framework (state, events, tools, loop)
2. **`pi-coding-agent`** - High-level coding agent (built on core + file tools + session management)

You typically **only use `pi-coding-agent`** directly. Use `pi-agent-core` only for custom agent implementations that need full control.

---

## Dependency Graph

```
pi-coding-agent
├─ depends on → pi-agent-core
│              ├─ Agent class
│              ├─ AgentTool, AgentMessage types
│              ├─ agentLoop(), agentLoopContinue()
│              └─ Event system
│
├─ depends on → pi-ai
│              └─ LLM providers (streamSimple, models)
│
└─ provides → createAgentSession(), AgentSession
               ├─ Built-in tools (read, write, edit, bash, grep, find, ls)
               ├─ Session persistence & compaction
               ├─ Settings management
               ├─ Extensions system
               ├─ TUI components
               └─ RPC/print modes
```

`pi-tui` is separate - provides terminal UI widgets.

---

## When to Use What

| Use Case | Import From |
|----------|-------------|
| Building a coding assistant | `@mariozechner/pi-coding-agent` (createAgentSession) |
| Custom agent (non-coding) | `@mariozechner/pi-agent-core` (Agent class) |
| UI components for TUI | `@mariozechner/pi-tui` (TUI, Container, Text, etc.) |
| LLM models/providers | `@mariozechner/pi-ai` (getModel, streamSimple) |

**Rule**: If you need file operations, session persistence, or extensions → **use `pi-coding-agent`**.

---

## High-Level API (Recommended)

**Entry**: `createAgentSession(options)` from `@mariozechner/pi-coding-agent`

```typescript
const { session } = await createAgentSession({
  cwd: process.cwd(),
  agentDir: "~/.pi/agent",
  model: myModel,          // optional, from pi-ai getModel()
  thinkingLevel: "medium", // optional
  tools: ["read", "bash"], // optional allowlist (default: all 7 tools)
  customTools: [myTool],   // optional additional tools
});
```

**Returns** `AgentSession` - all-in-one interface.

**File ref**: `llm-context/pi-mono/packages/coding-agent/src/core/sdk.ts`

---

## AgentSession Interface (Main API)

All methods you'll use:

### Prompting
- `session.prompt(text: string): Promise<void>` - send user message, stream response
- `session.abort(): Promise<void>` - cancel current turn

### Events
- `session.subscribe(cb: (event: AgentSessionEvent) => void): () => void` - listen to lifecycle
- Events: `agent_start`, `turn_start`, `message_update` (text_delta, usage), `tool_execution_start/end`, `turn_end`, `compaction_start/end`, `error`, `agent_end`

### State & Stats
- `session.getStats(): SessionStats` - tokens, cost, duration, errors, turns
- `session.getSettings(): Settings` - current settings
- `session.updateSetting(key, value): Promise<void>` - persist setting
- `session.getModel(): Model` / `session.setModel(model): Promise<void>`
- `session.getThinkingLevel(): ThinkingLevel` / `session.setThinkingLevel(level): Promise<void>`

### Session Management
- `session.getSessionManager(): SessionManager`
  - `listBranches()`, `switchTo(branch)`, `switchToLatest()`, `deleteBranch(name)`
  - `getBranch()` - current branch name
  - `getEntries()` - all entries (messages, compaction, etc.)
- `session.fork(name: string): Promise<void>` - create branch
- `session.compact(summary?, preview?): Promise<string>` - manual compaction
- `session.setCompactionEnabled(enabled: boolean): void`
- `session.exportToJsonl(path?): Promise<string>`
- `session.importFromJsonl(path: string): Promise<void>`

### Resources
- `session.getResourceLoader(): ResourceLoader`
  - `reload()`, `getExtensions()`, `getSkills()`, `getPrompts()`

### Disposal
- `session.dispose(): Promise<void>` - cleanup, persist

**File ref**: `llm-context/pi-mono/packages/coding-agent/src/core/agent-session.ts`

---

## Built-in Tools (7)

Auto-created by `createAgentSession()`. All available through agent call.

| Tool | Parameters | Returns | File Ref |
|------|------------|---------|----------|
| `read` | `{ path: string }` | `{ content: [{text}], details }` | `tools/read.ts` |
| `write` | `{ path: string, content: string }` | `{ content: [{text}], details }` | `tools/write.ts` |
| `edit` | `{ path, edits: [{from, to}] }` OR diff mode | `{ content, details }` | `tools/edit.ts`, `edit-diff.ts` |
| `bash` | `{ command: string, cwd?: string }` | `{ output, exitCode, duration }` | `tools/bash.ts` |
| `grep` | `{ pattern, path?, recursive?, ... }` | `{ matches, count }` | `tools/grep.ts` |
| `find` | `{ path?, pattern, recursive? }` | `{ files }` | `tools/find.ts` |
| `ls` | `{ path?, recursive?, pattern? }` | `{ entries }` | `tools/ls.ts` |

All tools support:
- Sandbox (path validation, size limits, denied commands)
- Streaming for large results (auto-truncate)
- Configurable via `toolPermissions` in settings

**ToolDefinitions**: If you need custom cwd/permissions, use `createReadTool(cwd, options)` from `@mariozechner/pi-coding-agent`.

---

## Custom Tools

Use `defineTool` from `@mariozechner/pi-coding-agent`:

```typescript
import { defineTool } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const myTool = defineTool({
  name: "my_tool",
  label: "My Tool",
  description: "Does something",
  parameters: Type.Object({
    input: Type.String(),
  }),
  execute: async (ctx, params) => {
    // ctx: { settings, toolPermissions, cwd, agentDir }
    return {
      content: [{ type: "text" as const, text: "Result" }],
      details: { meta: "..." },
    };
  },
});
```

Pass to `createAgentSession({ customTools: [myTool] })`.

**File ref**: `llm-context/pi-mono/packages/agent/src/types.ts` (ToolDefinition type) and examples in `pi-coding-agent/examples/extensions/`.

---

## Session Persistence & Compaction

**Storage**: `~/.pi/agent/sessions/` (JSONL files)

**Auto-compaction**: Enabled by default at 2000 tokens. Configure via settings `compaction.{enabled, tokens}`.

**Manual**:
```typescript
await session.compact("Summary text"); // returns "Removed X entries"
await session.compact("", true); // preview only
session.setCompactionEnabled(false);
```

**Branching**:
```typescript
await session.fork("feature-branch");
await session.switchTo("feature-branch");
session.listBranches(); // [{name, latestTurn, created}]
```

**Export/Import**:
```typescript
await session.exportToJsonl("./my-session.jsonl");
await session.importFromJsonl("./my-session.jsonl");
```

**File ref**: `pi-coding-agent/src/core/compaction/`, `pi-coding-agent/src/core/session-manager.ts`

---

## Settings System

**Locations** (merged):
1. Global: `~/.pi/agent/settings.json`
2. Project: `<cwd>/.pi/settings.json`

**Schema** (partial):
```json
{
  "compaction": { "enabled": true, "tokens": 2000 },
  "retry": { "enabled": true, "maxRetries": 2 },
  "model": "anthropic/claude-opus-4-5",
  "thinkingLevel": "medium",
  "toolPermissions": {
    "allowedTools": [],
    "deniedTools": ["write", "bash"],
    "confirmDestructive": true,
    "allowedPaths": [],
    "maxFileSize": 10485760,
    "maxTotalOutput": 1048576
  },
  "logging": { "dir": "...", "level": "info", "rotation": "daily" },
  "git": { "autoCommit": false },
  "budget": { "daily": 10, "monthly": 100 }
}
```

**API**:
```typescript
const settings = session.getSettings();
await session.updateSetting("compaction.tokens", 3000);
await session.saveSettings(); // auto-called by updateSetting
```

**Validation**: Use `validateSettings()` from your `src/config/validation.ts` (copy from pi's `src/core/settings-manager.ts` if needed).

**Hot-reload**: Changes to `~/.pi/agent/settings.json` auto-reload (pi-coding-agent watches).

**File ref**: `pi-coding-agent/src/core/settings-manager.ts`

---

## Extensions System

**Purpose**: Plugins for custom commands, tools, UI widgets, hooks.

**Discovery**: Loaded from:
- `~/.pi/agent/extensions/`
- `<cwd>/.pi/extensions/`

**Structure**:
```typescript
export default {
  name: "my-extension",
  description: "...",
  version: "1.0.0",
  // Optional: slash commands
  commands: [
    { name: "mycmd", description: "...", execute: (ctx, ...args) => {...} }
  ],
  // Optional: tool definitions
  tools: [myToolDefinition],
  // Optional: UI widgets
  widgets: [...],
  // Optional: hooks
  onSessionStart: (ctx) => {...},
  beforeAgentStart: (ctx) => {...},
  beforeToolCall: (ctx) => {...},
  afterToolCall: (ctx, result) => {...},
};
```

**Load**: Just place `.js`/`.ts` file in extensions/ - auto-loaded on startup and hot-reloaded.

**API in extension context**: `ExtensionAPI` passed to commands/hooks:
- `session`, `agent`, `settings`, `resourceLoader`, `tui`, `cwd`, `agentDir`, etc.

**File ref**: `pi-coding-agent/src/core/extensions/`, examples in `pi-coding-agent/examples/extensions/`

---

## Resource Loading (Extensions, Skills, Prompts)

**Managed by**: `DefaultResourceLoader` (auto-created by `createAgentSession()`)

**Loads from**:
- Extensions: `~/.pi/agent/extensions/`, `<cwd>/.pi/extensions/`
- Skills: `~/.pi/agent/skills/`, `<cwd>/.pi/skills/`
- Prompts: `~/.pi/agent/prompts/`, `<cwd>/.pi/prompts/`
- Context: `~/.pi/agent/context/` (files auto-injected into system prompt)

**Hot-reload**: File changes trigger `reload()` automatically (watchers).

**Manual reload**:
```typescript
await session.getResourceLoader().reload();
```

**Access**:
```typescript
const loader = session.getResourceLoader();
loader.getExtensions().extensions; // array
loader.getSkills().skills; // array
loader.getPrompts().prompts; // array
```

**File ref**: `pi-coding-agent/src/core/resource-loader.ts`

---

## TUI Components (pi-tui + pi-coding-agent)

**Base library**: `@mariozechner/pi-tui` provides:
- `TUI`, `Text`, `Container`, `Spacer`, `Input`, `SelectList`, `KeybindingsManager`
- Terminal rendering, input handling, layout

**Coding agent components**: `@mariozechner/pi-coding-agent` provides:
- `UserMessageComponent`
- `AssistantMessageComponent`
- `ToolExecutionComponent`
- `SettingsSelectorComponent`
- `CustomEditor` (autocomplete, themes)
- `FooterComponent`

**Pattern**:
```typescript
import { TUI, Text, Container } from "@mariozechner/pi-tui";
import { UserMessageComponent, AssistantMessageComponent, ToolExecutionComponent } from "@mariozechner/pi-coding-agent";
import { getMarkdownTheme } from "@mariozechner/pi-coding-agent";

const tui = new TUI(new ProcessTerminal());
const messages = new Container();
tui.addChild(messages);

// Add user message
messages.addChild(new UserMessageComponent("Hello", getMarkdownTheme()));

// Add assistant message
const assistant = new AssistantMessageComponent("", false, getMarkdownTheme());
messages.addChild(assistant);
assistant.updateContent("Response text");

// Show tool execution
const tool = new ToolExecutionComponent("read", "call-id", { path: "file.ts" }, options, toolDef, tui);
messages.addChild(tool);
tool.updateResult({ content: [...] });

tui.start();
```

**File ref**:
- `pi-tui`: `llm-context/pi-mono/packages/tui/src/`
- `pi-coding-agent` TUI components: search for `*Component.ts` in `pi-coding-agent/src/modes/interactive/components/` (or inline in `agent-tui.ts`)

---

## Low-Level API (pi-agent-core)

Use only if `createAgentSession()` is too restrictive.

**Entry**: `new Agent(options)` from `@mariozechner/pi-agent-core`

```typescript
import { Agent, type AgentTool, type AgentMessage } from "@mariozechner/pi-agent-core";
import { streamSimple } from "@mariozechner/pi-ai";

const agent = new Agent({
  initialState: {
    systemPrompt: "You are...",
    model: myModel,
    thinkingLevel: "medium",
    tools: [myReadTool, myBashTool],
  },
  streamFn: streamSimple,
  convertToLlm: (messages) => messages, // convert AgentMessage[] to Message[]
  onPayload: (payload) => console.log(payload),
  onResponse: (response) => {...},
  beforeToolCall: (ctx) => {...}, // intercept
  afterToolCall: (ctx, result) => {...}, // modify result
});

agent.subscribe((event) => {
  switch (event.type) {
    case "turn_end":
      // done
      break;
  }
});

const userMsg: AgentMessage = { role: "user", content: [{ type: "text", text: "Hello" }] };
await agent.sendMessage(userMsg);
```

**Key differences from `createAgentSession()`**:
- No session persistence (you must store messages yourself)
- No compaction (you implement `transformContext`)
- No built-in tools (you provide all tools as `AgentTool[]`)
- No settings, extensions, resource loading (you implement if needed)
- Full control over event stream, context management, tool execution

**When to use**:
- Building non-coding agents (different tool set)
- Custom state management
- Learning/experimentation

**File ref**: `llm-context/pi-mono/packages/agent/src/agent.ts`, `llm-context/pi-mono/packages/agent/src/agent-loop.ts`

---

## Reading Source Code Effectively

**Start here** (in order):

1. **`pi-coding-agent/src/core/sdk.ts`** - Factory function `createAgentSession()` - see how everything wires together.
2. **`pi-coding-agent/src/core/agent-session.ts`** - Main `AgentSession` class (public API). Read methods, not internals.
3. **`pi-coding-agent/src/core/tools/index.ts`** - How built-in tools are constructed.
4. **`pi-agent-core/src/agent.ts`** - Low-level `Agent` class (if you need custom agent).
5. **`pi-agent-core/src/agent-loop.ts`** - The turn loop logic.
6. **`pi-coding-agent/src/core/extensions/`** - Extension system patterns.
7. **`pi-coding-agent/examples/extensions/`** - Real extension examples.

**Skip these initially** (implementation details):
- Compaction algorithms (just use `session.compact()`)
- Session manager internals (just use `session.getSessionManager()`)
- Bash executor internals (just call `bash` tool)
- Model registry/auth storage (just use defaults)

---

## Key Interfaces to Know

### From pi-coding-agent
- `AgentSession` - main interface
- `ToolDefinition<TParams, TResult>` - tool schema
- `ResourceLoader` - loads extensions/skills/prompts
- `SettingsManager` - settings storage
- `SessionManager` - session persistence/branching
- `AgentSessionEvent` - all event types

### From pi-agent-core
- `Agent` - low-level agent
- `AgentMessage` - `{ role, content: Block[] }`
- `AgentTool<TParams, TResult>` - tool with `execute(ctx, params)`
- `AgentEvent` - low-level events

### From pi-ai
- `Model` - `{ id, provider, baseUrl, ... }`
- `streamSimple(messages, model, options)` - LLM call
- `getModel(provider, id)` - model factory

### From pi-tui
- `TUI`, `Container`, `Text`, `Input`, `SelectList`, etc.

---

## Common Patterns

### Streaming Responses
```typescript
session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});
await session.prompt("Hello");
```

### Tool Permissions
Settings `toolPermissions`:
```json
{
  "allowedTools": [],        // empty = all allowed
  "deniedTools": ["write"],  // block specific
  "confirmDestructive": true,
  "allowedPaths": ["/home/user/project"],
  "maxFileSize": 10485760,
  "maxTotalOutput": 1048576
}
```

### Extension Development
Create `~/.pi/agent/extensions/my-ext.js`:
```javascript
export default {
  name: "my-ext",
  commands: [{
    name: "greet",
    description: "Say hello",
    execute: async (ctx, name = "world") => {
      return `👋 Hello, ${name}!`;
    }
  }],
};
```

Now `/greet` available in TUI.

### Custom Tool Options
```typescript
import { createWriteToolDefinition } from "@mariozechner/pi-coding-agent";

const safeWrite = createWriteToolDefinition(cwd, {
  maxFileSize: 1024 * 1024, // 1MB
  requireConfirm: true,
  allowedPaths: [cwd],      // restrict to cwd
});
```

---

## What's Already Provided (Don't Reimplement)

Feature: pi-coding-agent provides it

- ✅ Session persistence (JSONL format)
- ✅ Compaction (automatic + manual)
- ✅ Branching & switching
- ✅ Tool permission system
- ✅ Settings hot-reload
- ✅ Resource loading (extensions/skills/prompts)
- ✅ Built-in file tools (7 tools)
- ✅ Bash sandbox (deny list, timeout)
- ✅ Circuit breaker for tools (3 failures/60s → 5m block)
- ✅ Retry with exponential backoff
- ✅ Model fallback on errors
- ✅ Cost tracking & budget alerts
- ✅ Metrics (Prometheus)
- ✅ Observability (file logging, rotation)
- ✅ Auto-commit (git)
- ✅ Event system
- ✅ TUI components
- ✅ RPC server
- ✅ Print mode

**You should NOT implement these** - just configure via settings or extend via hooks.

---

## Architecture of qclaw

Your `src/agent/core.ts` is an `AgentCore` wrapper that adds:
- File logging (FileLogger)
- Circuit breaker (already in pi-coding-agent? Check)
- Resource/settings watchers (already in DefaultResourceLoader? Check)
- Metrics collection (use `observability/metrics.ts`)
- Auto-commit (custom)
- Settings management overrides

**Recommendation**:
1. Remove duplicate circuit breaker logic (pi-coding-agent has it)
2. Use existing watchers from `DefaultResourceLoader` (already watches extensions/skills/prompts)
3. Keep your metrics (they're custom Prometheus)
4. Keep auto-commit if not in pi-coding-agent
5. Keep FileLogger if you need file logging (pi-coding-agent has some logging)

**But lean on pi-coding-agent as much as possible**.

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| Tools not executing | `tools` allowlist in `createAgentSession()`? |
| Session not persisting | `SessionManager.create(cwd)` (default) vs `inMemory()`? |
| Model unavailable | API keys in `~/.pi/agent/auth.json` |
| Extensions not loading | Syntax errors? Check `~/.pi/agent/extensions/` |
| High token usage | Compaction enabled? `compaction.tokens` too high? |
| Slow performance | Too many extensions? Disable via `tools` allowlist |

---

## Package.json for Coding Agent

```json
{
  "dependencies": {
    "@mariozechner/pi-coding-agent": "^0.68.0",
    "@mariozechner/pi-tui": "^0.68.0"
    // pi-agent-core comes transitively
    // pi-ai comes transitively
  }
}
```

Only declare what you directly import. `pi-coding-agent` brings `pi-agent-core` and `pi-ai`.

---

## Conclusion

- **Use `createAgentSession()`** for coding agents - provides everything out of the box
- **Read `pi-coding-agent/src/core/sdk.ts`** to understand wiring
- **Read `pi-coding-agent/src/core/agent-session.ts`** to see available methods
- **Use `defineTool()`** for custom tools
- **Drop extensions in `~/.pi/agent/extensions/`** for slash commands
- **Don't reimplement** compaction, persistence, retry, circuit breaker - they exist
- **Use `pi-tui` components** to build interactive UI
- **Only use `pi-agent-core` directly** if you need full control (rare)

Your `qclaw` should be ~500 lines, not 1700. The current `AgentCore` is doing too much - offload to pi-coding-agent's built-ins.
