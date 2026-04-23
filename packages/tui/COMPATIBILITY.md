# Compatibility Matrix

## @mariozechner/pi-tui-professional v1.0.0

This document outlines compatibility with different versions of dependencies and runtimes.

---

## Runtime Compatibility

### Node.js

| Version | Supported | Tested |
|---------|:---------:|:------:|
| 20.x LTS | ✅ | ✅ |
| 22.x LTS | ✅ | ✅ |
| 24.x LTS | ✅ | ✅ |
| 18.x LTS | ⚠️ | No* |
| 16.x LTS | ❌ | No |

*Note: Node 18 is EOL and not actively tested. May work but not guaranteed.

### Terminals

| Terminal | OS | Full Support | Notes |
|----------|----|:------------:|-------|
| Kitty | Linux/macOS | ✅ | Full color, mouse, images |
| iTerm2 | macOS | ✅ | Full color, images |
| WezTerm | All | ✅ | Full features |
| Alacritty | All | ✅ | Good color support |
| Windows Terminal | Windows | ✅ | Full color |
| GNOME Terminal | Linux | ✅ | Basic features |
| Terminal.app | macOS | ✅ | Basic features |
| tmux | All | ✅ | Works inside tmux/screen |

---

## Dependencies

### Peer Dependencies (Required)

| Package | Version Range | Tested Versions | Notes |
|---------|---------------|-----------------|-------|
| `@mariozechner/pi-tui` | `^0.68.0` | 0.68.0, 0.69.0* | TUI engine |
| `@mariozechner/pi-coding-agent` | `^0.68.0` | 0.68.0, 0.69.0* | AI agent framework |
| `@mariozechner/pi-agent-core` | `^0.68.0` | 0.68.0, 0.69.0* | Agent core |

*Future versions may be compatible but are not yet tested. We follow semver: patch/minor updates should work; major versions may require changes.

### Dev Dependencies (Build/Test)

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | `^5.0.0` | TypeScript compiler |
| `tsx` | `^4.0.0` | Runtime for TypeScript tests |
| `@types/node` | `^20.0.0` | Node.js type definitions |

---

## Feature Support by Terminal

| Feature | Kitty | iTerm2 | WezTerm | Alacritty | Windows Terminal | Others |
|---------|:-----:|:------:|:-------:|:---------:|:----------------:|:------:|
| 256 colors | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| True color (24-bit) | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️* |
| Mouse support | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Inline images | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Hyperlinks | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

*True color may work in other terminals but not guaranteed.

---

## Breaking Changes History

### v1.0.0 (Current)

- Initial stable release
- No breaking changes from pre-release

---

## Upgrade Guide

### From pre-1.0 versions

If you were using an earlier alpha/beta version:

- API is stable as of v1.0.0
- No migration needed
- Ensure all peer dependencies are updated to ^0.68.0

---

## Future Compatibility

We are committed to maintaining compatibility with:

- LTS versions of Node.js (current LTS and previous LTS)
- Latest patch releases of pi-tui and pi-coding-agent
- Major terminal emulators listed above

When a new major version of pi-tui or pi-coding-agent is released:

1. We will test compatibility in our CI
2. If breaking changes are required, we will:
   - Bump our major version (semver)
   - Provide migration guide
   - Maintain backward compatibility for at least one major version if possible

---

## How to Report Compatibility Issues

If you encounter compatibility problems with a specific:

- Node.js version
- Terminal emulator
- pi-tui / pi-coding-agent version

Please open an issue with:

1. Your environment (OS, Node version, terminal)
2. The exact versions of dependencies
3. A minimal reproducible example
4. Expected vs actual behavior

We'll investigate and update this matrix accordingly.

---

## Known Issues

| Symptom | Environment | Workaround |
|---------|-------------|------------|
| Colors may appear as plain text in some terminals that don't support true color | Any non-24bit terminal | Set `TERM=xterm-256color` or use `COLORTERM=truecolor` |
| Mouse events not received | Terminals without mouse support | Use keyboard navigation |
| Images not displayed | Kitty required | None, use text fallback |
| Performance degrade with >1000 messages | All | Use `maxMessages` prop to limit history |

---

**Last updated**: 2026-04-23  
**For version**: 1.0.0
