# Changelog

All notable changes to qclaw will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **@mariozechner/pi-agent** package – unified agent library with factory and event bus
- Main CLI application with TUI
- Settings UI: F2 (theme), F3 (model), F4 (sessions)
- Persistent configuration in `~/.qclaw/config.json` with live file watcher
- Error logging to `~/.qclaw/log.txt`
- Optional telemetry with `--telemetry` flag
- Session management UI: list and fork sessions
- Autocomplete for slash commands and file paths
- Model resolution from string identifiers with provider inference
- CLI flags: `--cwd`, `--model`, `--tools`, `--session-dir`, `--theme`, `--debug`, `--telemetry`
- Comprehensive documentation: QUICKSTART.md, AGENT-PACKAGE.md, INTEGRATION-PATTERNS.md, CONFIGURATION.md

### Changed

- N/A (initial release)

### Deprecated

- N/A

### Removed

- N/A

### Fixed

- ESM module resolution for dist builds

### Security

- N/A

## [1.0.0] – 2026-04-23

### Added

- Initial public release of qclaw
- Professional AI coding assistant with TUI
- Integration of pi-agent, pi-tui, and pi-coding-agent packages

[的花絮]