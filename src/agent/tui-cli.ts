import type { AgentCore } from "./core.js";
import { commandRegistry } from "./commands.js";
import type { CommandHandlers } from "./commands.js";
import { AliasManager } from "./aliases.js";
import {
  TUI,
  Text,
  Editor,
  Markdown,
  Loader,
  CancellableLoader,
  SelectList,
  CombinedAutocompleteProvider,
  ProcessTerminal,
  matchesKey,
  Key,
  type SelectItem,
} from "@mariozechner/pi-tui";
import chalk from "chalk";

export class AgentTUI {
  private agent: AgentCore;
  private verbose: boolean;
  private tui: TUI;
  private editor: Editor;
  private commandHandlers: CommandHandlers;
  private isResponding: boolean = false;
  private welcome: Text;
  private spacer: Text;
  private lastRenderedAssistantId: string | null = null;
  private aliasManager: AliasManager;

  constructor(agent: AgentCore, verbose: boolean = false) {
    this.agent = agent;
    this.verbose = verbose;
    this.commandHandlers = {
      agent,
      sessionManager: agent.getSessionManager(),
      resourceLoader: agent.getResourceLoader(),
    };
    this.aliasManager = new AliasManager(agent.getAgentDir());

    const terminal = new ProcessTerminal();
    this.tui = new TUI(terminal);

    this.welcome = new Text(
      "🎮 Pi SDK Agent\n\nType your messages or use slash commands. Press Ctrl+P for command palette. Ctrl+C to exit.",
      1,
      1,
      (s: string) => chalk.cyan(s)
    );
    this.tui.addChild(this.welcome);

    this.spacer = new Text("");
    this.tui.addChild(this.spacer);

    const autocompleteProvider = new CombinedAutocompleteProvider([], process.cwd());

    this.editor = new Editor(this.tui, {
      borderColor: (s: string) => chalk.gray(s),
      selectList: {
        selectedPrefix: (s: string) => chalk.yellow(s),
        selectedText: (s: string) => chalk.bold(s),
        description: (s: string) => chalk.dim(s),
        scrollInfo: (s: string) => chalk.dim(s),
        noMatch: (s: string) => chalk.red(s),
      },
    });
    this.editor.setAutocompleteProvider(autocompleteProvider);
    this.editor.onSubmit = (value: string) => this.handleSubmit(value);
    this.tui.addChild(this.editor);

    this.tui.setFocus(this.editor);

    this.agent.subscribe((event: any) => this.handleAgentEvent(event));

    this.updateAutocompleteCommands();
    this.renderSessionMessages();
  }

  private updateAutocompleteCommands() {
    const prompts = this.commandHandlers.resourceLoader.getPrompts();
    const builtinCommands = [
      { name: "help", description: "Show help" },
      { name: "new", description: "Create fresh session" },
      { name: "resume", description: "Resume recent session" },
      { name: "fork", description: "Branch from current" },
      { name: "sessions", description: "List all sessions" },
      { name: "session", description: "Show session tree" },
      { name: "skills", description: "List loaded skills" },
      { name: "extensions", description: "List loaded extensions" },
      { name: "commands", description: "List all slash commands" },
      { name: "reload", description: "Reload resources" },
      { name: "models", description: "Show current model" },
      { name: "cycle", description: "Switch to next model" },
      { name: "thinking", description: "Set thinking level" },
      { name: "stats", description: "Show statistics" },
      { name: "cost", description: "Show cost estimate" },
      { name: "tokens", description: "Show token usage" },
      { name: "compact", description: "Compact context" },
      { name: "clear", description: "Clear screen" },
      { name: "verbose", description: "Toggle verbose mode" },
      { name: "hello", description: "Test custom tool" },
      { name: "datetime", description: "Get current datetime" },
      { name: "sysinfo", description: "Show system info" },
      { name: "ls", description: "List files" },
      { name: "export", description: "Export session" },
      { name: "import", description: "Import session" },
      { name: "graph", description: "Show session graph" },
      { name: "diff", description: "Diff branches" },
      { name: "search", description: "Search session" },
      { name: "labels", description: "Manage labels" },
      { name: "notes", description: "Manage notes" },
      { name: "budget", description: "Budget settings" },
      { name: "backup", description: "Backup data" },
      { name: "restore", description: "Restore backup" },
      { name: "logs", description: "View logs" },
      { name: "settings", description: "Show settings" },
      { name: "set", description: "Update setting" },
    ];

    prompts.prompts.forEach(p => {
      builtinCommands.push({
        name: p.name,
        description: p.description || "",
      });
    });

    this.editor.setAutocompleteProvider(
      new CombinedAutocompleteProvider(builtinCommands, process.cwd())
    );
  }

