# Building a Professional Coding Agent with pi

## Quick Answer: Use `@mariozechner/pi-coding-agent`

**Don't use `pi-agent-core` directly** — it's the low-level framework. For a coding agent, use **`pi-coding-agent`** which builds on top of `pi-agent-core` and provides:

- Built-in tools: `read`, `write`, `edit`, `bash`, `grep`, `find`, `ls`
- Session persistence & compaction
- Extensions & skills system
- Settings management
- TUI components
- RPC & print modes

---

## Architecture

```
pi-coding-agent → pi-agent-core → pi-ai
                    ↑
              Your Agent
```

- **`pi-ai`**: LLM providers (OpenAI, Anthropic, Google, etc.)
- **`pi-agent-core`**: Core agent loop, events, tools, state management
- **`pi-coding-agent`**: File tools + session management + extensions + TUI

---

## Entry Point: `createAgentSession()`

**File Reference**: `llm-context/pi-mono/packages/coding-agent/src/core/sdk.ts`

```typescript
import { createAgentSession } from "@mariozechner/pi-coding-agent";

const { session, extensionsResult } = await createAgentSession({
  cwd: process.cwd(),
  agentDir: "~/.pi/agent",
  model: myModel,                    // optional: from pi-ai getModel()
  thinkingLevel: "medium",           // optional: off|minimal|low|medium|high|xhigh
  tools: ["read", "bash", "edit"],   // optional: allowlist (default: all built-in)
  customTools: [myTool],             // optional: ToolDefinition[]
  resourceLoader: myLoader,          // optional: custom loader
  sessionManager: myManager,         // optional: custom persistence
  settingsManager: mySettings,       // optional: custom settings
});
```

**Returns**:
- `session`: `AgentSession` — main interface
- `extensionsResult`: `LoadExtensionsResult` — loaded extensions info

---

## Core Usage Pattern

**File Reference**: `llm-context/pi-mono/packages/coding-agent/src/core/agent-session.ts`

```typescript
// 1. Subscribe to events
session.subscribe((event) => {
  switch (event.type) {
    case "message_update":
      // streaming text: event.assistantMessageEvent.type === "text_delta"
      // usage: event.assistantMessageEvent.type === "usage"
      break;
    case "turn_end":
      // assistant finished a turn
      break;
    case "tool_execution_start":
      // tool started: event.tool.name, event.toolCall.input
      break;
    case "tool_execution_end":
      // tool finished: event.toolExecution.output, event.toolExecution.details
      break;
    case "error":
      // error occurred
      break;
  }
});

// 2. Send prompt
await session.prompt("Explain this code");

// 3. Get stats
const stats = session.getStats(); // tokens, cost, duration, etc.

// 4. Dispose when done
session.dispose();
```

---

## Custom Tools

**File Reference**: `llm-context/pi-mono/packages/coding-agent/src/core/tools/index.ts`

Use `defineTool` from `@mariozechner/pi-coding-agent`:

```typescript
import { defineTool } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const myTool = defineTool({
  name: "my_tool",
  label: "My Tool",
  description: "Does something useful",
  parameters: Type.Object({
    input: Type.String({ description: "Input string" }),
  }),
  execute: async (ctx, params) => {
    // ctx: { settings, toolPermissions, cwd, agentDir }
    // params: validated arguments
    const result = doWork(params.input);
    return {
      content: [{ type: "text" as const, text: result }],
      details: { metadata: "..." },
    };
  },
});
```

**Pass to `createAgentSession({ customTools: [myTool] })`**.

---

## Built-in Tools (7)

**File Reference**: `llm-context/pi-mono/packages/coding-agent/src/core/tools/*.ts`

Tools are auto-created by `createAgentSession()`:

| Tool | Purpose | Files |
|------|---------|-------|
| `read` | Read file (with size limits) | `read.ts` |
| `write` | Write/create file (sandboxed) | `write.ts` |
| `edit` | Edit file via search/replace or diff | `edit.ts`, `edit-diff.ts` |
| `bash` | Execute shell commands (sandboxed) | `bash.ts`, `bash-executor.ts` |
| `grep` | Search text in files | `grep.ts` |
| `find` | Find files by pattern | `find.ts` |
| `ls` | List directory contents | `ls.ts` |

**Tool options**: Each has `create*ToolOptions` type for customizing limits (max file size, timeout, allowed commands, etc.).

---

## Session Management

