# BÁO CÁO: Sử dụng pi-tui và coding-agent để phát triển coding agent mới

## 1. Tổng quan

### 1.1 Hai-layer architecture

Pi ecosystem có hai package chính cho UI:

- **`@mariozechner/pi-tui`**: Thư viện TUI cơ bế với differential rendering, synchronized output, component system. Cung cấp **engine** và **building blocks**.

- **`@mariozechner/pi-coding-agent`**: Ứng dụng coding agent hoàn chỉnh, xây dựng **TRÊN** pi-tui. Export các component, theme, utilities để extensions dùng.

**Mối quan hệ**: Coding-agent = pi-tui + business logic + custom components + theme wrapper.

### 1.2 Mục tiêu

Khi viết lại coding-agent mới, bạn có thể:

1. **Dùng pi-tui trực tiếp** cho low-level UI (TUI, Container, Box, Text, Editor, Markdown, Loader, Image, etc.)
2. **Dùng coding-agent exports** cho high-level components (UserMessageComponent, AssistantMessageComponent, ToolExecutionComponent, ExtensionInputComponent, FooterComponent, theme utils, etc.)

→ **Tiết kiệm công sức**: Không cần viết lại diff-rendering, overlay system, focus management, IME support, terminal capabilities, key handling, autocomplete, image rendering.

---

## 2. pi-tui: Foundation Library

### 2.1 Core concepts

**TUI instance**: Central manager
```typescript
const terminal = new ProcessTerminal();
const tui = new TUI(terminal);
tui.addChild(component);
tui.start();
tui.requestRender(); // Trigger re-render
tui.stop();
```

**Component interface**:
```typescript
interface Component {
  render(width: number): string[]; // Each line ≤ width
  handleInput?(data: string): void; // When focused
  invalidate?.(): void; // Clear cache
}
```

**Focusable interface** (IME support):
```typescript
interface Focusable {
  focused: boolean; // Set by TUI
  // Use CURSOR_MARKER in render() to position hardware cursor
}
```

**Container**: Groups children, forwards focus/key events.

**Overlays**: Modal dialogs với positioning options.
```typescript
const handle = tui.showOverlay(component, {
  width: 60,
  anchor: 'center',
  margin: 2
});
handle.focus();
handle.hide();
```

### 2.2 Key features để không viết lại

1. **Differential rendering**:
   - First render: full output (no scrollback clear)
   - Width changed or change above viewport: clear + full render
   - Normal: only changed lines
   - All wrapped in CSI 2026 (synchronized)

2. **Key detection**:
```typescript
import { matchesKey, Key } from "@mariozechner/pi-tui";

if (matchesKey(data, Key.ctrl("c"))) { }
if (matchesKey(data, Key.enter)) { }
if (matchesKey(data, "shift+tab")) { }
```

3. **Terminal capabilities**:
```typescript
const caps = getCapabilities(); // { images: 'kitty'|'iterm2'|null, ... }
if (caps.images) { /* render images */ }
```

4. **Autocomplete**:
```typescript
const provider = new CombinedAutocompleteProvider(slashCommands, cwd);
editor.setAutocompleteProvider(provider);
```

5. **Theme system**:
Components nhận functions:
```typescript
const theme: MarkdownTheme = {
  heading: (text) => colorFn(text),
  link: (text) => colorFn(text),
  // ...
};
const md = new Markdown(content, paddingX, paddingY, theme);
```

### 2.3 Built-in components sẵn dùng

- Layout: `Box` (padding + bg), `Spacer`
- Text: `Text` (multi-line), `TruncatedText`
- Input: `Input` (single-line), `Editor` (multi-line với autocomplete)
- Markup: `Markdown` (syntax highlighting)
- Selection: `SelectList` (list), `SettingsList` (settings với cycling/submenus)
- Feedback: `Loader`, `CancellableLoader`
- Media: `Image` (inline Kitty/iTerm2)
- Utilities: `DynamicBorder` (coding-agent component, nhưng dễ tạo)

