#!/usr/bin/env tsx

/**
 * Generate Custom Models Script
 *
 * Bắt chước y chang pi-ai/generate-models.ts nhưng chỉ fetch từ models.dev
 * cho các custom providers đã khai báo trong registry.ts.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, "..");
const OUTPUT_DIR = join(PROJECT_ROOT, "src", "extensions", "providers", "models");
const OUTPUT_FILE = join(OUTPUT_DIR, "custom-models.generated.ts");

// Import registry (this executes registrations)
await import(join(PROJECT_ROOT, "src", "extensions", "providers", "registry.js"));
const { getKnownCustomProviders } = await import(
  join(PROJECT_ROOT, "src", "extensions", "providers", "registry.js")
);

interface ModelsDevModel {
  id: string;
  name: string;
  tool_call?: boolean;
  reasoning?: boolean;
  limit?: { context?: number; output?: number };
  cost?: { input?: number; output?: number; cache_read?: number; cache_write?: number };
  modalities?: { input?: string[] };
}

function escapeName(name: string): string {
  return name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function loadModelsDevData(customProviders: any[]): Promise<Model<any>[]> {
  console.log("Fetching models from models.dev API...");
  const response = await fetch("https://models.dev/api.json");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();

  const models: Model<any>[] = [];

  // Duyệt từng custom provider (dựa trên sourceKey)
  for (const provider of customProviders) {
    const providerData = data[provider.sourceKey];

    if (!providerData?.models) {
      console.log(`  ⚠️  ${provider.providerName}: No data in models.dev`);
      continue;
    }

    for (const [modelId, model] of Object.entries(providerData.models)) {
      const m = model as ModelsDevModel;
      if (m.tool_call !== true) continue;

      models.push({
        id: modelId,
        name: m.name || modelId,
        api: provider.api as any,
        provider: provider.providerName as any,
        baseUrl: provider.baseUrl,
        reasoning: m.reasoning === true,
        input: (m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"]) as ("text" | "image")[],
        cost: {
          input: m.cost?.input || 0,
          output: m.cost?.output || 0,
          cacheRead: m.cost?.cache_read || 0,
          cacheWrite: m.cost?.cache_write || 0,
        },
        contextWindow: m.limit?.context || 4096,
        maxTokens: m.limit?.output || 4096,
      });
    }
  }

  console.log(`Loaded ${models.length} tool-capable models from models.dev`);
  return models;
}

async function generate(): Promise<void> {
  console.log("🚀 Generating custom models from models.dev...\n");

  try {
    const customProviders = getKnownCustomProviders();
    if (customProviders.length === 0) {
      console.log("⚠️  No custom providers registered in registry.ts");
      process.exit(0);
    }

    console.log(`Processing ${customProviders.length} custom provider(s):\n`);

    // Fetch models từ models.dev
    const allModels = await loadModelsDevData(customProviders);

    // Group by provider: Record<providerName, Record<modelId, Model>>
    const providers: Record<string, Record<string, Model<any>>> = {};
    for (const model of allModels) {
      if (!providers[model.provider]) {
        providers[model.provider] = {};
      }
      providers[model.provider][model.id] = model;
    }

    // Generate file content - EXACTLY like pi-ai
    const lines: string[] = [
      "// THIS FILE IS AUTO-GENERATED",
      "// Source: https://models.dev/api.json",
      `// Generated: ${new Date().toISOString()}`,
      "// DO NOT EDIT MANUALLY - Run 'npm run generate-custom-models' to update",
      "",
      "import type { Model } from \"@mariozechner/pi-ai\";",
      "",
      "export const CUSTOM_MODELS = {",
    ];

    // Sort providers for deterministic output
    const sortedProviderNames = Object.keys(providers).sort();
    for (const providerName of sortedProviderNames) {
      const providerModels = providers[providerName];
      lines.push(`  "${providerName}": {`);

      // Sort model IDs
      const sortedModelIds = Object.keys(providerModels).sort();
      for (const modelId of sortedModelIds) {
        const model = providerModels[modelId];
        const inputArray = model.input.includes("image") ? '["text", "image"]' : '["text"]';

        lines.push(`    "${modelId}": {`);
        lines.push(`      id: "${escapeName(model.id)}",`);
        lines.push(`      name: "${escapeName(model.name)}",`);
        lines.push(`      api: "${model.api}",`);
        lines.push(`      provider: "${model.provider}",`);
        lines.push(`      baseUrl: "${model.baseUrl}",`);
        lines.push(`      reasoning: ${model.reasoning},`);
        lines.push(`      input: ${inputArray},`);
        lines.push(`      cost: {`);
        lines.push(`        input: ${model.cost.input},`);
        lines.push(`        output: ${model.cost.output},`);
        lines.push(`        cacheRead: ${model.cost.cacheRead},`);
        lines.push(`        cacheWrite: ${model.cost.cacheWrite},`);
        lines.push(`      },`);
        lines.push(`      contextWindow: ${model.contextWindow},`);
        lines.push(`      maxTokens: ${model.maxTokens},`);
        lines.push(`    } satisfies Model<"${model.api}">,`);
      }

      lines.push(`  },`);
    }

    lines.push(`} as const;`);

    // Write file
    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf-8");
    console.log(`\n✅ Generated: ${OUTPUT_FILE}\n`);

  } catch (error) {
    console.error("❌ Generation failed:", error);
    if (error instanceof Error) console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
}

generate();
