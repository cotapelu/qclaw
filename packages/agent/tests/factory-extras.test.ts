import { describe, it } from "node:test";
import assert from "node:assert";
import { createAgent, createSimpleAgent } from "../src/factory.js";
import { SessionManager } from "@mariozechner/pi-coding-agent";

describe("Agent Factory Extras", () => {
  it("should create agent with custom sessionManager (injected)", async () => {
    // Create a temporary in-memory session manager
    const sessionManager = SessionManager.inMemory();
    const agent = await createAgent({
      sessionManager,
      tools: ["read", "bash"],
    });

    assert.ok(agent);
    assert.ok(agent.session);
    // Verify the session manager is the one we provided
    const sessionAny = agent.session as any;
    assert.strictEqual(sessionAny.sessionManager, sessionManager);

    await agent.shutdown();
  });

  it("should accept model string without crashing", async () => {
    // Provide a model string that likely won't resolve, but should not crash
    const agent = await createAgent({
      model: "claude-3-opus",
      tools: ["read", "bash"],
    });

    assert.ok(agent);
    // Model might not be resolved if no API key, but creation should succeed
    await agent.shutdown();
  });

  it("createSimpleAgent should use default tools and work", async () => {
    const agent = await createSimpleAgent();
    assert.ok(agent);
    assert.ok(agent.session);
    await agent.shutdown();
  });
});
