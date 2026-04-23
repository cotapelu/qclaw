# @mariozechner/pi-tui-professional

A professional TUI (Terminal User Interface) component library built on top of `@mariozechner/pi-tui` and `@mariozechner/pi-coding-agent`. This package provides high-level, theme-aware components for building sophisticated terminal applications, especially coding agents.

## Features

- **Theme Management**: Complete theme system with dark/light/auto modes, 60+ color roles
- **Message Components**: Styled user/assistant/tool messages with markdown support
- **Input Components**: Advanced editor with autocomplete, keybindings, image paste
- **Layout Components**: Chat container, footer, dynamic borders
- **Selectors**: Model, theme, settings, thinking level selectors
- **Overlays**: Dialogs, confirmations, input prompts
- **Loaders**: Themed loaders with spinners and cancellable support
- **Utilities**: Diff rendering, truncation, progress bars, formatting

## Installation

```bash
npm install @mariozechner/pi-tui @mariozechner/pi-coding-agent @mariozechner/pi-tui-professional
```

## Quick Start

```typescript
import { TUI, ProcessTerminal } from "@mariozechner/pi-tui";
import {
  ThemeManager,
  ChatContainer,
  CustomEditor,
  FooterComponent,
  UserMessageComponent,
  AssistantMessageComponent,
  ToolExecutionComponent,
  getMarkdownTheme,
} from "@mariozechner/pi-tui-professional";

async function main() {
  // Initialize TUI
  const terminal = new ProcessTerminal();
  const tui = new TUI(terminal);

  // Initialize theme
  const theme = ThemeManager.getInstance();
  theme.initialize({ mode: "dark" });

  // Layout
  const chatContainer = new ChatContainer({
    themeManager: theme,
    maxMessages: 100,
    autoScroll: true,
    messageSpacing: 1,
  });
  tui.addChild(chatContainer);

  // Footer
  const footer = new FooterComponent(theme, {
    cwd: process.cwd(),
    model: "claude-3-opus",
  });
  tui.addChild(footer);

  // Editor
  const editor = new CustomEditor(tui, theme, {
    placeholder: "Type your message...",
  });
  tui.addChild(editor);

  // Handle input
  tui.onInput = (data) => {
    if (data === "\r") { // Enter
      const input = editor.getValue();
      editor.clear();

      // Add user message
      const userMsg = new UserMessageComponent(input, theme);
      chatContainer.addMessage(userMsg);

      // Simulate assistant response
      const assistantMsg = new AssistantMessageComponent("", false, theme);
      chatContainer.addMessage(assistantMsg);

      // Stream response (example)
      simulateStream(assistantMsg, "Hello! How can I help you today?");
    }
  };

  tui.start();
}

async function simulateStream(component: AssistantMessageComponent, text: string) {
  const words = text.split(" ");
  let accumulated = "";
  for (const word of words) {
    accumulated += word + " ";
    component.updateContent(accumulated);
    await new Promise(r => setTimeout(r, 50));
  }
}

main().catch(console.error);
```

## Core Components

### ThemeManager

Central theme management with subscription support.

```typescript
const theme = ThemeManager.getInstance();
theme.initialize({ mode: "dark" });

// Subscribe to theme changes
const unsubscribe = theme.subscribe(() => {
  console.log("Theme changed to:", theme.getMode());
});

// Apply colors
console.log(theme.fg("accent", "Highlighted text"));
console.log(theme.bg("error", "Error background"));
```

### ChatContainer

Scrollable container for chat messages with auto-scroll and message limiting.

```typescript
const chat = new ChatContainer({
  themeManager: theme,
  maxMessages: 50,
  autoScroll: true,
  messageSpacing: 1,
});

chat.addMessage(userMessage);
chat.scrollToBottom();
chat.clearMessages();
```

### FooterComponent

Status bar displaying cwd, git branch, model, token usage, etc.

```typescript
const footer = new FooterComponent(theme, {
  cwd: process.cwd(),
  gitBranch: "main",
  model: "claude-3-opus",
  tokenUsage: 45,
  thinkingLevel: "medium",
  showImages: true,
});

footer.setTokenUsage(60);
footer.setModel("new-model");
footer.addStatus("Working...");
```

### CustomEditor

Multi-line editor with autocomplete, vim/emacs keybindings, IME support.

```typescript
const editor = new CustomEditor(tui, theme, {
  placeholder: "Ask anything...",
});

editor.setAutocompleteProvider(myProvider);
editor.setValue("initial content");
editor.clear();
editor.focusEditor();
```

### Message Components

Styled message bubbles with markdown rendering.

```typescript
const userMsg = new UserMessageComponent(
  "Hello, **world**!",
  theme,
  getMarkdownTheme()
);

const assistantMsg = new AssistantMessageComponent(
  "",
  false, // showThinking
  theme,
  getMarkdownTheme()
);
assistantMsg.updateContent("Response with `code` and *italic*");

const toolMsg = new ToolExecutionComponent(
  "read",
  "call-123",
  { path: "file.ts" },
  { showImages: true },
  toolDefinition, // optional
  theme,
  process.cwd()
);
toolMsg.updateResult({
  content: [{ type: "text", text: "File content..." }],
});
```

### Selectors

Overlay selectors for options.

