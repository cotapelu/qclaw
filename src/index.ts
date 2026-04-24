#!/usr/bin/env node

/**
 * QClaw - Professional AI Coding Assistant
 *
 * Main entry point for the TUI application.
 * Integrates @mariozechner/pi-agent with @mariozechner/pi-tui-professional.
 */

import { TUI, ProcessTerminal, Container, Text, Editor, Key, matchesKey, CombinedAutocompleteProvider } from "@mariozechner/pi-tui";
import {
  ThemeManager,
  ChatContainer,
  FooterComponent,
} from "@mariozechner/pi-tui-professional";
import { createAgent, createEventBus, type Agent } from "@mariozechner/pi-agent";
import { ExtensionSelectorComponent } from "@mariozechner/pi-coding-agent";
import type { SlashCommand } from "@mariozechner/pi-tui";
import { Command } from "commander";
import chalk from "chalk";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync, watch as fsWatch } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

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

const SLASH_COMMANDS: SlashCommand[] = [
  { name: "help", description: "Show help information" },
  { name: "clear", description: "Clear chat history" },
  { name: "compact", description: "Compact session context" },
  { name: "exit", description: "Exit the application" },
];

class QClawApp {
  private tui: TUI;
  private theme: ThemeManager;
  private bus = createEventBus();
  private agent!: Agent;
  private chat: ChatContainer;
  private editor: any; // CustomEditor
  private footer: FooterComponent;
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

    // Build layout
    this.buildLayout();

    // Set up input handler
    (this.tui as any).onInput = (data: string) => this.handleInput(data);

