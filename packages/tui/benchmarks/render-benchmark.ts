/**
 * Simple performance benchmark for pi-tui-professional components
 * Run: npx tsx benchmarks/render-benchmark.ts
 */

import { ThemeManager } from "../src/theme/theme-manager.js";
import { ChatContainer } from "../src/components/layout/chat-container.js";
import { FooterComponent } from "../src/components/layout/footer.js";
import { ProgressBar } from "../src/components/layout/progress-bar.js";
import { DynamicBorder } from "../src/components/layout/dynamic-border.js";
import { Container } from "@mariozechner/pi-tui";

console.log("⚡ Performance Benchmark - pi-tui-professional\n");

function benchmark(name: string, fn: () => void, iterations: number = 1000): number {
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = process.hrtime.bigint();
  const ns = Number(end - start);
  const avg = ns / iterations;
  console.log(`${name}: ${avg.toFixed(0)} ns/op (${(avg / 1000).toFixed(2)} µs)`);
  return avg;
}

// Init theme
const theme = ThemeManager.getInstance();
theme.initialize("dark");

// ChatContainer benchmark
const chat = new ChatContainer({ themeManager: theme, maxMessages: 100 });
for (let i = 0; i < 100; i++) {
  chat.addMessage({
    render: (w: number) => [`Message ${i}`],
    handleInput: () => {},
    invalidate: () => {},
    focused: false,
  } as any);
}
benchmark("ChatContainer.render (100 messages)", () => chat.render(80));

// FooterComponent benchmark
const footer = new FooterComponent(theme, { cwd: "/home/user/project", model: "test-model" });
footer.setTokenUsage(75);
benchmark("FooterComponent.render", () => footer.render(80));

// ProgressBar benchmark
const progress = new ProgressBar(theme, 30, { showPercentage: true });
progress.setProgress(50);
benchmark("ProgressBar.render", () => progress.render(80));

// DynamicBorder benchmark
const border = new DynamicBorder(theme, { title: "Test Panel", borderStyle: "double" });
border.addChild({
  render: (w: number) => ["  Content  "],
  handleInput: () => {},
  invalidate: () => {},
  focused: false,
} as any);
benchmark("DynamicBorder.render", () => border.render(80));

// Container benchmark (baseline)
const container = new Container();
for (let i = 0; i < 50; i++) {
  container.addChild({
    render: (w: number) => [`Line ${i}`],
    handleInput: () => {},
    invalidate: () => {},
    focused: false,
  } as any);
}
benchmark("Base Container.render (50 children)", () => container.render(80));

console.log("\n✅ Benchmark complete!");
process.exit(0);
