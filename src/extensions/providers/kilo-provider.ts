#!/usr/bin/env node

/**
 * Kilo Provider Registration
 *
 * Registers Kilo Gateway as an API key provider.
 * Users can authenticate via /login → "Use an API key" → kilo.
 *
 * Environment variable: KILO_API_KEY
 * API endpoint: https://api.kilo.ai/v1
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { ProviderConfig } from "@mariozechner/pi-coding-agent";
import { KILO_MODELS_ALL } from "./models/index.js";

export function registerKiloProvider(api: ExtensionAPI): void {
  const config: ProviderConfig = {
    baseUrl: "https://api.kilo.ai/v1",
    apiKey: "KILO_API_KEY",
    api: "openai-completions",
    models: KILO_MODELS_ALL,
  };

  api.registerProvider("kilo", config);
}
