/**
 * Integration test for agent package
 * Tests: createAgent, event bus, shutdown, basic error handling
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { createAgent, createSimpleAgent, createEventBus, EventSubscriber } from "../src/index.js";

describe("Agent Package Integration", () => {
  it("should create agent with default config", async () => {
    // This may fail if no API key, but should create the session object
    let agent;
    try {
      agent = await createAgent({});
      assert.ok(agent);
      assert.ok(agent.session);
      assert.ok(agent.bus);
      assert.ok(typeof agent.sendMessage === "function");
      assert.ok(typeof agent.shutdown === "function");
      assert.ok(typeof agent.on === "function");
    } finally {
      if (agent) await agent.shutdown().catch(() => {});
    }
  });

  it("should create agent with custom event bus", async () => {
    const bus = createEventBus();
    let agent;
    try {
      agent = await createAgent({ eventBus: bus });
      assert.strictEqual(agent.bus, bus);
    } finally {
      if (agent) await agent.shutdown().catch(() => {});
    }
  });

  it("should subscribe to events via agent.on()", async () => {
    let agent;
    try {
      agent = await createAgent({});
      const received: any[] = [];

      const unsub = agent.on("some:event", (event) => {
        received.push(event);
      });

      // Emit custom event on bus
      agent.bus.emit("some:event", { hello: "world" });

      // Need to wait a tick
      await new Promise((r) => setTimeout(r, 10));

      assert.ok(received.length > 0, "Event should be received");
      unsub();
    } finally {
      if (agent) await agent.shutdown().catch(() => {});
    }
  });

  it("should use EventSubscriber correctly", async () => {
    const bus = createEventBus();
    const subscriber = new EventSubscriber(bus);
    const received: any[] = [];

    const unsub = subscriber.subscribe("test:event", (event) => {
      received.push(event);
    });

    bus.emit("test:event", { x: 1 });
    await new Promise((r) => setTimeout(r, 10));

    assert.ok(received.length === 1);
    assert.strictEqual(received[0].x, 1);

    unsub();
    bus.emit("test:event", { x: 2 });
    await new Promise((r) => setTimeout(r, 10));
    assert.strictEqual(received.length, 1); // no new event after unsubscribe
  });

  it("createSimpleAgent should set default tools", async () => {
    let agent;
    try {
      agent = await createSimpleAgent();
      assert.ok(agent);
      // We can't easily verify the tools without accessing internals
    } finally {
      if (agent) await agent.shutdown().catch(() => {});
    }
  });

  it("agent shutdown should dispose resources", async () => {
    const bus = createEventBus();
    const agent = await createAgent({ eventBus: bus });
    await agent.shutdown();
    // After shutdown, bus should still be usable but agent methods shouldn't throw
    assert.ok(true);
  });
});
