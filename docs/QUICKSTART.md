# Quick Start Guide

This guide gets you up and running with qclaw in 5 minutes.

## Prerequisites

- **Node.js** 18+ (recommended 20+)
- **API key** for at least one LLM provider (Anthropic, OpenAI, Google, etc.)
- **Terminal** with true color support (iTerm2, kitty, alacritty, etc.)

## Installation

```bash
# Clone the repository (if you haven't)
git clone https://github.com/qcoder/qclaw.git
cd qclaw

# Install dependencies (this will build all packages)
npm install

# Build everything
npm run build
```

## Running qclaw

### Development Mode (with hot reload)

```bash
npm run dev
```

This runs the TUI directly with `tsx`. Changes to source files will reload (may need to restart).

### Production Mode

```bash
npm start
```

This runs the compiled `dist/index.js`.

### As a CLI Tool (install globally)

```bash
npm link   # from project root
qclaw      # runs the agent TUI
```

## First Run

1. **Set your API key** as an environment variable:

```bash
# For Anthropic Claude
export ANTHROPIC_API_KEY="your-key-here"

# For OpenAI GPT-4
export OPENAI_API_KEY="your-key-here"

# For Google Gemini
export GOOGLE_API_KEY="your-key-here"
```

2. **Start the app**:

```bash
npm start
```

3. You'll see a TUI interface with:
   - **Chat area** at the top (displays conversation)
   - **Input editor** at the bottom
   - **Footer** with cwd, model, token usage

4. **Type your first message** and press **Enter**.

Example: `"What files are in the current directory?"`

5. The agent will use the built-in `bash` and `ls` tools to answer.

## Navigation

| Key | Action |
|-----|--------|
| `Enter` | Send message (when editor focused) |
| `Ctrl+D` | Duplicate current line |
| `Ctrl+E` | Open multi-line editor |
| `Ctrl+P` | Cycle through models (if multiple configured) |
| `Ctrl+C` | Quit (graceful shutdown) |

## Settings

You can change settings on the fly:

| Key | Action |
|-----|--------|
| `F2` | Change theme (dark/light/auto) |
| `F3` | Select model from available models |

Settings changes are automatically saved to `~/.qclaw/config.json`.

## Configuration

### Session Storage

By default, sessions are stored in `./.qclaw/sessions` relative to your working directory. Change this by setting `sessionDir` in the agent config (future).

### Tools

The default tool set includes: `read`, `edit`, `bash`, `grep`, `find`, `ls`, `git`.

You can customize which tools are available by modifying the `tools` array in `src/index.ts`:

```typescript
const agent = await createAgent({
  tools: ["read", "bash"], // only these tools
});
```

### Themes

Toggle between dark/light:

```typescript
// In code, or add a keybinding
import { setTheme } from "@mariozechner/pi-coding-agent";
setTheme("light");
```

## Troubleshooting

### "No models available"

- Check your API key environment variable is set and exported.
- Verify the key is valid and has credits.
- Ensure your shell environment passes the variable to the Node process.

### TUI doesn't render correctly

- Use a terminal with true color support.
- Set `TERM=xterm-256color` or `TERM=kitty` (or your terminal type).
- Avoid using `tmux`/`screen` without proper terminfo.

### Agent not responding

- Check network connectivity.
- Some models may be rate-limited.
- Look at console logs for errors (run with `DEBUG=* npm start` for more output).

### Build errors

```bash
# Clean and rebuild everything
npm run clean
rm -rf node_modules packages/*/dist
npm install
npm run build
```

## Next Steps

- Read the [Integration Patterns](INTEGRATION-PATTERNS.md) guide for advanced usage.
- Explore the [Agent Package](AGENT-PACKAGE.md) API reference.
- Check out examples in `packages/agent/examples/`.
- Extend with custom tools or extensions.

## Getting Help

- **Issues**: https://github.com/qcoder/qclaw/issues
- **Docs**: See `docs/` directory
- **Source**: Read source code in `llm-context/pi-mono/` for deep dives
