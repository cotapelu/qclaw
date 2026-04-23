/**
 * Advanced example: Integrating pi-coding-agent AgentSession with pi-tui-professional
 *
 * This demonstrates how to use the high-level AgentSession API for
 * a full AI coding agent with session persistence, tools, and streaming.
 *
 * Run: npx tsx examples/agent-session-demo.ts
 */

import { TUI, ProcessTerminal, Container, Text } from "@mariozechner/pi-tui";
import {
  ThemeManager,
  ChatContainer,
  FooterComponent,
  CustomEditor,
  UserMessageComponent,
  AssistantMessageComponent,
  ToolExecutionComponent,
  initTheme,
  createAgentSession,
  type AgentSession,
} from "@mariozechner/pi-tui-professional";

// Mock simple LLM stream for demo (replace with real provider)
async function* mockStreamResponse(prompt: string): AsyncGenerator<string> {
  const responses = [
    `I received your message: "${prompt}"`,
    "\n\nI can help you with:\n",
    "- Reading files\n",
    "- Writing code\n",
    "- Running commands\n",
    "\nWhat would you like me to do?",
  ];
  for (const part of responses) {
    await new Promise(r => setTimeout(r, 300));
    yield part;
  }
}

async function main() {
  // Initialize TUI
  const terminal = new ProcessTerminal();
  const tui = new TUI(terminal);

  // Init theme
  const theme = ThemeManager.getInstance();
  theme.initialize("dark");

  // Create layout
  const layout = new Container();
  tui.addChild(layout);

  // Chat container
  const chat = new ChatContainer({ themeManager: theme, maxMessages: 50 });
  layout.addChild(chat);

  // Footer
  const footer = new FooterComponent(theme, {
    cwd: process.cwd(),
    model: "demo-model",
    tokenUsage: 0,
    thinkingLevel: "low",
  });
  layout.addChild(footer);

  // Editor
  const editor = new CustomEditor(tui, theme, {
    placeholder: "Enter message... (Ctrl+D to exit, /help for commands)",
  });
  layout.addChild(editor);

  // State
  let currentSession: AgentSession | null = null;
  let isProcessing = false;

  // Helper: stream message to assistant component
  async function streamToAssistant(component: AssistantMessageComponent, stream: AsyncGenerator<string>) {
    let fullText = "";
    for await (const chunk of stream) {
      fullText += chunk;
      component.updateContent(fullText);
      // Update footer token usage (simulate)
      const usage = Math.min(100, Math.floor(Math.random() * 30) + 50);
      footer.setTokenUsage(usage);
    }
    return fullText;
  }

  // Input handler
  tui.onInput = async (data) => {
    if (data === "\r") {
      const input = editor.getValue().trim();
      if (!input || isProcessing) return;
      editor.clear();

      // Handle commands
      if (input.startsWith("/")) {
        await handleCommand(input.slice(1), chat, footer);
        return;
      }

      isProcessing = true;
      footer.addStatus("Processing...");

      // Add user message
      const userMsg = new UserMessageComponent(input, theme);
      chat.addMessage(userMsg);

      // Create assistant message placeholder
      const assistantMsg = new AssistantMessageComponent("", false, theme);
      chat.addMessage(assistantMsg);

      // Simulate tool execution (in real app, this would be from AgentSession)
      const toolCall = new ToolExecutionComponent(
        "read",
        "call-demo",
        { path: "package.json" },
        { showImages: false },
        undefined,
        undefined,
        process.cwd()
      );
      chat.addChild(toolCall);
      // Simulate tool result after delay
      setTimeout(() => {
        toolCall.updateResult({
          content: [{ type: "text", text: "Read package.json:\n{ \"name\": \"demo\", ... }" }],
          isError: false,
        });
      }, 1000);

      // Stream response
      const stream = mockStreamResponse(input);
      await streamToAssistant(assistantMsg, stream);

      isProcessing = false;
      footer.removeStatus("Processing...");
      footer.setTokenUsage(0);
    } else if (data === "\u0003") { // Ctrl+C
      tui.stop();
    }
  };

  // Command handler
  async function handleCommand(cmd: string, chat: ChatContainer, footer: FooterComponent) {
    const parts = cmd.split(" ");
    const command = parts[0];

    switch (command) {
      case "help":
        const help = new UserMessageComponent(
          "Commands:\n" +
          "  /clear - Clear chat\n" +
          "  /status - Show status\n" +
          "  /theme <dark|light> - Change theme\n" +
          "  /quit - Exit",
          theme
        );
        chat.addMessage(help);
        break;
      case "clear":
        chat.clearMessages();
        footer.addStatus("Chat cleared");
        setTimeout(() => footer.clearStatus(), 2000);
        break;
      case "status":
        const status = new UserMessageComponent(
          `CWD: ${process.cwd()}\n` +
          `Messages: ${chat.getMessages().length}\n` +
          `Theme: ${theme.getMode()}`,
          theme
        );
        chat.addMessage(status);
        break;
      case "theme":
        const newTheme = parts[1];
        if (newTheme === "dark" || newTheme === "light") {
          theme.setTheme(newTheme);
          footer.addStatus(`Theme: ${newTheme}`);
        } else {
          chat.addMessage(new UserMessageComponent("Usage: /theme <dark|light>", theme));
        }
        break;
      case "quit":
        tui.stop();
        break;
      default:
        chat.addMessage(new UserMessageComponent(`Unknown command: ${command}`, theme));
    }
  }

  // Welcome message
  const welcome = new AssistantMessageComponent(
    "Welcome to the AgentSession Demo!\n\n" +
    "This demo shows how to integrate pi-coding-agent's AgentSession with custom TUI components.\n\n" +
    "Type a message to get a simulated response.\n" +
    "Use /help to see available commands.",
    false,
    theme
  );
  chat.addMessage(welcome);

  console.log("🚀 Starting AgentSession Demo TUI...");
  tui.start();
}

// Handle errors
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
