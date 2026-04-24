# Developer Guide: Extending qclaw

This guide covers how to extend qclaw with custom tools, slash commands, and UI enhancements.

## Table of Contents

- [Custom Tools](#custom-tools)
- [Slash Commands](#slash-commands)
- [Model Registry Extensions](#model-registry-extensions)
- [Theme Customization](#theme-customization)
- [Contributing](#contributing)

---

## Custom Tools

Tools allow the agent to interact with the file system, execute commands, and perform specialized tasks. qclaw uses the tool system from `@mariozechner/pi-coding-agent`.

### Tool Definition Structure

A tool is defined by a `Tool` object (from pi-ai) with:

```typescript
interface Tool<TParameters extends TSchema> {
  name: string;          // Unique identifier
  description: string;   // Shown in UI and LLM prompt
  parameters: TSchema;   // JSON Schema for arguments
  execute: (params: Static<TParameters>, signal?: AbortSignal) => Promise<ToolResult>;
}
```

### Creating a Custom Tool

1. Define the parameters schema using `@sinclair/typebox`:

```typescript
import { Type } from "@sinclair/typebox";

const MyToolParams = Type.Object({
  path: Type.String({ description: "Path to process" }),
  verbose: Type.Optional(Type.Boolean()),
});
```

2. Implement the execute function:

```typescript
async function executeMyTool(params: { path: string; verbose?: boolean }, signal?: AbortSignal) {
  // Perform work, respect signal for cancellation
  const result = await someAsyncOperation(params.path, { verbose: params.verbose });
  return {
    content: [{ type: "text", text: result }],
    details: { success: true },
    isError: false,
  };
}
```

3. Create the tool definition:

```typescript
import { Tool } from "@mariozechner/pi-ai";

const myTool: Tool<typeof MyToolParams> = {
  name: "my_tool",
  description: "My custom tool for special operations",
  parameters: MyToolParams,
  execute: executeMyTool,
};
```

4. Register with the agent:

```typescript
import { createAgent } from "@mariozechner/pi-agent";

const agent = await createAgent({
  customTools: [myTool],
});
```

### Using Extensions for Complex Tools

For tools that require more integration (UI, configuration, lifecycle hooks), create an **Extension**:

```typescript
import { Extension, ExtensionContext, ExtensionActions } from "@mariozechner/pi-coding-agent";

class MyExtension implements Extension {
  name = "my-extension";
  description = "Provides custom tools and UI";

  async activate(context: ExtensionContext, actions: ExtensionActions) {
    // Register tools
    actions.registerTool(myTool);

    // Add UI components if needed
    // actions.registerWidget(...);

    // Listen to events
    context.on("agent:start", () => console.log("Agent started"));
  }

  async deactivate() {
    // Cleanup
  }
}
```

Use the extension:

```bash
qclaw --extensions ./my-extension.ts
```

---

## Slash Commands

Slash commands allow users to type `/command` in the editor to trigger actions.

### Built-in Commands

Currently qclaw supports these slash commands (autocompleted):

- `/help` – Show help
- `/clear` – Clear chat history
- `/compact` – Manually compact session context
- `/exit` – Exit the application

### Adding Custom Slash Commands

You can extend the slash command list via `CombinedAutocompleteProvider`:

```typescript
import { CombinedAutocompleteProvider } from "@mariozechner/pi-tui";
import { SlashCommand } from "@mariozechner/pi-tui";

const customCommands = [
  {
    name: "mytool",
    description: "Run my custom tool",
    getArgumentCompletions: async (prefix) => {
      // Return suggestions for arguments
      return [{ value: "arg1", label: "Argument 1" }];
    },
  },
];
```

This is currently not yet exposed as a configuration flag; future versions will support `--slash-commands` or extension-based registration.

---

## Model Registry Extensions

If you want to add custom models or providers:

```typescript
import { ModelRegistry } from "@mariozechner/pi-coding-agent";

const registry = ModelRegistry.create();

// Add a custom model
registry.addModel({
  id: "my-custom-model",
  name: "My Custom Model",
  api: "openai-completions",
  provider: "my-provider",
  baseUrl: "https://api.example.com/v1",
  reasoning: false,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 8192,
  maxTokens: 4096,
});
```

Then pass this registry when creating the agent (via `sessionManager` or future config options).

---

## Theme Customization

qclaw uses the theme system from `pi-coding-agent`. Themes are JSON files with color definitions.

### Creating a Custom Theme

1. Copy an existing theme (`llm-context/pi-mono/packages/coding-agent/src/modes/interactive/theme/dark.json`).
2. Modify color values (hex strings or 0-255 for 256-color).
3. Place the file somewhere (e.g., `~/.qclaw/themes/my-theme.json`).
4. Use via CLI: `qclaw --theme custom` (future support) or edit config file.

### Theme Override via Config

You can override specific colors by creating a partial theme JSON:

```json
{
  "vars": {
    "accent": "#ff00ff",
    "border": "#444444"
  }
}
```

Place it at `~/.qclaw/theme.json` and set `"theme": "custom"` (future feature).

---

## Debugging

Enable debug logging:

```bash
qclaw --debug
```

Logs go to `~/.qclaw/log.txt`. You can also enable telemetry:

```bash
qclaw --telemetry
```

Telemetry logs to `~/.qclaw/telemetry.log`.

---

## Testing

To run tests for a package:

```bash
cd packages/agent && npm test
cd packages/tui && npm test
```

Integration tests for the main app are in `tests/`.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Run `npm run build` and `npm test` to ensure everything passes
5. Submit a PR

### Code Style

- TypeScript strict mode
- ESM modules (`.mjs`/`.ts` with `"type": "module"`)
- 2-space indentation
- Prefer composition over inheritance
- Use existing pi packages – don't reimplement

---

## Next Steps

- Explore the source of `pi-coding-agent` in `llm-context/` to understand the full capabilities.
- Join the Qcoder community for discussions and support.
- Report issues on GitHub.

---

*Happy Hacking!*
