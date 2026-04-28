#!/usr/bin/env node

/**
 * Piclaw Custom Extension
 * Adds slash commands for config viewing and piclaw-specific info.
 */

import type {
  ExtensionAPI,
  ProviderConfig,
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
}
