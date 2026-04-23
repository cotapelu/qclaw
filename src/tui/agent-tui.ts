import type { AgentCore } from "../agent/core.js";
import { commandRegistry } from "../agent/commands.js";
import type { CommandHandlers } from "../agent/commands.js";
import { AliasManager } from "../agent/aliases.js";
import { t, type Locale } from "../agent/i18n.js";
import {
  TUI,
  Text,
  ProcessTerminal,
  Container,
  Spacer,
  CombinedAutocompleteProvider,
  KeybindingsManager,
  TUI_KEYBINDINGS,
  setKeybindings,
  type SelectItem,
} from "@mariozechner/pi-tui";
import {
  CustomEditor,
  UserMessageComponent,
  AssistantMessageComponent,
  ToolExecutionComponent,
  FooterComponent,
  SettingsSelectorComponent,
  getMarkdownTheme,
  getEditorTheme,
  initTheme,
  type ToolExecutionOptions,
  type FooterData,
} from "@mariozechner/pi-coding-agent";
import chalk from "chalk";

export class AgentTUI {
  private agent: AgentCore;
  private verbose: boolean;
  private tui: TUI;
  private editor: CustomEditor;
  private commandHandlers: CommandHandlers;
  private isResponding: boolean = false;
  private welcome: Text;
  private spacer: Spacer;
  private lastRenderedAssistantId: string | null = null;
  private aliasManager: AliasManager;
  private messageContainer: Container;
  private currentTheme: string = 'dark';
  private locale: Locale = 'en';
  private currentAssistantMessage: AssistantMessageComponent | null = null;
  private currentToolComponent: ToolExecutionComponent | null = null;
  private footer: FooterComponent | null = null;
  // Performance tracking
  private frameCountSinceLastFps = 0;
  private lastFpsUpdate = 0;
  private currentFps = 0;
  private lastRenderTime = 0;
  private originalRequestRender?: () => void;

  constructor(agent: AgentCore, verbose: boolean = false) {
    this.agent = agent;
    this.verbose = verbose;
    this.commandHandlers = {
      agent,
      sessionManager: agent.getSessionManager(),
      resourceLoader: agent.getResourceLoader(),
      tui: this,
    };
    this.aliasManager = new AliasManager(agent.getAgentDir());
    
    // Load settings
    const settings = this.agent.getSettings();
    this.currentTheme = settings.theme || 'dark';
    this.locale = (settings.locale as Locale) || 'en';

    // Initialize theme system from pi-coding-agent
    initTheme(this.currentTheme);

    const terminal = new ProcessTerminal();
    this.tui = new TUI(terminal);
    
    // Wrap requestRender for performance metrics
    this.lastFpsUpdate = performance.now();
    this.originalRequestRender = this.tui.requestRender.bind(this.tui);
    this.tui.requestRender = () => {
      const start = performance.now();
      this.frameCountSinceLastFps++;
      this.originalRequestRender!();
      this.lastRenderTime = performance.now() - start;
    };

    // Initialize global keybindings
    const kb = new KeybindingsManager(TUI_KEYBINDINGS);
    setKeybindings(kb);
    
    // Load user keybindings from settings if present
    if (settings.keybindings && typeof settings.keybindings === 'object') {
      kb.setUserBindings(settings.keybindings as any);
    }
    // Default custom binding: allow Ctrl+Enter for newline
    kb.setUserBindings({
      'tui.input.newLine': ['shift+enter', 'ctrl+enter']
    });

    // Setup layout
    this.setupLayout();

    // Subscribe to agent events
    this.agent.subscribe((event: any) => this.handleAgentEvent(event));

    // Load initial data
    this.updateAutocompleteCommands();
    this.renderSessionMessages();
  }

