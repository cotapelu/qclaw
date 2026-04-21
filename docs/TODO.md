# Pi SDK Agent - TODO & Progress

## ✅ Completed Features

### Core Agent
- [x] AgentCore class with service orchestration
- [x] Session creation via `createAgentSession()`
- [x] Event subscription & handling
- [x] Prompt streaming
- [x] Tool execution
- [x] Error handling
- [x] Signal handling (SIGINT, SIGTERM)
- [x] Graceful shutdown
- [x] Stats tracking (tokens, turns, tool calls, errors, cost)
- [x] Cost estimation per model

### Session Management
- [x] Session persistence (`SessionManager.create()`)
- [x] Session tree navigation (`getTree()`, `getEntries()`)
- [x] Branching (`/fork`, `sessionManager.branch()`)
- [x] Resume recent (`/resume`)
- [x] New session (`/new`)
- [x] Session listing (`/sessions`, `SessionManager.list()`)
- [x] Session info display (`/session`)
- [x] Export session to JSONL (`/export`)
- [x] Import session from JSONL (`/import`)

### Resource Loading
- [x] Extensions auto-load (`DefaultResourceLoader`)
- [x] Skills auto-load
- [x] Prompt templates auto-load
- [x] System prompt override
- [x] Resource reloading (`/reload`)

### Custom Tools
- [x] Tool definition with `defineTool()`
- [x] TypeBox schema validation
- [x] 4 example tools:
  - [x] `hello_world` - greeting with styles
  - [x] `current_datetime` - time with formats/timezones
  - [x] `system_info` - system statistics (brief/full)
  - [x] `list_files` - file explorer with glob support
- [x] Tool result streaming (basic)
- [x] Error handling in tools

### CLI Interface
- [x] Readline-based interactive CLI
- [x] Streaming output (text_delta)
- [x] Tool execution notifications
- [x] Turn completion markers
- [x] Command parsing
- [x] Banner display
- [x] Stats display on exit (verbose mode)

### Commands (20+ slash commands)
- [x] `/new` - Create fresh session
- [x] `/resume` - Resume most recent
- [x] `/fork` - Branch from current
- [x] `/sessions` - List all sessions
- [x] `/session` - Show session tree
- [x] `/skills` - List loaded skills
- [x] `/extensions` - List loaded extensions
- [x] `/commands` - List all commands
- [x] `/help` - Show help message
- [x] `/reload` - Reload resources
- [x] `/models` - Show current & available models
- [x] `/cycle` - Switch to next model
- [x] `/thinking` - Set thinking level
- [x] `/stats` - Session statistics
- [x] `/cost` - Cost estimate
- [x] `/tokens` - Token usage breakdown
- [x] `/compact` - Manual compaction
- [x] `/clear` - Clear screen
- [x] `/verbose` - Show verbose status
- [x] `/hello` - Test custom tool
- [x] `/datetime` - Get datetime
- [x] `/sysinfo` - System info
- [x] `/ls` - List files

### Configuration
- [x] Config file support (JSON/YAML)
- [x] Environment variable overrides (`PI_AGENT_DIR`, `PI_VERBOSE`)
- [x] Settings loading from `~/.pi/agent/settings.json`
- [x] Settings persistence via `SettingsManager`
- [x] Default settings (compaction, retry)

### Run Modes
- [x] CLI mode (default)
- [x] Print mode (`--print "message"`)
- [x] Quiet mode for print (suppress logs)
- [x] RPC mode stub (placeholder)

### Logging & Debug
- [x] Verbose mode (`--verbose`)
- [x] Debug logs with `[AGENT]` prefix
- [x] Event logging (configurable)
- [x] Error logging
- [x] Stats summary on exit

### Code Quality
- [x] TypeScript strict mode
- [x] Full type definitions
- [x] No `any` abuse (mostly)
- [x] Modular architecture
- [x] Public API only (no internal imports)
- [x] Error boundaries
- [x] Unhandled rejection/exception handlers

### Documentation
- [x] README.md with quick start
- [x] ARCHITECTURE.md with design details
- [x] EXPORTS.md with full API reference
- [x] Inline code comments
- [x] settings.example.json
- [x] TODO.md (this file)

### Build & Dev
- [x] TypeScript configuration
- [x] Build script (`npm run build`)
- [x] Type checking (`npm run check`)
- [x] package.json with scripts
- [x] .gitignore
- [x] .env.example

---

## 🚧 In Progress / Partial

### Settings Persistence
- [x] Load settings from file
- [ ] Save settings to file (user changes not yet persisted)
- [ ] Settings validation schema
- [ ] Hot-reload settings on file change

### Model Management
- [x] List available models
- [x] Cycle through models
- [ ] Save preferred model to settings
- [ ] Model info display (context size, pricing)
- [ ] Model filtering by capabilities