```typescript
// Model selector
const modelSelector = new ModelSelectorComponent(
  ["claude-3-opus", "gpt-4"],
  currentModel,
  { onSelect: (model) => setModel(model) },
  theme
);
modelSelector.show(tui, { width: 60 });

// Theme selector
const themeSelector = new ThemeSelectorComponent(theme);
themeSelector.show(tui);

// Settings selector
const settingsSelector = new SettingsSelectorComponent(theme, {
  onSettingChanged: (key, value) => {
    console.log(`${key} = ${value}`);
  },
});
settingsSelector.show(tui);

// Thinking level
const thinkingSelector = new ThinkingSelectorComponent(
  theme,
  "medium" // current level
);
thinkingSelector.show(tui);
```

### Loaders

Themed loading indicators.

```typescript
const loader = new ThemedLoader(tui, theme, "Thinking...");
loader.start();
// ... do work ...
loader.stop();

const borderedLoader = new BorderedLoader(
  tui,
  theme,
  "Loading...",
  { borderStyle: "double", padding: 2 }
);
borderedLoader.start();
```

### Dialogs

Modal dialogs for confirmation and input.

```typescript
// MessageBox
showMessageBox(tui, theme, "Operation complete!", { title: "Info" });

// ConfirmDialog
const confirmed = await showConfirmDialog(
  tui,
  theme,
  "Are you sure you want to delete this file?",
  { title: "Confirm" }
);
if (confirmed) {
  // proceed
}

// InputDialog
const result = await showInputDialog(
  tui,
  theme,
  "Enter filename",
  { defaultValue: "untitled.txt" }
);
if (result) {
  console.log("User input:", result);
}
```

### Utilities

Helper functions for common tasks.

```typescript
import {
  renderDiff,
  createProgressBar,
  createTitledBox,
  formatSize,
  formatDuration,
} from "@mariozechner/pi-tui-professional";

// Diff rendering
const diffLines = renderDiff(
  unifiedDiffText,
  width,
  theme
);

// Progress bar
const bar = createProgressBar(
  75, // percentage
  20, // width
  theme,
  { showPercentage: true }
); // "[███████░░░░░] 75%"

// Titled box
const box = createTitledBox(
  "Status",
  ["Line 1", "Line 2"],
  width,
  theme,
  { borderStyle: "rounded", padding: 1 }
);

// Formatting
console.log(formatSize(1024 * 1024)); // "1.0 MB"
console.log(formatDuration(5000));    // "5s"
```

## Overlays

Show any component as an overlay with automatic focus management.

```typescript
const selector = new ThemeSelectorComponent(theme);
const handle = tui.showOverlay(selector, {
  width: 50,
  anchor: "center",
  margin: 2,
});

// Later
handle.hide();
```

## Dynamic Borders

Wrap components with themed borders.

```typescript
const bordered = createBorder(
  theme,
  myComponent,
  {
    borderStyle: "double",
    title: "My Panel",
    padding: 1,
  }
);
tui.addChild(bordered);
```

## Integration with pi-coding-agent

This package works seamlessly with `pi-coding-agent` components:

```typescript
import {
  initTheme,
  getMarkdownTheme,
  getEditorTheme,
  CustomEditor,
  UserMessageComponent,
  FooterComponent,
  theme as piTheme,
} from "@mariozechner/pi-coding-agent";

// Use pi-coding-agent's theme system
initTheme("dark");

// Our components wrap those
const theme = ThemeManager.getInstance();
const editor = new CustomEditor(tui, theme);
```

## Best Practices

1. **Always use ThemeManager** for color access, never hardcode ANSI codes
2. **Cache renders** in custom components (override `render()` with caching)
3. **Propagate focus** if your component contains focusable children
4. **Respect line width** in `render()` - every line must ≤ given width
5. **Invalidate caches** when content changes
6. **Use overlay system** for dialogs instead of custom focus stacks

## API Reference

### ThemeManager

| Method | Description |
|--------|-------------|
| `initialize(config)` | Set up theme system |
| `setTheme(mode)` | Switch theme |
| `getMode()` | Get current mode |
| `fg(role, text)` | Apply foreground color |
| `bg(role, text)` | Apply background color |
| `style(fg, bg, text)` | Both fg and bg |
| `subscribe(cb)` | Listen to theme changes |
| `getMarkdownTheme()` | Get markdown renderer theme |
| `getEditorTheme()` | Get editor theme |

### ChatContainer

| Method | Description |
|--------|-------------|
| `addMessage(component)` | Add a message |
| `removeMessage(component)` | Remove a message |
| `clearMessages()` | Clear all |
| `scrollToBottom()` | Auto-scroll |
| `scrollUp(lines)` / `scrollDown(lines)` | Manual scroll |
| `getScrollPosition()` | Get scroll offset |

### FooterComponent

| Method | Description |
|--------|-------------|
| `updateData(data)` | Update footer info |
| `setCwd(cwd)` | Set working directory |
| `setModel(model)` | Set model name |
| `setTokenUsage(%)` | Update usage bar |
| `setThinkingLevel(level)` | Set thinking level |
| `addStatus(text)` / `removeStatus(text)` | Manage status indicators |

## Development

```bash
# Build
npm run build

# Test
npm test

# Watch
npm run dev
```

## License

MIT
