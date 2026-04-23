# Quick Start Guide - @mariozechner/pi-tui-professional

## Installation

```bash
npm install @mariozechner/pi-tui-professional
```

This package has **peer dependencies** on `@mariozechner/pi-tui` and `@mariozechner/pi-coding-agent`. They will be installed automatically if not already present.

## Basic Usage

```typescript
import { TUI, ProcessTerminal } from "@mariozechner/pi-tui";
import {
  ThemeManager,
  ChatContainer,
  FooterComponent,
  CustomEditor,
  UserMessageComponent,
  AssistantMessageComponent,
  initTheme,
} from "@mariozechner/pi-tui-professional";

async function main() {
  // 1. Create TUI instance
  const terminal = new ProcessTerminal();
  const tui = new TUI(terminal);

  // 2. Initialize theme (dark, light, or "auto")
  const theme = ThemeManager.getInstance();
  theme.initialize("dark");

  // 3. Build UI components
  const chat = new ChatContainer({ themeManager: theme });
  const footer = new FooterComponent(theme, { cwd: process.cwd() });
  const editor = new CustomEditor(tui, theme);

  // 4. Add to layout
  tui.addChild(chat);
  tui.addChild(footer);
  tui.addChild(editor);

  // 5. Handle input
  tui.onInput = (data) => {
    if (data === "\r") { // Enter
      const input = editor.getValue();
      editor.clear();

      chat.addMessage(new UserMessageComponent(input, theme));
      const assistant = new AssistantMessageComponent("", false, theme);
      chat.addMessage(assistant);

      // Stream response from your LLM here...
      streamResponse(assistant, input);
    }
  };

  // 6. Start
  tui.start();
}
```

## Key Components

| Component | Purpose |
|-----------|---------|
| `ThemeManager` | Centralized theme control (singleton) |
| `ChatContainer` | Scrollable message list |
| `FooterComponent` | Status bar (cwd, model, usage) |
| `CustomEditor` | Multi-line input with keybindings |
| `DynamicBorder` | Themed borders for panels |
| `ProgressBar` | Visual progress indicator |
| `ModalComponent` | Dialog overlays |

## Examples

Run the included examples:

```bash
# Basic chat interface
npx tsx packages/tui/examples/basic-chat.ts

# Full-featured demo with tool calls
npx tsx packages/tui/examples/full-chat.ts

# Settings modal demo
npx tsx packages/tui/examples/settings-demo.ts
```

## API Reference

See [README.md](./README.md) for complete API documentation.

## Building from Source

```bash
cd packages/tui
npm install
npm run build
npm test
```

## Testing

```bash
npm test                    # All tests
npm run test:unit          # Unit tests
npm run test:comprehensive # Component tests
npm run test:integration   # Integration test
```

## Package Structure

```
@mariozechner/pi-tui-professional/
├── theme/          # ThemeManager
├── components/
│   ├── layout/    # ChatContainer, FooterComponent, DynamicBorder, ScrollableContainer, ProgressBar
│   └── overlays/  # ModalComponent
├── utils/          # Helper functions
└── index.ts       # Main exports
```

## Peer Dependencies

- `@mariozechner/pi-tui` ^0.68.0
- `@mariozechner/pi-coding-agent` ^0.68.0

These provide the core TUI engine and AI agent components respectively.

## License

Apache-2.0

## Support

- Issues: https://github.com/qcoder/qclaw/issues
- Documentation: See README.md