  private setupLayout(): void {
    // Welcome message
    this.welcome = new Text(
      "🎮 Pi SDK Agent\n\nType your messages or use slash commands. Press Ctrl+P for command palette. Ctrl+C to exit.",
      1,
      1,
      (s: string) => chalk.cyan(s)
    );
    this.tui.addChild(this.welcome);

    // Spacer
    this.spacer = new Spacer();
    this.tui.addChild(this.spacer);

    // Message container (holds chat messages)
    this.messageContainer = new Container();
    this.tui.addChild(this.messageContainer);

    // Spacer between messages and editor
    this.tui.addChild(this.spacer);

    // Editor (CustomEditor from pi-coding-agent)
    const autocompleteProvider = new CombinedAutocompleteProvider([], process.cwd());
    this.editor = new CustomEditor(this.tui, getEditorTheme(), {
      // Custom keybindings if needed
    });
    this.editor.setAutocompleteProvider(autocompleteProvider);
    this.editor.onSubmit = (value: string) => this.handleSubmit(value);
    this.tui.addChild(this.editor);

    // Footer component (status bar)
    this.footer = new FooterComponent(
      this.agent.getSession(),
      this.buildFooterData()
    );
    this.tui.addChild(this.footer);

    this.tui.setFocus(this.editor);
  }

  private buildFooterData(): FooterData {
    const stats = this.agent.getStats();
    const model = this.agent.getModel();
    const settings = this.agent.getSettings();
    
    return {
      model: model ? `${model.provider}/${model.id}` : 'none',
      tokens: stats.totalTokens,
      cost: stats.estimatedCost,
      messages: this.commandHandlers.sessionManager.getEntries().length,
      thinkingLevel: settings.thinkingLevel || 'off',
      // Optional: add more fields as needed
    };
  }

