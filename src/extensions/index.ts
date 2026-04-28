#!/usr/bin/env node

/**
 * Piclaw Extensions - Main Entry Point
 *
 * This file registers all custom extensions for PiClaw.
 */

import { registerKiloProvider } from "./providers/kilo-provider.js";
import { registerEchoTool, registerSystemInfoTool } from "./tools/index.js";

export default function (api: import("@mariozechner/pi-coding-agent").ExtensionAPI) {
  // Register providers
  registerKiloProvider(api);

  // Register custom tools
  registerEchoTool(api);
  registerSystemInfoTool(api);
}
