# Configuration & Telemetry

This document covers configuration file, error logging, and telemetry features in qclaw.

## Configuration File

qclaw persists user preferences to `~/.qclaw/config.json`. Settings from the config file are merged with CLI flags, with CLI taking precedence.

### Configuration Schema

```json
{
  "theme": "dark" | "light" | "auto",
  "model": "string" (e.g., "claude-3-opus"),
  "tools": ["string"],
  "sessionDir": "string"
}
```

### Example

```json
{
  "theme": "auto",
  "model": "anthropic/claude-3-opus:high",
  "tools": ["read", "edit", "bash", "grep", "find", "ls"],
  "sessionDir": "~/.qclaw/sessions"
}
```

### Live Reload

The application watches `~/.qclaw/config.json` for changes. When you edit the file, the new settings are applied immediately:

- Theme change → triggers `ThemeManager.setTheme()` and re-renders
- Other changes (model, tools) → take effect on next agent session

To disable the watcher, set `--no-watch` (future) or edit via UI which automatically saves.

## Error Logging

All errors are logged to `~/.qclaw/log.txt` with timestamps and severity levels. This helps diagnose issues when running in production.

Log format:

```
2025-04-23T21:45:00.123Z [AGENT_ERROR] Some error message
2025-04-23T21:45:05.456Z [CONFIG_ERROR] Failed to read config: ...
```

Logs are appended, not rotated. Manage log size manually or via external log rotation.

## Telemetry

qclaw includes an opt-in telemetry system to help improve the product. Telemetry is **disabled by default**.

### Enabling Telemetry

```bash
qclaw --telemetry
```

Or add to config:

```json
{
  "telemetry": true
}
```

### What is Collected?

Telemetry events are written to `~/.qclaw/telemetry.log` and include:

- `agent_error` – agent exceptions
- `init_error` – startup errors
- `session_switch` – when switching sessions
- `model_change` – when user selects a different model
- `theme_change` – when user changes theme

Example entry:

```json
2025-04-23T21:46:00.789Z [agent_error] {"error":"Network timeout","context":"sendMessage"}
```

### Privacy

- No personal data is collected
- No message content is recorded
- Telemetry is stored locally only (future: optional remote reporting)
- You can inspect `telemetry.log` at any time

### Disabling Telemetry

Simply omit `--telemetry` flag or set `"telemetry": false` in config. Stop the application and delete the telemetry file if desired.

## Settings UI

You can change settings interactively within the TUI:

| Key | Action |
|-----|--------|
| `F2` | Open theme selector (writes to config) |
| `F3` | Open model selector (writes to config) |
| `F4` | View sessions (fork selected) |

## Session Management

Sessions are stored in the directory specified by `sessionDir` (CLI or config). Default: `./.qclaw/sessions` relative to current working directory.

- Session files have `.jsonl` extension (one JSON object per line)
- Forking a session creates a copy in the current project directory
- Session list (`F4`) shows files in the session directory
- Selecting a session forks it into current project and switches the agent to use it

## Troubleshooting

### Configuration not applying

- Ensure `~/.qclaw/config.json` is valid JSON
- Check file permissions (should be readable/writable by user)
- Look in `~/.qclaw/log.txt` for errors

### Telemetry not logging

- Verify `--telemetry` flag is present or config has `"telemetry": true`
- Check that `~/.qclaw/telemetry.log` is writable

### High disk usage

- Logs and telemetry can grow over time. Periodically clean:
  ```bash
  rm ~/.qclaw/log.txt
  rm ~/.qclaw/telemetry.log
  ```

## Advanced

### Environment Variables

- `QCLAW_CWD` – Override the working directory (mainly for debugging)
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc. – API credentials

### Multiple Configurations

Currently only one global config is supported. To have per-project configs, launch qclaw from each project's directory with different `sessionDir` and manually edit config accordingly.

### Custom Tools Extensions

Extensions and skills are loaded from paths specified in CLI flags or config (future). They are not yet persisted in config file but can be added via:

```bash
qclaw --extensions ./my-extension.ts --skills ./my-skills/
```