### Print Mode
- [x] Basic print mode
- [x] Output streaming
- [ ] Output formatting options (markdown, JSON)
- [ ] Exit code based on success/failure
- [ ] Timeout handling
- [ ] Output to file

### RPC Mode
- ~ Placeholder only
- [ ] Full JSON-RPC server implementation
- [ ] `runRpcMode()` integration
- [ ] Request/response handling
- [ ] Event streaming over RPC

### Export/Import
- [x] Export to JSONL
- [x] Import from JSONL
- [ ] Import merges vs replaces option
- [ ] Export with metadata (date, model, stats)
- [ ] Export format options (JSON, YAML)
- [ ] Session diff between imports

### Tool Execution
- [x] Basic tool execution
- [ ] Tool result streaming (large outputs)
- [ ] Tool execution time metrics
- [ ] Tool retry on failure
- [ ] Tool permission system
- [ ] Tool sandboxing (security)

---

## 📋 TODO / Backlog

### High Priority

#### 1. Settings Persistence Enhancement
- [ ] Implement `SettingsManager` save/update
- [ ] Watch settings file for changes
- [ ] Validate settings on load
- [ ] Provide settings UI commands (`/set`, `/settings`)

#### 2. Print Mode Improvements
- [ ] Add `--output <file>` option
- [ ] Add `--format json|markdown|text`
- [ ] Capture and output token usage
- [ ] Set exit code: 0 success, 1 error
- [ ] Add timeout (`--timeout <seconds>`)

#### 3. RPC Mode Implementation
- [ ] Setup `createAgentSessionRuntime` properly
- [ ] Implement JSON-RPC 2.0 server
- [ ] Handle `prompt` method
- [ ] Stream `agent_event` notifications
- [ ] Support `cancel` requests
- [ ] Documentation for RPC clients

#### 4. Model Selection UI
- [ ] `/select-model` interactive picker
- [ ] Show model details (context, cost, capabilities)
- [ ] Save selection to settings
- [ ] Filter models by provider/features

#### 5. Session Search
- [ ] `/search <keyword>` - search in messages
- [ ] `/search --tool <name>` - filter by tool usage
- [ ] `/search --date <range>` - filter by date
- [ ] Export search results

#### 6. Tool History & Analytics
- [ ] Track tool execution count
- [ ] Track tool execution duration
- [ ] `/tool-stats` command
- [ ] Most/least used tools report
- [ ] Tool failure rate

#### 7. Branch Visualization
- [ ] `/graph` - ASCII graph of session tree
- [ ] Export graph to DOT format
- [ ] Visualize branch points
- [ ] Show labels on graph

#### 8. Prompt Template Parameters
- [ ] Parse arguments from slash command
- [ ] Pass parameters to template content
- [ ] Template variable substitution
- [ ] Example: `/deploy staging` → template gets `{environment: "staging"}`

#### 9. Better Compaction Control
- [ ] `/nocompact` - disable for current session
- [ ] Show what was compacted
- [ ] Undo compaction (if possible)
- [ ] Compaction preview

#### 10. Error Recovery & Retry
- [ ] Exponential backoff on failures
- [ ] Fallback model on error
- [ ] Auto-retry with different model
- [ ] Better error messages for API limits

### Medium Priority

#### 11. Logging System
- [ ] Log to file (`~/.pi/agent/logs/`)
- [ ] Log rotation (daily/size)
- [ ] Log levels (debug, info, warn, error)
- [ ] `/logs` command to view recent logs
- [ ] JSON structured logging

#### 12. Hot Reloading
- [ ] Watch `.pi/extensions/` for changes
- [ ] Watch `.pi/skills/` for changes
- [ ] Watch `.pi/prompts/` for changes
- [ ] Auto-reload on file change
- [ ] Notify user on reload

#### 13. Configuration Wizard
- [ ] `--init` or `/init` command
- [ ] Interactive API key setup
- [ ] Model selection wizard
- [ ] Preference configuration
- [ ] Create directory structure

#### 14. Multi-Project Support
- [ ] Project-specific settings (`.pi/settings.json`)
- [ ] Project-specific extensions/skills
- [ ] Settings inheritance (global → project)
- [ ] Project profiles

#### 15. Cost Management
- [ ] Daily/monthly cost tracking
- [ ] Budget alerts (configurable threshold)
- [ ] Cost breakdown by model/tool
- [ ] Cost projection

#### 16. Session Management Enhancements
- [ ] Session labels (`/label <name>`)
- [ ] Session notes/metadata
- [ ] Session search by label
- [ ] Session thumbnails/previews
- [ ] Session diff between versions

#### 17. Image Support
- [ ] Add image tool (read images)
- [ ] Display images in output (if TUI)
- [ ] Support for vision models
- [ ] Image analysis tools

