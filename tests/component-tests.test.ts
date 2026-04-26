import { describe, it } from "node:test";
import assert from "assert";

// Test imports of our custom components
import { ChatContainer } from "../packages/tui/src/components/chat/chat-container.js";
import { ThemeManager } from "../packages/tui/src/theme/theme-manager.js";

describe("Component Imports", () => {
  it("should load ThemeManager", () => {
    assert.ok(ThemeManager);
  });
});

describe("ChatContainer", () => {
  it("should create a ThemeManager instance", () => {
    const tm = ThemeManager.getInstance();
    tm.initialize("dark");
    assert.ok(tm);
  });
});
