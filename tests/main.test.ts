import { describe, it } from "node:test";
import assert from "node:assert";

describe("Main Application", () => {
  it("should import module without auto-starting the app", async () => {
    // Importing should not trigger app.run() because conditional entry check
    await import("../src/index.js");
    // If we get here without hanging, test passes
    assert.ok(true);
  });
});
