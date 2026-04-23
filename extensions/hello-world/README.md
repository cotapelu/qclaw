# Hello World Extension

A minimal example extension for qclaw that demonstrates how to register a custom tool.

## Features

- Registers `/hello` tool
- Greets user with customizable style
- Logs when agent starts

## Installation

1. Build the extension:
   ```bash
   npm run build
   ```

2. Copy or symlink to qclaw's extensions directory:
   ```bash
   ln -s $(pwd) /path/to/qclaw/extensions/hello-world
   ```

3. In qclaw, run `/reload` to load the extension

## Usage

Once loaded, the `hello` tool is available. Use it in chat:

```
Use the hello tool to greet Alice friendly
```

Or with slash command shortcut if registered.

## Development

- Edit `src/index.ts`
- Run `npm run watch` for auto-rebuild
- `/reload` in qclaw to test changes

## Learn More

- [Extension Development Guide](../docs/DEVELOPER.md)
- [Pi SDK API](https://pi-sdk.dev)
