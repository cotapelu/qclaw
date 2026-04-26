# @piclaw/pi-tui

**Professional TUI Framework for AI Coding Assistants**

A comprehensive, batteries-included Terminal UI framework built on top of `@mariozechner/pi-tui` and `@mariozechner/pi-coding-agent`. Provides opinionated layout components, theme integration, and utilities to build production-ready coding assistant applications.

---

## Features

- **Complete UI Component Suite**: Access all UI components from both `pi-tui` and `pi-coding-agent` through a single import.
- **Custom Layout Components**: Ready-to-use containers (`ChatContainer`, `ScrollableContainer`, `DynamicBorder`, `ProgressBar`, `FooterComponent`, `ModalComponent`).
- **Integrated Theming**: `ThemeManager` singleton with semantic color roles, automatic dark/light detection, and reactive updates.
- **Chat Management**: Specialized `ChatContainer` with message spacing, limiting, and built-in support for all message types (user, assistant, tool execution, bash).
- **Scrollable Viewports**: `ScrollableContainer` with scrollbar support for large content.
- **Batteries-Included Utilities**: `renderDiff`, `formatSize`, `formatDuration`, `createTitledBox`, and more.
- **Single Import**: Everything you need from one package — no need to track multiple dependencies.

---

## Installation

```bash
npm install @piclaw/pi-tui
```

This package depends on `@mariozechner/pi-tui` and `@mariozechner/pi-coding-agent` (^0.70.2). Peer dependencies are automatically installed.

---

## Quick Start

```typescript
import {
  TUI,
  ProcessTerminal,
  ThemeManager,
  ChatContainer,
  FooterComponent,
  DynamicBorder,
  UserMessageComponent,
  AssistantMessageComponent,
  initTheme,
} from "@piclaw/pi-tui";

// Initialize TUI
const tui = new TUI(new ProcessTerminal());

// Initialize theme
const theme = ThemeManager.getInstance();
theme.initialize("dark");

// Create layout
const chat = new ChatContainer({ themeManager: theme, maxMessages: 100 });
const footer = new FooterComponent(theme, { cwd: process.cwd() });

// Add border around chat
const chatBorder = new DynamicBorder(theme, {
  title: "Chat",
  borderStyle: "rounded",
  padding: 1,
});
chatBorder.addChild(chat);

// Compose UI
const layout = new Container();
layout.addChild(chatBorder);
layout.addChild(footer);
tui.addChild(layout);

// Add messages
chat.addMessage(new UserMessageComponent("Hello!", theme));
chat.addMessage(new AssistantMessageComponent("Hi there! How can I help?", theme));

// Start
tui.run();
```

---

## Philosophy

`@piclaw/pi-tui` is **more than a re-export package**. It's a **composable TUI framework** that:

