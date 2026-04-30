#!/usr/bin/env node

/**
 * Piclaw - CLI Entry Point
 * Using InteractiveMode from @mariozechner/pi-coding-agent
 */

import {
  createAgentSessionServices,
  createAgentSessionFromServices,
  SessionManager,
  AgentSessionRuntime,
  InteractiveMode,
  type CreateAgentSessionRuntimeResult,
  type AgentSessionServices,
  type SessionStartEvent,
} from "@mariozechner/pi-coding-agent";
import { getAgentDir, VERSION } from "./config/config.js";
import { createSubLoaderToolDefinition } from "./tools/subtool-loader.js";
import { loadConfig, type PiclawConfig } from "./config/config-manager.js";
import { parseOptions } from "./cli/args.js";
import { ensurePiclawExtensionRegistered, validateApiKeys } from "./helpers.js";
import chalk from "chalk";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main(args: string[] = process.argv.slice(2)): Promise<void> {
  const { opts, cliOverrides } = parseOptions(args);
  const cwd = opts.cwd ?? process.cwd();

  // Load persistent config and merge with CLI overrides
  const config = loadConfig(cliOverrides);

  // Validate API keys for configured providers
  validateApiKeys(config);

  console.log(`Piclaw v${VERSION} - Initializing...`);

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
      agentDir, // Use piclaw's agentDir to keep consistent with our config
    });

    // 2. Create session manager
    const sessionManager = SessionManager.create(cwd, config.sessionDir ?? opts.sessionDir);

    // 3. Create session from services with allowed tools from config
    const sessionStartEvent: SessionStartEvent = { type: "session_start", reason: "startup" };

    const customTools = [createSubLoaderToolDefinition(services.cwd)];
    const createSessionResult = await createAgentSessionFromServices({
      services,
      sessionManager,
      sessionStartEvent,
      tools: config.tools,
      customTools,
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

      const customTools = [createSubLoaderToolDefinition(newServices.cwd)];
      const result = await createAgentSessionFromServices({
        services: newServices,
        sessionManager: runtimeOpts.sessionManager,
        sessionStartEvent: runtimeOpts.sessionStartEvent,
        tools: config.tools,
        customTools,
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
            console.log(`Model set to ${model.id}`);
          } else {
            console.warn(`Model '${config.model}' not found in registry.`);
          }
        } else {
          console.warn(`Invalid model format: '${config.model}'. Use provider:modelId`);
        }
      } catch (err: any) {
        console.warn(`Failed to set model '${config.model}': ${err.message}`);
      }
    }

    if (config.thinking) {
      createSessionResult.session.setThinkingLevel(config.thinking);
      console.log(`Thinking level set to ${config.thinking}`);
    }

    // 7. Start interactive mode
    const interactive = new InteractiveMode(runtime, {
      verbose: config.verbose ?? false,
    });

    await interactive.run();
  } catch (error: any) {
    console.error("\n❌ Failed to start Piclaw:");

    // Provide helpful error messages based on error type
    if (error.message?.includes("ENOENT")) {
      console.error("  → A required file or directory was not found.");
    } else if (error.message?.includes("EACCES") || error.message?.includes("permission")) {
      console.error("  → Permission denied. Check file permissions.");
    } else if (error.message?.includes("API key") || error.message?.includes("api key")) {
      console.error("  → Missing or invalid API key. Check environment variables.");
    } else if (error.message?.includes("network") || error.message?.includes("ECONNREFUSED")) {
      console.error("  → Network error. Check your internet connection.");
    } else if (error.message?.includes("timeout")) {
      console.error("  → Request timed out. Try again later.");
    }

    console.error(`  Error: ${error.message}`);

    if (config.verbose) {
      console.error(error);
    } else {
      console.error("  Run with --verbose for more details.");
    }

    process.exit(1);
  }
}

// Export for programmatic usage (e.g., from cli.ts or tests)
export { main };
