#!/usr/bin/env node

/**
 * QClaw - Professional AI Coding Assistant
 *
 * Main entry point for the TUI application.
 * Integrates @piclaw/pi-agent with @piclaw/pi-tui.
 */

import {
  TUI,
  ProcessTerminal,
  Container,
  Text,
  Editor,
  Image,
  Key,
  matchesKey,
  CombinedAutocompleteProvider,
  SlashCommand,
  ThemeManager,
  ChatContainer,
  getMarkdownTheme,
  UserMessageComponent,
  AssistantMessageComponent,
  ToolExecutionComponent,
  BashExecutionComponent,
  BranchSummaryMessageComponent,
  CompactionSummaryMessageComponent,
  SkillInvocationMessageComponent,
  CustomMessageComponent,
  SettingsSelectorComponent,
  ModelSelectorComponent,
  type SettingsCallbacks,
  type SettingsConfig,
  KeybindingsManager,
  TUI_KEYBINDINGS,
  DynamicBorder,
  type Component,
} from "@piclaw/pi-tui";
import { initTheme, copyToClipboard, FooterComponent as PiFooterComponent, CustomEditor, ThinkingSelectorComponent, LoginDialogComponent, OAuthSelectorComponent } from "@mariozechner/pi-coding-agent";
import { createAgent, createEventBus, type Agent, ExtensionSelectorComponent } from "@piclaw/pi-agent";

import { Command } from "commander";
import chalk from "chalk";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync, watch as fsWatch, statSync, unlinkSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { homedir } from "node:os";
import { modelsAreEqual } from "@mariozechner/pi-ai";

interface CliOptions {
  cwd?: string;
  model?: string;
  tools?: string[];
  sessionDir?: string;
  theme?: "dark" | "light" | "auto";
  debug?: boolean;
  telemetry?: boolean;
}

interface Config {
  theme?: "dark" | "light" | "auto";
  model?: string;
  tools?: string[];
  sessionDir?: string;
}

interface AppStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  contextPercent: number;
  model: string;
  cwd: string;
  startupTime?: number;
}

// Simple config validation
function validateConfig(raw: any): Config {
  const valid: Config = {};
  if (raw.theme === "dark" || raw.theme === "light" || raw.theme === "auto") {
    valid.theme = raw.theme;
  }
  if (typeof raw.model === "string") {
    valid.model = raw.model;
  }
  if (Array.isArray(raw.tools) && raw.tools.every((t: any) => typeof t === "string")) {
    valid.tools = raw.tools;
  }
  if (typeof raw.sessionDir === "string") {
    valid.sessionDir = raw.sessionDir;
  }
  // Also validate telemetry
  if (typeof raw.telemetry === "boolean") {
    // But Config doesn't include telemetry, so ignore
  }
  return valid;
}

const CONFIG_DIR = join(homedir(), ".qclaw");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

function loadConfig(): Config {
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, "utf8");
      const parsed = JSON.parse(raw);
      const validated = validateConfig(parsed);
      return validated as Config;
    }
  } catch (e) {
    console.warn("Failed to read or validate config:", e);
    logToFile("CONFIG_ERROR", e instanceof Error ? e.message : String(e));
  }
  return {};
}

function saveConfig(config: Config): void {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to write config:", e);
    logToFile("CONFIG_ERROR", e instanceof Error ? e.message : String(e));
  }
}

function logToFile(level: string, msg: string): void {
  try {
    const logDir = join(CONFIG_DIR);
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
    const logPath = join(logDir, "log.txt");
    const line = `${new Date().toISOString()} [${level}] ${msg}\n`;
    appendFileSync(logPath, line, { encoding: "utf8", flag: "a" });
  } catch {
    // ignore
  }
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: "help", description: "Show help information" },
  { name: "clear", description: "Clear chat history" },
  { name: "compact", description: "Compact session context" },
  { name: "exit", description: "Exit the application" },
  { name: "save", description: "Save conversation to file" },
  { name: "export", description: "Export conversation (JSON)" },
  { name: "edit", description: "Open file in external editor" },
];

class AutoIndentEditor extends CustomEditor {
  private myKeybindings: any;

  constructor(tui: TUI, theme: any, keybindings: any, options?: any) {
    super(tui, theme, keybindings, options);
    this.myKeybindings = keybindings;
  }

  handleInput(data: string): void {
    if (this.myKeybindings.matches(data, "tui.input.newLine")) {
      try {
        const cursor = this.getCursor();
        const lineIdx = cursor.line;
        const fullText = this.getText();
        const lines = fullText.split("\n");
        const currentLine = lines[lineIdx] || "";
        const indent = currentLine.match(/^\\s*/)?.[0] || "";
        this.insertTextAtCursor("\n" + indent);
      } catch (e) {
        super.handleInput(data);
      }
      return;
    }
    super.handleInput(data);
  }
}