---

## 3. coding-agent: High-level components & theme

### 3.1 Theme system của coding-agent

Coding-agent có theme class với **40+ color tokens**, hỗ trợ:
- Hex colors (`"#ff0000"`)
- 256-color indices (0-255)
- Variable references (`"primary"`)
- File watcher cho custom themes
- Export to HTML

**Map vào pi-tui theme interfaces**:

```typescript
// MarkdownTheme
export function getMarkdownTheme(): MarkdownTheme {
  return {
    heading: (text) => theme.fg("mdHeading", text),
    link: (text) => theme.fg("mdLink", text),
    code: (text) => theme.fg("mdCode", text),
    codeBlock: (text) => theme.fg("mdCodeBlock", text),
    quote: (text) => theme.fg("mdQuote", text),
    bold: (text) => theme.bold(text),
    italic: (text) => theme.italic(text),
    highlightCode: (code, lang) => {
      if (!lang || !supportsLanguage(lang)) return code.split('\n').map(l => theme.fg("mdCodeBlock", l));
      return highlight(code, { language: lang, theme: getCliHighlightTheme(theme) }).split('\n');
    }
  };
}

// EditorTheme
export function getEditorTheme(): EditorTheme {
  return {
    borderColor: (text) => theme.fg("borderMuted", text),
    selectList: getSelectListTheme()
  };
}
```

**Color tokens** (category):
- Core UI: `accent`, `border`, `borderAccent`, `borderMuted`, `success`, `error`, `warning`, `muted`, `dim`, `text`, `thinkingText`
- Backgrounds: `selectedBg`, `userMessageBg`, `userMessageText`, `customMessageBg`, `toolPendingBg`, `toolSuccessBg`, `toolErrorBg`
- Markdown: `mdHeading`, `mdLink`, `mdCode`, `mdQuote`, ...
- Syntax: `syntaxKeyword`, `syntaxFunction`, `syntaxString`, ...
- Thinking levels: `thinkingOff`, `thinkingMinimal`, `thinkingLow`, `thinkingMedium`, `thinkingHigh`, `thinkingXhigh`

**Usage**:
```typescript
import { theme, getMarkdownTheme } from "@mariozechner/pi-coding-agent";

const md = new Markdown(text, 1, 1, getMarkdownTheme());
const colored = theme.fg("accent", "Hello");
const bg = theme.bg("userMessageBg", "Content");
```

### 3.2 Custom components để tái sử dụng

Coding-agent export nhiều component cao cấp, xây dựng trên pi-tui:

**Chat components**:
- `UserMessageComponent`: Box + Markdown, có OSC 133 zones, user background
- `AssistantMessageComponent`: Container, render text + thinking + tool calls, hide/show thinking
- `BashExecutionComponent`: Render bash output với syntax highlighting

**Input components**:
- `CustomEditor`: Extends `Editor`, thêm app keybindings (Ctrl+D, Escape, paste image)
- `ExtensionInputComponent`: Container + Input + border + hints, implements Focusable
- `ExtensionEditorComponent`: Wrapper cho editor với status line

**Selection components**:
- `ExtensionSelectorComponent`: Simple list navigation
- `ModelSelectorComponent`, `SettingsSelectorComponent`, `ThemeSelectorComponent`, `SessionSelectorComponent`, `TreeSelectorComponent`, etc.: Các selector cụ thể với theme

**Feedback components**:
- `BorderedLoader`: Loader trong border
- `CountdownTimer`: Countdown display

**Layout components**:
- `DynamicBorder`: Render `─` line với theme color
- `Spacer`

**Message components** (special):
- `ToolExecutionComponent`: Complex tool rendering với images, expand/collapse, custom renderers
- `BranchSummaryMessageComponent`, `CompactionSummaryMessageComponent`, `SkillInvocationMessageComponent`

