#!/usr/bin/env node

/**
 * Piclaw Custom Extension
 * Adds slash commands for config viewing and piclaw-specific info.
 */

import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@mariozechner/pi-coding-agent";
import { join } from "node:path";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";

const CONFIG_PATH = join(homedir(), ".piclaw", "config.json");

function loadConfig(): Record<string, unknown> {
  if (!existsSync(CONFIG_PATH)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch (err) {
    return { error: "Failed to parse config" };
  }
}

export default function (api: ExtensionAPI) {
  // /config - show piclaw configuration
  api.registerCommand("config", {
    description: "Show Piclaw configuration",
    handler: async (args, ctx) => {
      const config = loadConfig();
      const message = `Piclaw config:\n\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\`\n\nEdit: ${CONFIG_PATH}`;
      if (ctx.ui) {
        ctx.ui.notify(message, "info");
      } else {
        api.sendMessage({
          customType: "piclaw-config",
          content: message,
          display: true,
          details: config,
        });
      }
    },
  });

  // /tools - show allowed tools
  api.registerCommand("tools", {
    description: "Show allowed tools for this session",
    handler: async (args, ctx) => {
      const tools = api.getActiveTools();
      const message = `Active tools (${tools.length}): ${tools.join(", ")}`;
      if (ctx.ui) {
        ctx.ui.notify(message, "info");
      } else {
        api.sendMessage({
          customType: "piclaw-tools",
          content: message,
          display: true,
          details: { tools },
        });
      }
    },
  });

  // /piclaw-status - show piclaw and session status
  api.registerCommand("piclaw-status", {
    description: "Show Piclaw status and current settings",
    handler: async (args, ctx) => {
      const config = loadConfig();
      const model = ctx.model;
      const thinking = api.getThinkingLevel();
      const activeTools = api.getActiveTools();
      const content = [
        `## Piclaw Status`,
        `- **Model**: ${model?.id ?? "none"}`,
        `- **Thinking**: ${thinking}`,
        `- **Active tools**: ${activeTools.join(", ")}`,
        `- **Config file**: ${CONFIG_PATH}`,
        `\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\``,
      ].join("\n");

      if (ctx.ui) {
        ctx.ui.notify(content, "info");
      }
      api.sendMessage({
        customType: "piclaw-status",
        content,
        display: true,
        details: { config, model, thinking, activeTools },
      });
    },
  });
}
