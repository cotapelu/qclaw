# Extension Development

Extensions can add custom tools, slash commands, and status widgets.

- Tools: register via `AgentBuilder.addTool(toolDefinition)`.
- Status: use `QClawApp.setExtensionStatus(extensionId, status)` to show in footer.
- Widgets: add components above/below editor with `QClawApp.addWidget(component, position)`.
- Overlays: extensions can display temporary UI using `tui.showOverlay(component)`.

See pi‑coding‑agent for detailed extension points.