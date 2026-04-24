/**
 * Integration test - simulates a mini chat app using the components
 */

import assert from "node:assert";
import { Container } from "@mariozechner/pi-tui";
import {
  ThemeManager,
  ChatContainer,
  FooterComponent,
  ProgressBar,
  UserMessageComponent,
} from "../src/index.js";
import { DynamicBorder } from "../src/components/layout/dynamic-border.js";

console.log("🧪 Running integration test...\n");

async function testMiniChatApp() {
  const theme = ThemeManager.getInstance();
  theme.initialize("dark");

  // Create ChatContainer
  const chat = new ChatContainer({ themeManager: theme, maxMessages: 10 });

  // Add user message (using real component from pi-coding-agent)
  const userMsg = new UserMessageComponent("Hello, world!", theme);
  chat.addMessage(userMsg);

  // Add a simple mock assistant message (just a text component)
  const mockAssistant = new Container();
  const text = new Container(); // Instead, use a simple Text? But Text is from pi-tui.
  // We'll just add an empty container to simulate.
  chat.addMessage(mockAssistant);

  // Create footer and progress bar
  const footer = new FooterComponent(theme, { cwd: "/home/test", model: "test-model" });
  const progress = new ProgressBar(theme, 20, { showPercentage: true });
  progress.setProgress(75);

  // Create bordered progress bar
  const border = new DynamicBorder(theme, { title: "Progress", borderStyle: "rounded" });
  border.addChild(progress);

  // Render chat
  const chatLines = chat.render(80);
  assert(chatLines.length > 0, "Chat should render lines");
  assert(chat.getMessages().length === 2, "Chat should have 2 messages");

  // Render footer
  const footerLines = footer.render(80);
  assert(footerLines.length === 1, "Footer should render one line");
  const footerData = footer.getData();
  assert(footerData.cwd === "/home/test", "Footer cwd should match");
  assert(footerData.model === "test-model", "Footer model should match");

  // Render progress bar
  const progressLines = progress.render(80);
  assert(progressLines.length === 1, "Progress bar should render one line");
  assert(progress.getProgress() === 75, "Progress should be 75");

  // Render bordered progress
  const borderLines = border.render(80);
  assert(borderLines.length > 0, "Border should render");

  console.log("  ✅ All components render correctly");
  console.log("  📊 Chat lines:", chatLines.length);
  console.log("  📊 Footer:", footerLines[0].trim());
  console.log("  📊 Progress:", progressLines[0].trim());
}

await testMiniChatApp();

console.log("\n✨ Integration test passed!");
process.exit(0);
