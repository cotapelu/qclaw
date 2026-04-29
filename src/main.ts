#!/usr/bin/env node

/**
 * PiClaw - CLI Entry Point
 * Using InteractiveMode from @mariozechner/pi-coding-agent
 */

import {
  createAgentSessionServices,
  createAgentSessionFromServices,
  SessionManager,
  AgentSessionRuntime,
  InteractiveMode,
  getAgentDir,
  VERSION,
  type CreateAgentSessionRuntimeResult,
  type AgentSessionServices,
  type SessionStartEvent,
} from "@mariozechner/pi-coding-agent";
import chalk from "chalk";
import { loadConfig, saveConfig, type PiclawConfig } from "./config/config-manager.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Options {
  cwd?: string;
  tools?: string[];
  sessionDir?: string;
  model?: string;
  thinking?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  verbose?: boolean;
  config?: PiclawConfig;
}

/**
 * Ensure piclaw extension is registered in global settings.
 * This allows custom slash commands without manual user config.
 */
async function ensurePiclawExtensionRegistered(agentDir: string, extensionPath: string): Promise<void> {
  const globalSettingsPath = join(agentDir, "settings.json");

  // Read existing settings or use empty object
  let globalSettings: Record<string, unknown> = {};
  if (existsSync(globalSettingsPath)) {
    try {
      globalSettings = JSON.parse(readFileSync(globalSettingsPath, "utf-8"));
    } catch (err) {
      console.warn(chalk.yellow(`Failed to parse global settings, creating new.`));
    }
  }

  // Ensure extensions array
  if (!Array.isArray(globalSettings.extensions)) {
    globalSettings.extensions = [extensionPath];
  } else if (!globalSettings.extensions.includes(extensionPath)) {
    globalSettings.extensions.push(extensionPath);
  } else {
    return; // already registered
  }

  // Write back
  try {
    writeFileSync(globalSettingsPath, JSON.stringify(globalSettings, null, 2), "utf-8");
  } catch (err) {
    console.warn(chalk.yellow(`Failed to write global settings: ${err}`));
  }
}

function parseOptions(args: string[]): { opts: Options; cliOverrides: PiclawConfig } {
  const opts: Options = {};
  const cliOverrides: PiclawConfig = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--cwd" && args[i + 1]) opts.cwd = args[++i];
    if (args[i] === "--tools" && args[i + 1]) {
      opts.tools = args[i + 1].split(",");
      cliOverrides.tools = opts.tools;
    }
    if (args[i] === "--sessionDir" && args[i + 1]) {
      opts.sessionDir = args[++i];
      cliOverrides.sessionDir = opts.sessionDir;
    }
    if (args[i] === "--model" && args[i + 1]) {
      opts.model = args[++i];
      cliOverrides.model = opts.model;
    }
    if (args[i] === "--thinking" && args[i + 1]) {
      opts.thinking = args[++i] as any;
      cliOverrides.thinking = opts.thinking;
    }
    if (args[i] === "--verbose") {
      opts.verbose = true;
      cliOverrides.verbose = true;
    }
    if (args[i] === "-h" || args[i] === "--help") {
      console.log(`
PiClaw CLI - AI Coding Assistant

Options:
  --cwd <path>       Working directory (default: process.cwd())
  --tools <list>     Comma-separated tool allowlist
  --sessionDir <dir> Session directory
  --model <id>       Model to use (e.g., anthropic:claude-opus-4-5)
  --thinking <level> Thinking level: off|minimal|low|medium|high|xhigh
  --verbose          Show detailed logs
  -h, --help         Show this help
`);
      process.exit(0);
    }
  }

  return { opts, cliOverrides };
}

/**
 * Validate required API keys for configured providers.
 * Checks environment variables and warns user if missing.
 */
function validateApiKeys(config: PiclawConfig): void {
  const warnings: string[] = [];

  // Check model provider API keys if model is specified
  if (config.model) {
    const [provider] = config.model.split(":");
    switch (provider) {
      case "kilo":
        if (!process.env.KILO_API_KEY) {
          warnings.push(
            "KILO_API_KEY environment variable is not set. " +
            "Set it with: export KILO_API_KEY=your_api_key"
          );
        }
        break;
      case "anthropic":
        if (!process.env.ANTHROPIC_API_KEY) {
          warnings.push(
            "ANTHROPIC_API_KEY environment variable is not set. " +
            "Set it with: export ANTHROPIC_API_KEY=your_api_key"
          );
        }
        break;
      case "openai":
        if (!process.env.OPENAI_API_KEY) {
          warnings.push(
            "OPENAI_API_KEY environment variable is not set. " +
            "Set it with: export OPENAI_API_KEY=your_api_key"
          );
        }
        break;
    }
  }

  // Display warnings
  if (warnings.length > 0) {
    console.log(chalk.yellow("\n⚠️  API Key Warnings:"));
    for (const warning of warnings) {
      console.log(chalk.yellow(`  - ${warning}`));
    }
    console.log();
  }
}

