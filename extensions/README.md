# Example Plugins

This directory contains example qclaw extensions to help you get started.

## Structure

Each extension is self-contained in its own subdirectory:

```
extensions/
├── hello-world/          # Minimal "Hello, World!" plugin
├── git-helper/           # Git-related utilities
├── code-review/          # Code quality checks
└── ...
```

## Available Examples

### hello-world

The simplest possible extension that registers a tool.

📁 `hello-world/src/index.ts`:

```typescript
import { ExtensionAPI, defineTool } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function(pi: ExtensionAPI) {
  pi.on("agent_start", () => {
    console.log("Hello World extension loaded!");
  });

  pi.registerTool({
    name: "hello",
    label: "Hello",
    description: "Say hello",
    parameters: Type.Object({
      name: Type.Optional(Type.String())
    }),
    execute: async (ctx, params) => ({
      content: [{ type: "text", text: `Hello, ${params.name || 'World'}!` }],
      details: {}
    }),
  });
}
```

### git-helper

Provides git status and diff commands.

### code-review

Analyzes code for common issues and suggests improvements.

## Development Workflow

1. Copy an example as a starting point
2. Modify `src/index.ts` to implement your logic
3. Run `npm run build` in the extension directory
4. In qclaw, run `/reload` to load your changes
5. Test with `/your-command`

## Publishing Your Extension

1. Move your extension to its own repository
2. Publish to npm: `npm publish`
3. Users can install with:
   - `npm install -g your-extension`
   - The extension will be auto-loaded from `node_modules/.bin` or global location

## Resources

- [Developer Guide](../docs/DEVELOPER.md)
- [Pi SDK Documentation](https://pi-sdk.dev)
- [Extension API Reference](../docs/API.md)

---

Start with [hello-world](./hello-world/) and build from there!
