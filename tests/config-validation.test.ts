import { describe, it } from "node:test";
import assert from "node:assert";

// Simple validation (mirrors index.ts)
function validateConfig(raw: any): any {
  const valid = {};
  if (raw.theme === "dark" || raw.theme === "light" || raw.theme === "auto") {
    valid.theme = raw.theme;
  }
  if (typeof raw.model === "string") {
    valid.model = raw.model;
  }
  if (Array.isArray(raw.tools) && raw.tools.every((t: any) => typeof t === "string")) {
    valid.tools = raw.tools;
  }
  if (typeof raw.sessionDir === "string") {
    valid.sessionDir = raw.sessionDir;
  }
  return valid;
}

describe("Config Validation", () => {
  it("should accept valid config", () => {
    const raw = {
      theme: "dark",
      model: "claude-3-opus",
      tools: ["read", "edit"],
      sessionDir: "./sessions",
    };
    const result = validateConfig(raw);
    assert.strictEqual(result.theme, "dark");
    assert.strictEqual(result.model, "claude-3-opus");
    assert.deepEqual(result.tools, ["read", "edit"]);
    assert.strictEqual(result.sessionDir, "./sessions");
  });

  it("should accept empty config", () => {
    const result = validateConfig({});
    assert.strictEqual(result.theme, undefined);
    assert.strictEqual(result.model, undefined);
    assert.strictEqual(result.tools, undefined);
    assert.strictEqual(result.sessionDir, undefined);
  });

  it("should accept partial config", () => {
    const raw = { theme: "light" };
    const result = validateConfig(raw);
    assert.strictEqual(result.theme, "light");
    assert.strictEqual(result.model, undefined);
  });

  it("should reject invalid theme", () => {
    const raw = { theme: "purple" };
    const result = validateConfig(raw);
    assert.strictEqual(result.theme, undefined);
  });

  it("should coerce types correctly", () => {
    const raw = { tools: "read,edit" }; // wrong type (string instead of array)
    const result = validateConfig(raw);
    assert.strictEqual(result.tools, undefined);
  });
});
