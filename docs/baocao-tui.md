# BÁO CÁO: Sử dụng pi-tui và pi-coding-agent để phát triển coding agent

## 1. Tổng quan

### 1.1 Two-Layer Architecture

```
┌─────────────────────────────────────────────┐
│  Your Coding Agent                          │
│  (Business Logic + UI Composition)          │
├─────────────────────────────────────────────┤
│ @mariozechner/pi-coding-agent              │
│  - High-level components                    │
│  - Theme system (60+ colors)                │
│  - Extension API                            │
│  - Session management                       │
├─────────────────────────────────────────────┤
│ @mariozechner/pi-tui                       │
│  - Engine: diff rendering, overlays         │
│  - Building blocks: Container, Box, Text    │
│  - Editor, Markdown, SelectList, Loader     │
│  - Key handling, IME, terminal caps         │
└─────────────────────────────────────────────┘
```

**pi-tui** = Foundation (engine + low-level components)
**pi-coding-agent** = High-level UI + theme + business abstractions

### 1.2 How to Use

- **Direct pi-tui**: Build custom UI from scratch (rare)
- **Compose coding-agent components**: Fast, consistent UI (recommended)
- **Mix**: Use pi-tui components inside coding-agent components

**Rule**: Never reimplement - compose existing components.

### 1.3 Quick Reference

| Need | Use |
|------|-----|
| TUI lifecycle | `TUI`, `ProcessTerminal` from `pi-tui` |
| Container/layout | `Container`, `Box`, `Spacer` from `pi-tui` |
| Text display | `Text`, `TruncatedText`, `Markdown` from `pi-tui` |
| User messages | `UserMessageComponent` from `coding-agent` |
| Assistant messages | `AssistantMessageComponent` from `coding-agent` |
| Tool output | `ToolExecutionComponent`, `BashExecutionComponent` from `coding-agent` |
| Input | `CustomEditor`, `ExtensionInputComponent` from `coding-agent` |
| Footer | `FooterComponent` from `coding-agent` |
| Selectors | `*SelectorComponent` từ `coding-agent` |
| Loaders | `Loader`, `BorderedLoader`, `CancellableLoader` |
| Theme | `Theme` class + utilities từ `coding-agent` |

---

## 2. pi-tui Components (Low-Level Building Blocks)

**Source**: `llm-context/pi-mono/packages/tui/src/`

### 2.1 Core Engine

| Component | File | Purpose |
|-----------|------|---------|
| `TUI` | `tui.ts` | Main orchestrator - diff rendering, input handling, overlays |
| `ProcessTerminal` | `terminal.ts` | Terminal I/O via child process |
| `Terminal` (interface) | `terminal.ts` | Abstraction for testing |
| `Container` | `components/` | Layout container, manages children |

**Key methods**:
- `tui.addChild(component)`, `tui.start()`, `tui.stop()`, `tui.requestRender()`
- `container.addChild()`, `container.removeChild()`
- Automatic diff rendering (CSI 2026)

### 2.2 Layout Components

| Component | File | Purpose |
|-----------|------|---------|
| `Box` | `components/box.ts` | Padding + background color |
| `Spacer` | `components/spacer.ts` | Empty space (width/height) |

### 2.3 Text Components

| Component | File | Purpose |
|-----------|------|---------|
| `Text` | `components/text.ts` | Multi-line text, optional alignment |
| `TruncatedText` | `components/truncated-text.ts` | Text with ellipsis if too long |

### 2.4 Input Components

| Component | File | Purpose |
|-----------|------|---------|
| `Input` | `components/input.ts` | Single-line text input |
| `Editor` | `components/editor.ts` | Multi-line editor with autocomplete |

**Editor features**:
- Vim/Emacs keybindings
- Autocomplete via `AutocompleteProvider`
- Undo/redo stack
- IME support (implements `Focusable`)
- Configurable via `EditorOptions`, `EditorTheme`

### 2.5 Markup Components

| Component | File | Purpose |
|-----------|------|---------|
| `Markdown` | `components/markdown.ts` | Markdown rendering (bold, italic, code, codeblocks) |
| `Image` | `components/image.ts` | Kitty/iTerm2 inline images |

