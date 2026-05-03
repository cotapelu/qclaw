#!/usr/bin/env node

/**
 * Piclaw Extensions - Main Entry Point
 *
 * This file registers all custom extensions for Piclaw.
 */

import { registerKiloProvider } from "./providers/kilo-provider.js";
import { registerTodosTool, registerMemoryTool, registerEchoTool, registerSystemInfoTool } from "./tools/index.js";
import { createSubLoaderToolDefinition } from "../tools/subtool-loader.js";
import autoMemory from "./auto-memory.js";

export default function (api: import("@mariozechner/pi-coding-agent").ExtensionAPI) {
  // Register providers
  registerKiloProvider(api);

  // Register custom tools
  registerTodosTool(api);
  registerMemoryTool(api);
  
  // Register additional tools
  registerEchoTool(api);
  registerSystemInfoTool(api);

  // Register subtool_loader as a custom tool
  const subtoolLoader = createSubLoaderToolDefinition(process.cwd());
  api.registerTool(subtoolLoader);

  // Load auto-memory integration
  autoMemory(api);
}
