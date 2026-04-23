import { TUI, ProcessTerminal, Container } from "@mariozechner/pi-tui";
import {
  ThemeManager,
  ChatContainer,
  FooterComponent,
  CustomEditor,
  UserMessageComponent,
  AssistantMessageComponent,
  initTheme,
} from "@mariozechner/pi-tui-professional";

async function main() {
  // Initialize terminal
  const terminal = new ProcessTerminal();
  const tui = new TUI(terminal);

  // Initialize theme (auto-detect)
  const theme = ThemeManager.getInstance();
  theme.initialize("auto");

  // Create chat container
  const chat = new ChatContainer({ themeManager: theme });
  tui.addChild(chat);

  // Create footer
  const footer = new FooterComponent(theme, {
    cwd: process.cwd(),
    model: "demo",
  });
  tui.addChild(footer);

  // Create editor for input
  const editor = new CustomEditor(tui, theme, {
    placeholder: "Type your message and press Enter...",
  });
  tui.addChild(editor);

  // Handle input
  tui.onInput = (data) => {
    if (data === "\r") { // Enter key
      const input = editor.getValue().trim();
      if (!input) return;
      editor.clear();

      // Add user message
      const userMsg = new UserMessageComponent(input, theme);
      chat.addMessage(userMsg);

      // Create assistant message placeholder
      const assistantMsg = new AssistantMessageComponent("", false, theme);
      chat.addMessage(assistantMsg);

      // Simulate streaming response (replace with real LLM call)
      const response = `Echo: ${input}`;
      let i = 0;
      const interval = setInterval(() => {
        const chunk = response.slice(0, i);
        assistantMsg.updateContent(chunk);
        tui.requestRender();
        i++;
        if (i > response.length) clearInterval(interval);
      }, 50);
    }
  };

  tui.start();
}

main().catch(console.error);
