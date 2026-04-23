# Troubleshooting Guide

## @mariozechner/pi-tui-professional v1.0.0

This guide covers common issues and solutions when using this library.

---

## Installation Issues

### "Cannot find module '@mariozechner/pi-tui'"

**Cause**: Peer dependencies not installed.

**Solution**:
```bash
npm install @mariozechner/pi-tui @mariozechner/pi-coding-agent
```

### "Conflicting peer dependencies" or "ERESOLVE"

**Cause**: Version mismatch between peers.

**Solution**: Ensure all three packages use compatible versions (all ^0.68.0 or later):
```bash
npm install @mariozechner/pi-tui@^0.68.0 @mariozechner/pi-coding-agent@^0.68.0 @mariozechner/pi-tui-professional@^1.0.0
```

### "npm ERR! 404 Not Found: @mariozechner/pi-tui-professional"

**Cause**: Package not published or scope not available.

**Solution**: Verify package name is correct and that you have access to the `@mariozechner` scope. If not, use a different scope or fork.

---

## Runtime Issues

### "TypeError: theme.fg is not a function"

**Cause**: Using a `ThemeManager` instance incorrectly. `fg` expects a role and text.

**Solution**:
```typescript
const colored = theme.fg("accent", "Hello"); // Correct
// Not: theme.fg("Hello")
```

### "My TUI freezes or crashes with uncaught exception"

**Cause**: Unhandled error in render or input handling.

**Solution**:
- Wrap `tui.start()` in try/catch
- Ensure your components handle errors gracefully
- Use error boundaries (custom) around risky code
- Run with `DEBUG=*` environment variable for more logs (if supported by pi-tui)

### "Colors don't appear; text is plain"

**Cause**: Terminal doesn't support true color or theme roles not mapped.

**Solution**:
- Set `COLORTERM=truecolor` in your environment
- Verify terminal emulator supports 24-bit color ( Kitty, iTerm2, WezTerm )
- Ensure `TERM` is set to `xterm-256color` or similar
- Test with `echo -e "\e[38;2;255;0;0mRed\e[0m"` – should show bright red

### "Scrolling doesn't work"

**Cause**: `ScrollableContainer` may not have enough content to scroll, or you're not sending scroll events.

**Solution**:
- Verify `hasScrollbar()` returns true (content height > viewport)
- Use `scrollDown()` / `scrollUp()` methods programmatically
- Keyboard scrolling is bound to keys; ensure input is routed correctly

### "Components not responding to input"

**Cause**: Component not focused or input not bubbled.

**Solution**:
- Ensure `focused` property returns `true` for the active component
- Check `tui.onInput` handler routes keys properly
- Use `tui.setFocus(component)` to change focus

### "Progress bar shows wrong percentage"

**Cause**: Might be clamped incorrectly or width too small.

**Solution**:
- Verify you call `progress.setProgress(0-100)` correctly
- Check `progress.render(width)` returns a single line
- Ensure width is enough to display the percentage text

### "Modal doesn't close on keypress"

**Cause**: Modal's `handleInput` not calling `close()` or returning proper signal.

**Solution**:
- In your modal, return `true` from `handleInput` to indicate handled and close
- Or call `tui.closeOverlay()` explicitly
- For `showModalMessage` / `showModalConfirm`, they handle Enter/Esc automatically

### "maxMessages not limiting chat history"

**Cause**: Bug in version <1.0.0. Fixed in 1.0.0.

**Solution**: Upgrade to 1.0.0 or set `maxMessages` prop on `ChatContainer`.

### "Large messages cause performance lag"

**Cause**: Rendering thousands of lines per message.

**Solution**:
- Split long messages into pages or limit displayed lines
- Set `maxMessages` to limit total history
- Consider lazy rendering or pagination for huge outputs

### "CustomEditor doesn't handle multi-line input"

**Cause**: By default, `CustomEditor` sends data on Enter. Shift+Enter may be needed for newlines.

**Solution**:
- In your `onInput` handler, check for `"\r"` vs `"\n"` or key codes
- Use `editor.multiLine = true` if available (check pi-coding-agent's CustomEditor)

---

## Build Issues

### "TypeScript error: Cannot find module ..."

**Cause**: Missing type definitions or incorrect import paths.

**Solution**:
- Ensure `tsconfig.json` has `"moduleResolution": "NodeNext"` or `"node16"`
- Verify all imports use file extensions `.js` for ESM packages
- Run `npm install` to fetch dependencies

### "Cannot use import statement outside a module"

**Cause**: Using ESM package with CommonJS configuration.

**Solution**:
- Set `"type": "module"` in your package.json
- Use `.mjs` or `.js` with ESM
- Or use dynamic import: `const mod = await import('...')`

---

## Testing Issues

### "tests/run.test.ts fails with 'Theme initialized: undefined'"

**Cause**: ThemeManager initialization may return different modes based on environment.

**Solution**: Adjust test to accept both 'dark' and 'light' modes.

---

## Deployment Issues

### "npm publish fails with 'prepack script failed'"

**Cause**: Build or tests failing during prepack.

**Solution**:
- Run `npm run build` manually and fix errors
- Run `npm test` and fix failing tests
- Ensure `npm pack --dry-run` succeeds

### "Package published but files missing"

**Cause**: `.npmignore` or `files` field misconfigured.

**Solution**:
- Check package contents with `npm pack --dry-run`
- Verify `.npmignore` excludes only `src/`, `tests/`, `examples/`, etc.
- Ensure `dist/` exists and includes index.js

---

## Performance Problems

### "UI feels sluggish with 500+ messages"

**Solution**:
- Set `maxMessages: 100` or similar
- Use `ChatContainer`'s `clearMessages()` periodically
- Profile your custom components with `console.time()` in render

### "High memory usage"

**Cause**: Storing many full message components.

**Solution**:
- Use `maxMessages` to cap
- Consider storing only displayed messages and offloading history to disk/database

---

## Terminal Issues

### "Garbage characters or broken display"

**Cause**: Terminal size mismatch or unknown capabilities.

**Solution**:
- Ensure terminal reports correct size (`stty size`)
- Set `TERM` correctly (e.g., `xterm-256color`)
- Avoid running inside incompatible terminal multiplexers

### "Input lag"

**Cause**: Heavy processing in `onInput` handler blocking the event loop.

**Solution**:
- Defer expensive operations to `setTimeout` or worker threads
- Keep `onInput` fast; offload to async functions

---

## Debugging Tips

1. **Enable debug logging**: Set `DEBUG=tui:*` or check pi-tui's debug env vars
2. **Inspect component tree**: Use `container.dump()` if available
3. **Check renders**: Add `console.log('render', component.name)` inside custom `render()` methods to count renders
4. **Profile**: Use `node --inspect` and Chrome DevTools to profile TUI app
5. **Simplify**: Comment out parts to isolate the issue

---

## Getting Help

If you can't resolve an issue:

1. **Search existing issues**: https://github.com/qcoder/qclaw/issues
2. **Read the docs**: See README.md, LIMITATIONS_AND_FUTURE.md, COMPATIBILITY.md
3. **Create a new issue**: Include environment details, minimal reproducible code, error logs, and Node/terminal versions.

---

**Last updated**: 2026-04-23  
**For**: v1.0.0
