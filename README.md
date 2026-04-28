# PiClaw

PiClaw is a professional AI coding agent built on [pi-coding-agent](https://github.com/mariozechner/pi-coding-agent). It provides a powerful terminal-based interface for AI-assisted development.

## Features

- Persistent configuration management (`~/.piclaw/config.json`)
- Custom slash commands:
  - `/config` - Show current Piclaw configuration
  - `/piclaw-set <key> <value>` - Set a config value (e.g., `/piclaw-set model anthropic:claude-opus-4-5`, `/piclaw-set thinking high`)
  - `/tools` - List active tools
  - `/piclaw-status` - Show Piclaw and session status
- Automatic tool allowlist from config
- Model and thinking level persistence across sessions
- Extension system for custom commands

## Installation

```bash
# Clone and install
npm install
npm run build
npm link
```

## Usage

Start the interactive agent:

```bash
piclaw
```

Or with options:

```bash
piclaw --cwd /path/to/project --model anthropic:claude-opus-4-5 --thinking high --verbose
```

### CLI Options

- `--cwd <path>` - Working directory (default: current)
- `--tools <list>` - Comma-separated tool allowlist (overrides config)
- `--sessionDir <dir>` - Custom session storage directory
- `--model <id>` - Model to use (e.g., `anthropic:claude-opus-4-5`)
- `--thinking <level>` - Thinking level: `off|minimal|low|medium|high|xhigh`
- `--verbose` - Show detailed logs

## Configuration

Piclaw stores configuration in `~/.piclaw/config.json`. Example:

```json
{
  "model": "anthropic:claude-opus-4-5",
  "thinking": "high",
  "tools": ["read", "bash", "edit", "write", "grep", "find"],
  "verbose": false
}
```

You can edit this file manually or use the `/piclaw-set` command inside the agent.

### Supported Config Keys

- `model` - Default model (`provider:modelId`)
- `thinking` - Default thinking level
- `tools` - Array of allowed tool names
- `sessionDir` - Custom session storage path
- `verbose` - Enable verbose logging

## Slash Commands

Built-in commands (from pi):
- `/model` - Select model (opens UI)
- `/thinking` - Change thinking level
- `/settings` - Open settings menu
- `/session` - Show session info
- `/quit` - Exit
... and many more. Press `/` in the app to see all commands.

Piclaw-specific commands:
- `/config` - Show Piclaw config
- `/piclaw-set <key> <value>` - Set a config key/value
- `/tools` - Show active tools
- `/piclaw-status` - Show Piclaw status

## Development

```bash
# Build
npm run build

# Run in dev mode (tsx)
npm run dev

# Lint
npm run lint

# Type check
npm run check

# Test
npm test
```

## How It Works

Piclaw extends pi-coding-agent with:

1. **Config Manager** - Loads/saves user configuration
2. **CLI Resolution** - Merges CLI options with config file
3. **Tool Allowlist** - Applies `tools` config to session
4. **Auto-Loaded Extension** - Registers custom slash commands via global settings

On startup, Piclaw:
- Loads config from `~/.piclaw/config.json`
- Merges with CLI overrides
- Registers the built-in piclaw extension (written in `src/extensions/piclaw-extension.ts`)
- Creates agent session with allowed tools from config
- Applies initial model and thinking level

## Extension Architecture

Piclaw's custom extension is automatically registered by writing its path to the global settings file (`~/.pi/agent/settings.json`). This happens on every startup (if not already present).

To create your own extension, place a `.ts` or `.js` file in:
- Global: `~/.pi/agent/extensions/`
- Project: `<project>/.pi/extensions/`

See examples in `llm-context/pi-mono/packages/coding-agent/examples/extensions/`.

## License

MIT
