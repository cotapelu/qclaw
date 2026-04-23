import type { AgentCore } from "./core.js";
import { commandRegistry } from "./commands.js";
import type { CommandHandlers } from "./commands.js";
import { AliasManager } from "./aliases.js";
import { t, type Locale } from "./i18n.js";
import {
  TUI,
  Text,
  Editor,
  Markdown,
  Loader,
  CancellableLoader,
  SelectList,
  SettingsList,
  CombinedAutocompleteProvider,
  ProcessTerminal,
  Box,
  TruncatedText,
  Image,
  Spacer,
  Container,
  Input,
  KeybindingsManager,
  TUI_KEYBINDINGS,
  setKeybindings,
  type SelectItem,
  type SelectListTheme,
  type SettingsListTheme,
  type ImageTheme,
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
  private spacer: any;
  private lastRenderedAssistantId: string | null = null;
  private aliasManager: AliasManager;
  private messageComponents: any[] = [];
  private readonly MAX_MESSAGE_COMPONENTS = 100; // Prevent memory leak
  private currentTheme: string = 'dark';
  private locale: Locale = 'en';
  // Performance tracking
  private frameCountSinceLastFps = 0;
  private lastFpsUpdate = 0;
  private currentFps = 0;
  private lastRenderTime = 0;
  private originalRequestRender?: () => void;
  private statusBar: TruncatedText;

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

    this.welcome = new Text(
      "🎮 Pi SDK Agent\n\nType your messages or use slash commands. Press Ctrl+P for command palette. Ctrl+C to exit.",
      1,
      1,
      (s: string) => chalk.cyan(s)
    );
    this.tui.addChild(this.welcome);

    this.spacer = new Spacer();
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

    // Status bar at bottom
    this.statusBar = new TruncatedText("", 0, 0);
    this.tui.addChild(this.statusBar);

    this.tui.setFocus(this.editor);

    this.agent.subscribe((event: any) => this.handleAgentEvent(event));

    this.updateAutocompleteCommands();
    this.renderSessionMessages();
    this.updateStatusBar();
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
        this.updateStatusBar();
        break;
      case 'turn_end':
        this.removeLoaderIfPresent();
        this.isResponding = false;
        this.editor.disableSubmit = false;
        this.renderLatestAssistantMessage();
        this.updateStatusBar();
        break;
      case 'error':
        this.addMessage(`❌ Agent error: ${event.message}`, "error");
        this.isResponding = false;
        this.editor.disableSubmit = false;
        this.removeLoaderIfPresent();
        this.updateStatusBar();
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
    // Only render last N messages to avoid memory issues
    const messages = entries.filter(e => e.type === 'message').slice(-this.MAX_MESSAGE_COMPONENTS);
    for (const entry of messages) {
      const msg = entry as any;
      const role = msg.message.role as "user" | "assistant";
      const blocks = msg.message.content;
      if (blocks && blocks.length > 0) {
        this.addMessageBlocks(blocks, role);
      }
    }
    this.cleanupOldMessages();
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
            this.addMessageBlocks(blocks, "assistant");
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
    const box = this.createBox(role);
    box.addChild(markdown);
    this.insertMessageComponent(box);
    this.cleanupOldMessages();
  }

  private insertMessageComponent(component: any): void {
    const children = this.tui.children;
    children.splice(children.length - 1, 0, component);
    children.splice(children.length - 1, 0, this.spacer);
    this.messageComponents.push(component);
    this.tui.requestRender();
  }

  private cleanupOldMessages(): void {
    if (this.messageComponents.length > this.MAX_MESSAGE_COMPONENTS) {
      const removed = this.messageComponents.shift()!;
      // Remove from TUI children
      const children = this.tui.children;
      const index = children.indexOf(removed);
      if (index !== -1) {
        children.splice(index, 1);
        // Also remove spacer after it
        const spacerIdx = children.indexOf(this.spacer);
        if (spacerIdx > index && spacerIdx < index + 2) {
          children.splice(spacerIdx, 1);
        }
      }
    }
  }

  private createMarkdownTheme(role: string): any {
    let base;
    if (this.currentTheme === 'dark') {
      base = {
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
    } else { // light
      base = {
        heading: (s: string) => chalk.blue.bold(s),
        link: (s: string) => chalk.magenta(s),
        linkUrl: (s: string) => chalk.dim.underline(s),
        code: (s: string) => chalk.yellow(s),
        codeBlock: (s: string) => chalk.bgWhite.black(s),
        codeBlockBorder: (s: string) => chalk.gray(s),
        quote: (s: string) => chalk.italic(s),
        quoteBorder: (s: string) => chalk.gray(s),
        hr: (s: string) => chalk.dim(s),
        listBullet: (s: string) => chalk.green(s),
        bold: (s: string) => chalk.bold(s),
        italic: (s: string) => chalk.italic(s),
        strikethrough: (s: string) => chalk.strikethrough(s),
        underline: (s: string) => chalk.underline(s),
      };
    }

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

  // Update status bar with current stats
  private updateStatusBar(): void {
    try {
      // Calculate FPS
      const now = performance.now();
      if (now - this.lastFpsUpdate >= 1000) {
        const elapsed = now - this.lastFpsUpdate;
        this.currentFps = this.frameCountSinceLastFps * 1000 / elapsed;
        this.frameCountSinceLastFps = 0;
        this.lastFpsUpdate = now;
      }

      const model = this.agent.getModel();
      const modelName = model ? `${model.provider}/${model.id}` : 'unknown';
      const stats = this.agent.getStats();
      const entries = this.commandHandlers.sessionManager.getEntries();
      const tokenCount = stats.totalTokens || 0;
      const cost = stats.estimatedCost || 0;
      const msgCount = entries.length;
      const fpsStr = this.currentFps.toFixed(1);
      const renderStr = this.lastRenderTime.toFixed(1);
      const mem = (process as any).memoryUsage();
      const memMb = (mem.rss / 1024 / 1024).toFixed(1);
      const newText = `[${t(this.locale, 'model', 'status')}] ${modelName} | [${t(this.locale, 'tokens', 'status')}] ${tokenCount} | [${t(this.locale, 'cost', 'status')}] $${cost.toFixed(4)} | [${t(this.locale, 'messages', 'status')}] ${msgCount} | [${t(this.locale, 'fps', 'status')}] ${fpsStr} | [${t(this.locale, 'rt', 'status')}] ${renderStr}ms | [${t(this.locale, 'mem', 'status')}] ${memMb}MB`;
      // Replace statusBar
      const children = this.tui.children;
      const index = children.indexOf(this.statusBar);
      if (index !== -1) {
        children[index] = new TruncatedText(newText, 0, 0);
        this.statusBar = children[index] as TruncatedText;
      } else {
        this.statusBar = new TruncatedText(newText, 0, 0);
        this.tui.addChild(this.statusBar);
      }
      this.tui.requestRender();
    } catch (e) {
      // Ignore errors
    }
  }

  // Create a Box with background based on message role
  private createBox(role: string): Box {
    let bgFn: ((s: string) => string) | undefined;
    switch (role) {
      case "user":
        bgFn = (s) => chalk.bgBlue(s);
        break;
      case "system":
        bgFn = (s) => chalk.bgYellow(s);
        break;
      case "error":
        bgFn = (s) => chalk.bgRed(s);
        break;
      case "assistant":
      default:
        bgFn = undefined;
    }
    return new Box(1, 1, bgFn);
  }

  // Create Image component from content block
  private createImageFromBlock(block: any): any {
    try {
      const base64 = block.base64;
      const url = block.url;
      const mimeType = block.mimeType || 'image/png';
      if (base64) {
        const theme: ImageTheme = { fallbackColor: (s) => chalk.dim(s) };
        return new Image(base64, mimeType, theme, { maxWidthCells: 40 });
      } else if (url) {
        // Placeholder for URL (fetch could be implemented async later)
        return new Text(`🖼️ ${url}`, 1, 1, (s) => chalk.dim(s));
      }
    } catch (e) {}
    return null;
  }

  // Add message with multiple content blocks (text + image)
  private addMessageBlocks(blocks: any[], role: "user" | "assistant" | "system" | "error"): void {
    const box = this.createBox(role);
    for (const block of blocks) {
      if (block.type === 'text') {
        const theme = this.createMarkdownTheme(role);
        const markdown = new Markdown(block.text, 1, 1, theme);
        box.addChild(markdown);
      } else if (block.type === 'image') {
        if (block.base64) {
          const img = this.createImageFromBlock(block);
          if (img) box.addChild(img);
        } else if (block.url) {
          // Show loading placeholder immediately
          const loading = new Text(`🖼️ [Loading...]`, 1, 1, (s) => chalk.dim(s));
          box.addChild(loading);
          this.tui.requestRender();

          // Async fetch image from URL with retry
          const fetchWithRetry = async (url: string, maxRetries = 3): Promise<{ buf: ArrayBuffer; mime: string }> => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('HTTP ' + response.status);
                const mime = response.headers.get('content-type') || 'image/png';
                const buf = await response.arrayBuffer();
                return { buf, mime };
              } catch (err) {
                if (attempt === maxRetries) throw err;
                await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempt)));
              }
            }
            throw new Error('Max retries exceeded');
          };

          fetchWithRetry(block.url)
            .then(({ buf, mime }) => {
              const base64 = Buffer.from(buf).toString('base64');
              const theme: ImageTheme = { fallbackColor: (s) => chalk.dim(s) };
              const img = new Image(base64, mime, theme, { maxWidthCells: 40 });
              // Replace loading with image
              const children = box.children;
              const idx = children.indexOf(loading);
              if (idx !== -1) {
                children.splice(idx, 1, img);
              } else {
                box.addChild(img);
              }
              this.tui.requestRender();
            })
            .catch(() => {
              // Replace loading with error placeholder
              const errorPlaceholder = new Text(`🖼️ [Failed to load]`, 1, 1, (s) => chalk.red(s));
              const children = box.children;
              const idx = children.indexOf(loading);
              if (idx !== -1) {
                children.splice(idx, 1, errorPlaceholder);
              } else {
                box.addChild(errorPlaceholder);
              }
              this.tui.requestRender();
            });
        }
      }
    }
    this.insertMessageComponent(box);
    this.cleanupOldMessages();
  }

  private clearScreen(): void {
    this.tui.children = [this.welcome, this.spacer, this.editor, this.statusBar];
    this.messageComponents = [];
    this.lastRenderedAssistantId = null;
    this.tui.requestRender();
  }

  public async showSettingsOverlay(): Promise<void> {
    try {
      const registry = this.agent.getModelRegistry();
      const available = await registry.getAvailable();
      const currentModel = this.agent.getModel();
      const currentSettings = this.agent.getSettings();

      const items: any[] = [
        {
          id: 'model',
          label: 'Model',
          currentValue: currentModel ? `${currentModel.provider}/${currentModel.id}` : 'none',
          description: 'Switch AI model',
          submenu: (current: string, done: (val?: string) => void) =>
            this.createModelSelector(available, done)
        },
        {
          id: 'theme',
          label: 'Theme',
          currentValue: this.currentTheme,
          values: ['dark', 'light'],
          description: 'Color theme'
        },
        {
          id: 'budget',
          label: 'Budget',
          currentValue: this.getBudgetStatus(currentSettings),
          description: 'Set spending limits',
          submenu: (current: string, done: (val?: string) => void) => this.createBudgetSelector(done)
        },
        {
          id: 'verbose',
          label: 'Verbose',
          currentValue: currentSettings.verbose ? 'on' : 'off',
          values: ['on', 'off'],
          description: 'Toggle verbose logging'
        },
        {
          id: 'thinkingLevel',
          label: 'Thinking Level',
          currentValue: currentSettings.thinkingLevel || 'off',
          values: ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'],
          description: 'Agent reasoning depth'
        }
      ];

      const settingsList = new SettingsList(
        items,
        10,
        this.createSettingsTheme(),
        async (id, newValue) => {
          await this.handleSettingChange(id, newValue);
        },
        () => {
          this.tui.hideOverlay();
        },
        { enableSearch: true }
      );

      this.tui.showOverlay(settingsList, {
        width: 50,
        maxHeight: '70%',
        anchor: 'center',
        margin: 2,
        visible: (w, h) => w >= 50
      });
    } catch (error: any) {
      this.addMessage(`❌ Settings error: ${error.message}`, 'error');
    }
  }

  private createSettingsTheme(): SettingsListTheme {
    return {
      label: (text: string, selected: boolean) => selected ? chalk.bold.white(text) : chalk.white(text),
      value: (text: string, selected: boolean) => selected ? chalk.yellow.bold(text) : chalk.yellow(text),
      description: (text: string) => chalk.dim(text),
      cursor: chalk.cyan('>'),
      hint: (text: string) => chalk.dim(text)
    };
  }

  private createModelSelector(available: any[], done: (value?: string) => void): SelectList {
    const items = available.map(m => ({
      value: `${m.provider}/${m.id}`,
      label: m.id,
      description: `${m.provider}`
    }));
    const list = new SelectList(
      items as any,
      10,
      {
        selectedPrefix: (s) => chalk.yellow('> '),
        selectedText: (s) => chalk.bold.white(s),
        description: (s) => chalk.dim(s),
        scrollInfo: (s) => chalk.dim(s),
        noMatch: (s) => chalk.red(s)
      }
    );
    list.onSelect = (item) => {
      this.tui.hideOverlay();
      done(item.value);
    };
    list.onCancel = () => {
      this.tui.hideOverlay();
      done();
    };
    return list;
  }

  private getBudgetStatus(settings: any): string {
    const budget = settings.budget as any || {};
    if (budget.daily) return `$${budget.daily}/day`;
    if (budget.monthly) return `$${budget.monthly}/month`;
    return 'none';
  }

  private createBudgetSelector(done: (val?: string) => void): SelectList {
    const items = [
      { value: 'none', label: 'None', description: 'No budget limit' },
      { value: '10-daily', label: '$10 daily', description: '' },
      { value: '50-daily', label: '$50 daily', description: '' },
      { value: '100-daily', label: '$100 daily', description: '' },
      { value: '500-monthly', label: '$500 monthly', description: '' },
    ];
    const list = new SelectList(
      items as any,
      8,
      {
        selectedPrefix: (s) => chalk.yellow('> '),
        selectedText: (s) => chalk.bold.white(s),
        description: (s) => chalk.dim(s),
        scrollInfo: (s) => chalk.dim(s),
        noMatch: (s) => chalk.red(s)
      }
    );
    list.onSelect = async (item) => {
      this.tui.hideOverlay();
      const [valStr, period] = item.value.split('-');
      if (item.value === 'none') {
        // No action
      } else {
        const amount = parseFloat(valStr);
        if (period === 'daily') {
          await commandRegistry.execute('set', this.commandHandlers, 'budget.daily', amount.toString());
        } else {
          await commandRegistry.execute('set', this.commandHandlers, 'budget.monthly', amount.toString());
        }
      }
      done();
    };
    list.onCancel = () => {
      this.tui.hideOverlay();
      done();
    };
    return list;
  }

  private async handleSettingChange(id: string, newValue: string): Promise<void> {
    try {
      const result = await commandRegistry.execute('set', this.commandHandlers, id, newValue);
      if (result) {
        // Optionally show confirmation
        // this.addMessage(result, 'system');
      }
      // Update local theme if changed
      if (id === 'theme') {
        this.currentTheme = newValue;
      }
      this.updateStatusBar();
    } catch (error: any) {
      this.addMessage(`❌ Error setting ${id}: ${error.message}`, 'error');
    }
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
      width: 70,
      maxHeight: '60%',
      anchor: 'center',
      margin: 2,
      visible: (w, h) => w >= 60,
    });
  }

  /**
   * Shows a single-line input overlay for quick prompts.
   * Returns a promise that resolves with the entered value.
   */
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
    // Register debug handler
    this.tui.onDebug = () => this.showDebugOverlay();
    this.tui.start();
  }

  public stop(): void {
    this.tui.stop();
  }

  private showDebugOverlay(): void {
    const lines: string[] = [];
    const collect = (comp: any, depth: number = 0): void => {
      const indent = '  '.repeat(depth);
      const name = comp.constructor.name || 'Component';
      const extra: string[] = [];
      if (comp.focused) extra.push('focused');
      if (comp instanceof Box) extra.push('Box');
      if (comp instanceof Markdown) extra.push('Markdown');
      if (comp instanceof SelectList) extra.push('SelectList');
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
    // Auto-hide after 5 seconds
    setTimeout(() => this.tui.hideOverlay(), 5000);
  }
}