**Markdown theming**:
```typescript
interface MarkdownTheme {
  heading: (text: string) => string;
  link: (text: string) => string;
  linkUrl?: (text: string) => string;
  code: (text: string) => string;
  codeBlock: (text: string) => string;
  quote: (text: string) => string;
  bold: (text: string) => string;
  italic: (text: string) => string;
  highlightCode?: (code: string, lang?: string) => string[];
}
```

### 2.6 Selection Components

| Component | File | Purpose |
|-----------|------|---------|
| `SelectList` | `components/select-list.ts` | Vertical list selection (up/down, type-to-filter) |
| `SettingsList` | `components/settings-list.ts` | Settings with cycling values, submenus |

**SelectList theming**:
```typescript
interface SelectListTheme {
  selectedPrefix: (text: string) => string;
  selectedText: (text: string) => string;
  description: (text: string) => string;
  scrollInfo: (text: string) => string;
  noMatch: (text: string) => string;
}
```

**SettingsList theming**:
```typescript
interface SettingsListTheme {
  label: (text: string, selected: boolean) => string;
  value: (text: string, selected: boolean) => string;
  description: (text: string) => string;
  cursor: string;
  hint: (text: string) => string;
}
```

### 2.7 Feedback Components

| Component | File | Purpose |
|-----------|------|---------|
| `Loader` | `components/loader.ts` | Spinner + message (non-blocking) |
| `CancellableLoader` | `components/cancellable-loader.ts` | Loader with Escape to cancel |

### 2.8 Utilities

| Export | File | Purpose |
|--------|------|---------|
| `matchesKey(data, keyDef)` | `keys.ts` | Key matching ("ctrl+c", "enter", "shift+tab") |
| `Key` enum | `keys.ts` | Predefined key constants |
| `CombinedAutocompleteProvider` | `autocomplete.ts` | Combines multiple providers |
| `getCapabilities()`, `detectCapabilities()` | `terminal-image.ts` | Terminal feature detection |
| `truncateToWidth()`, `wrapTextWithAnsi()` | `utils.ts` | Text handling |
| `getKeybindings()`, `setKeybindings()` | `keybindings.ts` | Keybinding management |

### 2.9 Overlay System

```typescript
const handle = tui.showOverlay(component, {
  width: 60,
  anchor: 'center' | 'top' | 'bottom' | 'left' | 'right',
  margin: 2
});
handle.focus(); // TUI auto-manages focus stack
handle.hide();   // Remove overlay
```

**OverlayAnchor**: Position relative to parent bounds
**OverlayMargin**: Distance from anchor edge

### 2.10 Important Interfaces

```typescript
interface Component {
  render(width: number): string[];  // Must fit width
  handleInput?(data: string): void; // Called when focused
  invalidate?(): void;              // Clear cached render
}

interface Focusable {
  focused: boolean; // Set by TUI/Container
}
```

**Cursor positioning**: Use `CURSOR_MARKER` constant in render to place hardware cursor.

---

## 3. pi-coding-agent Components (High-Level UI)

**Source**: `llm-context/pi-mono/packages/coding-agent/src/modes/interactive/components/`

### 3.1 Message Components

| Component | File | Purpose |
|-----------|------|---------|
| `UserMessageComponent` | `user-message.ts` | User message with background, OSC 133 zones |
| `AssistantMessageComponent` | `assistant-message.ts` | Assistant response with thinking toggle |
| `ToolExecutionComponent` | `tool-execution.ts` | Tool call with expand/collapse, images, custom renderers |
| `BashExecutionComponent` | `bash-execution.ts` | Bash output với syntax highlight |
| `CustomMessageComponent` | `custom-message.ts` | Generic custom message |
| `BranchSummaryMessageComponent` | `branch-summary-message.ts` | Branch summary display |
| `CompactionSummaryMessageComponent` | `compaction-summary-message.ts` | Compaction summary |
| `SkillInvocationMessageComponent` | `skill-invocation-message.ts` | Skill call display |

**Pattern**:
```typescript
const msg = new AssistantMessageComponent(undefined, false, getMarkdownTheme());
container.addChild(msg);
msg.updateContent(content); // Update later
```

### 3.2 Input Components

| Component | File | Purpose |
|-----------|------|---------|
| `CustomEditor` | `custom-editor.ts` | Editor with app keybindings (Ctrl+D, Ctrl+E, etc.) |
| `ExtensionInputComponent` | `extension-input.ts` | Single-line input với border + hints |
| `ExtensionEditorComponent` | `extension-editor.ts` | Editor wrapper with status line |

