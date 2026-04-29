#!/usr/bin/env node
/**
 * Piclaw Custom Extension
 * 
 * Note: Kilo provider is already registered via kilo-provider.ts
 * This file can be extended with additional custom functionality.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (api: ExtensionAPI) {
  // ============================================================================
  // CUSTOM EXTENSIONS
  // ============================================================================
  // Future: Add custom providers, tools, or commands here
  
  // Example of adding a custom command (commented out):
  // api.registerCommand({
  //   name: "my-command",
  //   description: "My custom command",
  //   execute: async (args) => { ... }
  // });
}