# Roadmap for @mariozechner/pi-tui-professional

This document outlines planned enhancements for future versions.

## v1.1.0 (Near-term)

### Features
- [ ] **Mouse Support**: Add mouse wheel scrolling, click handling for buttons/selectors
- [ ] **Clipboard Integration**: Copy message content with double-click or keybinding
- [ ] **Enhanced Theme API**: Allow runtime theme color customization via `ThemeManager.extendTheme()`
- [ ] **Smooth Scrolling**: Animated scroll with momentum (configurable speed)
- [ ] **Lazy Loading**: For very large chat histories (>1000 messages), render only visible messages
- [ ] **i18n Support**: Basic internationalization for built-in labels (coming from pi-coding-agent)

### Components
- [ ] `TableComponent` - For displaying tabular data
- [ ] `TreeViewComponent` - For file/directory trees
- [ ] `StatusIndicator` - More advanced status display
- [ ] `SpinnerComponent` - Alternative to Loader with different styles

### Improvements
- [ ] Better error boundaries in components
- [ ] Accessibility: ARIA labels, screen reader announcements
- [ ] Performance optimizations for large message rendering
- [ ] Configurable keybindings override

## v1.2.0 (Mid-term)

### Features
- [ ] **Virtual Scrolling**: For enormous chat histories (10k+ messages)
- [ ] **Search Highlighting**: In ChatContainer, highlight matched text
- [ ] **Message Reactions**: UI for adding reactions to messages
- [ ] **Thread Support**: Display conversation threads

### Components
- [ ] `CodeEditorComponent` - Syntax-highlighted code editor
- [ ] `DiffViewComponent` - Side-by-side diff display
- [ ] `GraphvizComponent` - Render Graphviz diagrams in terminal

### Integration
- [ ] Official `createAgentTUI()` factory function
- [ ] Built-in session persistence UI
- [ ] Settings sync across sessions

## v2.0.0 (Long-term)

### Breaking Changes (if any)
- [ ] Review and possibly redesign ScrollableContainer API based on feedback
- [ ] Align more closely with any breaking changes in pi-tui or pi-coding-agent

### Major Features
- [ ] **Web/TTY Backend**: Support for web-based terminal (browser) in addition to TTY
- [ ] **Plugin System**: Official extension API for third-party components
- [ ] **Component Library**: Catalog of pre-built components (forms, tables, trees, etc.)

### Beyond
- We envision this becoming the de facto standard for TUI development in the pi ecosystem.
- Potential integration with other frameworks (React, Vue) via adapters.

---

## Contributing

Have a feature request? Open an issue: https://github.com/qcoder/qclaw/issues

## Notes

- This roadmap is subject to change based on user feedback and evolving requirements.
- Priorities may shift as the pi ecosystem grows.
- All versions will maintain backward compatibility where possible (semver).
