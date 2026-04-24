# QClaw

[![Build Status](https://github.com/qcoder/qclaw/actions/workflows/ci.yml/badge.svg)](https://github.com/qcoder/qclaw/actions)

**QClaw** is a professional AI coding assistant built with a modular architecture. It combines a state-of-the-art agent core with a rich terminal UI, designed for developers who need a powerful, extensible command-line assistant.

## ✨ Features

- **Modular Architecture**: Clean separation between agent logic (business layer) and UI (TUI) via event bus.
- **Professional TUI**: Built on `@mariozechner/pi-tui-professional` with chat interface, footer status, theming.
- **Rich Agent**: Full-featured agent from `@mariozechner/pi-agent` with tools, session management, compaction, extensions, skills.
- **Settings UI**: Interactive theme (F2), model (F3), and session (F4) selectors.
- **Persistent Config**: Live-reloaded settings from `~/.qclaw/config.json` with file watcher.
- **Error Logging**: All errors logged to `~/.qclaw/log.txt` for diagnostics.
- **Telemetry**: Opt-in usage reporting (`--telemetry`) to help improve the product.
- **Autocomplete**: Slash commands and file path completion in editor.
- **Session Switching**: Fork and switch between different session files on the fly.
- **CLI Flexibility**: Flags for `--cwd`, `--model`, `--tools`, `--session-dir`, `--theme`, `--debug`, `--telemetry`.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run the TUI (requires API key)
ANTHROPIC_API_KEY=your-key npm start
```

Or for development with hot reload:

```bash
npm run dev
```

See [docs/QUICKSTART.md](docs/QUICKSTART.md) for detailed setup and usage.

## 📚 Documentation

- [Quick Start Guide](docs/QUICKSTART.md) – Get up and running in 5 minutes.
- [Agent Package Overview](docs/AGENT-PACKAGE.md) – Deep dive into the agent library.
- [Integration Patterns](docs/INTEGRATION-PATTERNS.md) – How to combine agent with TUI.
- [Core Packages Documentation](llm-context/pi-mono/README.md) – Explore underlying libraries.

## 🏗️ Architecture

```
qclaw/
├── packages/
│   ├── tui/        → @mariozechner/pi-tui-professional (UI components)
│   └── agent/      → @mariozechner/pi-agent (agent factory + bus)
├── src/            → Main application (TUI + agent integration)
├── docs/           → User and developer documentation
└── llm-context/    → Read-only source of underlying libraries for reasoning
```

## 🔧 CLI Usage

```bash
qclaw [options]

Options:
  -c, --cwd <path>        Working directory
  -m, --model <id>        Model identifier (e.g., claude-3-opus)
  -t, --tools <list>      Comma-separated tools (default: read,edit,bash,grep,find,ls,git)
  -s, --session-dir <path> Session storage directory
      --theme <mode>      Theme: dark, light, auto (default: auto)
      --debug             Enable debug logging
      --telemetry         Enable error telemetry (opt-in)
```

## 📦 Packages

| Package | Description |
|---------|-------------|
| `@mariozechner/pi-agent` | Agent factory with event bus, re-exports core APIs |
| `@mariozechner/pi-tui-professional` | Professional TUI components (Chat, Footer, Border) |
| `@mariozechner/pi-coding-agent` | Core agent business logic (re-exported) |
| `@mariozechner/pi-agent-core` | Core abstractions (Agent, AgentLoop) |
| `@mariozechner/pi-tui` | Terminal UI engine |
| `@mariozechner/pi-ai` | AI model utilities |

## 🛠️ Development

```bash
# Build all packages
npm run build

# Run tests for all packages
npm test

# Run only agent tests
npm run test:agent

# Run only tui tests
npm run test:tui

# Type checking
npm run check
```

## 📄 License

Apache-2.0 – See [LICENSE](LICENSE) file.

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) (to be added).

## 💡 Inspiration

QClaw is built on the excellent foundations provided by the pi ecosystem. It demonstrates how to compose multiple specialized packages into a full application while keeping a clean separation of concerns.

---

*Made with ❤️ by the Qcoder team.*
