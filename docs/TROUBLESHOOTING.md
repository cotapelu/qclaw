# Troubleshooting

## Common Issues

- TUI fails to start: ensure `$TERM` is set (e.g., `xterm-256color`) and the terminal supports truecolor.
- No models available: check API keys in `~/.qclaw/auth.json` or environment variables.
- Images not showing: verify terminal image protocol (sixel, iTerm2) or use settings to disable images.
- Cannot scroll chat: use `Shift+PageUp/PageDown` or mouse wheel if supported.

## Getting Help

Check the project repository issues or run with `--debug` for verbose logs.