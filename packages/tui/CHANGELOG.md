# Changelog

All notable changes to `@mariozechner/pi-tui-professional` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-23

### Added

- Initial public release
- ThemeManager singleton for centralized theme control
- ChatContainer - scrollable message list with auto-scroll and message limiting
- FooterComponent - status bar with cwd, git branch, model, token usage, thinking level
- DynamicBorder - themed borders (single/double/rounded/heavy/ascii) with title support
- ScrollableContainer - viewport scrolling with scrollbar rendering
- ProgressBar - color-coded progress indicator
- ModalComponent - base modal class with helpers (showModalMessage, showModalConfirm)
- 10+ utility functions (renderDiff, truncateText, wrapText, formatSize, formatDuration, etc.)
- Re-exports from pi-tui and pi-coding-agent for convenience
- Full TypeScript support with declaration files
- Theme-aware throughout with 60+ color roles
- Comprehensive test suite (unit, comprehensive, integration)
- Example applications (basic-chat, full-chat, settings-demo)
- GitHub Actions CI/CD (build + test on Node 20/22/24)
- Apache-2.0 license

### Docs

- README.md - complete API reference with examples
- QUICKSTART.md - quick start guide
- RELEASE.md - publishing checklist
- SUMMARY.md - project overview and stats
- FINAL_SUMMARY.md - validation report

[1.0.0]: https://github.com/qcoder/qclaw/releases/tag/v1.0.0
