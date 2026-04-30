#!/usr/bin/env node

/**
 * Custom Models Index
 * Export models cho custom providers.
 * Combines hardcoded fallback models với generated models từ models.dev.
 */

// Hardcoded fallback models
import { KILO_MODELS } from "./kilo-models.js";

// Re-export for external use
export { KILO_MODELS };

// Generated models (nested: { provider: { modelId: model } })
let generatedModels: Record<string, Record<string, any>> = {};

try {
  const gen = await import("./custom-models.generated.js");
  generatedModels = gen.CUSTOM_MODELS || {};  // ← ĐÚNG TÊN
  console.log("[Models] Loaded generated custom models for:", Object.keys(generatedModels).join(", "));
} catch (err) {
  console.log("[Models] No generated file found (run generate-custom-models)");
}

/**
 * Get models array cho một provider.
 */
export function getProviderModels(providerName: string): any[] {
  const providerModels = generatedModels[providerName];
  if (providerModels) {
    return Object.values(providerModels);  // ← CONVERT OBJECT TO ARRAY
  }

  // Fallback to hardcoded
  switch (providerName) {
    case "kilo":
      return KILO_MODELS;
    default:
      return [];
  }
}

// Convenience
export const KILO_MODELS_ALL = getProviderModels("kilo");
