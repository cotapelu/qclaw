# Pi SDK Agent

Full-featured AI coding assistant built with Pi SDK. Production-ready, modular, and extensible.

## Features

- **Interactive CLI** with streaming responses
- **Session persistence & branching** (automatic save to `~/.pi/agent/sessions/`)
- **Extensions system** (auto-load from `.pi/extensions/` or `~/.pi/agent/extensions/`)
- **Skills** (custom instructions from `.pi/skills/`)
- **Prompt templates** (slash commands from `.pi/prompts/`)
- **Custom tools** (TypeScript-defined with `defineTool`)
- **Built-in tools**: read, bash, edit, write
- **Settings persistence** (JSON config file)
- **Model cycling** (`/cycle`)
- **Thinking levels** (`/thinking off|minimal|low|medium|high|xhigh`)
- **Cost & token tracking**
- **Export/Import sessions** (`/export`, `/import`)
- **Print mode** (`--print "message"`)
- **Verbose logging** (`--verbose` or `PI_VERBOSE=true`)
- **Signal handling** (graceful shutdown)
- **100% public API** (no internal imports)

## Quick Start

### 1. Install & Build

```bash
cd pi-sdk-agent
npm install
```

Ensure pi packages are built (from monorepo root):
```bash
npm run build --workspace=packages/ai
npm run build --workspace=packages/agent
npm run build --workspace=packages/coding-agent
```

### 2. Configure API Key

Option A: `~/.pi/agent/auth.json`
```json
{
  "credentials": [
    { "provider": "anthropic", "apiKey": "sk-ant-..." }
  ]
}
```

Option B: Environment variable
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run

```bash
npm start
```

Or print mode:
```bash
npm start --print "Explain main.ts"
```

Or with config:
```bash
npm start --config settings.example.json
```

## Commands

Press `/` to access slash commands.

### Session Management

| Command | Description |
|---------|-------------|
| `/new` | Create a fresh session |
| `/resume` | Continue the most recent session |
| `/fork` | Branch from current point |
| `/sessions` | List all saved sessions |
| `/session` | Show current session tree |
| `/export [file]` | Export session to JSONL |
| `/import <file>` | Import session from JSONL |

### Resources

| Command | Description |
|---------|-------------|
| `/skills` | List loaded skills |
| `/extensions` | List loaded extensions |
| `/commands` | List all slash commands |
| `/reload` | Reload extensions, skills, prompts |

### Model & Thinking

| Command | Description |
|---------|-------------|
| `/models` | Show current & available models |
| `/cycle` | Switch to next model |
| `/thinking <level>` | Set thinking level (off/minimal/low/medium/high/xhigh) |

### Info & Stats

| Command | Description |
|---------|-------------|
| `/stats` | Show session statistics |
| `/cost` | Show estimated cost |
| `/tokens` | Show token usage |
| `/verbose` | Show verbose logging status |

### Tools

| Command | Description |
|---------|-------------|
| `/hello [name]` | Test custom tool |
| `/datetime [format]` | Get current datetime (iso/local/utc/timestamp) |
| `/sysinfo [detail]` | Show system info (brief/full) |
| `/ls [path]` | List files in directory |

### Navigation

| Command | Description |
|---------|-------------|
| `/clear` | Clear screen |
| `/help` | Show this help |

## Configuration

### Settings File (optional)

Place `~/.pi/agent/settings.json` or use `--config`:

```json
{
  "compaction": { "enabled": true, "tokens": 2000 },
  "retry": { "enabled": true, "maxRetries": 2 },
  "model": "anthropic/claude-sonnet-4-5",
  "thinkingLevel": "off"
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `GOOGLE_API_KEY` | Google Gemini API key |
| `PI_AGENT_DIR` | Agent directory (default `~/.pi/agent`) |
| `PI_VERBOSE` | Enable verbose logging (`true`/`false`) |

## Project Structure

```
pi-sdk-agent/
├── src/
│   ├── index.ts           # Entry point (CLI/Print modes)
│   ├── config.ts          # Config interfaces
│   ├── agent/
│   │   ├── core.ts        # AgentCore orchestration
│   │   ├── cli.ts         # CLI interface
│   │   └── commands.ts    # All slash commands
│   └── tools/
│       └── index.ts       # Custom tools
├── settings.example.json
├── EXPORTS.md             # Full API reference
├── ARCHITECTURE.md        # Design docs
├── package.json
└── tsconfig.json
```

## Development

```bash
# Type check
npm run check

# Build
npm run build

# Run
npm start

# Run with hot reload (tsx)
npm run dev
```

## Public API Only

This agent uses only exported APIs from Pi packages:

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
  type ToolDefinition,
  type Model,
  type ThinkingLevel,
} from "@mariozechner/pi-coding-agent";
```

No internal paths (`/src/core/...`) are used, ensuring compatibility when packages are published to npm.

See [EXPORTS.md](./EXPORTS.md) for complete export lists.

## Customization

### Add a Custom Tool

Edit `src/tools/index.ts`:

```typescript
export const myTool: ToolDefinition = defineTool({
  name: "my_tool",
  label: "My Tool",
  description: "Does something",
  parameters: Type.Object({
    input: Type.String()
  }),
  execute: async (_, params) => ({
    content: [{ type: "text", text: `Result: ${params.input}` }],
    details: {},
  }),
});

// Add to getCustomTools() return array
```

### Add a Command

Edit `src/agent/commands.ts`:

```typescript
this.register("mycmd", async (handlers, ...args) => {
  // Do something
  return "Command result";
});
```

### Add a Skill

Create `~/.pi/agent/skills/my-skill.md`:

````markdown
# My Skill

## Rules
- Use TypeScript
- Prefer functional components
- Write tests
````

It will be auto-loaded and injected into the system prompt.

### Extensions

Create `~/.pi/agent/extensions/my-extension.ts`:

```typescript
import { ExtensionAPI, type ToolDefinition } from "@mariozechner/pi-coding-agent";

export default function(pi: ExtensionAPI) {
  pi.on("agent_start", () => console.log("Agent started"));

  pi.registerTool({
    name: "custom_tool",
    label: "Custom",
    description: "Does custom things",
    parameters: Type.Object({}),
    execute: async (_, params) => ({
      content: [{ type: "text", text: "Done" }],
      details: {},
    }),
  });
}
```

## Troubleshooting

### "No models available"
- Check API key: `echo $ANTHROPIC_API_KEY`
- Or create `~/.pi/agent/auth.json`
- Ensure the provider supports the model

### Build errors
Packages must be built before using this agent:
```bash
cd /path/to/pi-mono
npm run build --workspace=packages/ai
npm run build --workspace=packages/agent
npm run build --workspace=packages/coding-agent
```

### Print mode produces no output
- Make sure API key is set
- The agent streams output; ensure your terminal displays it
- Use `--verbose` to see debug logs

## License

MIT - Part of the pi monorepo.