**CustomEditor extends Editor** (from pi-tui):
- Adds: Ctrl+D (duplicate line), Escape (clear), Ctrl+E (edit multi-line)
- Paste image support
- Requires `TUI` instance in constructor

### 3.3 Selector Components

| Component | File | Purpose |
|-----------|------|---------|
| `ExtensionSelectorComponent` | `extension-selector.ts` | Generic list selector (base) |
| `ModelSelectorComponent` | `model-selector.ts` | Model selection |
| `SettingsSelectorComponent` | `settings-selector.ts` | Settings với cycling/submenus |
| `ThemeSelectorComponent` | `theme-selector.ts` | Theme selection |
| `SessionSelectorComponent` | `session-selector.ts` | Session management |
| `TreeSelectorComponent` | `tree-selector.ts` | Tree navigation |
| `ThinkingSelectorComponent` | `thinking-selector.ts` | Thinking level toggle |
| `ShowImagesSelectorComponent` | `show-images-selector.ts` | Toggle images |
| `ScopedModelsSelectorComponent` | `scoped-models-selector.ts` | Models with scopes |
| `UserMessageSelectorComponent` | `user-message-selector.ts` | Select from user messages |

**Pattern**:
```typescript
const selector = new ModelSelectorComponent(models, currentModel, {
  onSelect: (model) => { /* handle */ }
});
const handle = tui.showOverlay(selector, { width: 60 });
```

### 3.4 Feedback & Layout

| Component | File | Purpose |
|-----------|------|---------|
| `BorderedLoader` | `bordered-loader.ts` | Loader inside themed border |
| `CountdownTimer` | `countdown-timer.ts` | Countdown display |
| `DynamicBorder` | `dynamic-border.ts` | Themed border with box-drawing chars |

### 3.5 Dialogs

| Component | File | Purpose |
|-----------|------|---------|
| `LoginDialogComponent` | `login-dialog.ts` | Authentication login |
| `OAuthSelectorComponent` | `oauth-selector.ts` | OAuth provider selection |

### 3.6 Footer

| Component | File | Purpose |
|-----------|------|---------|
| `FooterComponent` | `footer.ts` | Status bar: pwd, git branch, tokens, model, thinking level |

**Data source**: Uses `ReadonlyFooterDataProvider` (exports from core) to get:
- Current working directory (truncated)
- Git branch (if in repo)
- Token usage (context %)
- Current model
- Thinking level
- Extension statuses

### 3.7 Utilities

| Export | File | Purpose |
|--------|------|---------|
| `keyHint()`, `keyText()`, `rawKeyHint()` | `keybinding-hints.ts` | Format keybindings for display |
| `truncateToVisualLines()`, `VisualTruncateResult` | `visual-truncate.ts` | CJK-aware truncation |
| `renderDiff()`, `RenderDiffOptions` | `diff.ts` | Render unified diff |

### 3.8 All Exports Summary

From `src/modes/interactive/components/index.ts`:
```
ArminComponent
AssistantMessageComponent
BashExecutionComponent
BorderedLoader
BranchSummaryMessageComponent
CompactionSummaryMessageComponent
CustomEditor
CustomMessageComponent
DynamicBorder
ExtensionEditorComponent
ExtensionInputComponent
ExtensionSelectorComponent
FooterComponent
LoginDialogComponent
ModelSelectorComponent
OAuthSelectorComponent
ScopedModelsSelectorComponent
SessionSelectorComponent
SettingsSelectorComponent
ShowImagesSelectorComponent
SkillInvocationMessageComponent
ThemeSelectorComponent
ThinkingSelectorComponent
ToolExecutionComponent
TreeSelectorComponent
UserMessageComponent
UserMessageSelectorComponent
CountdownTimer
DaxnutsComponent
keyHint, keyText, rawKeyHint
renderDiff, RenderDiffOptions
truncateToVisualLines, VisualTruncateResult
```

---

### 4.6 Bash Mode Border

```typescript
const bashBorder = theme.getBashModeBorderColor()("─".repeat(width));
```

## 5. Quick Start: Build Your TUI

### 5.1 Basic Structure

