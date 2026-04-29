#!/usr/bin/env node

/**
 * Piclaw Extensions - Main Entry Point
 *
 * This file registers all custom extensions for PiClaw.
 */

import { registerKiloProvider } from "./providers/kilo-provider.js";
import { registerSessionsTool, registerTodosTool, registerMemoryTool } from "./tools/index.js";
import autoMemory from "./auto-memory.js";

export default function (api: import("@mariozechner/pi-coding-agent").ExtensionAPI) {
  // Register providers
  registerKiloProvider(api);

  // Register custom tools
  registerSessionsTool(api);
  registerTodosTool(api);
  registerMemoryTool(api);

  // Load auto-memory integration
  autoMemory(api);
}
