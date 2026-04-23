#!/usr/bin/env node

import { parseArgs } from "node:util";
import { runInteractiveMode, runPrintMode, runRpcMode, Mode } from "./modes/index.js";
import { loadConfig } from "./config/loader.js";

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      mode: {
        type: "string",
        short: "m",
        default: "interactive",
      },
      config: {
        type: "string",
        short: "c",
      },
      help: {
        type: "boolean",
        short: "h",
      },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Usage: qclaw [options] [message]

Modes:
  interactive (default)  Start interactive TUI
  print                 Print response to stdout, non-interactive
  rpc                   Start RPC server (JSON-RPC over stdio)

Options:
  -m, --mode <mode>     Run mode (interactive, print, rpc)
  -c, --config <path>   Path to config file (YAML or JSON)
  -h, --help            Show this help message

Examples:
  qclaw                           # Start interactive TUI
  qclaw -m print "Explain code"   # Print response
  qclaw -c ~/.pi/my-config.yaml   # Use custom config
    `);
    process.exit(0);
  }

  try {
    const mode = values.mode as Mode;
    const configPath = values.config;

    switch (mode) {
      case Mode.INTERACTIVE:
        await runInteractiveMode({ configPath });
        break;

      case Mode.PRINT:
        const message = positionals[0] || "";
        if (!message) {
          console.error("Error: message required for print mode");
          process.exit(1);
        }
        await runPrintMode(message, { configPath });
        break;

      case Mode.RPC:
        await runRpcMode({ configPath });
        break;

      default:
        console.error(`Error: unknown mode "${mode}"`);
        process.exit(1);
    }
  } catch (error: any) {
    console.error("Fatal error:", error.message);
    process.exit(1);
  }
}

main();
