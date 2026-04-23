# qclaw VS Code Extension

A Visual Studio Code extension for the Pi SDK Agent (qclaw).

## Features (Planned)

- Run qclaw agent in sidebar
- Quick commands palette
- Session management UI
- File browsing with `/ls`
- Git integration
- Code diff viewer
- Image preview for vision tools

## Development

```bash
# Install dependencies
npm install

# Build
npm run compile

# Package
npm run package
```

## Usage

1. Open Command Palette (Ctrl+Shift+P)
2. Run "Qclaw: Start Agent"
3. Interact with agent in sidebar

## Configuration

- `qclaw.agentPath`: Path to qclaw executable
- `qclaw.apiKey`: API key for LLM provider
- `qclaw.model`: Default model to use

## Architecture

- Webview panel for agent UI
- Communicates with local qclaw process via stdio/RPC
- Shows streaming responses
- Command palette integration

## Publishing

This extension will be published to the VS Code Marketplace under the name `qclaw`.

---

**Status**: Early development - not yet published.
