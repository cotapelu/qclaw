# @mariozechner/pi-tui-professional

[![npm version](https://img.shields.io/npm/v/@mariozechner/pi-tui-professional.svg)](https://npmjs.com/package/@mariozechner/pi-tui-professional)
[![npm downloads](https://img.shields.io/npm/dm/@mariozechner/pi-tui-professional.svg)](https://npmjs.com/package/@mariozechner/pi-tui-professional)
[![License](https://img.shields.io/npm/l/@mariozechner/pi-tui-professional.svg)](LICENSE)
[![Build Status](https://github.com/qcoder/qclaw/actions/workflows/ci.yml/badge.svg)](https://github.com/qcoder/qclaw/actions/workflows/ci.yml)

**Production Ready** ✅ | v1.0.0 | Apache-2.0

A professional TUI (Terminal User Interface) component library built on top of `@mariozechner/pi-tui` and `@mariozechner/pi-coding-agent`. This package provides high-level, theme-aware components for building sophisticated terminal applications, especially coding agents and AI assistants.

## ✨ Features

- **Theme Management**: Centralized theme control (`ThemeManager`) with dark/light modes and 60+ color roles
- **Layout Components**: `ChatContainer`, `FooterComponent`, `DynamicBorder`, `ScrollableContainer`, `ProgressBar`
- **Message Components**: Re-exported from pi-coding-agent (`UserMessageComponent`, `AssistantMessageComponent`, `ToolExecutionComponent`, `BashExecutionComponent`)
- **Input Components**: `CustomEditor` wrapper, re-exported pi-coding-agent selectors
- **Overlays**: `ModalComponent` with `showModalMessage` and `showModalConfirm` helpers
- **Utilities**: Diff rendering, truncation, wrapping, padding, progress bar creation, format helpers

## Installation

```bash
npm install @mariozechner/pi-tui @mariozechner/pi-coding-agent @mariozechner/pi-tui-professional
```

## Quick Start

```typescript
import { TUI, ProcessTerminal, Container } from "@mariozechner/pi-tui";
import {
  ThemeManager,
  ChatContainer,
  FooterComponent,
  CustomEditor,
  UserMessageComponent,
  AssistantMessageComponent,
  initTheme,
  getMarkdownTheme,
} from "@mariozechner/pi-tui-professional";

async function main() {
  // Initialize terminal
  const terminal = new ProcessTerminal();
  const tui = new TUI(terminal);

  // Initialize theme (dark/light/auto)
  const theme = ThemeManager.getInstance();
  theme.initialize("auto");

  // Layout: Chat area
  const chat = new ChatContainer({ themeManager: theme });
  tui.addChild(chat);

  // Footer
  const footer = new FooterComponent(theme, {
    cwd: process.cwd(),
    model: "claude-3-opus",
  });
  tui.addChild(footer);

  // Editor at bottom
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
      chat.addMessage(userMsg);

      // Simulate assistant response (replace with real LLM call)
      const assistantMsg = new AssistantMessageComponent("", false, theme);
      chat.addMessage(assistantMsg);
      simulateStream(assistantMsg, "Echo: " + input);
    }
  };

  tui.start();
}

async function simulateStream(component: AssistantMessageComponent, text: string) {
  let accumulated = "";
  const words = text.split(" ");
  for (const word of words) {
    accumulated += word + " ";
    component.updateContent(accumulated);
    await new Promise(r => setTimeout(r, 50));
  }
}

main().catch(console.error);
```

## Core Concepts

### ThemeManager

Centralized theme management using pi-coding-agent's theme system.

```typescript
import { ThemeManager } from "@mariozechner/pi-tui-professional";

const theme = ThemeManager.getInstance();

// Initialize (once at startup)
theme.initialize("dark"); // "light", "auto"

// Switch theme later
theme.setTheme("light");

// Apply colors
const colored = theme.fg("accent", "Highlighted text");

// Subscribe to changes
const unsubscribe = theme.subscribe(() => {
  tui.requestRender(); // re-render with new theme
});

// Get theme objects for pi-coding-agent components
const markdownTheme = theme.getMarkdownTheme();
const editorTheme = theme.getEditorTheme();
```

### ChatContainer

A scrollable container for chat messages with message limiting.

```typescript
const chat = new ChatContainer({
  themeManager: theme,
  maxMessages: 100,    // optional, default unlimited
  autoScroll: true,    // auto-scroll to bottom
  messageSpacing: 1,   // spacing between messages
});

// Add messages
chat.addMessage(new UserMessageComponent("Hello", theme));
chat.addMessage(new AssistantMessageComponent("Hi there!", false, theme));

// Clear
chat.clearMessages();
```

### FooterComponent

Status bar showing cwd, git branch, model, token usage, thinking level, etc.

```typescript
const footer = new FooterComponent(theme, {
  cwd: process.cwd(),
  gitBranch: "main",
  model: "claude-3-opus",
  tokenUsage: 42,
  thinkingLevel: "medium",
  showImages: true,
});

// Update dynamically
footer.setTokenUsage(75);
footer.setModel("gpt-4");
footer.addStatus("Working...");
```

### CustomEditor

Multi-line editor with Vim/Emacs keybindings, autocomplete, IME support.

```typescript
import { CombinedAutocompleteProvider } from "@mariozechner/pi-tui";
import { BUILTIN_SLASH_COMMANDS } from "@mariozechner/pi-coding-agent";

const editor = new CustomEditor(tui, theme, {
  placeholder: "Ask anything...",
});

// Autocomplete
const provider = new CombinedAutocompleteProvider(
  BUILTIN_SLASH_COMMANDS,
  process.cwd()
);
editor.setAutocompleteProvider(provider);
```

### DynamicBorder

Wrap any component with a themed border.

```typescript
import { DynamicBorder, createBorder } from "@mariozechner/pi-tui-professional";

const bordered = new DynamicBorder(theme, {
  borderStyle: "double", // single, double, rounded, heavy, ascii
  title: "My Panel",
  padding: 1,
});
bordered.addChild(myComponent);

// Or use helper
const border = createBorder(theme, myComponent, {
  borderStyle: "rounded",
  title: "Info",
});
```

### ScrollableContainer

A container that can scroll its children vertically. Useful for large message histories.

```typescript
import { ScrollableContainer } from "@mariozechner/pi-tui-professional";

const scrollable = new ScrollableContainer(theme, 20); // viewport height 20 lines
scrollable.addChild(messageComponent);
scrollable.scrollDown(5);
scrollable.scrollToBottom();
```

**Methods**:
- `setViewportHeight(height)` - set visible lines
- `scrollDown(lines)`, `scrollUp(lines)`
- `scrollToTop()`, `scrollToBottom()`
- `hasScrollbar()`, `getScrollPercent()`

### ProgressBar

Displays a horizontal progress bar with percentage.

```typescript
import { ProgressBar } from "@mariozechner/pi-tui-professional";

const bar = new ProgressBar(theme, 30, { showPercentage: true });
bar.setProgress(75);
container.addChild(bar);
```

### ModalComponent

Base class for modal dialogs shown as overlays.

```typescript
import { ModalComponent, showModalMessage, showModalConfirm } from "@mariozechner/pi-tui-professional";

// Simple message modal
const msg = showModalMessage(tui, theme, "Operation complete!", {
  title: "Info",
  width: 50,
});

// Confirmation modal (Promise-based)
const confirmed = await showModalConfirm(tui, theme, "Delete file?");
if (confirmed) {
  // proceed
}

// Custom modal with content
const custom = new ModalComponent(theme, {
  title: "Settings",
  width: 60,
  borderStyle: "double",
});
custom.getContent().addChild(new Text("Setting 1", 1, 0));
custom.show(tui);
```

### Utilities

Helper functions for common UI tasks.

```typescript
import {
  renderDiff,          // Render unified diff with syntax colors
  truncateText,        // Truncate with ellipsis
  wrapText,            // Wrap text preserving ANSI
  padText,             // Pad with alignment + theme
  joinThemed,          // Join with themed separator
  createProgressBar,   // Create visual progress bar (string)
  createTitledBox,     // Create box with title border
  formatSize,          // Format bytes to human readable
  formatDuration,      // Format ms to "5s", "1m 5s", etc.
} from "@mariozechner/pi-tui-professional";

// Diff
const diffLines = renderDiff(diffText, width, theme, {
  showLineNumbers: false,
});

// Progress bar
const bar = createProgressBar(75, 20, theme, { showPercentage: true });
// "[███████░░░░░] 75%"

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
console.log(formatDuration(65000));   // "1m 5s"
```

## Re-Exports from pi-coding-agent

We re-export many pi-coding-agent components for convenience:

- **Messages**: `UserMessageComponent`, `AssistantMessageComponent`, `ToolExecutionComponent`, `CustomMessageComponent`, `BashExecutionComponent`
- **Input**: `CustomEditor` as `PiCustomEditor`
- **Selectors**: `ModelSelectorComponent`, `SettingsSelectorComponent`, `ThemeSelectorComponent`, `ThinkingSelectorComponent`
- **Footer**: `PiFooterComponent`
- **Utilities**: `keyHint`, `keyText`, `rawKeyHint`, `renderDiff` (as `PiRenderDiff`), `truncateToVisualLines`
- **Theme**: `initTheme`, `getMarkdownTheme`, `getSelectListTheme`, `getSettingsListTheme`, `getLanguageFromPath`, `highlightCode`

Also re-export core pi-tui components:

- `TUI`, `ProcessTerminal`, `Container`, `Text`, `Box`, `Spacer`, `Input`

You can import directly from `@mariozechner/pi-tui-professional` without needing to install both packages separately (though they are peer dependencies).

## API Reference

### ThemeManager

| Method | Description |
|--------|-------------|
| `getInstance()` | Get singleton |
| `initialize(themeName?)` | Init theme ("dark"/"light"/"auto") |
| `setTheme(themeName)` | Change theme |
| `getMode()` | Get current mode ("dark"/"light") |
| `fg(role, text)` | Apply foreground color |
| `getMarkdownTheme()` | Get markdown renderer theme |
| `getEditorTheme()` | Get editor theme |
| `getSelectListTheme()` | Get select list theme |
| `getSettingsListTheme()` | Get settings list theme |
| `subscribe(cb)` | Listen for theme changes |

### ChatContainer

| Constructor | `new ChatContainer({ themeManager, maxMessages?, autoScroll?, messageSpacing? })` |
| Method | `addMessage(component)` |
| Method | `removeMessage(component)` |
| Method | `clearMessages()` |
| Method | `getMessages()` |
| Static | `createChatBorder(width, char?)` |
| Static | `createSeparator(width, style?)` |

### FooterComponent

| Constructor | `new FooterComponent(themeManager, initialData?)` |
| Method | `updateData(data)` |
| Method | `setCwd(cwd)`, `setModel(model)`, `setTokenUsage(percentage)`, `setThinkingLevel(level)`, `setShowImages(show)` |
| Method | `addStatus(text)` / `removeStatus(text)` / `clearStatus()` |
| Method | `getData()` |

### DynamicBorder

| Constructor | `new DynamicBorder(themeManager, options?)` |
| Options | `borderStyle` ("single"/"double"/"rounded"/"heavy"/"ascii"), `title?`, `padding?` |
| Method | `setTitle(title)`, `setBorderStyle(style)` |
| Static | `createBorder(themeManager, component, options?)` |

### ScrollableContainer

A container that can scroll its children vertically.

| Constructor | `new ScrollableContainer(themeManager, viewportHeight?)` |
| Method | `setViewportHeight(height)` |
| Method | `scrollDown(lines?)`, `scrollUp(lines?)` |
| Method | `scrollToTop()`, `scrollToBottom()` |
| Method | `hasScrollbar()`, `getScrollPercent()`, `getScrollOffset()` |

### ProgressBar

Displays a horizontal progress bar with percentage.

| Constructor | `new ProgressBar(themeManager, width?, options?)` |
| Options | `filledChar?` (default "█"), `emptyChar?` (default "░"), `showPercentage?` (default true) |
| Method | `setProgress(percentage)` (0-100), `getProgress()` |
| Method | `setWidth(width)` |
| Note | Renders as a single-line `Container` |

### ModalComponent

| Constructor | `new ModalComponent(themeManager, options?)` |
| Options | `title?`, `width?`, `borderStyle?`, `closeOnEscape?` |
| Method | `show(tui)`, `hide()` |
| Method | `onClose(callback)` |
| Method | `getContent()` // returns inner `Container` to add children |

Helpers:

- `showModalMessage(tui, theme, message, options?)` → returns `ModalComponent`
- `showModalConfirm(tui, theme, message, options?)` → `Promise<boolean>`

### Utilities

All are pure functions:

```typescript
renderDiff(diff: string, width: number, theme: ThemeManager, options?: { showLineNumbers?: boolean }): string[]
truncateText(text: string, maxWidth: number, ellipsis?: string, theme?: ThemeManager): string
wrapText(text: string, width: number, theme: ThemeManager, role?: ThemeRole): string[]
padText(text: string, width: number, align?: "left"|"center"|"right", theme?: ThemeManager, role?: string): string
joinThemed(parts: string[], separator: string, theme: ThemeManager, separatorRole?: string): string
createProgressBar(percentage: number, width: number, theme: ThemeManager, options?: { filledChar?, emptyChar?, showPercentage? }): string
createTitledBox(title: string, content: string[], width: number, theme: ThemeManager, options?: { padding?, borderStyle? }): string[]
formatSize(bytes: number): string
formatDuration(ms: number): string
```

## Best Practices

1. **Initialize ThemeManager early**: Call `theme.initialize()` before creating components.
2. **Use provided components**: Compose with `ChatContainer`, `FooterComponent`, `DynamicBorder` instead of building from scratch.
3. **Cache renders**: If you create custom components, cache `render()` output and honor `invalidate()`.
4. **Respect line width**: Ensure every render line ≤ given width. Use `truncateToWidth` or `wrapTextWithAnsi` from pi-tui.
5. **Theme colors**: Use `theme.fg(role, text)` or re-exported pi-coding-agent theme functions. Avoid hardcoded ANSI.
6. **Overlay management**: Use `tui.showOverlay(component)` for dialogs; it handles focus and dismissal automatically.

## Frequently Asked Questions (FAQ)

<details>
<summary><b>Q: How do I change the theme dynamically?</b></summary>
<p>Use the <code>ThemeManager</code> singleton:</p>
<pre><code>import { ThemeManager } from "@mariozechner/pi-tui-professional";
const theme = ThemeManager.getInstance();
theme.setTheme("light"); // or "dark"
</code></pre>
<p>All subscribed components will re-render with the new theme.</p>
</details>

<details>
<summary><b>Q: My ChatContainer is slow with many messages. How can I improve performance?</b></summary>
<p>Set the <code>maxMessages</code> prop to limit history size (e.g., 100-200). The library automatically discards oldest messages beyond the limit. For very large histories, consider implementing virtual scrolling in custom components.</p>
</details>

<details>
<summary><b>Q: Do I need to install both pi-tui and pi-coding-agent separately?</b></summary>
<p>Yes. <code>@mariozechner/pi-tui-professional</code> declares them as <em>peer dependencies</em>. You must install them along with this package:</p>
<pre><code>npm install @mariozechner/pi-tui @mariozechner/pi-coding-agent @mariozechner/pi-tui-professional</code></pre>
</details>

<details>
<summary><b>Q: How do I add mouse support?</b></summary>
<p>See OPTIONAL_IMPROVEMENTS.md. Mouse support is planned for v1.1.0. Currently, the library is keyboard-only.</p>
</details>

<details>
<summary><b>Q: Can I use this in a browser?</b></summary>
<p>No. This package is designed for terminal/console environments (Node.js TUI). It relies on TTY capabilities.</p>
</details>

<details>
<summary><b>Q: How do I customize the appearance beyond the provided theme?</b></summary>
<p>The theme system uses roles (e.g., <code>"accent"</code>, <code>"foreground"</code>, <code>"muted"</code>). You can create a custom theme by extending the default themes. See <code>theme/theme.ts</code> in pi-coding-agent source for structure.</p>
</details>

<details>
<summary><b>Q: Is TypeScript required?</b></summary>
<p>The library is written in TypeScript and provides type declarations. You can use it from JavaScript, but TypeScript is highly recommended for best experience.</p>
</details>

<details>
<summary><b>Q: What is the performance like?</b></summary>
<p>Rendering is optimized; typical component renders in <em>&lt;25 µs</em>. The library uses render caching where appropriate. However, rendering thousands of lines (e.g., 10k+ messages) will impact performance. Keep history bounded.</p>
</details>

<details>
<summary><b>Q: How do I handle uncaught errors?</b></summary>
<p>Wrap your TUI startup in a try/catch. We recommend adding an error overlay using <code>ModalComponent</code>. Full error boundaries are planned for v1.2.0.</p>
</details>

<details>
<summary><b>Q: Where can I find the source code?</b></summary>
<p>Source is available in the repository: <code>src/</code>. This package is built on <code>pi-tui</code> and <code>pi-coding-agent</code> (see <code>llm-context/pi-mono/</code> for those sources).</p>
</details>

<details>
<summary><b>Q: How do I contribute?</b></summary>
<p>See <a href="CONTRIBUTING.md">CONTRIBUTING.md</a> for guidelines. We welcome PRs!</p>
</details>

---

## Development

```bash
# Build
npm run build

# Test
npm test

# Run example
npx tsx examples/basic-chat.ts
```

## License

MIT
