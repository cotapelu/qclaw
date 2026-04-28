#!/usr/bin/env node

/**
 * PiClaw - CLI Entry Point
 * Professional AI Coding Agent using @mariozechner/pi-coding-agent
 */

import { parseCliOptions, printHelp } from "./cli/args.js";
import { PiClawAgent } from "./agent.js";
import { startInteractive } from "./modes/interactive.js";

async function main(): Promise<void> {
  const options = parseCliOptions();

  // Show help and exit if requested
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  console.log("Initializing PiClaw...");

  try {
    const agent = new PiClawAgent();
    await agent.initialize(options);
    await startInteractive(agent);
  } catch (error: any) {
    console.error("Failed to start:", error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
