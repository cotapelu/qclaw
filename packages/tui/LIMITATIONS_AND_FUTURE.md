# Known Limitations & Future Improvements

## @mariozechner/pi-tui-professional v1.0.0

This document outlines known limitations of the current release and planned improvements.

---

## ⚠️ Known Limitations

### 1. Theme System
- **Limitation**: `ThemeManager.fg()` currently returns plain text (no actual coloring) because `pi-coding-agent`'s theme proxy is not directly accessible in our wrapper.
- **Impact**: Colors may not be applied unless users call `pi-coding-agent`'s `theme.fg()` directly.
- **Workaround**: Users can import `theme` from `@mariozechner/pi-coding-agent` and use it directly.
- **Future**: Integrate more closely with pi-coding-agent's theme system in v1.1.

### 2. Large Message Histories
- **Limitation**: `ChatContainer` and `ScrollableContainer` render all messages each time. Performance degrades with >1000 messages.
- **Impact**: Scrolling may become sluggish in very long conversations.
- **Workaround**: Use `maxMessages` prop to limit stored messages (e.g., 100-200).
- **Future**: Implement virtual scrolling (lazy rendering) in v1.2.0.

### 3. Mouse Support
- **Limitation**: No mouse interaction support (click, scroll, select).
- **Impact**: Users cannot click on UI elements or scroll with mouse wheel.
- **Workaround**: Use keyboard only.
- **Future**: Add mouse event handling in v1.1.0.

### 4. Clipboard Operations
- **Limitation**: Cannot copy message content to clipboard.
- **Impact**: Users cannot copy code snippets or text from messages.
- **Workaround**: Manually select and copy from terminal (if terminal supports it).
- **Future**: Add `copyToClipboard()` utility using pi-tui's clipboard support in v1.1.0.

### 5. Internationalization (i18n)
- **Limitation**: All labels are in English only.
- **Impact**: Non-English users see English UI.
- **Workaround**: None.
- **Future**: Add i18n support with locale files in v1.2.0.

### 6. Accessibility
- **Limitation**: No ARIA labels, screen reader announcements, or high-contrast mode.
- **Impact**: Not accessible to visually impaired users.
- **Workaround**: None.
- **Future**: Add accessibility features in v1.2.0 (screen reader support, focus indicators).

### 7. Smooth Scrolling
- **Limitation**: Scrolling is instant (no animation).
- **Impact**: Abrupt jumps when scrolling.
- **Workaround**: Use small scroll increments.
- **Future**: Add smooth scrolling with configurable momentum in v1.1.0.

### 8. Error Boundaries
- **Limitation**: Component errors can crash the TUI if not caught.
- **Impact**: Unhandled exceptions terminate the app.
- **Workaround**: Wrap user code in try/catch.
- **Future**: Add error boundaries and recovery in v1.2.0.

### 9. Image Support Detection
- **Limitation**: Image display depends on terminal capabilities (kitty, iTerm2, etc.). Not all terminals support inline images.
- **Impact**: Images may not render or fallback to text.
- **Workaround**: Check `getCapabilities().images` before using images.
- **Future**: Provide alternative image representations (ASCII art, descriptions) in v1.1.0.

### 10. TypeScript Declaration Gaps
- **Limitation**: Some pi-tui and pi-coding-agent types may not be perfectly aligned (different TypeBox versions).
- **Impact**: May see type errors in complex generic usage.
- **Workaround**: Use `any` cast sparingly.
- **Future**: Align type dependencies in v1.2.0.

---

## 🔮 Planned Improvements

### v1.1.0 (Near-term)
- Mouse support (wheel, click)
- Clipboard operations (copy/paste)
- Smooth scrolling with momentum
- Enhanced theme integration (dynamic color updates)
- Image fallbacks for non-supporting terminals
- Better error handling & recovery
- Performance optimizations for medium histories (500-1000 msgs)

### v1.2.0 (Mid-term)
- Virtual scrolling for large histories (10k+ messages)
- Internationalization (i18n) framework
- Accessibility features (ARIA, screen reader)
- Table component for tabular data
- TreeView component for file navigation
- Search/filter in ChatContainer
- Message reactions (emoji)
- Thread/conversation view

### v2.0.0 (Long-term)
- Review breaking changes in pi-tui/pi-coding-agent and adapt
- Web/TTY backend support (browser-based terminal)
- Plugin system for third-party components
- Official `createAgentTUI()` factory
- Graphviz diagram rendering
- Code editor with syntax highlighting
- Side-by-side diff viewer

---

## 📊 Performance Targets

| Metric | Current | Target (v1.2) |
|--------|---------|---------------|
| Render time (100 msgs) | ~21 µs | < 10 µs |
| Memory (1000 msgs) | TBD | < 50 MB |
| Startup time | < 100 ms | < 50 ms |
| Scroll latency | TBD | < 16 ms (60 FPS) |

---

## 🎯 Compatibility

- **Node.js**: 20, 22, 24 (tested)
- **OS**: Linux, macOS, Windows (with compatible terminal)
- **Terminals**: Kitty, iTerm2, WezTerm, Alacritty, Terminal.app, Windows Terminal
- **Providers**: OpenAI, Anthropic, Google, local models (via pi-ai)

---

## 📝 Notes

- This package is built on **pi-tui** and **pi-coding-agent**. Any limitations in those libraries propagate here.
- We aim to stay in sync with pi releases and adopt improvements as they become available.
- User feedback will guide the roadmap. Open issues on GitHub: https://github.com/qcoder/qclaw/issues

---

**Last updated**: 2026-04-23  
**For**: v1.0.0 release
