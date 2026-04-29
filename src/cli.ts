#!/usr/bin/env node

/**
 * Piclaw CLI Entry Point
 *
 * Minimal wrapper that delegates to main.ts.
 * Sets basic process metadata and environment.
 */

import { main } from "./main.js";

// Set process title
process.title = "piclaw";

// Mark as pi-based
process.env.PI_CODING_AGENT = "true";

// Simple error handlers (avoid crashing without logs)
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

// Run the application
await main(process.argv.slice(2));
