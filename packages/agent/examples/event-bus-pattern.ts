/**
 * Example: Event Bus Pattern with Agent
 *
 * Shows how to use the EventSubscriber for type-safe event handling
 * and how to emit custom events.
 */

import { createAgent, createEventBus, EventSubscriber } from "../src/index.js";

async function main() {
  console.log("🚀 Creating agent with custom event handling...\n");

  const bus = createEventBus();
  const subscriber = new EventSubscriber(bus);

  // Track events
  const events: any[] = [];

  // Subscribe to standard agent events
  subscriber.subscribe("message:assistant", (event) => {
    events.push({ type: "assistant", content: event.content });
    console.log("🤖 Assistant message received");
  });

  subscriber.subscribe("tokens:update", (event) => {
    events.push({ type: "tokens", total: event.totalTokens });
    console.log(`📊 Token update: ${event.totalTokens} total`);
  });

  // Subscribe to custom events
  subscriber.subscribe("my:custom:event", (event) => {
    events.push({ type: "custom", data: event });
    console.log("🔔 Custom event received:", event);
  });

  // Create the agent
  const agent = await createAgent({
    tools: ["read", "bash"],
    eventBus: bus,
  });

  // Emit a custom event
  bus.emit("my:custom:event", { message: "Hello from main", timestamp: Date.now() });

  // Send a message (will require API key to actually work)
  // await agent.sendMessage("Hello");

  await new Promise((r) => setTimeout(r, 1000));

  // Unsubscribe all
  subscriber.unsubscribeAll();

  // Emit another event - should not be received
  bus.emit("my:custom:event", { message: "This won't be received" });

  await new Promise((r) => setTimeout(r, 500));

  console.log("\n📋 Events captured:", events.length);
  console.log("✅ Event bus pattern works!");

  await agent.shutdown();
}

main().catch(console.error);