```typescript
import { TUI, ProcessTerminal, Container } from "@mariozechner/pi-tui";
import {
  initTheme,
  getMarkdownTheme,
  getEditorTheme,
  CustomEditor,
  UserMessageComponent,
  AssistantMessageComponent,
  FooterComponent,
  theme
} from "@mariozechner/pi-coding-agent";
import { matchesKey, Key } from "@mariozechner/pi-tui";

class MyAgent {
  private tui: TUI;
  private chatContainer: Container;
  private editor: CustomEditor;
  private footer: FooterComponent;

  constructor() {
    const terminal = new ProcessTerminal();
    this.tui = new TUI(terminal);

    // Initialize theme (dark/light/auto)
    initTheme("dark"); // or "light", undefined = auto-detect

    // Layout
    this.chatContainer = new Container();
    this.tui.addChild(this.chatContainer);

    // Custom editor
    this.editor = new CustomEditor(this.tui, getEditorTheme());
    this.tui.addChild(this.editor);

    // Footer
    this.footer = new FooterComponent(/* footerData */);
    this.tui.addChild(this.footer);

    // Input handler
    this.tui.onInput = (data) => this.handleInput(data);
  }

  private handleInput(data: string): void {
    if (matchesKey(data, Key.enter)) {
      const input = this.editor.getValue();
      this.editor.setValue("");
      this.processInput(input);
    }
  }

  private async processInput(input: string): Promise<void> {
    // User message
    const userMsg = new UserMessageComponent(input);
    this.chatContainer.addChild(userMsg);

    // Assistant response (streaming)
    const assistantMsg = new AssistantMessageComponent(undefined, false, getMarkdownTheme());
    this.chatContainer.addChild(assistantMsg);

    // Stream content
    for await (const chunk of this.generateResponse(input)) {
      assistantMsg.updateContent(chunk);
      this.tui.requestRender();
    }

    this.tui.requestRender();
  }

  start(): void {
    this.tui.start();
  }
}
```

### 5.2 Adding Overlays

```typescript
import { ModelSelectorComponent } from "@mariozechner/pi-coding-agent";

// Show model selector
const selector = new ModelSelectorComponent(models, currentModel, {
  onSelect: (model) => {
    this.setModel(model);
    handle.hide();
  }
});

const handle = this.tui.showOverlay(selector, {
  width: 60,
  anchor: 'center',
  margin: 2
});
```

### 5.3 Adding Loaders

```typescript
import { Loader } from "@mariozechner/pi-tui";

const loader = new Loader(
  this.tui,
  (s) => theme.fg("accent", s), // spinner
  (s) => theme.fg("muted", s),   // message
  "Thinking..."
);
loader.start();

// Do async work
await this.longOperation();

loader.stop();
```

### 5.4 Images in Messages

```typescript
import { Image } from "@mariozechner/pi-tui";
import { getCapabilities } from "@mariozechner/pi-tui";

const caps = getCapabilities();
if (caps.images) {
  const img = new Image(base64Data, "image/png", { /* options */ }, { maxWidthCells: 60 });
  messageComponent.addChild(img);
}
```

### 5.5 Tool Execution

```typescript
import { ToolExecutionComponent } from "@mariozechner/pi-coding-agent";

const tool = new ToolExecutionComponent(
  toolName,
  toolCallId,
  args,
  { showImages: true },
  toolDefinition, // optional custom render hooks
  this.tui,
  process.cwd()
);
this.chatContainer.addChild(tool);

// Later, when result arrives
if (result.success) {
  tool.updateResult(result);
} else {
  tool.updateResult({ ...result, error: result.error.message });
}
```

### 5.6 Theme Switching

```typescript
import { setTheme, onThemeChange } from "@mariozechner/pi-coding-agent";

// Switch theme
const result = setTheme("light");
if (!result.success) {
  console.error("Failed:", result.error);
}

// Listen for changes
onThemeChange(() => {
  this.tui.requestRender(); // Re-render with new theme
});
``` 

## 6. Important Notes

### 6.1 Caching

Components should cache render output:

```typescript
private cachedWidth?: number;
private cachedLines?: string[];

render(width: number): string[] {
  if (this.cachedLines && this.cachedWidth === width) return this.cachedLines;
  this.cachedLines = this.computeLines(width);
  this.cachedWidth = width;
  return this.cachedLines;
}

invalidate(): void {
  this.cachedWidth = undefined;
  this.cachedLines = undefined;
}
```

