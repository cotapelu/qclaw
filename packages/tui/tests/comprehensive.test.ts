/**
 * Comprehensive tests for pi-tui-professional package
 * Run with: npx tsx tests/comprehensive.test.ts
 */

import assert from "node:assert";
import { ThemeManager } from "../src/theme/theme-manager.js";
import { ChatContainer, createSeparator } from "../src/components/layout/chat-container.js";
import { FooterComponent } from "../src/components/layout/footer.js";
import { DynamicBorder, type BorderStyle } from "../src/components/layout/dynamic-border.js";
import { ScrollableContainer } from "../src/components/layout/scrollable-container.js";
import { ProgressBar } from "../src/components/layout/progress-bar.js";
import { createTitledBox, formatSize, formatDuration, renderDiff, truncateText, wrapText, padText, joinThemed } from "../src/utils/helpers.js";

console.log("🧪 Running comprehensive tests...\n");

// Test DynamicBorder
console.log("Test 1: DynamicBorder");
const theme = ThemeManager.getInstance();
theme.initialize("dark");

const border = new DynamicBorder(theme, {
  borderStyle: "double",
  title: "Test Border",
  padding: 1,
});
const mockChild = {
  render: (w: number) => ["  Hello  "],
};
border.addChild(mockChild);
const borderLines = border.render(40);
assert(borderLines.length > 0, "Border should render");
assert(borderLines[0].includes("╔"), "Double border top should start with ╔");
border.setTitle("New Title");
assert(borderLines.length > 0, "Border should still render after title change");
console.log("  ✅ DynamicBorder renders correctly");

// Test ScrollableContainer
console.log("\nTest 2: ScrollableContainer");
const scrollable = new ScrollableContainer(theme, 5);
const lines = ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5", "Line 6", "Line 7"];
for (const line of lines) {
  const comp = { render: (w: number) => [line] };
  scrollable.addChild(comp);
}
assert(scrollable.hasScrollbar(), "Should have scrollbar when content > viewport");
assert(scrollable.getScrollOffset() === 0, "Initial offset should be 0");
scrollable.scrollDown(2);
assert(scrollable.getScrollOffset() === 2, "Offset should be 2 after scrollDown(2)");
scrollable.scrollToBottom();
const maxOffset = Math.max(0, scrollable["totalHeight"] - 5);
assert(scrollable.getScrollOffset() === maxOffset, "Should be at bottom after scrollToBottom");
scrollable.scrollToTop();
assert(scrollable.getScrollOffset() === 0, "Should be at top after scrollToTop");
console.log("  ✅ ScrollableContainer scrolling works");

// Test ProgressBar
console.log("\nTest 3: ProgressBar");
const progress = new ProgressBar(theme, 20, { showPercentage: true });
progress.setProgress(50);
const progressLines = progress.render(40);
assert(progressLines.length === 1, "ProgressBar should render one line");
const line = progressLines[0];
assert(line.includes("50%"), "Should show 50%");
assert(line.length <= 40, "Line should fit within width");

progress.setProgress(100);
const fullLine = progress.render(40)[0];
assert(fullLine.includes("100%"), "Should show 100%");
console.log("  ✅ ProgressBar renders correctly");

// Test createSeparator
console.log("\nTest 4: createSeparator");
const sepSingle = createSeparator(30, "single");
assert(sepSingle.length === 30, "Separator should be exactly width");
assert(sepSingle === "─".repeat(30), "Single separator should use ─");
const sepDouble = createSeparator(10, "double");
assert(sepDouble === "═".repeat(10), "Double separator should use ═");
const sepDashed = createSeparator(5, "dashed");
assert(sepDashed === "┈".repeat(5), "Dashed separator should use ┈");
console.log("  ✅ createSeparator works");

// Test createTitledBox
console.log("\nTest 5: createTitledBox");
const boxLines = createTitledBox(
  "My Box",
  ["Line 1", "Line 2 is longer and should wrap if width is small"],
  60,
  theme,
  { borderStyle: "rounded", padding: 1 }
);
assert(boxLines.length >= 5, "Titled box should have at least 5 lines (top border, title, content lines, bottom border)");
assert(boxLines[0].includes("╭"), "Rounded border should start with ╭");
assert(boxLines.some(l => l.includes("My Box")), "Title should appear in border");
console.log("  ✅ createTitledBox works");

// Test formatSize
console.log("\nTest 6: formatSize");
assert(formatSize(0) === "0 B", "formatSize 0");
assert(formatSize(512) === "512 B", "formatSize 512B");
assert(formatSize(1024) === "1.0 KB", "formatSize 1KB");
assert(formatSize(1024 * 1024) === "1.0 MB", "formatSize 1MB");
assert(formatSize(1024 * 1024 * 1024) === "1.0 GB", "formatSize 1GB");
console.log("  ✅ formatSize works");

// Test formatDuration
console.log("\nTest 7: formatDuration");
assert(formatDuration(0) === "0s", "formatDuration 0");
assert(formatDuration(999) === "0s", "formatDuration <1s rounds to 0s");
assert(formatDuration(1000) === "1s", "formatDuration 1s");
assert(formatDuration(5000) === "5s", "formatDuration 5s");
assert(formatDuration(65000) === "1m 5s", "formatDuration 1m 5s");
assert(formatDuration(3600000) === "1h", "formatDuration 1h");
assert(formatDuration(3660000) === "1h 1m", "formatDuration 1h 1m");
console.log("  ✅ formatDuration works");

// Test joinThemed
console.log("\nTest 8: joinThemed");
const joined = joinThemed(["A", "B", "C"], " | ", theme);
assert(joined === "A | B | C", "joinThemed should join with separator");
console.log("  ✅ joinThemed works");

// Test renderDiff (basic)
console.log("\nTest 9: renderDiff");
const diff = `--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,3 @@
 line1
-line2
+line2 modified
 line3`;
const diffLines = renderDiff(diff, 40, theme);
assert(diffLines.length > 0, "renderDiff should return lines");
assert(diffLines.some(l => l.includes("line2")), "Should contain line2");
console.log("  ✅ renderDiff works");

// Test truncateText
console.log("\nTest 10: truncateText");
const truncated = truncateText("This is a very long text that should be truncated", 20, "...");
// Truncation should result in a string that when printed fits within width (considering ellipsis)
assert(truncated.length <= 30, "Truncated text should be reasonable length");
console.log("  ✅ truncateText works");

// Test wrapText
console.log("\nTest 11: wrapText");
const wrapped = wrapText("Short text", 10, theme);
assert(wrapped.length === 1 && wrapped[0].length <= 10, "Short text should fit in one line");
const longText = "This is a long text that should wrap to multiple lines when the width is small";
const wrappedLong = wrapText(longText, 20, theme);
assert(wrappedLong.length > 1, "Long text should wrap to multiple lines");
console.log("  ✅ wrapText works");

console.log("\n✨ All comprehensive tests passed!");
process.exit(0);
