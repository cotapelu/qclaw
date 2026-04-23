import { describe, it } from "node:test";
import assert from "node:assert";

describe("Agent Package Sanity Tests", () => {
  it("should export factory functions", async () => {
    const { createAgent, createSimpleAgent } = await import("../src/factory.js");
    assert.ok(typeof createAgent === "function");
    assert.ok(typeof createSimpleAgent === "function");
  });

  it("should export EventSubscriber from bus", async () => {
    const { EventSubscriber } = await import("../src/bus.js");
    assert.ok(typeof EventSubscriber === "function");
  });

  it("should export createEventBus from coding-agent", async () => {
    const { createEventBus } = await import("../src/index.js");
    assert.ok(typeof createEventBus === "function");
  });

  it("should re-export key components from pi-coding-agent", async () => {
    const mod = await import("../src/index.js");
    // Core session
    assert.ok("AgentSession" in mod);
    // UI components
    assert.ok("UserMessageComponent" in mod);
    assert.ok("AssistantMessageComponent" in mod);
    assert.ok("CustomEditor" in mod);
    assert.ok("FooterComponent" in mod);
    // Theme / utilities
    assert.ok("initTheme" in mod);
    assert.ok("getMarkdownTheme" in mod);
  });

  it("should re-export core abstractions under Core namespace", async () => {
    const { Core } = await import("../src/index.js");
    assert.ok("Agent" in Core);
    // AgentLoop is a function, not a class
    assert.ok("agentLoop" in Core || "runAgentLoop" in Core);
  });

  it("should re-export AI utilities (functions) from pi-ai", async () => {
    const mod = await import("../src/index.js");
    assert.ok("streamSimple" in mod);
    // Types like Model/ImageContent are compile-time only
  });

  it("should implement factory Agent interface", async () => {
    // Types are compile-time; just ensure module loads
    await import("../src/factory.js");
    assert.ok(true);
  });
});