### 6.2 Line Width

Always ensure `render()` output width ≤ given width:

```typescript
import { truncateToWidth, wrapTextWithAnsi } from "@mariozechner/pi-tui";

const lines = wrapTextWithAnsi(longText, width);
// or
const line = truncateToWidth(text, width, "...");
```

### 6.3 Focus Propagation

If your component contains a `Focusable` child and implements `Focusable`:

```typescript
class MyDialog extends Container implements Focusable {
  private input: Input;
  private _focused = false;

  get focused(): boolean { return this._focused; }
  set focused(value: boolean) {
    this._focused = value;
    this.input.focused = value; // propagate
  }
}
```

### 6.4 Color Usage

Never hardcode ANSI codes:

```typescript
// ✅ Good
const text = theme.fg("accent", "Hello");

// ❌ Bad
const text = "\x1b[31mHello\x1b[0m"; // hardcoded red
```

## 7. Other Essential Exports (Business Logic)

**Source**: `llm-context/pi-mono/packages/coding-agent/src/index.ts`

### 7.1 Session Management

```typescript
import { AgentSession, SessionManager } from "@mariozechner/pi-coding-agent";
```

- `AgentSession`: Core LLM interaction loop, tool execution, message history
- `SessionManager`: Persistent session storage, context management, compaction
- Types: `SessionEntry`, `SessionContext`, `SessionInfo`, etc.

**Location**: `src/core/agent-session.ts`, `src/core/session-manager.ts`

### 7.2 Tools

```typescript
import {
  createReadTool,
  createEditTool,
  createBashTool,
  createGrepTool,
  createLsTool,
  createFindTool,
  createWriteTool,
  type BashToolInput,
  type EditToolInput,
  // ...
} from "@mariozechner/pi-coding-agent";
```

- Tool definition factories (create tool definitions with default options)
- Operation types: `BashOperations`, `EditOperations`, `ReadOperations`, etc.
- Truncation utilities: `truncateHead()`, `truncateTail()`, `truncateLine()`

**Location**: `src/core/tools/index.ts`

### 7.3 Compaction & Summarization

```typescript
import { compact, generateBranchSummary, shouldCompact } from "@mariozechner/pi-coding-agent";
```

- `compact()`: Reduce context size by removing old entries
- `generateBranchSummary()`: Create summaries for branches
- `shouldCompact()`: Determine if compaction needed
- `DEFAULT_COMPACTION_SETTINGS`

**Location**: `src/core/compaction/index.ts`

### 7.4 Extension API

```typescript
import {
  Extension,
  ExtensionRuntime,
  defineTool,
  createExtensionRuntime,
  type ExtensionContext,
  type ExtensionActions,
} from "@mariozechner/pi-coding-agent";
```

- Build custom extensions (tools, slash commands, UI widgets)
- Event system: subscribe to agent events
- Hooks: `beforeAgentStart`, `beforeProviderRequest`, etc.

**Location**: `src/core/extensions/index.ts`

### 7.5 Skills

```typescript
import { loadSkills, type Skill } from "@mariozechner/pi-coding-agent";
```

- Load reusable skill definitions (prompt + tools) from directories
- Skill format: frontmatter + markdown prompt + tool definitions

**Location**: `src/core/skills.ts`

### 7.6 Auth & Model Registry

```typescript
import { AuthStorage, ModelRegistry } from "@mariozechner/pi-coding-agent";
```

- `AuthStorage`: Store API keys, OAuth credentials
- `ModelRegistry`: Discover available models from providers

**Location**: `src/core/auth-storage.ts`, `src/core/model-registry.ts`

### 7.7 SDK (Programmatic Usage)

```typescript
import {
  createAgentSession,
  createBashTool,
  createCodingTools,
  type CreateAgentSessionOptions,
} from "@mariozechner/pi-coding-agent";
```

- Embed coding agent in your own app
- No TUI required (headless mode)

**Location**: `src/core/sdk.ts`

### 7.8 Settings & Resource Management

- `SettingsManager`: User settings (compaction, images, retry)
- `DefaultResourceLoader`: Load project context files
- `DefaultPackageManager`: Package/dependency analysis

**Location**: `src/core/settings-manager.ts`, `src/core/resource-loader.ts`, `src/core/package-manager.ts`

