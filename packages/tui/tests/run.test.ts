/**
 * Simple test suite for pi-tui-professional package
 * Run with: npx tsx packages/tui/tests/run.test.ts
 */

import assert from "node:assert";
import { ThemeManager } from "../src/theme/theme-manager.js";
import { ChatContainer } from "../src/components/layout/chat-container.js";
import { FooterComponent } from "../src/components/layout/footer.js";
import { formatSize, formatDuration } from "../src/utils/helpers.js";

console.log("🧪 Running pi-tui-professional tests...\n");

// Test 1: ThemeManager
console.log("Test 1: ThemeManager");
const theme = ThemeManager.getInstance();
const mode = theme.initialize({ mode: "dark" });
assert(mode === "dark" || mode === "light", "Theme should initialize");
console.log("  ✅ Theme initialized:", mode);

const result = theme.setTheme("light");
assert(result.success, "Theme should change");
console.log("  ✅ Theme changed to:", result.mode);

const fgText = theme.fg("accent", "test");
assert(fgText.includes("\x1b["), "Should apply ANSI color");
console.log("  ✅ fg() applies color");

// Test 2: ChatContainer
console.log("\nTest 2: ChatContainer");
const chat = new ChatContainer({ themeManager: theme, maxMessages: 10 });
assert(chat !== null, "ChatContainer should create");
console.log("  ✅ ChatContainer created");

const mockComponent = {
  render: (w: number) => ["mock line"],
  handleInput: () => {},
  invalidate: () => {},
  focused: false,
};
chat.addMessage(mockComponent);
assert(chat.getMessages().length === 1, "Should have 1 message");
console.log("  ✅ addMessage() works");

chat.clearMessages();
assert(chat.getMessages().length === 0, "Should be empty");
console.log("  ✅ clearMessages() works");

// Test 3: FooterComponent
console.log("\nTest 3: FooterComponent");
const footer = new FooterComponent(theme, {
  cwd: "/home/user/project",
  model: "test-model",
});
footer.setTokenUsage(75);
footer.setThinkingLevel("high");

const footerData = footer.getData();
assert(footerData.cwd === "/home/user/project", "CWD should match");
assert(footerData.tokenUsage === 75, "Token usage should match");
assert(footerData.thinkingLevel === "high", "Thinking level should match");
console.log("  ✅ FooterComponent data methods work");

// Test 4: Utilities
console.log("\nTest 4: Utilities");
assert(formatSize(1024) === "1.0 KB", "formatSize KB");
assert(formatSize(1024 * 1024) === "1.0 MB", "formatSize MB");
console.log("  ✅ formatSize works");

assert(formatDuration(5000) === "5s", "formatDuration ms");
assert(formatDuration(65000) === "1m 5s", "formatDuration min");
console.log("  ✅ formatDuration works");

// Test 5: ThemeManager subscription
console.log("\nTest 5: ThemeManager subscriptions");
let callCount = 0;
const unsubscribe = theme.subscribe(() => {
  callCount++;
});
theme.setTheme("dark");
assert(callCount > 0, "Subscriber should be notified");
unsubscribe();
console.log("  ✅ Subscriptions work");

console.log("\n✨ All tests passed!");
process.exit(0);