class QClawApp {
  private tui: TUI;
  private theme: ThemeManager;
  private bus = createEventBus();
  private agent!: Agent;
  private chat: ChatContainer;
  private editor: any;
  private defaultBorderColor!: (text: string) => string;
  private widgetContainerAbove: Container;
  private widgetContainerBelow: Container;
  private footer: any;
  private layoutComponents: Component[] = [];
  private fullscreenActive = false;
  private cliOptions!: CliOptions;
  private options: CliOptions & Config;
  private modelRegistry?: any;
  private configWatcher?: any;
  private stats: AppStats = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    contextPercent: 0,
    model: "",
    cwd: process.cwd(),
  };

  // Event streaming state
  private streamingComponent: AssistantMessageComponent | undefined = undefined;
  private streamingMessage: any = undefined;
  private lastFullMessage: any = undefined; // last complete assistant message
  private pendingTools = new Map<string, ToolExecutionComponent>();
  private mdTheme = getMarkdownTheme();
  private toolOutputExpanded = false;
  private hideThinkingBlock = false; // could be from settings
  private keybindings!: any;
  private footerProvider: any;
  private retryInterval?: any;
  private retryEndTime?: number;
  private footerRenderTimeout?: any;

  constructor(options: CliOptions) {
    // Store CLI options for later re-merging when config file changes
    this.cliOptions = options;
    // Load persistent config and merge (CLI overrides file)
    const fileConfig = loadConfig();
    const merged = { ...fileConfig, ...options } as CliOptions & Config;
    this.options = merged;
    const cwd = merged.cwd ? process.env.QCLAW_CWD || merged.cwd : process.cwd();

    // Initialize terminal
    const terminal = new ProcessTerminal();
    this.tui = new TUI(terminal);

    // Initialize theme manager
    this.theme = ThemeManager.getInstance();
    const themeMode = this.theme.initialize(this.options.theme || "auto");
    if (this.options.debug) {
      console.log(chalk.dim(`Theme initialized: ${themeMode}`));
    }

    // Create keybindings manager
    this.keybindings = new KeybindingsManager(TUI_KEYBINDINGS);

    // Build layout
    this.buildLayout();

    // Set up input handler
    (this.tui as any).onInput = (data: string) => this.handleInput(data);

    // Agent event subscription will be set up after agent init
  }

  private buildLayout(): void {
    // Chat container
    const cwd = this.options.cwd ? process.env.QCLAW_CWD || this.options.cwd : process.cwd();
    this.chat = new ChatContainer({
      themeManager: this.theme,
      ui: this.tui,
      cwd,
      maxMessages: 100,
      messageSpacing: 1,
    });
    // Set chat max height based on terminal size (reserve space for editor/footer)
    const rows = this.tui.terminal.rows;
    if (rows > 10) {
      this.chat.setMaxHeight(rows - 5);
    }
    this.tui.addChild(this.chat);

    // Widget container above editor (for extensions)
    this.widgetContainerAbove = new Container();
    this.tui.addChild(this.widgetContainerAbove);

    // Editor at bottom
    const editorTheme = {
      borderColor: (text: string) => this.theme.fg("border", text),
      selectList: this.theme.getSelectListTheme(),
    };
    this.defaultBorderColor = editorTheme.borderColor;
    this.editor = new AutoIndentEditor(this.tui, editorTheme, this.keybindings, {});
    // Handle editor submit
    this.editor.onSubmit = (text: string) => this.handleEditorSubmit(text);
    // Track editor changes for mode status
    this.editor.onChange = () => this.updateModeStatus();
    // Autocomplete with slash commands and file paths
    try {
      this.editor.setAutocompleteProvider(
        new CombinedAutocompleteProvider(SLASH_COMMANDS, cwd, null)
      );
    } catch (e) {
      if (this.cliOptions.debug) console.warn("Autocomplete setup failed:", e);
    }
    this.tui.addChild(this.editor);

    // Widget container below editor (for extensions)
    this.widgetContainerBelow = new Container();
    this.tui.addChild(this.widgetContainerBelow);

    // Set initial focus to editor
    this.tui.setFocus(this.editor);

    // Footer will be created after agent initialization
    // Start config file watcher for live updates
    if (existsSync(CONFIG_PATH)) {
      try {
        this.configWatcher = fsWatch(CONFIG_PATH, (eventType) => {
          if (eventType === 'change') {
            const newFileConfig = loadConfig();
            const newEffective = { ...newFileConfig, ...this.cliOptions } as CliOptions & Config;
            this.options = newEffective;
            // Apply theme change if needed
            if (newEffective.theme && newEffective.theme !== this.theme.getMode()) {
              this.theme.setTheme(newEffective.theme);
            }
            if (this.options.debug) console.log("Config reloaded:", newEffective);
            this.tui.requestRender();
          }
        });
      } catch (e) {
        if (this.options.debug) console.warn("Config watcher failed:", e);
      }
    }
  }

  // MARK: - Extension widget API

  /**
   * Add a widget component to the specified container ("above" or "below" editor).
   * Extensions use this to display status, progress, or custom UI.
   */
  addWidget(component: Component, position: "above" | "below" = "below"): void {
    if (position === "above") {
      this.widgetContainerAbove.addChild(component);
    } else {
      this.widgetContainerBelow.addChild(component);
    }
    this.tui.requestRender();
  }

  /**
   * Remove a widget component from the specified container.
   */
  removeWidget(component: Component, position: "above" | "below" = "below"): void {
    const container = position === "above" ? this.widgetContainerAbove : this.widgetContainerBelow;
    container.removeChild(component);
    this.tui.requestRender();
  }

  /** For extensions: set a status indicator in the footer. */
  setExtensionStatus(extensionId: string, status: string): void {
    this.footerProvider._status.set(extensionId, status);
    this.tui.requestRender();
  }

  /** Clear an extension's status. */
  clearExtensionStatus(extensionId: string): void {
    this.footerProvider._status.delete(extensionId);
    this.tui.requestRender();
  }

  private async initAgent(): Promise<void> {
    if (this.options.debug) {
      console.log(chalk.dim("🔧 Initializing agent..."));
    }

    try {
      const agentConfig: any = {
        cwd: process.cwd(),
        model: this.options.model,
        tools: this.options.tools,
        extensions: [],
        skills: [],
        sessionDir: this.options.sessionDir || "./.qclaw/sessions",
        eventBus: this.bus,
      };

      this.agent = await createAgent(agentConfig);

      // Store model registry for model selector
      this.modelRegistry = (this.agent.session as any).modelRegistry;

      // Create footer using pi-coding-agent component
      this.footerProvider = {
        _status: new Map<string, string>(),
        getGitBranch: () => {
          try {
            const cwd = this.agent.session.sessionManager.getCwd();
            const branch = execSync('git symbolic-ref --quiet --short HEAD', { cwd, encoding: 'utf8' }).trim();
            return branch || null;
          } catch {
            return null;
          }
        },
        getExtensionStatuses: () => this.footerProvider._status,
        getAvailableProviderCount: () => 0,
        onBranchChange: () => () => {},
      };
      this.footer = new PiFooterComponent(this.agent.session, this.footerProvider);
      const keyHintParts = [
        'F2:theme', 'F3:model', 'F4:session', 'F7:login', 'F8:del-session', 'F9:model-thinking',
        'Ctrl+S:stats', 'Ctrl+E:tools', 'Ctrl+T:thinking', 'Ctrl+Shift+C:copy'
      ];
      this.footerProvider._status.set('keys', keyHintParts.join(' '));
      this.tui.addChild(this.footer);
      // Capture normal layout components for fullscreen toggle
      this.layoutComponents = [this.chat, this.widgetContainerAbove, this.editor, this.widgetContainerBelow, this.footer];
      // Listen for terminal resize to adjust chat height
      process.stdout.on('resize', this.handleResize);

      // Set initial model in stats
      const agentAny = this.agent as any;
      const model = agentAny.getCurrentModel?.();
      if (model) {
        this.stats.model = model.id;
      }

      // Subscribe to agent session events
      this.agent.session.subscribe(async (event: any) => {
        await this.handleAgentEvent(event);
      });

      if (this.options.debug) {
        console.log(chalk.green("✓ Agent ready"));
      }
      // Initialize hideThinkingBlock from settings
      this.hideThinkingBlock = this.agent.session.settingsManager.getHideThinkingBlock();
      // Apply editor settings (padding, autocomplete)
      this.applyEditorSettings();
      // Update footer images status
      this.updateFooterImagesStatus();
      // Show session ID in footer
      this.updateSessionIdStatus();
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(chalk.red("Failed to initialize agent:"), msg);
      logToFile("AGENT_INIT_ERROR", msg);
      this.reportTelemetry("init_error", { message: msg });
    }
  }



  private async handleAgentEvent(event: any): Promise<void> {
    // Handle agent session events (simplified)
    switch (event.type) {
      case "agent_start":
        // Clear any retry countdown
        if (this.retryInterval) {
          clearInterval(this.retryInterval);
          this.retryInterval = undefined;
          this.retryEndTime = undefined;
          this.setFooterStatus(undefined);
        }
        this.setFooterStatus("Thinking...");
        break;
      case "message_start":
        if (event.message?.role === "assistant") {
          this.streamingMessage = event.message;
          this.streamingComponent = new AssistantMessageComponent(undefined, this.hideThinkingBlock, this.mdTheme);
          this.chat.addMessage(this.streamingComponent);
          this.streamingComponent.updateContent(this.streamingMessage);
          // Add any image content
          this.addImagesToAssistantMessage(this.streamingComponent, this.streamingMessage);
        } else if (event.message?.role === "custom") {
          if (event.message.compactionSummary) {
            const comp = new CompactionSummaryMessageComponent(event.message.compactionSummary, this.mdTheme);
            this.chat.addMessage(comp);
          } else if (event.message.branchSummary) {
            const comp = new BranchSummaryMessageComponent(event.message.branchSummary, this.mdTheme);
            this.chat.addMessage(comp);
          } else if (event.message.skillInvocation) {
            const comp = new SkillInvocationMessageComponent(event.message.skillInvocation, this.mdTheme);
            this.chat.addMessage(comp);
          } else {
            const comp = new CustomMessageComponent(event.message, undefined, this.mdTheme);
            this.chat.addMessage(comp);
          }
        }
        break;
      case "message_update":
        if (this.streamingComponent && event.message?.role === "assistant") {
          this.streamingMessage = event.message;
          this.streamingComponent.updateContent(this.streamingMessage);
          this.addImagesToAssistantMessage(this.streamingComponent, this.streamingMessage);
          for (const content of this.streamingMessage.content) {
            if (content.type === "toolCall") {
              if (!this.pendingTools.has(content.id)) {
                const toolComp = new ToolExecutionComponent(
                  content.name,
                  content.id,
                  content.arguments,
                  { showImages: true },
                  undefined,
                  this.tui,
                  process.cwd()
                );
                toolComp.setExpanded(this.toolOutputExpanded);
                this.chat.addMessage(toolComp);
                this.pendingTools.set(content.id, toolComp);
              } else {
                const toolComp = this.pendingTools.get(content.id);
                if (toolComp) toolComp.updateArgs(content.arguments);
              }
            }
          }
        }
        break;
      case "message_end":
        if (this.streamingComponent && event.message?.role === "assistant") {
          this.streamingMessage = event.message;
          const reason = this.streamingMessage.stopReason;
          if (reason === "aborted" || reason === "error") {
            const errorMsg = this.streamingMessage.errorMessage || (reason === "aborted" ? "Operation aborted" : "Error");
            for (const toolComp of this.pendingTools.values()) {
              toolComp.updateResult({ content: [{ type: "text", text: errorMsg }], isError: true }, false);
            }
          } else {
            for (const toolComp of this.pendingTools.values()) {
              toolComp.setArgsComplete();
            }
          }
          // Store the complete assistant message for potential copying
          this.lastFullMessage = this.streamingMessage;
          this.streamingComponent = undefined;
          this.streamingMessage = undefined;
        }
        break;
      case "tool_execution_start":
        if (!this.pendingTools.has(event.toolCallId)) {
          const toolComp = new ToolExecutionComponent(
            event.toolName,
            event.toolCallId,
            event.args,
            { showImages: true },
            undefined,
            this.tui,
            process.cwd()
          );
          toolComp.setExpanded(this.toolOutputExpanded);
          this.chat.addMessage(toolComp);
          this.pendingTools.set(event.toolCallId, toolComp);
        }
        const compStart = this.pendingTools.get(event.toolCallId);
        if (compStart) compStart.markExecutionStarted();
        // Update tools status in footer
        if (this.pendingTools.size > 0) {
          this.footerProvider._status.set('tools', `${this.pendingTools.size} active tool${this.pendingTools.size===1?'':'s'}`);
        } else {
          this.footerProvider._status.delete('tools');
        }
        this.tui.requestRender();
        break;
      case "tool_execution_update":
        const compUpdate = this.pendingTools.get(event.toolCallId);
        if (compUpdate) {
          compUpdate.updateResult({ ...event.partialResult, isError: false }, true);
        }
        break;
      case "tool_execution_end":
        const compEnd = this.pendingTools.get(event.toolCallId);
        if (compEnd) {
          compEnd.updateResult({ ...event.result, isError: event.isError });
          this.pendingTools.delete(event.toolCallId);
        }
        // Update tools status in footer
        if (this.pendingTools.size > 0) {
          this.footerProvider._status.set('tools', `${this.pendingTools.size} active tool${this.pendingTools.size===1?'':'s'}`);
        } else {
          this.footerProvider._status.delete('tools');
        }
        this.tui.requestRender();
        break;
      case "agent_end":
        this.setFooterStatus(undefined);
        break;
      case "agent_error": {
        const err = event.error as any;
        if (err.fallbackModel) {
          this.setFooterStatus(`Falling back to ${err.fallbackModel}`);
          setTimeout(() => this.setFooterStatus(undefined), 5000);
        } else if (err.retryAfter != null) {
          const seconds = Math.ceil(Number(err.retryAfter));
          const end = Date.now() + seconds * 1000;
          this.retryEndTime = end;
          const update = () => {
            const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
            if (left > 0) {
              this.setFooterStatus(`Retrying in ${left}s...`);
            } else {
              clearInterval(this.retryInterval);
              this.retryInterval = undefined;
            }
          };
          update();
          this.retryInterval = setInterval(update, 1000);
        } else if (err.statusCode === 401 || err.code === 'unauthorized' || err.authRequired) {
          // Trigger login flow after a brief delay
          setTimeout(async () => {
            await this.showOAuthFlow();
          }, 1000);
        } else {
          console.error(chalk.red("Agent error:"), err);
          this.setFooterStatus("Error");
          setTimeout(() => this.setFooterStatus(undefined), 3000);
        }
        break;
      }
    }
    this.tui.requestRender();
  }

  private async showThemeSelector(): Promise<void> {
    const selector = new ExtensionSelectorComponent(
      "Select Theme",
      ["dark", "light", "auto"],
      async (selection: string) => {
        // Apply theme via ThemeManager (calls initTheme internally)
        this.theme.setTheme(selection as "dark" | "light" | "auto");
        // Persist to config
        this.options.theme = selection as any;
        saveConfig(this.options);
        // Hide overlay and re-render
        handle.hide();
        this.tui.requestRender();
      },
      () => {
        handle.hide();
      },
      { tui: this.tui }
    );

    const handle = this.tui.showOverlay(selector, { width: 40, anchor: "center" });
    handle.focus();
    this.tui.requestRender();
  }

  private async switchToSession(sessionFile: string): Promise<void> {
    try {
      const { SessionManager } = await import("@mariozechner/pi-coding-agent");
      const dir = this.options.sessionDir || "./.qclaw/sessions";
      const fullPath = join(dir, sessionFile);
      if (!existsSync(fullPath)) {
        console.error(chalk.red(`Session file not found: ${fullPath}`));
        return;
      }
      // Fork the selected session into current cwd
      const forked = SessionManager.forkFrom(fullPath, process.cwd(), dir);
      // Shutdown current agent
      await this.agent.shutdown();
      // Create new agent with the forked sessionManager
      this.agent = await createAgent({
        ...this.options,
        sessionManager: forked,
        eventBus: this.bus,
      });
      // Update model registry reference
      this.modelRegistry = (this.agent.session as any).modelRegistry;
      // Update session ID and images status in footer
      this.updateSessionIdStatus();
      this.updateFooterImagesStatus();
      // Update footer with new model (automatic via session)
      const model = (this.agent as any).getCurrentModel?.();
      // Show temporary status
      const statusText = `Switched to ${sessionFile}`;
      this.setFooterStatus(statusText);
      setTimeout(() => this.setFooterStatus(undefined), 2000);
      this.tui.requestRender();
    } catch (e: any) {
      console.error(chalk.red("Failed to switch session:"), e.message);
    }
  }

  private showSessionList(): void {
    const dir = this.options.sessionDir || "./.qclaw/sessions";
    try {
      const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith(".jsonl")) : [];
      const fileMap = new Map<string, string>();
      const items: string[] = [];
      for (const f of files) {
        try {
          const fullPath = join(dir, f);
          const stat = statSync(fullPath);
          const date = new Date(stat.mtime);
          const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString().slice(0, 5)}`;
          const display = `${f} (${dateStr})`;
          fileMap.set(display, f);
          items.push(display);
        } catch {
          fileMap.set(f, f);
          items.push(f);
        }
      }
      if (items.length === 0) items.push("(no sessions)");
      const selector = new ExtensionSelectorComponent(
        "Sessions (Enter=fork)",
        items,
        async (selection) => {
          if (selection === "(no sessions)") {
            handle.hide();
            return;
          }
          const actualFile = fileMap.get(selection) || selection;
          await this.switchToSession(actualFile);
          handle.hide();
        },
        () => {
          handle.hide();
        },
        { tui: this.tui }
      );
      const handle = this.tui.showOverlay(selector, { width: 50, anchor: "center" });
      handle.focus();
      this.tui.requestRender();
    } catch (e: any) {
      console.error(chalk.red("Failed to list sessions:"), e.message);
    }
  }

  private async deleteSession(): Promise<void> {
    const dir = this.options.sessionDir || "./.qclaw/sessions";
    try {
      const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith(".jsonl")) : [];
      if (files.length === 0) {
        await this.showMessageDialog("No sessions to delete.", "Info");
        return;
      }
      const fileMap = new Map<string, string>();
      const items: string[] = [];
      for (const f of files) {
        try {
          const fullPath = join(dir, f);
          const stat = statSync(fullPath);
          const date = new Date(stat.mtime);
          const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString().slice(0,5)}`;
          const display = `${f} (${dateStr})`;
          fileMap.set(display, f);
          items.push(display);
        } catch {
          fileMap.set(f, f);
          items.push(f);
        }
      }
      const selector = new ExtensionSelectorComponent(
        "Delete session (Enter=delete)",
        items,
        async (selection) => {
          handle.hide();
          const actualFile = fileMap.get(selection) || selection;
          const confirmed = await this.showConfirmDialog(`Delete session '${actualFile}'? This cannot be undone.`, "Confirm Delete");
          if (confirmed) {
            try {
              const fullPath = join(dir, actualFile);
              unlinkSync(fullPath);
              this.setFooterStatus(`Deleted ${actualFile}`);
              setTimeout(() => this.setFooterStatus(undefined), 2000);
            } catch (err: any) {
              this.showErrorDialog(`Failed to delete: ${err.message}`);
            }
          }
        },
        () => {
          handle.hide();
        },
        { tui: this.tui }
      );
      const handle = this.tui.showOverlay(selector, { width: 50, anchor: "center" });
      handle.focus();
      this.tui.requestRender();
    } catch (e: any) {
      console.error(chalk.red("Failed to list sessions for delete:"), e.message);
    }
  }

  private showSettingsSelector(): void {
    const settingsManager = this.agent.session.settingsManager;
    const session = this.agent.session;

    // Build config for the settings selector component
    const config: SettingsConfig = {
      autoCompact: settingsManager.getCompactionEnabled(),
      showImages: settingsManager.getShowImages(),
      imageWidthCells: settingsManager.getImageWidthCells(),
      autoResizeImages: settingsManager.getImageAutoResize(),
      blockImages: settingsManager.getBlockImages(),
      enableSkillCommands: settingsManager.getEnableSkillCommands(),
      steeringMode: settingsManager.getSteeringMode() ?? ("one-at-a-time" as const),
      followUpMode: settingsManager.getFollowUpMode() ?? ("one-at-a-time" as const),
      transport: settingsManager.getTransport() ?? "sse",
      thinkingLevel: session.thinkingLevel ?? "medium",
      availableThinkingLevels: ["off", "minimal", "low", "medium", "high", "xhigh"],
      currentTheme: settingsManager.getTheme() ?? "catppuccin-macchiato",
      availableThemes: ["catppuccin-macchiato", "catppuccin-frappe", "catppuccin-latte", "catppuccin-mocha", "nord", "dracula", "gruvbox"],
      hideThinkingBlock: settingsManager.getHideThinkingBlock(),
      collapseChangelog: settingsManager.getCollapseChangelog(),
      enableInstallTelemetry: settingsManager.getEnableInstallTelemetry(),
      doubleEscapeAction: settingsManager.getDoubleEscapeAction(),
      treeFilterMode: settingsManager.getTreeFilterMode(),
      showHardwareCursor: settingsManager.getShowHardwareCursor(),
      editorPaddingX: settingsManager.getEditorPaddingX(),
      autocompleteMaxVisible: settingsManager.getAutocompleteMaxVisible(),
      quietStartup: settingsManager.getQuietStartup(),
      clearOnShrink: settingsManager.getClearOnShrink(),
    };

    const callbacks: SettingsCallbacks = {
      onAutoCompactChange: (enabled) => {
        settingsManager.setCompactionEnabled(enabled);
        handle?.hide();
        this.tui.requestRender();
      },
      onShowImagesChange: (enabled) => {
        settingsManager.setShowImages(enabled);
        this.updateFooterImagesStatus();
        handle?.hide();
        this.tui.requestRender();
      },
      onImageWidthCellsChange: (width) => {
        settingsManager.setImageWidthCells(width);
        handle?.hide();
        this.tui.requestRender();
      },
      onAutoResizeImagesChange: (enabled) => {
        settingsManager.setImageAutoResize(enabled);
        handle?.hide();
        this.tui.requestRender();
      },
      onBlockImagesChange: (blocked) => {
        settingsManager.setBlockImages(blocked);
        handle?.hide();
        this.tui.requestRender();
      },
      onEnableSkillCommandsChange: (enabled) => {
        settingsManager.setEnableSkillCommands(enabled);
        handle?.hide();
        this.tui.requestRender();
      },
      onSteeringModeChange: (mode) => {
        settingsManager.setSteeringMode(mode);
        handle?.hide();
        this.tui.requestRender();
      },
      onFollowUpModeChange: (mode) => {
        settingsManager.setFollowUpMode(mode);
        handle?.hide();
        this.tui.requestRender();
      },
      onTransportChange: (transport) => {
        settingsManager.setTransport(transport);
        handle?.hide();
        this.tui.requestRender();
      },
      onThinkingLevelChange: (level) => {
        session.setThinkingLevel(level);
        this.footer.invalidate();
        handle?.hide();
        this.tui.requestRender();
      },
      onThemeChange: (themeName) => {
        settingsManager.setTheme(themeName);
        initTheme(themeName);
        handle?.hide();
        this.tui.requestRender();
      },
      onHideThinkingBlockChange: (hidden) => {
        settingsManager.setHideThinkingBlock(hidden);
        this.hideThinkingBlock = hidden;
        // Update all existing assistant message components
        for (const msg of this.chat.getMessages()) {
          if (msg instanceof AssistantMessageComponent) {
            msg.setHideThinkingBlock(hidden);
          }
        }
        handle?.hide();
        this.tui.requestRender();
      },
      onCollapseChangelogChange: (collapsed) => {
        settingsManager.setCollapseChangelog(collapsed);
        handle?.hide();
        this.tui.requestRender();
      },
      onEnableInstallTelemetryChange: (enabled) => {
        settingsManager.setEnableInstallTelemetry(enabled);
        handle?.hide();
        this.tui.requestRender();
      },
      onDoubleEscapeActionChange: (action) => {
        settingsManager.setDoubleEscapeAction(action);
        handle?.hide();
        this.tui.requestRender();
      },
      onTreeFilterModeChange: (mode) => {
        settingsManager.setTreeFilterMode(mode);
        handle?.hide();
        this.tui.requestRender();
      },
      onShowHardwareCursorChange: (enabled) => {
        settingsManager.setShowHardwareCursor(enabled);
        handle?.hide();
        this.tui.requestRender();
      },
      onEditorPaddingXChange: (padding) => {
        settingsManager.setEditorPaddingX(padding);
        this.editor.setPaddingX(padding);
        handle?.hide();
        this.tui.requestRender();
      },
      onAutocompleteMaxVisibleChange: (maxVisible) => {
        settingsManager.setAutocompleteMaxVisible(maxVisible);
        this.editor.setAutocompleteMaxVisible(maxVisible);
        handle?.hide();
        this.tui.requestRender();
      },
      onQuietStartupChange: (enabled) => {
        settingsManager.setQuietStartup(enabled);
        handle?.hide();
        this.tui.requestRender();
      },
      onClearOnShrinkChange: (enabled) => {
        settingsManager.setClearOnShrink(enabled);
        handle?.hide();
        this.tui.requestRender();
      },
      onCancel: () => {
        handle?.hide();
      },
    };

    const selector = new SettingsSelectorComponent(config, callbacks);
    const handle = this.tui.showOverlay(selector, { width: 60, anchor: "center" });
    handle.focus();
    this.tui.requestRender();
  }

  private showThinkingSelector(): void {
    const session = this.agent.session as any;
    const currentLevel = session.thinkingLevel || "medium";
    const selector = new ThinkingSelectorComponent(
      currentLevel,
      ["off","minimal","low","medium","high","xhigh"] as any,
      (level) => {
        session.setThinkingLevel(level);
        this.setFooterStatus(`Thinking: ${level}`);
        setTimeout(() => this.setFooterStatus(undefined), 2000);
        handle?.hide();
        this.tui.requestRender();
      },
      () => {
        handle?.hide();
        this.tui.requestRender();
      }
    );
    const handle = this.tui.showOverlay(selector, { width: 50, anchor: "center" });
    this.tui.requestRender();
  }

  private async showModelSelector(): Promise<void> {
    const session = this.agent.session as any;
    const model = session.state?.model;
    const settingsManager = session.settingsManager;
    const modelRegistry = this.modelRegistry;
    const scopedModels = session.scopedModels || [];

    const selector = new ModelSelectorComponent(
      this.tui,
      model,
      settingsManager,
      modelRegistry,
      scopedModels,
      async (selectedModel: any) => {
        try {
          await session.setModel(selectedModel);
          this.stats.model = selectedModel.id;
          this.setFooterStatus(`Model: ${selectedModel.id}`);
          setTimeout(() => this.setFooterStatus(undefined), 2000);
          handle?.hide();
          this.tui.requestRender();
        } catch (e: any) {
          this.setFooterStatus(`Error: ${e.message}`);
          setTimeout(() => this.setFooterStatus(undefined), 3000);
        }
      },
      () => {
        handle?.hide();
        this.tui.requestRender();
      },
      ""
    );
    const handle = this.tui.showOverlay(selector, { width: 60, anchor: "center" });
    this.tui.requestRender();
  }

  private async showOAuthFlow(): Promise<void> {
    const session = this.agent.session as any;
    const authStorage = session.modelRegistry.authStorage;
    const selector = new OAuthSelectorComponent(
      "login",
      authStorage,
      async (providerId: string) => {
        handle.hide();
        await this.performLogin(providerId);
      },
      () => {
        handle.hide();
      }
    );
    const handle = this.tui.showOverlay(selector, { width: 50, anchor: "center" });
    this.tui.requestRender();
  }

  private async performLogin(providerId: string): Promise<void> {
    const session = this.agent.session as any;
    const authStorage = session.modelRegistry.authStorage;
    const providerInfo = authStorage.getOAuthProviders().find((p: any) => p.id === providerId);
    const providerName = providerInfo?.name || providerId;
    const usesCallbackServer = providerInfo?.usesCallbackServer ?? false;

    const dialog = new LoginDialogComponent(this.tui, providerId, (success: boolean, message?: string) => {
      // Completion handled by the promise
    });

    const handle = this.tui.showOverlay(dialog, { width: 70, anchor: "center" });
    this.tui.requestRender();

    let manualCodeResolve: ((code: string) => void) | undefined;
    let manualCodeReject: ((err: Error) => void) | undefined;
    const manualCodePromise = new Promise<string>((resolve, reject) => {
      manualCodeResolve = resolve;
      manualCodeReject = reject;
    });

    try {
      await authStorage.login(providerId, {
        onAuth: (info: { url: string; instructions?: string }) => {
          dialog.showAuth(info.url, info.instructions);
          if (usesCallbackServer) {
            dialog.showManualInput("Paste redirect URL below, or complete login in browser:")
              .then((value: string) => {
                if (value && manualCodeResolve) {
                  manualCodeResolve(value);
                  manualCodeResolve = undefined;
                }
              })
              .catch(() => {
                if (manualCodeReject) {
                  manualCodeReject(new Error("Login cancelled"));
                  manualCodeReject = undefined;
                }
              });
          } else if (providerId === "github-copilot") {
            dialog.showWaiting("Waiting for browser authentication...");
          }
        },
        onPrompt: async (prompt: { message: string; placeholder?: string }) => {
          return dialog.showManualInput(prompt.message);
        },
        onProgress: (message: string) => {
          dialog.showProgress(message);
        },
        onManualCodeInput: () => manualCodePromise,
      });

      if (typeof session.modelRegistry.refresh === "function") {
        await session.modelRegistry.refresh();
      }
      this.setFooterStatus(`Logged in to ${providerName}`);
      setTimeout(() => this.setFooterStatus(undefined), 2000);
    } catch (error: any) {
      this.showErrorDialog(`Login failed: ${error.message}`);
    } finally {
      handle.hide();
      this.tui.requestRender();
    }
  }

  private async setModelThinkingLevel(): Promise<void> {
    const session = this.agent.session as any;
    const currentModel = session.model;
    if (!currentModel) {
      this.setFooterStatus("No model selected");
      setTimeout(() => this.setFooterStatus(undefined), 2000);
      return;
    }
    const scopedModels = session.scopedModels || [];
    const existing = scopedModels.find((sm: any) => modelsAreEqual(sm.model, currentModel));
    const globalLevel = session.thinkingLevel || "medium";
    const currentLevel = existing?.thinkingLevel || globalLevel;

    const selector = new ThinkingSelectorComponent(
      currentLevel,
      ["off", "minimal", "low", "medium", "high", "xhigh"] as any,
      async (level) => {
        handle?.hide();
        // Update scopedModels
        let newScoped = Array.from(scopedModels);
        if (level === globalLevel) {
          // Remove override
          newScoped = newScoped.filter((sm: any) => !modelsAreEqual(sm.model, currentModel));
        } else {
          // Add or update
          const idx = newScoped.findIndex((sm: any) => modelsAreEqual(sm.model, currentModel));
          if (idx >= 0) {
            newScoped[idx] = { model: currentModel, thinkingLevel: level };
          } else {
            newScoped.push({ model: currentModel, thinkingLevel: level });
          }
        }
        session.setScopedModels(newScoped);
        this.setFooterStatus(`Model ${currentModel.id}: ${level}`);
        setTimeout(() => this.setFooterStatus(undefined), 2000);
        this.tui.requestRender();
      },
      () => {
        handle?.hide();
        this.tui.requestRender();
      }
    );
    const handle = this.tui.showOverlay(selector, { width: 50, anchor: "center" });
    this.tui.requestRender();
  }

  private showSessionInfoOverlay(): void {
    const session = this.agent.session as any;
    const model = session.model?.id || "none";
    const cwd = session.sessionManager?.getCwd?.() || process.cwd();
    const sessionFile = session.sessionManager?.sessionFile || "no session";
    const lines = [
      `Session Info`,
      ``,
      `Model: ${model}`,
      `CWD: ${cwd}`,
      `Session: ${sessionFile}`,
    ];
    const overlay = new Container();
    for (const line of lines) {
      overlay.addChild(new Text(line, 1, 0));
    }
    const handle = this.tui.showOverlay(overlay, { width: 50, anchor: "center" });
    setTimeout(() => {
      handle?.hide();
      this.tui.requestRender();
    }, 5000);
  }

  private showStatisticsOverlay(): void {
    const lines = [
      `📊 Statistics`,
      ``,
      `Model: ${this.stats.model || "none"}`,
      `CWD: ${this.stats.cwd}`,
      ...(this.stats.startupTime !== undefined ? [`Startup: ${this.stats.startupTime!.toFixed(1)}ms`] : []),
      `Token Usage: ${this.stats.totalTokens} total`,
      `  Input:  ${this.stats.inputTokens}`,
      `  Output: ${this.stats.outputTokens}`,
      `  Context: ${this.stats.contextPercent}%`,
    ];

    const overlay = new Container();
    for (const line of lines) {
      overlay.addChild(new Text(line, 1, 0));
    }

    const handle = this.tui.showOverlay(overlay, { width: 40, anchor: "center" });
    setTimeout(() => {
      if (handle) handle.hide();
      this.tui.requestRender();
    }, 5000);
  }

  private showConfirmDialog(message: string, title: string = "Confirm"): Promise<boolean> {
    return new Promise((resolve) => {
      let resolved = false;
      const container = new Container();
      container.addChild(new Text(this.theme.fg("accent", title), 0, 0));
      container.addChild(new Text("", 0, 0));
      container.addChild(new Text(message, 0, 0));
      container.addChild(new Text("", 0, 0));
      container.addChild(new Text(this.theme.fg("muted", "Y/N or Enter/Esc"), 0, 0));

      const handle = this.tui.showOverlay(container, { width: 50, anchor: "center" });
      handle.focus();

      const handler = (data: string) => {
        if (resolved) return;
        if (matchesKey(data, "enter") || data === "y" || data === "Y") {
          resolved = true;
          resolve(true);
          handle.hide();
        } else if (matchesKey(data, "escape") || data === "n" || data === "N") {
          resolved = true;
          resolve(false);
          handle.hide();
        }
      };
      (container as any).handleInput = handler;
    });
  }

  private showMessageDialog(message: string, title: string = "Message"): Promise<void> {
    return new Promise((resolve) => {
      const container = new Container();
      container.addChild(new Text(this.theme.fg("accent", title), 0, 0));
      container.addChild(new Text("", 0, 0));
      container.addChild(new Text(message, 0, 0));
      container.addChild(new Text("", 0, 0));
      container.addChild(new Text(this.theme.fg("muted", "Press Enter"), 0, 0));

      const handle = this.tui.showOverlay(container, { width: 50, anchor: "center" });
      handle.focus();

      const handler = (data: string) => {
        if (matchesKey(data, "enter")) {
          resolve();
          handle.hide();
        }
      };
      (container as any).handleInput = handler;
    });
  }

  private showErrorDialog(message: string): Promise<void> {
    return new Promise((resolve) => {
      const container = new Container();
      container.addChild(new Text(this.theme.fg("error", "Error"), 0, 0));
      container.addChild(new Text("", 0, 0));
      container.addChild(new Text(message, 0, 0));
      container.addChild(new Text("", 0, 0));
      container.addChild(new Text(this.theme.fg("muted", "Press Enter"), 0, 0));

      const handle = this.tui.showOverlay(container, { width: 50, anchor: "center" });
      handle.focus();

      const handler = (data: string) => {
        if (matchesKey(data, "enter")) {
          resolve();
          handle.hide();
        }
      };
      (container as any).handleInput = handler;
    });
  }

  private reportTelemetry(event: string, data: any): void {
    if (!this.options.telemetry) return;
    try {
      const telemetryFile = join(CONFIG_DIR, "telemetry.log");
      const line = `${new Date().toISOString()} [${event}] ${JSON.stringify(data)}\n`;
      appendFileSync(telemetryFile, line, { encoding: "utf8", flag: "a" });
    } catch {
      // ignore
    }
  }

  private getLastAssistantText(): string | null {
    const msg = this.lastFullMessage || this.streamingMessage;
    if (!msg || !msg.content) return null;
    const texts: string[] = [];
    for (const c of msg.content) {
      if (c.type === "text" && c.text) texts.push(c.text);
      if (c.type === "thinking" && c.thinking) texts.push(c.thinking);
    }
    return texts.join("\n");
  }

  private extractLastCodeBlock(): string | null {
    const text = this.getLastAssistantText();
    if (!text) return null;
    // Match triple backtick code blocks, optionally with language
    const regex = /```(?:[a-zA-Z0-9]*\n)?([\s\S]*?)```/g;
    const matches: string[] = [];
    let m;
    while ((m = regex.exec(text)) !== null) {
      matches.push(m[0]);
    }
    if (matches.length === 0) return null;
    const last = matches[matches.length - 1];
    // Strip delimiters
    const inner = last.replace(/^```(?:[a-zA-Z0-9]*\n)?/, "").replace(/```$/, "");
    return inner.trim() || null;
  }

  /**
   * Handle editor submit (Enter pressed)
   */
  private async handleEditorSubmit(input: string): Promise<void> {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Add to editor history
    this.editor.addToHistory(trimmed);

    // Built‑in slash commands
    if (trimmed === "/clear") {
      this.chat.clearMessages();
      this.setFooterStatus("Chat cleared");
      setTimeout(() => this.setFooterStatus(undefined), 2000);
      this.tui.requestRender();
      return;
    }
    if (trimmed === "/help") {
      const help = new Container();
      const lines = [
        "Slash commands:",
        "  /clear   Clear chat",
        "  /exit    Exit application",
        "  /save    Save conversation",
        "  /export  Export conversation (JSON)",
        "  /help    Show this help",
      ];
      for (let i = 0; i < lines.length; i++) {
        help.addChild(new Text(lines[i], 1, 0));
      }
      const handle = this.tui.showOverlay(help, { width: 40, anchor: "center" });
      setTimeout(() => { handle.hide(); this.tui.requestRender(); }, 5000);
      return;
    }
    if (trimmed === "/save" || trimmed === "/export") {
      const session = this.agent.session as any;
      const msgs = session?.state?.messages || [];
      const dir = this.options.sessionDir || "./.qclaw/sessions";
      const filename = join(dir, `export-${Date.now()}.json`);
      try {
        writeFileSync(filename, JSON.stringify(msgs, null, 2));
        this.setFooterStatus(`Exported ${msgs.length} messages`);
      } catch (e: any) {
        this.setFooterStatus(`Export failed: ${e.message}`);
      }
      setTimeout(() => this.setFooterStatus(undefined), 3000);
      this.tui.requestRender();
      return;
    }
    if (trimmed === "/exit" || trimmed === "/quit") {
      await this.shutdown();
      process.exit(0);
      return;
    }
    if (trimmed.startsWith("/edit ")) {
      const file = trimmed.slice(6).trim();
      if (!file) {
        this.setFooterStatus("Usage: /edit <file>");
        setTimeout(() => this.setFooterStatus(undefined), 2000);
        this.tui.requestRender();
        return;
      }
      const editor = process.env.EDITOR || process.env.VISUAL || "vim";
      try {
        spawn(editor, [file], { detached: true, stdio: "ignore" }).unref();
        this.setFooterStatus(`Opened ${file}`);
      } catch (e: any) {
        this.setFooterStatus(`Failed: ${e.message}`);
      }
      setTimeout(() => this.setFooterStatus(undefined), 2000);
      this.tui.requestRender();
      return;
    }

    // Support for ! prefix for bash mode (task-43)
    if (trimmed.startsWith('!')) {
      const cmd = trimmed.slice(1).trim();
      try {
        const output = execSync(cmd, { cwd: this.agent.session.sessionManager.getCwd(), encoding: 'utf8' });
        const container = new Container();
        container.addChild(new Text(`$ ${cmd}`));
        const lines = output.split('\n');
        for (const line of lines) {
          if (line) container.addChild(new Text(line));
        }
        this.chat.addMessage(container);
      } catch (e: any) {
        const errContainer = new Container();
        errContainer.addChild(new Text(this.theme.fg('error', `Error: ${e.message}`)));
        this.chat.addMessage(errContainer);
      }
      this.tui.requestRender();
      return;
    }

    // Add user message using UserMessageComponent
    const userMsg = new UserMessageComponent(trimmed, this.mdTheme);
    this.chat.addMessage(userMsg);
    this.tui.requestRender();

    try {
      await this.agent.sendMessage(trimmed);
    } catch (error: any) {
      console.error(chalk.red("Send error:"), error.message);
      const errMsg = new Container();
      const errText = new Text(this.theme.fg("error", "Error: " + error.message), 1, 0);
      errMsg.addChild(errText);
      this.chat.addMessage(errMsg);
      this.tui.requestRender();
    }
  }

  private async handleInput(data: string): Promise<void> {
    // Function keys (handled globally)
    if (matchesKey(data, Key.f2)) {
      await this.showThemeSelector();
      return;
    }
    if (matchesKey(data, Key.f3)) {
      await this.showModelSelector();
      return;
    }
    if (matchesKey(data, Key.f4)) {
      this.showSessionList();
      return;
    }
    if (matchesKey(data, Key.f5)) {
      this.showSettingsSelector();
      return;
    }
    if (matchesKey(data, Key.f6)) {
      this.showThinkingSelector();
      return;
    }
    if (matchesKey(data, "ctrl+s")) {
      this.showStatisticsOverlay();
      return;
    }
    if (matchesKey(data, "ctrl+e")) {
      this.toolOutputExpanded = !this.toolOutputExpanded;
      for (const toolComp of this.pendingTools.values()) {
        toolComp.setExpanded(this.toolOutputExpanded);
      }
      this.tui.requestRender();
      return;
    }
    // Cycle model forward (Ctrl+P)
    if (matchesKey(data, "ctrl+p")) {
      this.cycleModel("forward");
      return;
    }
    // Cycle model backward (Ctrl+Shift+P)
    if (matchesKey(data, "ctrl+shift+p")) {
      this.cycleModel("backward");
      return;
    }
    // Global copy last code block (Ctrl+Shift+C)
    if (matchesKey(data, "ctrl+shift+c")) {
      let code = this.extractLastCodeBlock();
      if (!code) {
        const text = this.getLastAssistantText();
        if (text) code = text;
      }
      if (code) {
        try {
          await copyToClipboard(code);
          const status = "Copied to clipboard";
          this.setFooterStatus(status);
          setTimeout(() => this.setFooterStatus(undefined), 2000);
        } catch (err: any) {
          const status = "Copy failed";
          this.setFooterStatus(status);
          setTimeout(() => this.setFooterStatus(undefined), 2000);
        }
      } else {
        const status = "No content to copy";
        this.setFooterStatus(status);
        setTimeout(() => this.setFooterStatus(undefined), 2000);
      }
      return;
    }
    // Toggle fullscreen chat (F11)
    if (matchesKey(data, "f11")) {
      this.toggleFullscreen();
      return;
    }
    // Toggle thinking block visibility (Ctrl+T)
    if (matchesKey(data, "ctrl+t")) {
      const newVal = !this.hideThinkingBlock;
      this.hideThinkingBlock = newVal;
      this.agent.session.settingsManager.setHideThinkingBlock(newVal);
      for (const msg of this.chat.getMessages()) {
        if (msg instanceof AssistantMessageComponent) {
          msg.setHideThinkingBlock(newVal);
        }
      }
      this.tui.requestRender();
      return;
    }
    // Cycle thinking level (Shift+Tab)
    if (matchesKey(data, "shift+tab")) {
      const session = this.agent.session as any;
      const levels = ["off","minimal","low","medium","high","xhigh"];
      const current = session.thinkingLevel as string;
      const idx = levels.indexOf(current);
      const next = levels[(idx + 1) % levels.length];
      session.setThinkingLevel(next);
      this.setFooterStatus(`Thinking: ${next}`);
      setTimeout(() => this.setFooterStatus(undefined), 2000);
      return;
    }
    // Show session info (Ctrl+I)
    if (matchesKey(data, "ctrl+i")) {
      this.showSessionInfoOverlay();
      return;
    }
    // OAuth login (F7)
    if (matchesKey(data, Key.f7)) {
      await this.showOAuthFlow();
      return;
    }
    // Per-model thinking level (F9)
    if (matchesKey(data, Key.f9)) {
      await this.setModelThinkingLevel();
      return;
    }
    // Session deletion (F8)
    if (matchesKey(data, Key.f8)) {
      this.deleteSession();
      return;
    }
    // Abort agent generation (Ctrl+C)
    if (matchesKey(data, "ctrl+c")) {
      const agentAny = this.agent as any;
      if (agentAny.abort) {
        agentAny.abort();
        this.setFooterStatus("Aborted");
        setTimeout(() => this.setFooterStatus(undefined), 2000);
      }
      return;
    }
    // Let editor handle other keys (Enter, arrows, etc.)
    this.editor.handleInput(data);
  }

  private applyEditorSettings(): void {
    if (this.agent?.session) {
      const sm = this.agent.session.settingsManager;
      this.editor.setPaddingX(sm.getEditorPaddingX());
      this.editor.setAutocompleteMaxVisible(sm.getAutocompleteMaxVisible());
    }
  }

  private addImagesToAssistantMessage(component: AssistantMessageComponent, message: any): void {
    // Access private contentContainer via any
    const anyComp = component as any;
    const contentContainer = anyComp.contentContainer as Container | undefined;
    if (!contentContainer) return;
    for (const content of message.content) {
      if (content.type === "image" && content.data) {
        const img = new Image(content.data, content.mimeType,
          { fallbackColor: (s: string) => this.theme.fg("toolOutput", s) },
          { maxWidthCells: 60 }
        );
        contentContainer.addChild(img);
      }
    }
  }

  private setFooterStatus(text: string | undefined): void {
    if (this.footerProvider) {
      if (text === undefined) {
        this.footerProvider._status.delete('qclaw');
      } else {
        this.footerProvider._status.set('qclaw', text);
      }
      // Debounce render to avoid excessive updates
      if (this.footerRenderTimeout) clearTimeout(this.footerRenderTimeout);
      this.footerRenderTimeout = setTimeout(() => {
        this.tui.requestRender();
        this.footerRenderTimeout = undefined;
      }, 50);
    }
  }

  private cycleModel(direction: "forward" | "backward"): void {
    const session = this.agent.session as any;
    session.cycleModel(direction)
      .then((result: any) => {
        if (result) {
          this.stats.model = result.model.id;
          this.setFooterStatus(`Model: ${result.model.id}`);
          setTimeout(() => this.setFooterStatus(undefined), 2000);
        }
        this.tui.requestRender();
      })
      .catch((err: any) => {
        console.error(chalk.red("Model cycle error:"), err);
        this.setFooterStatus("Model switch failed");
        setTimeout(() => this.setFooterStatus(undefined), 2000);
        this.tui.requestRender();
      });
  }

  private updateFooterImagesStatus(): void {
    if (!this.agent?.session?.settingsManager) return;
    const enabled = this.agent.session.settingsManager.getShowImages();
    this.footerProvider._status.set('img', `img: ${enabled ? 'on' : 'off'}`);
    this.tui.requestRender();
  }

  private updateModeStatus(): void {
    if (!this.editor) return;
    const text = this.editor.getText();
    const trimmed = text.trimStart();
    if (trimmed.startsWith('!')) {
      this.footerProvider._status.set('mode', 'bash');
      // Change editor border color to indicate bash mode
      (this.editor as any).borderColor = (s: string) => this.theme.fg('error', s);
    } else {
      this.footerProvider._status.delete('mode');
      // Restore default border color
      (this.editor as any).borderColor = this.defaultBorderColor;
    }
    this.tui.requestRender();
  }

  private updateSessionIdStatus(): void {
    const id = randomBytes(4).toString('hex');
    this.footerProvider._status.set('session', `session: ${id}`);
    this.tui.requestRender();
  }

  private toggleFullscreen(): void {
    if (!this.fullscreenActive) {
      // Enter fullscreen: keep only chat
      this.layoutComponents.forEach(comp => {
        if (comp !== this.chat) {
          this.tui.removeChild(comp);
        }
      });
      // Make chat fill the terminal
      this.chat.setMaxHeight(undefined);
      this.fullscreenActive = true;
    } else {
      // Exit fullscreen: restore all components in order
      this.tui.removeChild(this.chat);
      for (const comp of this.layoutComponents) {
        this.tui.addChild(comp);
      }
      // Restore chat maxHeight based on terminal rows
      const rows = this.tui.terminal.rows;
      if (rows > 10) {
        this.chat.setMaxHeight(rows - 5);
      } else {
        this.chat.setMaxHeight(undefined);
      }
      this.fullscreenActive = false;
    }
    this.tui.requestRender();
  }

  private handleResize = (): void => {
    const rows = this.tui.terminal.rows;
    if (rows > 10) {
      this.chat.setMaxHeight(rows - 5);
    } else {
      this.chat.setMaxHeight(undefined);
    }
    this.tui.requestRender();
  };

  async run(): Promise<void> {
    const startHr = process.hrtime.bigint();
    await this.initAgent();
    const elapsedMs = Number(process.hrtime.bigint() - startHr) / 1e6;
    this.stats.startupTime = elapsedMs;
    if (this.options.debug) {
      console.log(chalk.dim(`Startup time: ${elapsedMs.toFixed(1)}ms`));
    }
    this.tui.start();
  }

  async shutdown(): Promise<void> {
    if (this.configWatcher) this.configWatcher.close();
    await this.agent.shutdown();
    this.tui.stop();
  }
}