  private async handleSubmit(value: string): Promise<void> {
    const trimmed = value.trim();
    if (!trimmed) return;

    // Special case: "/" opens command palette
    if (trimmed === "/") {
      await this.showCommandPalette();
      return;
    }

    // Handle slash commands directly
    if (trimmed.startsWith("/")) {
      let [cmd, ...args] = trimmed.slice(1).split(' ');
      // Expand aliases if command not found
      const aliasCmd = this.aliasManager.get(cmd);
      if (aliasCmd) {
        // Alias can be command only or command + args
        [cmd, ...args] = aliasCmd;
      }
      const result = await commandRegistry.execute(cmd, this.commandHandlers, ...args);
      if (cmd === "clear") {
        this.clearScreen();
      } else if (result) {
        this.addMessage(result, "system");
      }
      return;
    }

    // Regular chat - add user message
    this.addMessage(trimmed, "user");

    // Send to agent
    this.isResponding = true;
    this.editor.disableSubmit = true;

    const loader = new CancellableLoader(
      this.tui,
      (s: string) => chalk.cyan(s),
      (s: string) => chalk.dim(s),
      "Thinking..."
    );
    loader.onAbort = () => {
      this.isResponding = false;
      this.editor.disableSubmit = false;
    };
    this.insertMessageComponent(loader);

    try {
      await this.agent.prompt(trimmed);
    } catch (error: any) {
      this.addMessage(`❌ Error: ${error.message}`, "error");
      this.isResponding = false;
      this.editor.disableSubmit = false;
      this.removeLoaderIfPresent();
    }
  }

  private handleAgentEvent(event: any): void {
    switch (event.type) {
      case 'agent_start':
        break;
      case 'turn_end':
        this.removeLoaderIfPresent();
        this.isResponding = false;
        this.editor.disableSubmit = false;
        this.renderLatestAssistantMessage();
        break;
      case 'error':
        this.addMessage(`❌ Agent error: ${event.message}`, "error");
        this.isResponding = false;
        this.editor.disableSubmit = false;
        this.removeLoaderIfPresent();
        break;
    }
  }