    // Wire agent events
    this.wireAgentEvents();
  }

  private buildLayout(): void {
    // Chat container
    this.chat = new ChatContainer({
      themeManager: this.theme,
      maxMessages: 100,
      messageSpacing: 1,
    });
    this.tui.addChild(this.chat);

    // Editor at bottom
    const editorTheme = {
      borderColor: (text: string) => this.theme.fg("border", text),
      selectList: this.theme.getSelectListTheme(),
    };
    this.editor = new Editor(this.tui, editorTheme, {});
    this.tui.addChild(this.editor);

    // Setup autocomplete for slash commands and file paths
    try {
      this.editor.setAutocompleteProvider(
        new CombinedAutocompleteProvider(SLASH_COMMANDS, process.cwd(), null)
      );
    } catch (e) {
      if (this.cliOptions.debug) console.warn("Autocomplete setup failed:", e);
    }

    // Footer
    this.footer = new FooterComponent(this.theme, {
      cwd: process.cwd(),
      model: this.options.model || "default",
    });
    this.tui.addChild(this.footer);

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

      // Set footer model from current session model and stats
      const agentAny = this.agent as any;
      const model = agentAny.getCurrentModel?.();
      if (model) {
        this.footer.setModel(model.id);
        this.stats.model = model.id;
      }

      if (this.options.debug) {
        console.log(chalk.green("✓ Agent ready"));
      }
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(chalk.red("Failed to initialize agent:"), msg);
      logToFile("AGENT_INIT_ERROR", msg);
      this.reportTelemetry("init_error", { message: msg });
    }
  }

  private wireAgentEvents(): void {
    this.bus.on("message:user", () => {});
    this.bus.on("message:assistant", (event: any) => {
      const msg = new Container();
      const text = new Text(event.content, 1, 0);
      msg.addChild(text);
      this.chat.addMessage(msg);
      this.tui.requestRender();
    });
    this.bus.on("tokens:update", (usage: any) => {
      this.stats.totalTokens = usage.totalTokens || 0;
      this.stats.inputTokens = usage.inputTokens || 0;
      this.stats.outputTokens = usage.outputTokens || 0;
      this.stats.contextPercent = usage.contextPercent || 0;
      this.footer.setTokenUsage(usage.totalTokens);
      this.tui.requestRender();
    });
    this.bus.on("model:change", (event: any) => {
      this.stats.model = event.modelId;
      this.footer.setModel(event.modelId);
      this.tui.requestRender();
    });
    this.bus.on("thinking:start", () => {
      this.footer.addStatus("Thinking...");
      this.tui.requestRender();
    });
    this.bus.on("thinking:end", () => {
      this.footer.removeStatus("Thinking...");
      this.tui.requestRender();
    });
    this.bus.on("agent_error", (event: any) => {
      const msg = event.error || String(event);
      console.error(chalk.red("Agent error:"), msg);
      logToFile("AGENT_ERROR", msg);
      this.reportTelemetry("agent_error", { error: msg });
      this.footer.addStatus("Error");
      setTimeout(() => this.footer.removeStatus("Error"), 3000);
      this.tui.requestRender();
    });
    this.bus.on("agent_start", () => {
      this.footer.addStatus("Ready");
      this.tui.requestRender();
    });
    this.bus.on("agent_end", () => {
      this.footer.removeStatus("Ready");
      this.footer.removeStatus("Thinking...");
      this.footer.removeStatus("Error");
      this.tui.requestRender();
    });
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

  private async showModelSelector(): Promise<void> {
    if (!this.modelRegistry) {
      console.error(chalk.yellow("Model registry not available yet"));
      return;
    }

    try {
      // Get available models from registry
      const models = await this.modelRegistry.listModels();
      const items = models.map((m: any) => m.id);
      const currentModel = (this.agent as any).getCurrentModel?.()?.id;

      if (items.length === 0) {
        console.error(chalk.yellow("No models available"));
        return;
      }

      const selector = new ExtensionSelectorComponent(
        "Select Model",
        items,
        async (selection: string) => {
          const selected = models.find((m: any) => m.id === selection);
          if (selected) {
            try {
              // Set model on session directly
              (this.agent.session as any).model = selected;
              this.footer.setModel(selection);
              // Persist to config
              this.options.model = selection;
              saveConfig(this.options);
            } catch (e: any) {
              console.error(chalk.red("Failed to set model:"), e.message);
            }
          }
          handle.hide();
          this.tui.requestRender();
        },
        () => {
          handle.hide();
        },
        { tui: this.tui }
      );

      const handle = this.tui.showOverlay(selector, { width: 60, anchor: "center" });
      handle.focus();
      this.tui.requestRender();
    } catch (error: any) {
      console.error(chalk.red("Failed to list models:"), error.message);
    }
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
      // Update footer with new model
      const model = (this.agent as any).getCurrentModel?.();
      if (model) this.footer.setModel(model.id);
      this.footer.addStatus(`Switched to ${sessionFile}`);
      setTimeout(() => this.footer.removeStatus(`Switched to ${sessionFile}`), 2000);
      this.tui.requestRender();
    } catch (e: any) {
      console.error(chalk.red("Failed to switch session:"), e.message);
    }
  }

  private showSessionList(): void {
    const dir = this.options.sessionDir || "./.qclaw/sessions";
    try {
      const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith(".jsonl")) : [];
      const items = files.length ? files : ["(no sessions)"];
      const selector = new ExtensionSelectorComponent(
        "Sessions (Enter=fork)",
        items,
        async (selection) => {
          if (selection === "(no sessions)") {
            handle.hide();
            return;
          }
          await this.switchToSession(selection);
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

  private showStatisticsOverlay(): void {
    const lines = [
      `📊 Statistics`,
      ``,
      `Model: ${this.stats.model || "none"}`,
      `CWD: ${this.stats.cwd}`,
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

  private async handleInput(data: string): Promise<void> {
    // Check for function keys first
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
    if (matchesKey(data, "ctrl+s")) {
      this.showStatisticsOverlay();
      return;
    }

    // Enter to send
    if (data === "\r") {
      const input = this.editor.getValue().trim();
      this.editor.clear?.();

      if (!input) return;

      // Add user message
      const userMsg = new Container();
      const text = new Text("👤 " + input, 1, 0);
      userMsg.addChild(text);
      this.chat.addMessage(userMsg);
      this.tui.requestRender();

      try {
        await this.agent.sendMessage(input);
      } catch (error: any) {
        console.error(chalk.red("Send error:"), error.message);
        const errMsg = new Container();
        const errText = new Text(chalk.red("Error: " + error.message), 1, 0);
        errMsg.addChild(errText);
        this.chat.addMessage(errMsg);
        this.tui.requestRender();
      }
    }
  }

  async run(): Promise<void> {
    await this.initAgent();
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