#### 18. Tool Sandboxing
- [ ] Fine-grained tool permissions
- [ ] Path restrictions (whitelist/blacklist)
- [ ] Read-only mode
- [ ] Confirmation for destructive tools
- [ ] Tool execution audit log

#### 19. Performance Monitoring
- [ ] Latency tracking per tool
- [ ] LLM response time metrics
- [ ] Slow tool warnings
- [ ] Performance dashboard (`/perf`)

#### 20. Backup & Restore
- [ ] `/backup` - backup entire `~/.pi/agent/`
- [ ] `/restore <file>` - restore from backup
- [ ] Automated backups (daily/weekly)
- [ ] Backup encryption

### Low Priority / Future

#### 21. Docker & Deployment
- [ ] Dockerfile
- [ ] Docker image with extensions
- [ ] docker-compose example
- [ ] Kubernetes config
- [ ] Health checks

#### 22. Web Dashboard
- [ ] Optional Express/HTTP server
- [ ] View sessions in browser
- [ ] Real-time updates (WebSocket)
- [ ] Session export/download
- [ ] Settings UI
- [ ] Authentication for dashboard

#### 23. Voice I/O
- [ ] Speech-to-text input
- [ ] Text-to-speech output
- [ ] Voice command support
- [ ] Audio playback tools

#### 24. Multi-User Collaboration
- [ ] Session sharing (read-only links)
- [ ] Multi-user editing (OT/CRDT)
- [ ] Comments on sessions
- [ ] Team workspaces

#### 25. Advanced Extensions
- [ ] Extension marketplace/registry
- [ ] `--install <npm-package>` command
- [ ] Extension dependencies
- [ ] Extension versioning
- [ ] Extension configuration UI

#### 26. Testing Framework
- [ ] Mock provider for tests
- [ ] Integration test harness
- [ ] E2E tests with fake LLM
- [ ] Test coverage reporting
- [ ] Property-based testing

#### 27. Binary Distribution
- [ ] `bun build --compile` to binary
- [ ] Installer scripts (bash, PowerShell)
- [ ] Homebrew tap
- [ ] APT/YUM repositories
- [ ] Windows installer (NSIS)

#### 28. Migration Tools
- [ ] Import from Claude Code
- [ ] Import from Cursor
- [ ] Import from Copilot Chat
- [ ] Import from ChatGPT export
- [ ] Migration wizard

#### 29. Security Hardening
- [ ] Credential encryption at rest
- [ ] Secure credential wiping
- [ ] Audit logging
- [ ] Penetration testing
- [ ] Vulnerability scanning

#### 30. Accessibility
- [ ] Screen reader support
- [ ] High contrast themes
- [ ] Keyboard-only navigation
- [ ] ARIA labels in TUI
- [ ] Font size adjustment

---

## 🐛 Known Issues

1. **Session export/import**: `SessionManager.appendEntry` doesn't exist - using file write directly
2. **RPC mode**: Not implemented, placeholder only
3. **Settings save**: Changes to settings not persisted back to file
4. **Model info**: `/models` doesn't show context size/pricing details
5. **Tool streaming**: Large tool outputs buffer before displaying
6. **Session search**: Not implemented
7. **Hot reload**: Not implemented
8. **Cost tracking**: Rough estimates only, not per-model accurate
9. **Extension discovery**: No npm registry integration
10. **Logging**: No file-based logging yet

---

## 📊 Progress Summary

**Total Items**: ~150 features/tasks
**Completed**: ~60 (40%)
**In Progress**: ~10 (7%)
**TODO**: ~80 (53%)

**Current Version**: 1.0.0-alpha

**Milestones**:
- [ ] v1.0.0 - Core features (60/150)
- [ ] v1.1.0 - Settings persistence, improved model management
- [ ] v1.2.0 - Print/RPC modes complete
- [ ] v2.0.0 - Advanced features (search, visualization, telemetry)
- [ ] v3.0.0 - Enterprise features (backup, multi-user, security)

---

## 🔄 Recent Changes

### 2025-04-21
- ✅ Implemented export/import sessions
- ✅ Added print mode with output streaming
- ✅ Added quiet mode for print/rpc
- ✅ Config file support (JSON/YAML)
- ✅ Improved command set (20+ commands)
- ✅ Stats tracking (tokens, cost, turns)
- ✅ Model cycling
- ✅ Thinking level control
- ✅ Comprehensive README rewrite
- ✅ Clean architecture with AgentCore separation

---

## 📝 Notes

- All features use **public API only** from pi packages
- Package exports documented in `EXPORTS.md`
- Architecture documented in `ARCHITECTURE.md`
- Type safety prioritized
- Error handling comprehensive
- Signal handling for graceful shutdown
- Extensible via tools, commands, skills, extensions

**Next immediate focus**: Complete print mode and RPC mode for actual usage.
