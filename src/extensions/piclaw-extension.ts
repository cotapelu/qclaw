#!/usr/bin/env node

/**
 * Piclaw Custom Extension
 * Adds slash commands for config viewing and piclaw-specific info.
 */

import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ProviderConfig,
} from "@mariozechner/pi-coding-agent";
import { join } from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { loadConfig, saveConfig, type PiclawConfig } from "../config/config-manager.js";
import { Container, Text } from "@mariozechner/pi-tui";
import { DynamicBorder } from "@mariozechner/pi-coding-agent";

function getConfigPath(): string {
  return join(homedir(), ".piclaw", "config.json");
}

function loadLocalConfig(): PiclawConfig {
  const path = getConfigPath();
  if (!existsSync(path)) {
    return { model: undefined, thinking: "medium", tools: ["read", "bash", "edit", "write"], sessionDir: undefined, verbose: false };
  }
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return { model: undefined, thinking: "medium", tools: ["read", "bash", "edit", "write"], sessionDir: undefined, verbose: false };
  }
}

export default function (api: ExtensionAPI) {
  // ============================================================================
  // CUSTOM PROVIDER REGISTRATION
  // Add providers here to make them available in /login → "Use an API key"
  // ============================================================================

  // Kilo Gateway (OpenAI-compatible)
  // Set KILO_API_KEY environment variable, or enter via /login
  api.registerProvider("kilo", {
    baseUrl: "https://api.kilo.ai/v1",
    apiKey: "KILO_API_KEY",
    api: "openai-completions",
    models: [
      {
        id: "qwen/qwen3.5-397b-a17b",
        name: "Qwen3.5 397B (Kilo)",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 0.39, output: 2.34, cacheRead: 0.1, cacheWrite: 0 },
        contextWindow: 262144,
        maxTokens: 65536,
      },
      {
        id: "stepfun/step-3.5-flash",
        name: "Step 3.5 Flash (Kilo)",
        reasoning: true,
        input: ["text"],
        cost: { input: 0.1, output: 0.3, cacheRead: 0.02, cacheWrite: 0 },
        contextWindow: 256000,
        maxTokens: 256000,
      },
      {
        id: "x-ai/grok-4",
        name: "Grok 4 (Kilo)",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 3, output: 15, cacheRead: 0.75, cacheWrite: 0 },
        contextWindow: 256000,
        maxTokens: 51200,
      },
    ],
  } as ProviderConfig);

  // ============================================================================
  // PICLAW SLASH COMMANDS
  // ============================================================================

  // /config - Show current Piclaw configuration
  api.registerCommand("config", {
    description: "Show current Piclaw configuration",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const config = loadLocalConfig();
      const configStr = JSON.stringify(config, null, 2);
      // Show config in a custom overlay
      await ctx.ui.custom<void>((tui, theme, _kb, done) => {
        const lines = configStr.split("\n");
        const container = new Container();
        container.addChild(new DynamicBorder((str) => theme.fg("accent", str)));
        container.addChild(new Text(theme.fg("accent", theme.bold("Piclaw Configuration"))));
        for (const line of lines) {
          container.addChild(new Text(theme.fg("text", line)));
        }
        container.addChild(new Text(theme.fg("dim", "Press any key to close")));
        container.addChild(new DynamicBorder((str) => theme.fg("accent", str)));
        const comp = {
          render(width: number) { return container.render(width); },
          invalidate() { container.invalidate(); },
          handleInput(_data: string) { done(); },
        };
        return comp;
      });
    },
  });

  // /piclaw-set <key> <value> - Set a config value and save
  api.registerCommand("piclaw-set", {
    description: "Set a Piclaw config value (e.g., /piclaw-set model anthropic:claude-opus-4-5)",
    handler: async (argsStr: string, ctx: ExtensionCommandContext) => {
      const parts = argsStr.trim().split(/\s+/);
      if (parts.length < 2) {
        ctx.ui.notify("Usage: /piclaw-set <key> <value>", "error");
        return;
      }
      const key = parts[0];
      const value = parts.slice(1).join(" ");
      const configPath = getConfigPath();
      // Ensure config dir
      const configDir = join(homedir(), ".piclaw");
      if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
      // Load existing config
      let config = loadLocalConfig();
      // Update
      if (key === "tools") {
        // Expect comma-separated
        const requested = value.split(",").map((s) => s.trim()).filter(Boolean);
        const allToolNames = api.getAllTools().map(t => t.name);
        const invalid = requested.filter(t => !allToolNames.includes(t));
        if (invalid.length > 0) {
          ctx.ui.notify(`Invalid tools: ${invalid.join(", ")}. Available: ${allToolNames.join(", ")}`, "error");
          return;
        }
        config.tools = requested;
        // Apply immediately
        api.setActiveTools(config.tools);
        ctx.ui.notify(`Tools set to: ${config.tools.join(", ")}`, "info");
      } else if (key === "thinking") {
        if (!["off","minimal","low","medium","high","xhigh"].includes(value)) {
          ctx.ui.notify("Invalid thinking level. Use: off, minimal, low, medium, high, xhigh", "error");
          return;
        }
        config.thinking = value as PiclawConfig["thinking"];
        // Apply immediately
        api.setThinkingLevel(config.thinking!);
        ctx.ui.notify(`Thinking level set to: ${config.thinking}`, "info");
      } else if (key === "model") {
        // Format: provider:modelId
        if (!value.includes(":")) {
          ctx.ui.notify("Model must be in format provider:modelId", "error");
          return;
        }
        config.model = value;
        const [provider, modelId] = value.split(":");
        const model = ctx.modelRegistry.find(provider, modelId);
        if (model) {
          const ok = await api.setModel(model);
          if (!ok) {
            ctx.ui.notify(`No API key for ${provider}/${modelId}. Set via /login or env vars.`, "warning");
          } else {
            ctx.ui.notify(`Model set to: ${value}`, "info");
          }
        } else {
          ctx.ui.notify(`Model ${value} not found in registry`, "error");
        }
      } else if (key === "verbose") {
        const boolVal = value === "true" || value === "1";
        config.verbose = boolVal;
        ctx.ui.notify(`Verbose set to: ${boolVal}`, "info");
      } else {
        // For other keys, just update config
        (config as any)[key] = value;
        ctx.ui.notify(`Config ${key} set to: ${value}`, "info");
      }
      // Save to disk
      saveConfig(config);
    },
  });

  // /tools - List active tools
  api.registerCommand("tools", {
    description: "List active tools in the current session",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      const active = api.getActiveTools();
      const all = api.getAllTools();
      const activeSet = new Set(active);
      const lines: string[] = [];
      lines.push("Tools:");
      for (const tool of all) {
        const marker = activeSet.has(tool.name) ? "*" : " ";
        lines.push(`  ${marker} ${tool.name}: ${tool.description}`);
      }
      // Show in overlay
      await ctx.ui.custom<void>((tui, theme, _kb, done) => {
        const container = new Container();
        container.addChild(new DynamicBorder((str) => theme.fg("accent", str)));
        container.addChild(new Text(theme.fg("accent", theme.bold("Active Tools"))));
        for (const line of lines) {
          container.addChild(new Text(theme.fg("text", line)));
        }
        container.addChild(new Text(theme.fg("dim", "Press any key to close")));
        container.addChild(new DynamicBorder((str) => theme.fg("accent", str)));
        const comp = {
          render(width: number) { return container.render(width); },
          invalidate() { container.invalidate(); },
          handleInput(_data: string) { done(); },
        };
        return comp;
      });
    },
  });

  // /piclaw-status - Show Piclaw and session status
  api.registerCommand("piclaw-status", {
    description: "Show Piclaw status (version, cwd, model, session)",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      const config = loadLocalConfig();
      const model = ctx.model ? `${ctx.model.id}` : "none";
      const thinking = api.getThinkingLevel();
      const sessionName = api.getSessionName() || "default";
      const cwd = ctx.cwd;
      const configPath = getConfigPath();
      const lines = [
        "Piclaw Status",
        `  cwd: ${cwd}`,
        `  config: ${configPath}`,
        `  model: ${model}`,
        `  thinking: ${thinking}`,
        `  tools: ${config.tools?.join(", ") || "(all)"}`,
        `  session: ${sessionName}`,
      ];
      await ctx.ui.custom<void>((tui, theme, _kb, done) => {
        const container = new Container();
        container.addChild(new DynamicBorder((str) => theme.fg("accent", str)));
        container.addChild(new Text(theme.fg("accent", theme.bold("Piclaw Status"))));
        for (const line of lines) {
          container.addChild(new Text(theme.fg("text", line)));
        }
        container.addChild(new Text(theme.fg("dim", "Press any key to close")));
        container.addChild(new DynamicBorder((str) => theme.fg("accent", str)));
        const comp = {
          render(width: number) { return container.render(width); },
          invalidate() { container.invalidate(); },
          handleInput(_data: string) { done(); },
        };
        return comp;
      });
    },
  });
}