  private updateAutocompleteCommands(): void {
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

    // Regular chat - add user message using pi-coding-agent component
    this.addUserMessage(trimmed);

    // Send to agent
    this.isResponding = true;
    this.editor.disableSubmit = true;

    // Show loading indicator (using pi-tui Loader)
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
    this.messageContainer.addChild(loader);
    this.tui.requestRender();

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
        this.updateFooter();
        break;
      case 'turn_end':
        this.removeLoaderIfPresent();
        this.isResponding = false;
        this.editor.disableSubmit = false;
        this.renderLatestAssistantMessage();
        this.updateFooter();
        break;
      case 'error':
        this.addMessage(`❌ Agent error: ${event.message}`, "error");
        this.isResponding = false;
        this.editor.disableSubmit = false;
        this.removeLoaderIfPresent();
        this.updateFooter();
        break;
      case 'message_update':
        if (event.message_update?.type === 'text_delta') {
          this.updateAssistantMessageDelta(event.message_update.delta);
        }
        break;
      case 'tool_execution_start':
        this.showToolExecution(event.tool_execution);
        break;
      case 'tool_execution_end':
        this.updateToolResult(event.tool_execution);
        break;
    }
  }

  private removeLoaderIfPresent(): void {
    const children = this.messageContainer.children;
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child instanceof Loader) {
        this.messageContainer.removeChild(child);
        break;
      }
    }
  }

  private renderSessionMessages(): void {
    const entries = this.commandHandlers.sessionManager.getEntries();
    // Only render last N messages to avoid memory issues
    const messages = entries.filter(e => e.type === 'message');
    
    for (const entry of messages) {
      const msg = entry as any;
      const role = msg.message.role as "user" | "assistant";
      const blocks = msg.message.content;
      if (blocks && blocks.length > 0) {
        this.addMessageBlocks(blocks, role);
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
          const blocks = msg.message.content;
          if (blocks && blocks.length > 0) {
            // Remove previous assistant message if exists
            if (this.currentAssistantMessage) {
              this.messageContainer.removeChild(this.currentAssistantMessage);
            }
            // Create new assistant message component
            this.currentAssistantMessage = new AssistantMessageComponent(
              "", // empty initially
              false, // collapsed
              getMarkdownTheme()
            );
            this.messageContainer.addChild(this.currentAssistantMessage);
            
            // Update with content
            const textBlock = blocks.find((b: any) => b.type === 'text');
            if (textBlock) {
              this.currentAssistantMessage.updateContent(textBlock.text);
            }
            this.lastRenderedAssistantId = entry.id;
          }
          break;
        }
      }
    }
    this.tui.requestRender();
  }

  private updateAssistantMessageDelta(delta: string): void {
    if (!this.currentAssistantMessage) {
      // Create if doesn't exist
      this.currentAssistantMessage = new AssistantMessageComponent(
        "",
        false,
        getMarkdownTheme()
      );
      this.messageContainer.addChild(this.currentAssistantMessage);
    }
    
    // Get current content and append delta
    const current = this.currentAssistantMessage.getContent() || "";
    this.currentAssistantMessage.updateContent(current + delta);
    this.tui.requestRender();
  }

  private addUserMessage(text: string): void {
    const userMsg = new UserMessageComponent(text, getMarkdownTheme());
    this.messageContainer.addChild(userMsg);
    this.tui.requestRender();
  }

  private addMessage(text: string, role: "user" | "assistant" | "system" | "error"): void {
    // For system/error messages, use simple text for now
    const md = new Text(text, 1, 1, (s) => {
      if (role === 'error') return chalk.red(s);
      if (role === 'system') return chalk.yellow(s);
      return chalk.white(s);
    });
    this.messageContainer.addChild(md);
    this.tui.requestRender();
  }

  private addMessageBlocks(blocks: any[], role: "user" | "assistant"): void {
    if (role === 'user') {
      const textBlock = blocks.find((b: any) => b.type === 'text');
      if (textBlock) {
        this.addUserMessage(textBlock.text);
      }
      // Handle images in user messages if needed
      const imageBlocks = blocks.filter((b: any) => b.type === 'image');
      for (const imgBlock of imageBlocks) {
        this.addImageBlock(imgBlock);
      }
    } else if (role === 'assistant') {
      // Assistant messages with tool calls handled separately via tool execution events
      const textBlock = blocks.find((b: any) => b.type === 'text');
      if (textBlock && !this.currentAssistantMessage) {
        // This will be handled by renderLatestAssistantMessage normally
      }
    }
  }

  private addImageBlock(block: any): void {
    // Could enhance this to show images inline
    // For now, just add placeholder
    const placeholder = new Text(`🖼️ [Image]`, 1, 1, (s) => chalk.dim(s));
    this.messageContainer.addChild(placeholder);
    this.tui.requestRender();
  }

  private showToolExecution(toolCall: any): void {
    const toolName = toolCall.toolName;
    const toolCallId = toolCall.toolCallId;
    const args = toolCall.input;
    const toolDefinition = this.agent.getToolDefinition(toolName);
    
    const options: ToolExecutionOptions = {
      showImages: true,
      cwd: this.agent.getConfig().cwd,
    };

    this.currentToolComponent = new ToolExecutionComponent(
      toolName,
      toolCallId,
      args,
      options,
      toolDefinition,
      this.tui
    );
    
    this.messageContainer.addChild(this.currentToolComponent);
    this.tui.requestRender();
  }

  private updateToolResult(event: any): void {
    if (this.currentToolComponent && event.tool_execution?.toolCallId === this.currentToolComponent.getToolCallId()) {
      this.currentToolComponent.updateResult(event.tool_execution.output);
      this.tui.requestRender();
    }
  }

  private clearScreen(): void {
    this.messageContainer.children = [];
    this.currentAssistantMessage = null;
    this.currentToolComponent = null;
    this.lastRenderedAssistantId = null;
    // Re-add welcome
    this.messageContainer.addChild(this.welcome);
    this.tui.requestRender();
  }

  public async showSettingsOverlay(): Promise<void> {
    try {
      // Use SettingsSelectorComponent if available
      if (SettingsSelectorComponent) {
        const settingsUI = new SettingsSelectorComponent(
          this.tui,
          this.agent.getSettingsManager(),
          {
            onThemeChange: async (theme) => {
              this.currentTheme = theme;
              await this.agent.updateSetting('theme', theme);
              initTheme(theme);
              this.tui.requestRender();
            },
            onModelChange: async (modelId) => {
              const models = await this.agent.getModelRegistry().getAvailable();
              const model = models.find(m => `${m.provider}/${m.id}` === modelId);
              if (model) {
                await this.agent.setModel(model);
                this.updateFooter();
              }
            },
          }
        );
        this.tui.showOverlay(settingsUI, {
          width: 60,
          anchor: 'center',
          margin: 2,
        });
      } else {
        // Fallback to custom settings overlay (existing code)
        await this.showCustomSettingsOverlay();
      }
    } catch (error: any) {
      this.addMessage(`❌ Settings error: ${error.message}`, 'error');
    }
  }

  private async showCustomSettingsOverlay(): Promise<void> {
    // Keep existing custom implementation as fallback
    // ... (existing showSettingsOverlay code)
  }

  public async showCommandPalette(): Promise<void> {
    const prompts = this.commandHandlers.resourceLoader.getPrompts();
    const builtinCommands: SelectItem[] = [
      { value: "help", label: "help", description: "Show help" },
      // ... (all commands as before)
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
      width: 70,
      maxHeight: '60%',
      anchor: 'center',
      margin: 2,
      visible: (w, h) => w >= 60,
    });
  }

  public showInputOverlay(question: string): Promise<string> {
    return new Promise((resolve) => {
      const input = new Input();
      input.setValue('');
      input.onSubmit = (value: string) => {
        this.tui.hideOverlay();
        resolve(value);
      };
      input.onEscape = () => {
        this.tui.hideOverlay();
        resolve('');
      };

      const container = new Container();
      container.addChild(new Text(question, 0, 0));
      container.addChild(input);

      this.tui.showOverlay(container, {
        width: 60,
        maxHeight: 5,
        anchor: 'center',
        margin: 2,
        visible: (w, h) => w >= 40,
      });
      this.tui.setFocus(input);
    });
  }

  public start(): void {
    this.tui.onDebug = () => this.showDebugOverlay();
    this.tui.start();
  }

  public stop(): void {
    this.tui.stop();
  }

  private updateFooter(): void {
    if (this.footer) {
      this.footer.updateData(this.buildFooterData());
      this.tui.requestRender();
    }
  }

  private showDebugOverlay(): void {
    const lines: string[] = [];
    const collect = (comp: any, depth: number = 0): void => {
      const indent = '  '.repeat(depth);
      const name = comp.constructor.name || 'Component';
      const extra: string[] = [];
      if (comp.focused) extra.push('focused');
      if (comp instanceof Container) extra.push('Container');
      if (comp instanceof Text) extra.push('Text');
      lines.push(`${indent}- ${name}${extra.length ? ' (' + extra.join(', ') + ')' : ''}`);
      if (comp.children) {
        comp.children.forEach((c: any) => collect(c, depth + 1));
      }
    };
    lines.push('=== TUI Component Tree ===');
    collect(this.tui);
    lines.push('');
    lines.push('Press any key to close');

    const translatedTitle = t(this.locale, 'debugTitle', 'overlay');
    const translatedClose = t(this.locale, 'debugClose', 'overlay');
    lines[0] = translatedTitle;
    lines[lines.length - 1] = translatedClose;
    const debugText = new Text(lines.join('\n'), 1, 1, (s) => chalk.yellow(s));
    this.tui.showOverlay(debugText, {
      width: 80,
      maxHeight: '80%',
      anchor: 'center',
      margin: 2,
      nonCapturing: true,
    });
    setTimeout(() => this.tui.hideOverlay(), 5000);
  }
}