  private removeLoaderIfPresent(): void {
    const children = this.tui.children;
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child instanceof Loader) {
        this.tui.removeChild(child);
        break;
      }
    }
  }

  private renderSessionMessages(): void {
    const entries = this.commandHandlers.sessionManager.getEntries();
    for (const entry of entries) {
      if (entry.type === 'message') {
        const msg = entry as any;
        const role = msg.message.role as "user" | "assistant";
        const text = msg.message.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n');
        if (text) {
          const theme = this.createMarkdownTheme(role);
          const markdown = new Markdown(text, 1, 1, theme);
          this.tui.addChild(markdown);
          this.tui.addChild(this.spacer);
        }
      }
    }
    this.tui.requestRender();
  }

  private renderLatestAssistantMessage(): void {
    const entries = this.commandHandlers.sessionManager.getEntries();
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry.type === 'message') {
        const msg = entry as any;
        if (msg.message.role === 'assistant') {
          if (entry.id === this.lastRenderedAssistantId) break;
          const content = msg.message.content
            .filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join('\n');
          if (content) {
            this.addMessage(content, "assistant");
            this.lastRenderedAssistantId = entry.id;
          }
          break;
        }
      }
    }
  }

  private addMessage(text: string, role: "user" | "assistant" | "system" | "error"): void {
    const theme = this.createMarkdownTheme(role);
    const markdown = new Markdown(text, 1, 1, theme);
    this.insertMessageComponent(markdown);
  }

  private insertMessageComponent(component: any): void {
    const children = this.tui.children;
    children.splice(children.length - 1, 0, component);
    children.splice(children.length - 1, 0, this.spacer);
    this.tui.requestRender();
  }

  private createMarkdownTheme(role: string): any {
    const base = {
      heading: (s: string) => chalk.bold(s),
      link: (s: string) => chalk.cyan(s),
      linkUrl: (s: string) => chalk.dim.underline(s),
      code: (s: string) => chalk.yellow(s),
      codeBlock: (s: string) => chalk.bgBlack.white(s),
      codeBlockBorder: (s: string) => chalk.gray(s),
      quote: (s: string) => chalk.italic(s),
      quoteBorder: (s: string) => chalk.gray(s),
      hr: (s: string) => chalk.dim(s),
      listBullet: (s: string) => chalk.yellow(s),
      bold: (s: string) => chalk.bold(s),
      italic: (s: string) => chalk.italic(s),
      strikethrough: (s: string) => chalk.strikethrough(s),
      underline: (s: string) => chalk.underline(s),
    };

    if (role === "user") {
      return {
        ...base,
        codeBlock: (s: string) => chalk.bgGray.white(s),
        heading: (s: string) => chalk.blue.bold(s),
      };
    } else if (role === "assistant") {
      return base;
    } else if (role === "system") {
      return {
        ...base,
        codeBlock: (s: string) => chalk.bgYellow.black(s),
        heading: (s: string) => chalk.yellow.bold(s),
      };
    } else if (role === "error") {
      return {
        ...base,
        codeBlock: (s: string) => chalk.bgRed.white(s),
        heading: (s: string) => chalk.red.bold(s),
      };
    }
    return base;
  }

  private clearScreen(): void {
    this.tui.children = [this.welcome, this.spacer, this.editor];
    this.lastRenderedAssistantId = null;
    this.tui.requestRender();
  }

  public async showCommandPalette(): Promise<void> {
    const prompts = this.commandHandlers.resourceLoader.getPrompts();
    const builtinCommands: SelectItem[] = [
      { value: "help", label: "help", description: "Show help" },
      { value: "new", label: "new", description: "Create fresh session" },
      { value: "resume", label: "resume", description: "Resume recent session" },
      { value: "fork", label: "fork", description: "Branch from current" },
      { value: "sessions", label: "sessions", description: "List all sessions" },
      { value: "session", label: "session", description: "Show session tree" },
      { value: "skills", label: "skills", description: "List loaded skills" },
      { value: "extensions", label: "extensions", description: "List loaded extensions" },
      { value: "commands", label: "commands", description: "List all slash commands" },
      { value: "reload", label: "reload", description: "Reload resources" },
      { value: "models", label: "models", description: "Show current model" },
      { value: "cycle", label: "cycle", description: "Switch to next model" },
      { value: "thinking", label: "thinking", description: "Set thinking level" },
      { value: "stats", label: "stats", description: "Show statistics" },
      { value: "cost", label: "cost", description: "Show cost estimate" },
      { value: "tokens", label: "tokens", description: "Show token usage" },
      { value: "compact", label: "compact", description: "Compact context" },
      { value: "clear", label: "clear", description: "Clear screen" },
      { value: "verbose", label: "verbose", description: "Toggle verbose mode" },
      { value: "hello", label: "hello", description: "Test custom tool" },
      { value: "datetime", label: "datetime", description: "Get current datetime" },
      { value: "sysinfo", label: "sysinfo", description: "Show system info" },
      { value: "ls", label: "ls", description: "List files" },
      { value: "export", label: "export", description: "Export session" },
      { value: "import", label: "import", description: "Import session" },
      { value: "graph", label: "graph", description: "Show session graph" },
      { value: "diff", label: "diff", description: "Diff branches" },
      { value: "search", label: "search", description: "Search session" },
      { value: "labels", label: "labels", description: "Manage labels" },
      { value: "notes", label: "notes", description: "Manage notes" },
      { value: "budget", label: "budget", description: "Budget settings" },
      { value: "backup", label: "backup", description: "Backup data" },
      { value: "restore", label: "restore", description: "Restore backup" },
      { value: "logs", label: "logs", description: "View logs" },
      { value: "settings", label: "settings", description: "Show settings" },
      { value: "set", label: "set", description: "Update setting" },
    ];

    prompts.prompts.forEach(p => {
      builtinCommands.push({
        value: p.name,
        label: p.name,
        description: p.description || "",
      });
    });

    const list = new SelectList(
      builtinCommands,
      15,
      {
        selectedPrefix: (s: string) => chalk.yellow("> "),
        selectedText: (s: string) => chalk.bold.white(s),
        description: (s: string) => chalk.dim(s),
        scrollInfo: (s: string) => chalk.dim(s),
        noMatch: (s: string) => chalk.red(s),
      }
    );

    list.onSelect = async (item: SelectItem) => {
      this.tui.hideOverlay();
      const [cmdName, ...args] = item.value.split(' ');
      const result = await commandRegistry.execute(cmdName, this.commandHandlers, ...args);
      if (result) {
        this.addMessage(result, "system");
      }
    };

    list.onCancel = () => {
      this.tui.hideOverlay();
      this.tui.setFocus(this.editor);
    };

    this.tui.showOverlay(list, {
      width: 60,
      maxHeight: 20,
      anchor: "center",
    });
  }

  public start(): void {
    this.tui.start();
  }

  public stop(): void {
    this.tui.stop();
  }
}
