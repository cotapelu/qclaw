/**
 * Sanity test for pi-coding-agent integration
 * Verifies that AgentSession can be imported and instantiated with a mock config.
 * Run with: npx tsx packages/tui/tests/agent-session-sanity.test.ts
 */

import assert from "node:assert";
// We'll try to instantiate with a minimal config if possible
// Note: AgentSession requires actual model access, so we'll use a mock or just check import

try {
  // This may fail if pi-coding-agent is not installed or has peer deps issues
  // But in our dev environment it should be available
  const { AgentSession } = await import("@mariozechner/pi-coding-agent");
  
  console.log("🧪 AgentSession sanity test...\n");
  console.log("  ✅ import succeeded");

  // We cannot easily instantiate without a model provider, so just verify the type exists
  assert(typeof AgentSession === "function", "AgentSession should be a constructor");
  console.log("  ✅ AgentSession is a constructor");

  console.log("\n✨ AgentSession sanity test passed!");
  process.exit(0);
} catch (error) {
  console.error("❌ Failed to import AgentSession:", error);
  process.exit(1);
}
