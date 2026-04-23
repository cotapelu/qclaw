/**
 * Example: Basic Agent Usage with Event Bus
 *
 * This demonstrates how to create an agent, listen to events,
 * send messages, and shut down gracefully.
 *
 * Prerequisites:
 * - Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable
 * - Install dependencies: npm install
 * - Build: npm run build
 *
 * Run: npx tsx examples/basic-usage.ts
 */

import { createAgent, createEventBus } from "../src/index.js";

async function main() {
  console.log("🚀 Creating agent...");

  // Create a shared event bus
  const bus = createEventBus();

  // Create the agent with configuration
  const agent = await createAgent({
    cwd: process.cwd(),
    tools: ["read", "edit", "bash", "grep", "find", "ls", "git"],
    extensions: [],
    skills: [],
    sessionDir: "./.agent/sessions",
    eventBus: bus,
  });

  console.log("✅ Agent created. Subscribing to events...\n");

  // Subscribe to various events
  agent.on("message:user", (event) => {
    console.log("👤 User:", event.content.substring(0, 60) + (event.content.length > 60 ? "..." : ""));
  });

  agent.on("message:assistant", (event) => {
    console.log("🤖 Assistant:", event.content.substring(0, 80) + (event.content.length > 80 ? "..." : ""));
  });

  agent.on("tool:call", (event) => {
    console.log(`🔧 Tool call: ${event.toolName}`, event.input);
  });

  agent.on("tool:result", (event) => {
    if (event.error) {
      console.log(`❌ Tool error: ${event.toolName} - ${event.error}`);
    } else {
      console.log(`✅ Tool result: ${event.toolName} (${event.durationMs}ms)`);
    }
  });

  agent.on("tokens:update", (usage) => {
    console.log(`📊 Tokens: ${usage.totalTokens} (context: ${usage.contextPercent}%)`);
  });

  agent.on("thinking:start", (event) => {
    console.log(`💭 Thinking... (level: ${event.level || "medium"})`);
  });

  agent.on("thinking:end", () => {
    console.log(`💭 Done thinking`);
  });

  // Also can use bus directly
  bus.subscribe("session:compact", (event) => {
    console.log("🗜️ Session compacted", event);
  });

  // Send a simple message
  console.log("\n📨 Sending message: 'What files are in the current directory?'\n");
  await agent.sendMessage("What files are in the current directory?");

  // Wait a bit for response
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log("\n📨 Sending follow-up: 'List the contents of package.json'\n");
  await agent.sendMessage("List the contents of package.json");

  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log("\n🛑 Shutting down agent...");
  await agent.shutdown();

  console.log("✅ Done!");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
