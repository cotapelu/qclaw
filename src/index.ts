#!/usr/bin/env node

import { AgentCore } from "./agent/core.js";
import { AgentCLI } from "./agent/cli.js";
import { AgentConfig } from "./config.js";
import { getCustomTools } from "./tools/index.js";

interface CliOptions {
  mode?: "cli" | "print" | "rpc";
  config?: string;
  message?: string; // For print mode
  output?: string; // For print mode: file to write output
  format?: "json" | "markdown" | "text"; // Output format for print mode
  verbose?: boolean;
  noSession?: boolean;
  help?: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = { mode: "cli" };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--print" || arg === "-p") {
      options.mode = "print";
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        options.message = args[++i];
      }
    } else if (arg === "--output" || arg === "-o") {
      if (i + 1 < args.length) options.output = args[++i];
    } else if (arg === "--format" || arg === "-f") {
      if (i + 1 < args.length) {
        const fmt = args[++i];
        if (fmt === "json" || fmt === "markdown" || fmt === "text") {
          options.format = fmt;
        } else {
          console.error(`Invalid format: ${fmt}. Use json, markdown, or text.`);
        }
      }
    } else if (arg === "--rpc") {
      options.mode = "rpc";
    } else if (arg === "--config" || arg === "-c") {
      if (i + 1 < args.length) options.config = args[++i];
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--no-session") {
      options.noSession = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (!arg.startsWith("-")) {
      if (!options.config) options.config = arg;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Pi SDK Agent - AI coding assistant

Usage:
  npm start              # Interactive CLI (default)
  npm start --print msg  # Print mode (single-shot)
  npm start --rpc        # RPC mode (JSON-RPC server)
  npm start --help       # Show this help

Options:
  -c, --config <file>    Path to config file (YAML/JSON)
  -o, --output <file>    Write print mode output to file
  -f, --format <fmt>     Output format: json, markdown, text (default: text)
  -v, --verbose          Enable verbose logging
  --no-session           Disable session persistence

Examples:
  npm start --print "Explain the code in main.ts"
  npm start --print "Summarize" --output summary.txt
  npm start --print "Review" --format json > output.json
  npm start --config ./my-config.yaml

Environment:
  ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.
  PI_AGENT_DIR           Agent directory (default: ~/.pi/agent)
  PI_VERBOSE             Enable verbose logging

See README.md for more.
`);
}

async function loadConfigFile(path?: string): Promise<Partial<AgentConfig>> {
  if (!path) return {};

  try {
    const fs = await import('fs');
    const yaml = await import('yaml');
    const content = fs.readFileSync(path, 'utf-8');
    const ext = path.split('.').pop()?.toLowerCase();

    if (ext === 'json') return JSON.parse(content);
    if (ext === 'yaml' || ext === 'yml') return yaml.parse(content);
    console.warn(`Unknown config extension: ${ext}`);
    return {};
  } catch (error: any) {
    console.error(`Failed to load config ${path}: ${error.message}`);
    return {};
  }
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
    return;
  }

  // Load config
  const fileConfig = await loadConfigFile(options.config);

  // Determine agent directory
  const piPkg = await import("@mariozechner/pi-coding-agent");
  const defaultAgentDir = piPkg.getAgentDir();
  const agentDir = process.env.PI_AGENT_DIR || fileConfig.agentDir || defaultAgentDir;

  // Build agent config
  const agentConfig: AgentConfig = {
    cwd: process.cwd(),
    agentDir,
    customTools: getCustomTools(),
    thinkingLevel: (fileConfig.thinkingLevel as any) || "off",
    usePersistence: options.noSession ? false : true,
    interactive: options.mode === "cli" || options.mode === "rpc",
    verbose: options.verbose || false,
    quiet: options.mode === "print",
    configFile: options.config,
  };

  if (fileConfig.model) agentConfig.model = fileConfig.model;

  // Create agent
  const agent = new AgentCore(agentConfig);

  // Signal handling
  const shutdown = async (signal: string) => {
    if (!agentConfig.quiet) console.log(`\nReceived ${signal}, shutting down...`);
    agent.dispose();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Initialize
  if (agentConfig.verbose) console.time("init");
  await agent.initialize();
  if (agentConfig.verbose) console.timeEnd("init");

  // For print mode, prepare output stream or buffer
  let outputStream: any = null;
  let outputBuffer = '';
  const format = options.format || 'text';
  const useBuffer = format !== 'text' || options.output; // buffer if json/markdown or output file

  if (options.mode === "print" && options.output && !useBuffer) {
    const fs = await import('fs');
    outputStream = fs.createWriteStream(options.output);
  }

  // For print mode, subscribe to output delta
  if (options.mode === "print") {
    const session = agent.getSession();
    if (session) {
      session.subscribe((event: any) => {
        if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
          const data = event.assistantMessageEvent.delta;
          if (useBuffer) {
            outputBuffer += data;
          } else if (outputStream) {
            outputStream.write(data);
          } else {
            process.stdout.write(data);
          }
        } else if (event.type === 'turn_end') {
          const newline = '\n';
          if (useBuffer) {
            outputBuffer += newline;
          } else if (outputStream) {
            outputStream.write(newline);
          } else {
            console.log();
          }
        }
      });
    }
  }

  // Banner handled by AgentCLI

  // Run mode
  switch (options.mode) {
    case "cli": {
      const cli = new (await import("./agent/cli.js")).AgentCLI(agent, agentConfig.verbose);
      await cli.start();
      break;
    }

    case "print": {
      const message = options.message || options.config || "Hello";
      if (agentConfig.verbose) console.log(`[PRINT] ${message}`);
      await agent.prompt(message);

      // Capture stats before dispose
      const stats = agent.getStats();
      const model = agent.getModel();
      const settings = agent.getSettings();

      agent.dispose();

      // If buffering, format and write output
      if (useBuffer) {
        let finalOutput = outputBuffer;
        if (format === 'json') {
          const jsonOutput = {
            text: outputBuffer.trim(),
            stats: {
              tokens: stats.totalTokens,
              promptTokens: stats.promptTokens,
              completionTokens: stats.completionTokens,
              cost: stats.estimatedCost,
              duration: stats.sessionDuration,
            },
            model: model ? `${model.provider}/${model.id}` : null,
            thinkingLevel: settings?.thinkingLevel || 'off',
          };
          finalOutput = JSON.stringify(jsonOutput, null, 2);
        }
        // markdown format: leave as is (already markdown)
        // text format: already plain

        if (options.output) {
          const fs = await import('fs');
          fs.writeFileSync(options.output, finalOutput);
        } else {
          console.log(finalOutput);
        }
      } else if (outputStream) {
        outputStream.end();
      }

      process.exit(0);
      break;
    }

    case "rpc":
      console.error("RPC mode not yet implemented. Use pi directly.");
      process.exit(1);
      break;
  }
}

// Error handling
process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error: any) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

main();
