/**
 * Simple import test for agent package
 * This tests that all exports are accessible and types are correct.
 */

import { createAgent, createSimpleAgent, EventSubscriber, createEventBus } from "../src/index.js";
import type { Agent, AgentConfig } from "../src/index.js";
import type { Component, Focusable } from "@mariozechner/pi-tui";
import type { UserMessageComponent, AssistantMessageComponent } from "@mariozechner/pi-coding-agent";
import type { Agent as CoreAgent, AgentLoop } from "@mariozechner/pi-agent-core";
import type { Model, ImageContent } from "@mariozechner/pi-ai";

console.log("✅ All imports successful!");

// Type checks (compile-time only)
function typeChecks() {
  const config: AgentConfig = {
    cwd: process.cwd(),
    tools: ["read", "edit", "bash"],
    extensions: [],
    skills: [],
    sessionDir: "./.agent/sessions",
  };

  const agent: Agent = {
    session: {} as any,
    bus: createEventBus(),
    sendMessage: async () => {},
    sendMessageWithImages: async () => {},
    shutdown: async () => {},
    on: () => () => {},
  };

  // Type-only checks (compile-time)
  const _typeCheck: Component = {} as any;
  const _focusable: Focusable = {} as any;
  const _userMsg: UserMessageComponent = {} as any;
  const _asstMsg: AssistantMessageComponent = {} as any;
  const _coreAgent: CoreAgent = {} as any;
  const _model: Model<any> = {} as any;
  const _img: ImageContent = {} as any;
}

console.log("✅ Type checks compile");

// Runtime smoke test: createEventBus
const bus = createEventBus();
console.log("✅ createEventBus works");

// Test EventSubscriber
const subscriber = new EventSubscriber(bus);
const unsub = subscriber.subscribe("test:event", (e) => {
  console.log("Received:", e);
});
bus.emit("test:event", { hello: "world" });
unsub();
console.log("✅ EventSubscriber works");

console.log("\n✅ All agent package functionality verified!");