1. **Re-exports** all UI components and primitives from `pi-tui` and `pi-coding-agent` (see [Exports](#exports)).
2. **Provides custom layout components** that don't exist in the base packages (e.g., `ChatContainer`, `FooterComponent`, `ScrollableContainer`).
3. **Integrates the theme system** via `ThemeManager` for consistent styling across all components.
4. **Offers utilities** for common tasks (diff rendering, text formatting, etc.).

This allows you to build sophisticated TUI applications with minimal code, leveraging battle-tested components while maintaining full control.

---

## Core Components

### Layout & Containers

| Component | Description |
|-----------|-------------|
| `ChatContainer` | Manages message list with spacing, maxMessages limit, and built-in support for `UserMessageComponent`, `AssistantMessageComponent`, `ToolExecutionComponent`, `BashExecutionComponent`. |
| `ScrollableContainer` | Viewport with vertical scrolling and optional scrollbar. |
| `DynamicBorder` | Themed border with selectable style (`single`, `double`, `rounded`, `heavy`, `ascii`) and optional title. |
| `ProgressBar` | Progress indicator with color-coded percentage (success/accent/warning/error). |
| `FooterComponent` | Status bar showing cwd, git branch, model, token usage, thinking level, session ID, and custom status items. |
| `ModalComponent` | Base modal dialog with overlay support. Includes `showModalMessage()` and `showModalConfirm()` helpers. |
| `Container`, `Text`, `Spacer`, `Box` | Re-exported from `@mariozechner/pi-tui`. |

### Message Components (from pi-coding-agent)

| Component | Purpose |
|-----------|---------|
| `UserMessageComponent` | User input with markdown rendering. |
| `AssistantMessageComponent` | Assistant replies with thinking blocks. |
| `ToolExecutionComponent` | Tool call display (expandable, syntax highlighting). |
| `BashExecutionComponent` | Bash command execution output. |
| `BranchSummaryMessageComponent` | Context compaction summary. |
| `CompactionSummaryMessageComponent` | Auto-compaction notification. |
| `SkillInvocationMessageComponent` | Skill command rendering. |
| `CustomMessageComponent` | Extensible custom message type. |

### Selectors & Dialogs

| Component | Use |
|-----------|-----|
| `ModelSelectorComponent` | Choose AI model. |
| `SettingsSelectorComponent` | Configure settings. |
| `ThemeSelectorComponent` | Pick theme. |
| `ThinkingSelectorComponent` | Set thinking level. |
| `ExtensionSelectorComponent` | Select extension. |
| `LoginDialogComponent` / `OAuthSelectorComponent` | Authentication flows. |
| `SessionSelectorComponent` | Resume previous session. |
| `ShowImagesSelectorComponent` | Toggle image display. |
| `TreeSelectorComponent` | Navigate session tree. |
| `UserMessageSelectorComponent` | Pick user message for forking. |

### Input & Editors

| Component | Description |
|-----------|-------------|
| `CustomEditor` (alias `PiCustomEditor`) | Enhanced multiline editor with autocomplete, history, and keybindings. |
| `ExtensionEditorComponent` | Editor for extension inputs. |
| `ExtensionInputComponent` | Single-line input for extensions. |

### Loaders & Indicators

| Component | Purpose |
|-----------|---------|
| `Loader` | Animated spinner with message. |
| `BorderedLoader` | Loader inside a bordered box. |
| `CountdownTimer` | Countdown display (retry, compaction). |

### Utilities

- **Theme**: `ThemeManager`, `themeText`, `themedBorder`.
- **Text**: `renderDiff`, `truncateText`, `wrapText`, `padText`, `joinThemed`.
- **Formatting**: `formatSize`, `formatDuration`.
- **Layout**: `createProgressBar`, `createTitledBox`, `createChatBorder`, `createSeparator`.

---

## Theming

`ThemeManager` is a singleton that wraps the `pi-coding-agent` theme system:

```typescript
const theme = ThemeManager.getInstance();
theme.initialize("dark"); // or "light" or "auto"

// Apply semantic colors
const errorText = theme.fg("error", "Something went wrong");
const accent = theme.fg("accent", "Highlight");

// Subscribe to theme changes
const unsubscribe = theme.subscribe(() => {
  tui.requestRender();
});

// Switch theme at runtime
theme.setTheme("light");
```

**Semantic color roles**:
`accent`, `border`, `muted`, `success`, `warning`, `error`, `info`, `userMessage`, `assistantMessage`, `toolTitle`, `toolOutput`, `thinkingText`, `dim`, `text`, `foreground`.

Access the underlying theme objects:
```typescript
const mdTheme = theme.getMarkdownTheme();
const selectTheme = theme.getSelectListTheme();
const settingsTheme = theme.getSettingsListTheme();
```

---

## Exports

### From `@mariozechner/pi-tui` (low-level primitives)

All core TUI classes and utilities:
- `TUI`, `Container`, `Text`, `Box`, `Spacer`, `Input`, `Editor`, `Image`, `Markdown`, `SelectList`, `SettingsList`, `TruncatedText`, `Loader`, `CancellableLoader`.
- Keybindings: `KeybindingsManager`, `getKeybindings`, `setKeybindings`, `TUI_KEYBINDINGS`, `Key`, `matchesKey`, `parseKey`, etc.
- Terminal: `ProcessTerminal`, `Terminal`, image support functions, capabilities.
- Autocomplete: `CombinedAutocompleteProvider`, `AutocompleteItem`, `AutocompleteProvider`, `SlashCommand`.
- Types: `Component`, `Focusable`, `EditorOptions`, `EditorTheme`, `MarkdownTheme`, `SelectListTheme`, `SettingsListTheme`, `OverlayOptions`, and many more.
- Utilities: `truncateToWidth`, `visibleWidth`, `wrapTextWithAnsi`, `fuzzyFilter`, `fuzzyMatch`.

### From `@mariozechner/pi-coding-agent` (specialized UI)

- **Messages**: `UserMessageComponent`, `AssistantMessageComponent`, `ToolExecutionComponent`, `BashExecutionComponent`, `CustomMessageComponent`, `BranchSummaryMessageComponent`, `CompactionSummaryMessageComponent`, `SkillInvocationMessageComponent`.
- **Selectors**: `ModelSelectorComponent`, `SettingsSelectorComponent`, `ThemeSelectorComponent`, `ThinkingSelectorComponent`, `ExtensionSelectorComponent`, `LoginDialogComponent`, `OAuthSelectorComponent`, `SessionSelectorComponent`, `ShowImagesSelectorComponent`, `TreeSelectorComponent`, `UserMessageSelectorComponent`.
- **Input**: `CustomEditor` (also exported as `PiCustomEditor`), `ExtensionEditorComponent`, `ExtensionInputComponent`.
- **Layout**: `DynamicBorder` (also available in our custom layer).
- **Footer**: `FooterComponent` (also exported as `PiFooterComponent` — note we provide our own `FooterComponent` in the custom layer).
- **Loaders**: `BorderedLoader`.
- **Utilities**: `keyHint`, `keyText`, `rawKeyHint`, `renderDiff`, `truncateToVisualLines`.
- **Advanced**: `ArminComponent`, `CustomEditor` (lower-level).
- **Theme**: `initTheme`, `getMarkdownTheme`, `getSelectListTheme`, `getSettingsListTheme`, `getLanguageFromPath`, `highlightCode`, `Theme`.

### Custom Layer (our own)

- `ThemeManager`, `themeText`, `themedBorder`.
- `ChatContainer` (layout version), `createChatBorder`, `createSeparator`.
- `FooterComponent` (our custom status bar), `createSimpleFooter`.
- `ScrollableContainer`, `createScrollableContainer`.
- `ProgressBar`, `createProgressBarComponent`.
- `DynamicBorder`, `createBorder`.
- `ModalComponent`, `showModalMessage`, `showModalConfirm`.
- Utilities: `renderDiff`, `truncateText`, `wrapText`, `padText`, `joinThemed`, `createProgressBar`, `createTitledBox`, `formatSize`, `formatDuration`.

---

## TypeScript Support

Full TypeScript definitions included. All exports are strictly typed.

---

## Development

```bash
# Build
npm run build

# Test
npm test

# Type-check
npm run type-check
```

---

## Dependencies

- Runtime: `@mariozechner/pi-tui` (^0.70.2), `@mariozechner/pi-coding-agent` (^0.70.2)
- Peer: `@mariozechner/pi-tui` (^0.70.2), `@mariozechner/pi-coding-agent` (^0.70.2)

Both dependencies provide the actual implementations. This package merely re-exports and extends them.

---

## License

Apache-2.0

---

## Related

- [`@mariozechner/pi-tui`](https://github.com/mariozechner/pi-mono/tree/main/packages/tui) — Low-level TUI primitives.
- [`@mariozechner/pi-coding-agent`](https://github.com/mariozechner/pi-mono/tree/main/packages/coding-agent) — Coding agent with UI components and session management.

---

## Contributing

This package is part of the Qcoder/qclaw monorepo. See root `AGENTS.md` for development guidelines.