**File Reference**: `llm-context/pi-mono/packages/coding-agent/src/core/session-manager.ts`

- **Auto-restore**: Last session auto-restored on startup (unless `sessionManager.inMemory()`)
- **Branching**: `session.fork("branch-name")` creates branch
- **Switching**: `session.switchTo("branch")` or `session.switchToLatest()`
- **List**: `session.listBranches()`
- **Delete**: `session.deleteBranch("branch")`
- **Export**: `session.exportToJsonl(path)` / `session.importFromJsonl(path)`
- **Compaction**: `session.compact(summary?)` — removes old entries, keeps recent

---

## Settings & Persistence

**File Reference**: `llm-context/pi-mono/packages/coding-agent/src/core/settings-manager.ts`

**Default locations**:
- Global: `~/.pi/agent/settings.json`
- Project: `<cwd>/.pi/settings.json`

**Settings schema** (validate with `validateSettings()` from `src/config/validation.ts`):

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
  "logging": { "dir": "...", "level": "info", "rotation": "daily", "format": "text" },
  "git": { "autoCommit": false, "commitMessage": "..." },
  "budget": { "daily": 10.0, "monthly": 100.0 }
}
```

**Access**: `session.getSettings()`, `session.updateSetting("key", value)`, `session.saveSettings()`.

---

## Resource Loading (Extensions, Skills, Prompts)

**File Reference**: `llm-context/pi-mono/packages/coding-agent/src/core/resource-loader.ts`

`createAgentSession()` auto-creates `DefaultResourceLoader`. It loads:

- **Extensions**: `~/.pi/agent/extensions/` + `<cwd>/.pi/extensions/`
- **Skills**: `~/.pi/agent/skills/` + `<cwd>/.pi/skills/`
- **Prompts**: `~/.pi/agent/prompts/` + `<cwd>/.pi/prompts/`
- **Context files**: `~/.pi/agent/context/` (auto-injected into system prompt)

**Hot-reload**: Edit files → auto-reload (watchers enabled).

**Manual reload**: `await session.getResourceLoader().reload()`.

---

## Extensions

**File Reference**: `llm-context/pi-mono/packages/coding-agent/src/core/extensions/`

**What**: Plugins that add commands, tools, UI widgets, hooks.

**Structure**: Extension = `{ name, description, factory: (api) => ({...}) }`

**Exports**:
- `defineTool` (re-exported from pi-agent-core)
- `ExtensionAPI`: `{ agent, session, settings, resourceLoader, tui, ... }`
- `ExtensionContext`: `{ cwd, agentDir, settings, ... }`
- Lifecycle hooks: `onSessionStart`, `onSessionEnd`, `beforeAgentStart`, etc.

**Load**: Place JS/TS file in extensions/ dir. Auto-discovered.

**Reference**: `llm-context/pi-mono/packages/coding-agent/examples/extensions/`

---

## TUI Integration

**Use**: `new AgentTUI(agent, verbose).start()` from `@mariozechner/pi-coding-agent`.

**File Reference**: `llm-context/pi-mono/packages/coding-agent/src/modes/interctive/agent-tui.ts` (or your `src/tui/agent-tui.ts`)

**Components available** (from `@mariozechner/pi-coding-agent`):
- `UserMessageComponent`
- `AssistantMessageComponent`
- `ToolExecutionComponent`
- `SettingsSelectorComponent`
- `CustomEditor` (with autocomplete)
- `FooterComponent`

**Keybindings**: `KeybindingsManager` from pi-tui.

---

## RPC & Print Modes

**File Reference**: `llm-context/pi-mono/packages/coding-agent/src/rpc.ts`

- **Print mode**: `session.prompt(message)` → stream to stdout (non-interactive)
- **RPC mode**: JSON-RPC server over stdio (`runRpcServer({ session })`)

Your `src/index.ts` already wires these.

---

## Compaction (Context Management)

**File Reference**: `llm-context/pi-mono/packages/coding-agent/src/core/compaction/`

- **Auto**: Enabled by default (threshold: 2000 tokens). Override via settings.
- **Manual**: `session.compact(summary?)` returns `{ removedEntries }`
- **Preview**: `session.compact(summary?, true)` returns estimate string
- **Disable**: `session.setCompactionEnabled(false)`

Compaction removes old non-essential entries, inserts a summary.

---

## Security & Sandbox

**File Reference**: `src/tools/sandbox.ts` (your custom, hmm check if pi-coding-agent has built-in)

pi-coding-agent tools validate:
- **Path traversal**: `validatePath()` prevents `../`
- **File size**: `maxFileSize` (default 10MB)
- **Denied paths**: `/etc/passwd`, `~/.ssh`, etc.
- **Bash commands**: Denied list (`rm`, `mv`, `dd`, etc.) + allowlist option
- **Output size**: `maxTotalOutput` (default 100KB)

Configure via `toolPermissions` in settings.

---

## Error Handling & Retry

**File Reference**: `llm-context/pi-mono/packages/coding-agent/src/core/agent-session.ts`

- **Auto-retry**: On transient errors (network, rate limit, overload) — respects `retry.maxAttempts`
- **Model fallback**: If all retries fail, auto-cycle to next available model (if configured)
- **Circuit breaker**: Tools with repeated failures (3 in 60s) are temporarily blocked (5m)
- **Error enhancement**: Provides actionable hints (rate limit, quota, auth, etc.)

---

## Cost Tracking & Budgets

**File Reference**: `llm-context/pi-mono/packages/coding-agent/src/core/agent-session.ts`

- **Cost history**: `~/.pi/agent/cost-history.jsonl`
- **Stats**: `session.getStats()` → `{ totalTokens, estimatedCost, sessionDuration, errors, turns }`
- **Budgets**: Set `budget.daily` / `budget.monthly` in settings → warnings when exceeded

---

## Observability (Metrics)

**File Reference**: `llm-context/pi-mono/packages/coding-agent/src/observability/`

Prometheus metrics (if enabled):
- `piclaw_requests_total`
- `piclaw_errors_total`
- `piclaw_tool_calls_total`
- `piclaw_session_duration_seconds`
- `piclaw_tokens_total`
- `piclaw_model_requests_total`

Start server: `--metrics` flag (port 9090 default).

---

## Command Patterns (Slash Commands)

**File Reference**: `llm-context/pi-mono/packages/coding-agent/src/slash-commands.ts`

Built-in slash commands (in your TUI, type `/` to see):
- `/new`, `/resume`, `/fork`, `/sessions`, `/session`
- `/skills`, `/extensions`, `/commands`, `/reload`
- `/models`, `/cycle`, `/thinking`, `/stats`, `/cost`, `/tokens`
- `/compact`, `/clear`, `/verbose`
- `/export`, `/import`, `/graph`, `/diff`, `/search`, `/labels`, `/notes`
- `/budget`, `/backup`, `/restore`, `/logs`, `/settings`, `/set`

**Custom slash commands**: Register in extension's `commands` property.

---

## Important: Do NOT Reimplement

**What's already in pi-coding-agent** (use as-is):
- Session persistence (JSONL format)
- Compaction algorithm (branch summaries)
- Tool permission system
- Settings hot-reload
- Resource loading (extensions/skills/prompts)
- TUI components (already built)
- Bash executor with operation tracking
- Model registry & discovery
- Cost estimation
- Error handling & retry logic

**Your code** should:
1. Call `createAgentSession(options)`
2. Wrap in `AgentCore` if you need extra orchestration (like your current `src/agent/core.ts`)
3. Add custom tools via `customTools`
4. Add custom extensions if needed
5. Build TUI using provided components
6. Keep custom logic minimal

---

## File Organization (Recommended)

```
src/
├── index.ts              ← main entry (CLI modes, arg parsing)
├── config.ts             ← config loading (YAML/JSON)
├── agent/
│   ├── core.ts           ← your AgentCore wrapper (orchestration only)
│   ├── manager.ts        ← multi-agent (if needed)
│   └── commands.ts       ← slash command handlers
├── tui/
│   └── agent-tui.ts      ← TUI using pi-coding-agent components
├── tools/
│   ├── index.ts          ← custom tools (defineTool)
│   ├── sandbox.ts        ← security helpers
│   └── image.ts          ← image tool (if needed)
├── templates/
│   └── index.ts          ← session templates
├── observability/
│   ├── metrics.ts        ← prometheus metrics
│   └── metrics-server.ts ← metrics HTTP server
├── utils/
│   └── rate-limiter.ts   ← rate limiting utilities
└── config/
    └── validation.ts     ← settings validation (TypeBox)

