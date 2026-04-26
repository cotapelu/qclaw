import { describe, it } from "node:test";
import assert from "assert";
import { SLASH_COMMANDS } from "../src/index.js";

describe("Slash Commands", () => {
  it("should include required commands", () => {
    const names = SLASH_COMMANDS.map(c => c.name);
    assert.ok(names.includes("help"));
    assert.ok(names.includes("clear"));
    assert.ok(names.includes("exit"));
    assert.ok(names.includes("save"));
    assert.ok(names.includes("export"));
    assert.ok(names.includes("edit"));
  });

  it("each command should have description", () => {
    for (const cmd of SLASH_COMMANDS) {
      assert.ok(cmd.description && cmd.description.length > 0, `Command ${cmd.name} missing description`);
    }
  });
});