async function main(args: string[] = process.argv.slice(2)): Promise<void> {
  const { opts, cliOverrides } = parseOptions(args);
  const cwd = opts.cwd ?? process.cwd();

  // Load persistent config and merge with CLI overrides
  const config: PiclawConfig = loadConfig(cliOverrides);
  opts.config = config;

  // Validate API keys for configured providers
  validateApiKeys(config);

  console.log(chalk.dim(`PiClaw v${VERSION} - Initializing...`));

  try {
    // Determine agentDir early for extension registration
    const agentDir = getAgentDir();

    // Always use compiled JS extension
    const extensionPath = join(__dirname, "extensions", "index.js");

    // Ensure piclaw extension is registered in global settings before services load extensions
    await ensurePiclawExtensionRegistered(agentDir, extensionPath);

    // 1. Create services (will load extensions from settings, including piclaw)
    const services: AgentSessionServices = await createAgentSessionServices({
      cwd,
    });

    // 2. Create session manager
    const sessionManager = SessionManager.create(cwd, config.sessionDir ?? opts.sessionDir);

    // 3. Create session from services with allowed tools from config
    const sessionStartEvent: SessionStartEvent = { type: "session_start", reason: "startup" };

    const createSessionResult = await createAgentSessionFromServices({
      services,
      sessionManager,
      sessionStartEvent,
      tools: config.tools,
    });

    // 4. Create runtime factory (for session switching)
    const createRuntime = async (runtimeOpts: {
      cwd: string;
      agentDir: string;
      sessionManager: SessionManager;
      sessionStartEvent?: SessionStartEvent;
    }): Promise<CreateAgentSessionRuntimeResult> => {
      const newServices = await createAgentSessionServices({
        cwd: runtimeOpts.cwd,
        agentDir: runtimeOpts.agentDir,
      });

      const result = await createAgentSessionFromServices({
        services: newServices,
        sessionManager: runtimeOpts.sessionManager,
        sessionStartEvent: runtimeOpts.sessionStartEvent,
        tools: config.tools,
      });

      return {
        ...result,
        services: newServices,
        diagnostics: [],
      };
    };

    // 5. Create runtime
    const runtime = new AgentSessionRuntime(
      createSessionResult.session,
      services,
      createRuntime,
      [], // diagnostics
      undefined // modelFallbackMessage
    );

    // 6. Apply initial model and thinking level from config (if available)
    if (config.model) {
      try {
        // Parse model reference: "provider:modelId"
        const [provider, modelId] = config.model.split(":");
        if (provider && modelId) {
          const model = services.modelRegistry.find(provider, modelId);
          if (model) {
            await createSessionResult.session.setModel(model);
            console.log(chalk.dim(`Model set to ${model.id}`));
          } else {
            console.warn(chalk.yellow(`Model '${config.model}' not found in registry.`));
          }
        } else {
          console.warn(chalk.yellow(`Invalid model format: '${config.model}'. Use provider:modelId`));
        }
      } catch (err) {
        console.warn(chalk.yellow(`Failed to set model '${config.model}': ${err}`));
      }
    }

    if (config.thinking) {
      createSessionResult.session.setThinkingLevel(config.thinking);
      console.log(chalk.dim(`Thinking level set to ${config.thinking}`));
    }

    // 7. Start interactive mode
    const interactive = new InteractiveMode(runtime, {
      verbose: config.verbose ?? false,
    });

    await interactive.run();
  } catch (error: any) {
    console.error(chalk.red("\n❌ Failed to start PiClaw:"));
    
    // Provide helpful error messages based on error type
    if (error.message?.includes("ENOENT")) {
      console.error(chalk.yellow("  → A required file or directory was not found."));
    } else if (error.message?.includes("EACCES") || error.message?.includes("permission")) {
      console.error(chalk.yellow("  → Permission denied. Check file permissions."));
    } else if (error.message?.includes("API key") || error.message?.includes("api key")) {
      console.error(chalk.yellow("  → Missing or invalid API key. Check environment variables."));
    } else if (error.message?.includes("network") || error.message?.includes("ECONNREFUSED")) {
      console.error(chalk.yellow("  → Network error. Check your internet connection."));
    } else if (error.message?.includes("timeout")) {
      console.error(chalk.yellow("  → Request timed out. Try again later."));
    }
    
    console.error(chalk.dim(`\n  Error: ${error.message}`));
    
    if (config.verbose) {
      console.error(error);
    } else {
      console.error(chalk.dim("\n  Run with --verbose for more details."));
    }
    
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(chalk.red("Fatal error:"), err);
  process.exit(1);
});

// Export for programmatic usage (e.g., from cli.ts or tests)
export { main };