// CLI parsing
function parseArgs(): CliOptions {
  const program = new Command();

  program
    .name("qclaw")
    .description("Professional AI coding assistant TUI")
    .version("1.0.0")
    .option("-c, --cwd <path>", "Working directory")
    .option("-m, --model <id>", "Model identifier (e.g., claude-3-opus)")
    .option("-t, --tools <list>", "Comma-separated tools (read,edit,bash,grep,find,ls,git)", "read,edit,bash,grep,find,ls,git")
    .option("-s, --session-dir <path>", "Session storage directory", "./.qclaw/sessions")
    .option("--theme <mode>", "Theme mode: dark, light, auto", "auto")
    .option("--debug", "Enable debug logging")
    .option("--telemetry", "Enable error telemetry (opt-in)");

  const args = process.argv.slice(2);
  const options = program.parse(args) as any;

  return {
    cwd: options.cwd,
    model: options.model,
    tools: options.tools ? options.tools.split(",") : undefined,
    sessionDir: options.sessionDir,
    theme: options.theme as "dark" | "light" | "auto",
    debug: options.debug || false,
    telemetry: options.telemetry || false,
  };
}

// Entry point
const options = parseArgs();
const app = new QClawApp(options);

async function runApp(): Promise<void> {
  const options = parseArgs();
  const app = new QClawApp(options);

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    await app.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  await app.run();
}

// Only auto-run if this module is the entry point
if (process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1])) {
  runApp().catch((err) => {
    console.error(chalk.red("Fatal error:"), err);
    process.exit(1);
  });
}