### 7.9 Event Bus

```typescript
import { createEventBus, type EventBus } from "@mariozechner/pi-coding-agent";
```

- Internal event system for decoupled communication

**Location**: `src/core/event-bus.ts`

## 8. Development Workflow

1. **Read source** in `llm-context/pi-mono/packages/` when unsure
2. **Check examples** in coding-agent tests: `llm-context/pi-mono/packages/coding-agent/tests/`
3. **Compose** existing components - never reinvent
4. **Run tests**: `npm test` (vitest)
5. **Build**: `npm run build`
6. **Manual test**: `node dist/cli.js` or your custom TUI

## 9. Reference Links

- pi-tui source: `llm-context/pi-mono/packages/tui/src/`
- coding-agent source: `llm-context/pi-mono/packages/coding-agent/src/`
- Exports index: `src/index.ts` trong mỗi package
- Theme examples: `src/modes/interactive/theme/{dark,light}.json`
- Component examples: `src/modes/interactive/components/*.ts`
- Tests: `tests/` folders in each package

## 10. Conclusion

You now have:
- ✅ Foundation (pi-tui): TUI engine, components, utilities
- ✅ High-level UI (coding-agent): Messages, tool rendering, selectors, footer
- ✅ Theme system: 60+ colors, theming adapters, file watcher
- ✅ Business logic: Sessions, tools, compaction, extensions, skills
- ✅ Patterns: How to compose, not reinvent

Build your coding agent by **composing** these building blocks. Study existing components in `llm-context/` for real-world patterns. Avoid reimplementing - leverage the ecosystem.

**Next step**:
1. Copy this file as your reference
2. Read component source files you need (links provided above)
3. Start coding: TUI + Container + Editor + Footer + Messages
4. Add overlays for selectors
5. Add loaders for async ops
6. Integrate AgentSession for LLM logic
7. Theme everything consistently

Done.
```

### 4.5 Autocomplete

```typescript
import { CombinedAutocompleteProvider } from "@mariozechner/pi-tui";
import { BUILTIN_SLASH_COMMANDS } from "@mariozechner/pi-coding-agent";

const provider = new CombinedAutocompleteProvider(
  BUILTIN_SLASH_COMMANDS,
  process.cwd()
);
this.editor.setAutocompleteProvider(provider);
```

### 4.6 Theme switching

```typescript
import { setTheme, onThemeChange } from "@mariozechner/pi-coding-agent";

// Change theme
setTheme("light");

// Listen for changes
onThemeChange(() => {
  // Re-render components với theme mới
  this.tui.requestRender();
});
```

### 4.7 Images

```typescript
import { getCapabilities, Image } from "@mariozechner/pi-tui";

const caps = getCapabilities();
if (caps.images) {
  const img = new Image(base64Data, "image/png", {
    fallbackColor: (s) => theme.fg("muted", s)
  }, {
    maxWidthCells: 60
  });
  container.addChild(img);
}
```

---

## 5. Best practices

### 5.1 Never reinvent

- **Diff-rendering**: Luôn dùng `TUI` và `requestRender()`. Không tự implement render loop.
- **Key handling**: Dùng `getKeybindings().matches()` hoặc `matchesKey()`.
- **Overlay**: Dùng `tui.showOverlay()`, không tự quản lý focus stack.
- **Terminal capabilities**: Dùng `detectCapabilities()`, `getCapabilities()`.
- **IME support**: Nếu component có cursor, implements `Focusable` và propagate focus state.

### 5.2 Component composition

Ưu tiên compose existing components thay vì custom render:

```typescript
// Good
class MyDialog extends Container {
  constructor() {
    super();
    this.addChild(new DynamicBorder());
    this.addChild(new Spacer(1));
    this.addChild(new Text("Title", 1, 0));
    this.addChild(new ExtensionInputComponent(...));
    this.addChild(new DynamicBorder());
  }
}

// Avoid
class MyDialog implements Component {
  render(width: number): string[] {
    // Manual border, padding - error-prone
  }
}
```

### 5.3 Theme consistency

Luôn dùng theme functions, không hardcode ANSI:

```typescript
// Good
const text = theme.fg("accent", "Hello");

// Bad
const text = "\x1b[31mHello\x1b[0m"; // Hardcoded red
```

### 5.4 Line width discipline

Component `render()` phải đảm bảo mỗi line ≤ width. Dùng:

```typescript
import { truncateToWidth, wrapTextWithAnsi } from "@mariozechner/pi-tui";