# What pi-coding-agent provides elsewhere:
# - ~/.pi/agent/ (sessions, settings, auth, logs, extensions, skills, prompts)
# - <cwd>/.pi/ (project-local overrides)
```

---

## Reference Map

| Your File | What It Does | pi Source to Read |
|-----------|-------------|-------------------|
| `src/agent/core.ts` | AgentCore wrapper | `pi-coding-agent/src/core/sdk.ts`, `pi-coding-agent/src/core/agent-session.ts` |
| `src/index.ts` | Entry point (modes) | `pi-coding-agent/src/index.ts` (references only — use as pattern) |
| `src/tui/agent-tui.ts` | TUI | `pi-coding-agent/src/modes/interactive/agent-tui.ts` |
| `src/tools/index.ts` | Custom tools | `pi-coding-agent/src/core/tools/*.ts` |
| `src/config/validation.ts` | Settings schema | `pi-coding-agent/src/core/settings-manager.ts` |
| `src/observability/metrics.ts` | Prometheus | `pi-coding-agent/src/observability/metrics.ts` |

---

## Get Started Template

```typescript
// src/index.ts
import { createAgentSession } from "@mariozechner/pi-coding-agent";
import { AgentTUI } from "./tui/agent-tui.js";
import { getCustomTools } from "./tools/index.js";
import * as yaml from "yaml";

async function main() {
  const config = loadConfig(); // optional YAML/JSON
  const { session } = await createAgentSession({
    cwd: process.cwd(),
    agentDir: config.agentDir,
    model: config.model,
    thinkingLevel: config.thinkingLevel,
    customTools: getCustomTools(),
  });

  const tui = new AgentTUI(session, config.verbose);
  await tui.start();
}
```

That's it. Everything else (session persistence, tool permissions, settings, hot-reload, compaction, retry, fallback) is handled by pi-coding-agent.

---

## Key Principles

1. **Use `createAgentSession()`** — it creates everything (tools, session, managers, loaders)
2. **Add custom tools** via `customTools: [defineTool(...)]`
3. **Add custom extensions** by dropping JS files in `~/.pi/agent/extensions/`
4. **Customize via settings** JSON (not code) — `session.updateSetting()`
5. **Leverage existing TUI components** — don't build UI from scratch
6. **Subscribe to events** for streaming, not polling
7. **Don't reimplement** compaction, persistence, sandbox — they're already there

---

## Need More Control?

Extend via:

- **Custom `resourceLoader`**: Override `loadExtensions()`, `loadSkills()`, etc.
- **Custom `sessionManager`**: Override persistence format/location
- **Custom `settingsManager`**: Override config source
- **Tools with options**: `createWriteTool(cwd, { maxFileSize, requireConfirm, ... })`
- **Extension hooks**: `beforeToolCall`, `afterToolCall`, `onSessionStart`, etc.
- **Agent-level hooks**: `session.subscribe()` + `session.getAgent()` → `agent.beforeToolCall`, `agent.afterToolCall`

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|--------------|-----|
| Tools not showing up | Not in `tools` allowlist | `createAgentSession({ tools: ["read","bash",...] })` or omit for all |
| Session not persisting | `SessionManager.inMemory()` used | Use `SessionManager.create(cwd)` (default) |
| Model not found | API key missing | `~/.pi/agent/auth.json` with `{ "openai": "sk-..." }` |
| Custom tool not called | `customTools` not passed to `createAgentSession()` | Pass them |
| Extension not loading | Syntax error or missing export | Check `~/.pi/agent/extensions/` + logs |
| High token usage | No compaction | `session.setCompactionEnabled(true)` or adjust `compaction.tokens` |

---

## Conclusion

Your `piclaw` project already follows this pattern correctly. The only improvement: **shrink `src/agent/core.ts`** — move non-orchestration logic (logger, circuit breaker, watchers, metrics) to separate modules. The orchestration itself (`AgentCore`) should be ~200 lines that just wires pi-coding-agent components together.

**Read these pi source files to master**:
1. `pi-coding-agent/src/core/sdk.ts` — factory pattern
2. `pi-coding-agent/src/core/agent-session.ts` — session lifecycle
3. `pi-agent-core/src/agent.ts` — low-level agent loop (if needed)
4. `pi-coding-agent/src/core/tools/index.ts` — built-in tools patterns
5. `pi-coding-agent/examples/extensions/` — extension examples

**You don't need to write an agent from scratch** — pi-coding-agent is complete. Your job: configure + extend.