**Dialog components**:
- `LoginDialogComponent`, `OAuthSelectorComponent`

**Footer**:
- `FooterComponent`: Shows pwd, git branch, token stats, context %, model, thinking level, extension statuses

**Theme utilities**:
- `initTheme()`, `setTheme()`, `setThemeInstance()`, `onThemeChange()`
- `getAvailableThemes()`, `getAvailableThemesWithPaths()`
- `highlightCode()`, `getLanguageFromPath()`
- `getEditorTheme()`, `getSelectListTheme()`, `getSettingsListTheme()`

**Key hint utilities**:
- `keyHint()`, `keyText()`, `rawKeyHint()` - Format key bindings cho UI

**Truncation** (CJK support):
- `truncateToVisualLines()`, `VisualTruncateResult`

---

## 4. Kiến trúc ứng dụng coding agent

### 4.1 Main TUI setup

```typescript
import { TUI, ProcessTerminal, Container, Spacer, TruncatedText } from "@mariozechner/pi-tui";
import { CustomEditor } from "@mariozechner/pi-coding-agent";
import { theme, initTheme } from "@mariozechner/pi-coding-agent";

class MyCodingAgent {
  private tui: TUI;
  private chatContainer: Container;
  private editor: CustomEditor;
  private footer: FooterComponent;

  constructor() {
    const terminal = new ProcessTerminal();
    this.tui = new TUI(terminal);

    // Khởi tạo theme
    initTheme("dark");

    // Layout
    this.chatContainer = new Container();
    this.tui.addChild(this.chatContainer);

    // Status line (optional)
    const status = new TruncatedText("", 1, 0);
    this.tui.addChild(status);

    // Editor
    this.editor = new CustomEditor(this.tui, getEditorTheme(), keybindings);
    this.tui.addChild(this.editor);

    // Footer
    this.footer = new FooterComponent(session, footerData);
    this.tui.addChild(this.footer);

    // Input handling
    this.tui.onInput = (data) => this.handleInput(data);
  }

  start() {
    this.tui.start();
  }
}
```

### 4.2 Message rendering

**User message**:
```typescript
import { UserMessageComponent } from "@mariozechner/pi-coding-agent";

const userMsg = new UserMessageComponent(text);
this.chatContainer.addChild(userMsg);
```

**Assistant message** (streaming):
```typescript
import { AssistantMessageComponent } from "@mariozechner/pi-coding-agent";

const assistantMsg = new AssistantMessageComponent(undefined, false, getMarkdownTheme());
this.chatContainer.addChild(assistantMsg);

// Update khi có content mới
assistantMsg.updateContent(message);
this.tui.requestRender();
```

**Tool execution**:
```typescript
import { ToolExecutionComponent } from "@mariozechner/pi-coding-agent";

const toolComp = new ToolExecutionComponent(
  toolName,
  toolCallId,
  args,
  { showImages: true },
  toolDefinition, // optional custom renderer
  this.tui,
  cwd
);
this.chatContainer.addChild(toolComp);

// Update khi có result
toolComp.updateResult(result);
```

### 4.3 Overlays

```typescript
// Show modal dialog
const handle = this.tui.showOverlay(dialogComponent, {
  width: 60,
  anchor: 'center',
  margin: 2
});

// Không cần focus quản lý thủ công, TUI tự động
// Đóng khi xong
handle.hide();
```

### 4.4 Loaders

```typescript
import { Loader } from "@mariozechner/pi-tui";

const loader = new Loader(
  this.tui,
  (s) => theme.fg("accent", s), // spinner color
  (s) => theme.fg("muted", s),   // message color
  "Working..."
);
loader.start();

// Hoặc CancellableLoader
const cancellable = new CancellableLoader(this.tui, colorFn, msgColorFn, "Working...");
cancellable.onAbort = () => { /* cleanup */ };
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