const lines = wrapTextWithAnsi(longText, width);
// hoặc
const line = truncateToWidth(text, width, "...");
```

### 5.5 Caching

Component nên cache render output:

```typescript
class CachedComponent implements Component {
  private cachedWidth?: number;
  private cachedLines?: string[];

  render(width: number): string[] {
    if (this.cachedLines && this.cachedWidth === width) {
      return this.cachedLines;
    }
    this.cachedLines = computeLines(width);
    this.cachedWidth = width;
    return this.cachedLines;
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }
}
```

### 5.6 Focus propagation

Container có child implement `Focusable` phải propagate focus:

```typescript
class MyDialog extends Container implements Focusable {
  private input: Input;

  get focused(): boolean { return this._focused; }
  set focused(value: boolean) {
    this._focused = value;
    this.input.focused = value; // Propagate
  }
}
```

---

## 6. Checklist khi phát triển coding-agent mới

- [ ] **Không** implement custom rendering engine - dùng `TUI`
- [ ] **Không** implement key detection - dùng `matchesKey()` / `getKeybindings().matches()`
- [ ] **Không** implement overlay system - dùng `tui.showOverlay()`
- [ ] **Không** implement terminal capabilities - dùng `getCapabilities()`
- [ ] **Không** implement Editor từ scratch - extend `Editor` hoặc compose `Input`
- [ ] **Không** hardcode colors - dùng theme.fg()/bg()
- [ ] **Không** ignore line width - dùng `truncateToWidth()`/`wrapTextWithAnsi()`
- [ ] **Không** ignore IME - implement `Focusable` nếu có cursor
- [ ] **Sử dụng** pi-tui components làm building blocks
- [ ] **Sử dụng** coding-agent theme system (`getMarkdownTheme()`, `getEditorTheme()`)
- [ ] **Sử dụng** coding-agent high-level components khi có sẵn (UserMessageComponent, AssistantMessageComponent, ToolExecutionComponent, etc.)

---

## 7. Architecture pattern

```
┌─────────────────────────────────────────────────────┐
│                  My Coding Agent                    │
├─────────────────────────────────────────────────────┤
│  Business Logic (AgentSession, Tools, LLM, etc.)   │
├─────────────────────────────────────────────────────┤
│            UI Layer (This layer)                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ Use pi-tui components:                      │  │
│  │ - TUI, Container, Box, Text, Spacer         │  │
│  │ - Editor, Markdown, Loader, Image           │  │
│  │ - SelectList, SettingsList                  │  │
│  └─────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────┐  │
│  │ Use coding-agent components:                │  │
│  │ - UserMessageComponent, AssistantMessage    │  │
│  │ - ToolExecutionComponent, FooterComponent   │  │
│  │ - CustomEditor, ExtensionInputComponent     │  │
│  └─────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────┐  │
│  │ Use coding-agent theme system:              │  │
│  │ - getMarkdownTheme(), getEditorTheme()      │  │
│  │ - theme.fg(), theme.bg()                    │  │
│  └─────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│         pi-tui (@mariozechner/pi-tui)              │
│  - Differential rendering, overlays, focus        │
│  - Key handling, terminal capabilities            │
│  - Component lifecycle, caching                   │
└─────────────────────────────────────────────────────┘
```

---

## 8. Conclusion

Để viết lại coding-agent **mà không phải viết lại TUI**:

1. **Dùng pi-tui** cho engine cơ bản (TUI, Container, Component, Overlays, Key handling, Capabilities)
2. **Dùng coding-agent exports** cho UI components cao cấp (messages, tool execution, footer) và theme system
3. **Compose/Extend** thay vì reinvent
4. **Tuân thủ** component interface, theme contracts, line width rules

Coding-agent hiện tại là **ví dụ mẫu hoàn hảo** về cách sử dụng pi-tui. Hãy học từ nó, không copy code nhưng hiểu pattern: **composition over inheritance**, **theme abstraction**, **delegation to pi-tui**.

Với hai package này, bạn có thể xây dựng coding-agent mới trong vài ngày, không phải vài tuần. Tập trung vào business logic, AI integration, tools, sessions - đừng phí thời gian vào rendering.
