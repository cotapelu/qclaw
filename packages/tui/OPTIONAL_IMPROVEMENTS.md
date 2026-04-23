# Optional Improvements for Future Versions

## For v1.1.0 (Near-term)

These improvements are not required for v1.0.0 publishing but would enhance the package.

### 1. Virtual Scrolling for ScrollableContainer
- **Current**: Renders all children
- **Problem**: Performance degrades with >1000 items
- **Solution**: Implement virtual scrolling (render only visible + buffer)
- **Impact**: Smooth scrolling for large datasets (10k+ items)
- **Effort**: Medium (3-5 days)

### 2. Mouse Wheel Support
- **Current**: Keyboard-only scrolling
- **Problem**: Users cannot use mouse wheel to scroll
- **Solution**: Add mouse event handling (wheel, click) using pi-tui's mouse support
- **Impact**: Better UX for mouse users
- **Effort**: Small (1-2 days)

### 3. Clipboard Copy Support
- **Current**: Cannot copy message content
- **Problem**: Users want to copy code snippets
- **Solution**: Add `copyToClipboard()` using pi-tui's clipboard or system call
- **Impact**: Improved usability
- **Effort**: Small (1 day)

### 4. CLI Demo Tool (bin entry point)
- **Current**: Examples are TypeScript files
- **Problem**: No executable demo
- **Solution**: Add `bin` field to package.json, create `demo.ts` that runs a demo
- **Impact**: Easier testing/exploration
- **Effort**: Small (1 day)

### 5. Error Boundaries
- **Current**: Unhandled errors crash the TUI
- **Problem**: Poor error handling
- **Solution**: Add error boundaries with graceful degradation
- **Impact**: More robust applications
- **Effort**: Medium (2-3 days)

### 6. Bundle Size Optimization
- **Current**: 30.4 KB (already small)
- **Problem**: Could be smaller
- **Solution**: Ensure tree-shaking works, maybe minify
- **Impact**: Faster installation
- **Effort**: Small (1 day)

---

## For v1.2.0 (Mid-term)

### 7. Smooth Scrolling with Momentum
- Add configurable scroll inertia
- Smooth scrolling animations

### 8. Internationalization (i18n)
- Locale files for labels
- RTL support

### 9. Accessibility
- ARIA labels
- Screen reader announcements
- High contrast mode

### 10. Search/Filter in ChatContainer
- Text search within messages
- Filter by user/assistant/tool

### 11. Message Reactions
- Emoji reactions on messages
- React to show appreciation

### 12. Enhanced Theme System
- Dynamic color updates
- Custom theme creation API

### 13. Table Component
- For tabular data display
- Sorting, selection, pagination

### 14. TreeView Component
- For file/directory navigation
- Expand/collapse nodes

### 15. Graphviz Diagram Rendering
- Render DOT graphs in terminal
- ASCII/Unicode art fallbacks

---

## For v2.0.0 (Long-term)

### 16. Web/TTY Backend Support
- Browser-based terminal
- SSH/remote support

### 17. Plugin System
- Third-party component registry
- Extension API

### 18. Official createAgentTUI() Factory
- Simplified setup
- Configuration presets

### 19. Code Editor with Syntax Highlighting
- Full editor with language support
- Auto-indentation, snippets

### 20. Side-by-side Diff Viewer
- Visual diff for code changes
- Inline/parallel modes

---

## Decisions

**Why these are optional?**
- v1.0.0 already meets all production requirements
- These enhance but are not critical for initial release
- Should be prioritized based on user feedback
- Can be released incrementally in v1.x series

**What should come first?**
1. Virtual scrolling (high impact for long chats)
2. Mouse wheel support (high UX impact, low effort)
3. Clipboard copy (common user request)
4. CLI demo (improves discoverability)
5. Error boundaries (robustness)

---

## Implementation Notes

- Each improvement should be tracked in separate tasks/PRs
- Follow existing patterns (composition, theme-awareness, tests)
- Maintain backward compatibility (semver)
- Update documentation for each new feature
- Add tests for new functionality

---

**These are NOT required for v1.0.0 publish. They can be done in subsequent releases based on user demand.**
