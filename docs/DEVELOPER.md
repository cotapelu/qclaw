# Developer Quickstart Guide

Welcome, developer! This guide will help you get started with qclaw development.

## What is qclaw?

**qclaw** is a full-featured AI coding assistant built on the Pi SDK. It provides:

- Interactive CLI with streaming responses
- Session persistence and branching
- Extensible via plugins and tools
- RPC mode for automation

## Repository Structure

```
qclaw/
├── src/
│   ├── index.ts          # Entry point
│   ├── agent/
│   │   ├── core.ts       # Agent orchestration
│   │   ├── cli.ts        # TUI interface
│   │   ├── commands.ts   # Slash commands
│   │   └── tui-cli.ts    # Full-screen TUI
│   ├── tools/            # Custom tools
│   ├── templates/        # Session templates
│   └── utils/            # Backup, etc.
├── llm-context/          # Source for LLM reasoning (pi mono)
├── vscode-extension/     # VS Code extension
├── benchmarks/           # Performance tests
├── docs/                 # Documentation
└── tests/                # Test suite
```

## Prerequisites

- Node.js 20+
- Git
- pi monorepo packages (built) - see llm-context/pi-mono

## Build & Run

```bash
# Install dependencies
npm ci

# Type check
npm run typecheck

# Run tests
npm test

# Build for production
npm run build

# Start interactive CLI
npm start

# Print mode
npm start --print "Hello, who are you?"
```

## Extending qclaw

### Create a Custom Tool

Edit `src/tools/index.ts`:

```typescript
export const myTool: ToolDefinition = defineTool({
  name: "my_tool",
  label: "My Tool",
  description: "Does something useful",
  parameters: Type.Object({
    input: Type.String()
  }),
  execute: async (ctx, params) => ({
    content: [{ type: "text", text: `Result: ${params.input}` }],
    details: {},
  }),
});
```

Then add it to `getCustomTools()`.

### Create an Extension (Plugin)

Use the built-in generator:

```
/create-extension my-extension
```

This creates a boilerplate in `extensions/my-extension/`. Develop it independently and reload with `/reload`.

### Add a Slash Command

In `src/agent/commands.ts`, register a new command:

```typescript
this.register("mycmd", async (handlers, ...args) => {
  // Do something
  return "Command result";
});
```

## Debugging

- Use `--verbose` flag for detailed logs: `npm start -- --verbose`
- Logs are saved to `~/.pi/agent/logs/`
- Use `/logs` command to view recent logs from within the agent
- Set `PI_VERBOSE=true` environment variable

## Testing

- Unit tests in `tests/` using Node test runner
- E2E tests simulate interactions
- Run `npm test` before committing

## Publishing Extensions

Extensions in `extensions/` are automatically loaded. To share:

1. Publish to npm as a standalone package
2. Document installation instructions
3. Add to community extensions list (PR welcome)

## Getting Help

- Read the docs in `README.md` and `docs/`
- Open an issue for bugs or feature requests
- Check existing commands with `/commands`

---

Happy hacking! 🛠️
