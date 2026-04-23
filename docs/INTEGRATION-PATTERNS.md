# Integration Patterns: Agent + TUI

This document describes how to integrate `@mariozechner/pi-agent` with `@mariozechner/pi-tui-professional` to build a full-featured coding assistant TUI.

## Overview

```
┌─────────────────────────────────────────────────────┐
│                  TUI Application                    │
│  (uses @mariozechner/pi-tui & pi-tui-professional) │
├─────────────────────────────────────────────────────┤
│           Event Bus (shared)                        │
├─────────────────────────────────────────────────────┤
│            @mariozechner/pi-agent                   │
│  - Business logic, LLM, tools, sessions            │
└─────────────────────────────────────────────────────┘
```

The TUI is completely separate from the agent. They communicate only through the event bus. This means:

- You can swap the TUI for a web UI without changing agent code
- You can run the agent headless (no TUI) for batch processing
- You can have multiple TUI instances sharing one agent (or vice versa)

## Step-by-Step Integration

### 1. Create Shared Event Bus

```typescript
import { createEventBus } from "@mariozechner/pi-agent";

const bus = createEventBus();
```

### 2. Create Agent

```typescript
import { createAgent } from "@mariozechner/pi-agent";

const agent = await createAgent({
  cwd: process.cwd(),
  tools: ["read", "edit", "bash", "grep", "find", "ls"],
  eventBus: bus,  // Share the bus
});
```

### 3. Build TUI

```typescript
import { TUI, ProcessTerminal } from "@mariozechner/pi-tui";
import {
  ThemeManager,
  ChatContainer,
  CustomEditor,
  FooterComponent,
  AssistantMessageComponent,
  UserMessageComponent,
  ToolExecutionComponent,
} from "@mariozechner/pi-tui-professional";

const terminal = new ProcessTerminal();
const tui = new TUI(terminal);

const theme = ThemeManager.getInstance();
theme.initialize("auto");

const chat = new ChatContainer({ themeManager: theme });
tui.addChild(chat);

const editor = new CustomEditor(tui, theme, { placeholder: "Ask anything..." });
tui.addChild(editor);

const footer = new FooterComponent(theme, { cwd: process.cwd() });
tui.addChild(footer);
```

### 4. Wire Agent → TUI (Events)

```typescript
// User sends a message via editor
tui.onInput = (data) => {
  if (data === "\r") {  // Enter
    const input = editor.getValue();
    editor.clear();

    // Add user message to UI immediately (optimistic)
    const userMsg = new UserMessageComponent(input, theme);
    chat.addMessage(userMsg);

    // Send to agent (the agent will also emit message:user event)
    agent.sendMessage(input);
  }
};

// Agent events → UI updates
bus.subscribe("message:assistant", (event) => {
  // Create assistant message component and add to chat
  const assistantMsg = new AssistantMessageComponent(event.content, false, theme);
  chat.addMessage(assistantMsg);
  tui.requestRender();
});

bus.subscribe("tool:call", (event) => {
  // Show tool execution in UI
  const toolMsg = new ToolExecutionComponent(
    event.toolName,
    event.callId,
    event.input,
    { showImages: true },
    undefined,
    tui,
    process.cwd()
  );
  chat.addMessage(toolMsg);
  tui.requestRender();
});

bus.subscribe("tool:result", (event) => {
  // Update tool message with result (find the component by callId)
  // In practice, maintain a Map<callId, ToolExecutionComponent>
  tui.requestRender();
});

bus.subscribe("tokens:update", (usage) => {
  footer.setTokenUsage(usage.totalTokens);
});

bus.subscribe("model:change", (event) => {
  footer.setModel(event.modelId);
});
```

### 5. Handle Shutdown

```typescript
process.on("SIGINT", async () => {
  await agent.shutdown();
  tui.stop();
  process.exit(0);
});
```

## Complete Example

See `packages/agent/examples/basic-usage.ts` for a working example (without TUI). To add TUI, follow the pattern above.

## Common Patterns

### Message Deduplication

The agent emits `message:user` when you call `agent.sendMessage()`. Avoid adding the same message twice to the UI:

```typescript
// Option 1: Rely on agent event only (don't add optimistically)
agent.sendMessage(input);
// agent will emit message:user → UI adds it

// Option 2: Add optimistically, but skip duplicate on event
const userMsg = new UserMessageComponent(input, theme);
chat.addMessage(userMsg);
agent.sendMessage(input);
// In event handler: check if message already exists
```

### Tool Execution Tracking

Keep a map of tool call IDs to UI components:

```typescript
const toolComponents = new Map<string, ToolExecutionComponent>();

bus.subscribe("tool:call", (event) => {
  const tool = new ToolExecutionComponent(/* ... */);
  chat.addMessage(tool);
  toolComponents.set(event.callId, tool);
});

bus.subscribe("tool:result", (event) => {
  const tool = toolComponents.get(event.callId);
  if (tool) {
    tool.updateResult(event);
  }
});
```

### Theme Switching

```typescript
import { setTheme } from "@mariozechner/pi-coding-agent";

// When user changes theme via TUI
setTheme("light");

// Listen for theme changes to re-render
bus.subscribe("theme:change", () => {
  tui.requestRender();
});
```

## Best Practices

1. **Always requestRender() after UI changes** – The TUI uses diff rendering, but you must call `tui.requestRender()` when you modify components.
2. **Share one event bus** – Create the bus once and pass it to both agent and any other components.
3. **Dispose properly** – On shutdown, call `agent.shutdown()` first, then `tui.stop()`.
4. **Use AgentSession directly for advanced control** – If you need compaction, session switching, etc., use `agent.session` (it's the full `AgentSession` instance).
5. **Don't block the event loop** – All event handlers should be async-friendly. Use `await` but don't do heavy sync work.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not firing | Ensure you're using the same bus instance for both agent and subscribers |
| UI not updating | Call `tui.requestRender()` after modifying components |
| Missing theme colors | Initialize theme before creating UI components: `ThemeManager.getInstance().initialize("auto")` |
| Agent not responding | Check API keys (environment variables), and that `agent.sendMessage()` is called |
| Type errors with events | Event types come from `AgentSessionEvent`; use `any` or cast if needed for custom events |

## Next Steps

- Read the source of `AgentSession` in `llm-context/pi-mono/packages/coding-agent/src/core/agent-session.ts` to understand available events.
- Explore `pi-tui-professional` components in `packages/tui/src/` for UI building blocks.
- Check examples in `packages/agent/examples/` for agent usage patterns.
