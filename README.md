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

## Security

- **Sandboxed file operations**: Path traversal protection, file size limits, output truncation
- **Tool permissions**: Allowed/denied tools, path restrictions, confirmation for destructive ops
- **Command injection prevention**: User input validated, shell escaping avoided
- **Circuit breaker**:自动关闭故障工具 sau 3 lỗi trong 60 giây
- **Timeout protection**: All external commands have timeouts
- **Secure defaults**: Dangerous tools (write, bash) denied by default; must be explicitly allowed

See [Security Best Practices](#security-best-practices) below.

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

## TUI Features

The interactive TUI (Terminal UI) powered by `@mariozechner/pi-tui` provides a rich user experience:

- **Colored message bubbles** with role-based backgrounds (user: blue, assistant: default, system: yellow, error: red)
- **Real-time status bar** showing current model, token count, estimated cost, and message count
- **Interactive command palette** (`Ctrl+P` or type `/`) with fuzzy search and responsive layout
- **Settings panel** (`/set`) with search, description, and interactive controls
- **Image support** – display base64 images inline (URL placeholders); async fetching from URLs (experimental)
- **Theme switching** – choose between dark and light color schemes via `/set theme <dark|light>`
- **Custom keybindings** – global keybinding manager with user overrides (e.g., `Ctrl+Enter` for newline)
- **Overlay enhancements** – margins, responsive visibility, and optimal positioning

All UI components use the `@mariozechner/pi-tui` library with differential rendering for flicker‑free updates.


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

## Security Best Practices

### 1. Tool Permissions

Restrict dangerous tools via `toolPermissions`:

```json
{
  "toolPermissions": {
    "allowedTools": ["read", "ls", "search"],
    "deniedTools": ["write", "bash", "edit"],
    "confirmDestructive": true,
    "allowedPaths": ["./src", "./tests"],
    "maxFileSize": 5242880,
    "maxTotalOutput": 1048576
  }
}
```

### 2. Path Restrictions

Always set `allowedPaths` to limit file access to specific directories. This prevents accidental access to sensitive files outside your project.

### 3. File Size Limits

Configure `maxFileSize` and `maxTotalOutput` to prevent memory exhaustion attacks.

### 4. Avoid Shell Commands

Prefer built-in tools over custom bash commands. If using `/exec`-like functionality, ensure user input is validated and use `execFile` (not `exec`).

### 5. Regular Audits

Run `npm audit` regularly and keep dependencies updated.

## Configuration

### Settings File (optional)

Place `~/.pi/agent/settings.json` or use `--config`:

```json
{
  "compaction": { "enabled": true, "tokens": 2000 },
  "retry": { "enabled": true, "maxRetries": 2 },
  "model": "anthropic/claude-sonnet-4-5",
  "thinkingLevel": "off",
  "toolPermissions": {
    "allowedTools": [],
    "deniedTools": ["write", "bash"],
    "confirmDestructive": true,
    "allowedPaths": [],
    "maxFileSize": 10485760,
    "maxTotalOutput": 1048576
  },
  "logging": {
    "dir": "~/.pi/agent/logs",
    "level": "info",
    "rotation": "daily",
    "format": "text"
  },
  "git": {
    "autoCommit": false,
    "commitMessage": "Agent session update"
  },
  "budget": {
    "daily": 10.0,
    "monthly": 100.0
  }
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

## Testing

```bash
# Unit tests
npm test

# With coverage
npm run coverage
```

## Deployment

Build for production:

```bash
npm run build
node dist/index.js --config /path/to/settings.json
```

Docker (optional):

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production && npm run build
CMD ["node", "dist/index.js"]
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT - Part of the pi monorepo.

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
- Or create `~/.pi/agent/auth.json` with proper format
- Ensure the provider supports the model: `/models`

### Build errors
```bash
# In pi-mono root, build all packages first:
npm run build --workspace=packages/ai
npm run build --workspace=packages/agent
npm run build --workspace=packages/coding-agent

# Then build qclaw itself:
cd qclaw && npm run build
```

### Print mode produces no output
- Make sure API key is set (env var or auth.json)
- The agent streams output; ensure your terminal displays it
- Use `--verbose` to see debug logs

### Rate limit exceeded
Some commands are rate-limited (e.g., `/backup` 5/min). Wait and retry. Adjust limits in `src/utils/rate-limiter.ts` if needed.

### Permission denied (EACCES) or path errors
- Check `toolPermissions.allowedPaths` in settings
- Ensure file permissions allow read access
- The sandbox blocks paths outside allowed directories

### Session corruption or load failure
- Sessions are stored in `~/.pi/agent/sessions/`
- Corrupted files are automatically skipped; use `/new` to start fresh
- Restore from backup: `/restore <backup-file>`

### High memory usage
- Enable compaction: `/compact` or set `"compaction.enabled": true`
- TUI accumulates message components; restart for very long sessions (1000+ turns)
- Reduce log retention in `settings.json`

### Circuit breaker open for tool
A tool failed repeatedly (3+ times in 60s) and is temporarily disabled. The circuit auto-resets after 5 minutes. Check tool logic or permissions.

### npm install hangs or fails
- Use `npm ci` for reproducible builds
- Clear npm cache: `npm cache clean --force`
- Check network connectivity
- For extension scaffolding, `npm install` is run async; check extension directory manually

### macOS screencapture fails
Screenshot requires macOS with `screencapture` command. On Linux/Windows, this tool is not supported. Use alternative methods to provide images.

### Metrics server port already in use
Change port: `npm start --metrics --metricsPort 9091`

### Debugging
Enable verbose logging:
```bash
export PI_VERBOSE=true
npm start --verbose
```
Check logs in `~/.pi/agent/logs/` (daily rotation).

## Deployment

### Docker

```bash
# Build image
docker build -t qclaw .

# Run (agent directory will be persisted)
docker run -it -v ~/.pi/agent:/home/nodejs/.pi/agent qclaw
```

Or with docker-compose:

```yaml
version: '3'
services:
  qclaw:
    build: .
    volumes:
      - ~/.pi/agent:/home/nodejs/.pi/agent
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    stdin_open: true
    tty: true
```

## CI/CD

GitHub Actions workflow runs on every push/PR:

- `npm ci`
- `npm run build`
- `npm run check` (TypeScript)
- `npm run lint` (ESLint)
- `npm test`
- Code coverage uploaded to Codecov

See `.github/workflows/ci.yml`.

## License

MIT - Part of the pi monorepo.
