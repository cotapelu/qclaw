#!/usr/bin/env node

/**
 * Piclaw Custom Extension
 * Kept minimal: only custom provider registration.
 */

import type { ExtensionAPI, ProviderConfig } from "@mariozechner/pi-coding-agent";

export default function (api: ExtensionAPI) {
  // ============================================================================
  // CUSTOM PROVIDER REGISTRATION
  // ============================================================================

  // Kilo Gateway (OpenAI-compatible)
  // Set KILO_API_KEY environment variable, or configure via /login
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
