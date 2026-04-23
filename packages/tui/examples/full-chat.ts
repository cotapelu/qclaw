import { TUI, ProcessTerminal, Container, Text } from "@mariozechner/pi-tui";
import {
  ThemeManager,
  ChatContainer,
  FooterComponent,
  CustomEditor,
  UserMessageComponent,
  AssistantMessageComponent,
  ToolExecutionComponent,
  DynamicBorder,
  ProgressBar,
  ModalComponent,
  showModalConfirm,
  initTheme,
} from "@mariozechner/pi-tui-professional";

async function main() {
  // Initialize terminal
  const terminal = new ProcessTerminal();
  const tui = new TUI(terminal);

  // Initialize theme (dark by default)
  const theme = ThemeManager.getInstance();
  theme.initialize("dark");

  // Create main layout container
  const layout = new Container();
  tui.addChild(layout);

  // Chat container (main area)
  const chat = new ChatContainer({
    themeManager: theme,
    maxMessages: 50,
    messageSpacing: 1,
  });
  layout.addChild(chat);

  // Footer (status bar at bottom)
  const footer = new FooterComponent(theme, {
    cwd: process.cwd(),
    model: "claude-3-opus",
    thinkingLevel: "medium",
  });
  layout.addChild(footer);

  // Input editor (at very bottom)
  const editor = new CustomEditor(tui, theme, {
    placeholder: "Type your message... (Enter to send, / for commands)",
  });
  layout.addChild(editor);

  // Progress overlay (initially hidden)
  const progressBorder = new DynamicBorder(theme, {
    title: "Processing",
    borderStyle: "rounded",
  });
  const progressBar = new ProgressBar(theme, 40, { showPercentage: true });
  progressBar.setProgress(0);
  progressBorder.addChild(progressBar);
  tui.addChild(progressBorder); // Will be shown/hidden as needed

  // Simulated agent state
  let isProcessing = false;

  // Input handler
  tui.onInput = async (data) => {
    if (data === "\r") {
      // Enter - submit
      const input = editor.getValue().trim();
      if (!input) return;
      if (isProcessing) {
        // Show modal to cancel? Or ignore
        return;
      }
      editor.clear();
      editor.blur();

      // Add user message
      const userMsg = new UserMessageComponent(input, theme);
      chat.addMessage(userMsg);

      // Simulate agent response with tool use
      await simulateAgentResponse(chat, theme, input, footer);
    } else if (data === "\u001b") {
      // ESC - maybe show help or cancel
      const helpMsg = new UserMessageComponent(
        "*Press Enter to send, use /commands for shortcuts*",
        theme
      );
      chat.addMessage(helpMsg);
    }
  };

  // Keybindings hint in footer
  footer.addStatus("Enter=Send");

  // Initial welcome message
  const welcome = new AssistantMessageComponent(
    "Welcome to the professional TUI chat demo!\n\nTry typing a message and press Enter.",
    false,
    theme
  );
  chat.addMessage(welcome);

  tui.start();
}

async function simulateAgentResponse(
  chat: ChatContainer,
  theme: any,
  userInput: string,
  footer: FooterComponent
) {
  // Simulate agent "thinking"
  const thinking = new AssistantMessageComponent("Thinking...", true, theme);
  chat.addMessage(thinking);

  // Simulate tool call
  const toolCall = new ToolExecutionComponent(
    "bash",
    "call-123",
    { command: "echo 'Processing...'" },
    { showImages: true },
    undefined,
    undefined,
    process.cwd()
  );
  chat.addMessage(toolCall);

  // Update tool result after delay
  await new Promise((r) => setTimeout(r, 1000));
  toolCall.updateResult({
    content: [{ type: "text", text: "Process completed successfully.\nOutput:\nHello from bash!" }],
    isError: false,
  });

  // Final assistant response
  setTimeout(() => {
    const response = new AssistantMessageComponent(
      `I received your message: "${userInput}"\n\nI've processed it using a bash tool. Is there anything else you'd like me to do?`,
      false,
      theme
    );
    chat.addMessage(response);
    footer.setTokenUsage(Math.floor(Math.random() * 100));
  }, 1500);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
