# Developer Guide

## Architecture

- `src/index.ts`: main application (`QClawApp`), TUI setup, event handling, keybindings.
- `packages/tui`: custom TUI components (`ChatContainer`, `CustomEditor`, footer, etc.).
- `packages/agent`: agent integration (`createAgent`, extensions).

## Adding a New Slash Command

1. Add entry to `SLASH_COMMANDS` array in `src/index.ts`:

```ts
{ name: "mycmd", description: "Does something" }
```

2. Handle the command in `handleEditorSubmit`:

```ts
if (trimmed === "/mycmd") {
  // perform action
  return;
}
```

## Registering a Tool

```ts
import { AgentBuilder } from "@piclaw/pi-agent";
import { Tool } from "@mariozechner/pi-agent-core";

const myTool: Tool = {
  name: "mytool",
  description: "Does something",
  inputSchema: {/* ... */},
  execute: async (callId, params) => ({ content: [{ type: "text", text: "done" }], details: {} }),
};

builder.addTool(myTool);
```

## Styling

Themes are JSON files with color tokens. See `docs/THEMES.md`. Use `theme.fg("role", text)` to apply colors.

## Testing

- Unit tests: `npm test`
- TUI tests: `npm run test:tui`
- Agent tests: `npm run test:agent`
