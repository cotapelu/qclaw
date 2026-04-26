# QClaw

Professional AI coding assistant TUI powered by pi SDK.

## Features

- Chat interface with markdown rendering
- Smart editor with autocomplete, history, auto‑indent, and bash mode (`!cmd`)
- Theme support (dark/light/auto) with live switching (F2)
- Model selector (F3) with provider info and per‑model thinking level (F9)
- Session management (F4 list, F8 delete, fork)
- Settings selector (F5) for compaction, images, editor padding, autocomplete
- Thinking level selector (F6)
- Footer with real‑time status, git branch, cwd, token usage, and tool count
- OAuth login flow (F7) for providers (Anthropic, GitHub Copilot, etc.)
- Abort generation (Ctrl+C), copy code (Ctrl+Shift+C), fullscreen (F11)
- Expandable tool output with syntax highlighting

## Installation

```bash
npm ci
npm run build
```

## Usage

```bash
npm start -- --cwd /path/to/project --model claude-3-opus
```

or

```bash
node dist/index.js --theme dark
```

## Keybindings

| Key        | Action                                 |
|-------------|----------------------------------------|
| F2          | Change theme                           |
| F3          | Cycle model / open model selector      |
| F4          | List sessions                          |
| F5          | Open settings                          |
| F6          | Select thinking level                  |
| F7          | OAuth login                            |
| F8          | Delete a session                       |
| F9          | Set thinking level for current model   |
| F11         | Toggle fullscreen chat                 |
| Ctrl+P      | Next model                             |
| Ctrl+Shift+P| Previous model                         |
| Ctrl+S      | Show statistics overlay                |
| Ctrl+E      | Expand/collapse all tool output        |
| Ctrl+T      | Toggle thinking block visibility       |
| Ctrl+Shift+C| Copy last code block to clipboard      |
| Ctrl+I      | Show session info overlay              |
| Ctrl+C      | Abort current generation               |
| Shift+Enter | Insert newline (no submit)             |
| Enter       | Submit prompt                          |
| Up/Down     | Navigate editor history                |

## Configuration

Config file: `~/.qclaw/config.json`

```json
{
  "theme": "auto",
  "model": "claude-3-opus",
  "tools": ["read", "edit", "bash", "grep", "find", "ls", "git"],
  "sessionDir": "~/.qclaw/sessions",
  "debug": false,
  "telemetry": false
}
```

## Extending

- Tools: register via `AgentBuilder.addTool()`.
- Status: use `app.setExtensionStatus(id, status)`.
- Widgets: `app.addWidget(component, "above"|"below")`.
- Custom slash commands: add to `SLASH_COMMANDS` with execute callbacks.

See `docs/` for more.
