import { type Model, type ThinkingLevel } from "@mariozechner/pi-ai";
import {
  SessionManager,
  AuthStorage,
  ModelRegistry,
  DefaultResourceLoader,
  SettingsManager,
  getAgentDir,
  createAgentSession,
  type ToolDefinition,
  type AgentSession,
  type CompactionResult,
} from "@mariozechner/pi-coding-agent";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export interface AgentCoreOptions {
  cwd?: string;
  agentDir?: string;
  customTools?: ToolDefinition[];
  model?: Model<any>;
  thinkingLevel?: any;
  usePersistence?: boolean;
  interactive?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  configFile?: string;
}

export interface AgentStats {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  toolCalls: number;
  errors: number;
  turns: number;
  sessionDuration: number;
  estimatedCost: number;
}

// Simple settings validation
function validateSettings(settings: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  if (settings.compaction) {
    if (typeof settings.compaction.enabled !== 'boolean') errors.push('compaction.enabled must be boolean');
    if (settings.compaction.tokens !== undefined && typeof settings.compaction.tokens !== 'number') errors.push('compaction.tokens must be number');
  }
  if (settings.retry) {
    if (typeof settings.retry.enabled !== 'boolean') errors.push('retry.enabled must be boolean');
    if (settings.retry.maxRetries !== undefined && typeof settings.retry.maxRetries !== 'number') errors.push('retry.maxRetries must be number');
  }
  if (settings.model !== undefined && typeof settings.model !== 'string') errors.push('model must be string');
  if (settings.thinkingLevel) {
    const validLevels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
    if (!validLevels.includes(settings.thinkingLevel)) errors.push(`thinkingLevel must be one of: ${validLevels.join(', ')}`);
  }
  return { valid: errors.length === 0, errors };
}

export class AgentCore {
  private session: AgentSession | null = null;
  private runtime: any = null;
  private sessionManager: SessionManager;
  private authStorage: AuthStorage;
  private modelRegistry: ModelRegistry;
  private settingsManager: SettingsManager;
  private resourceLoader: DefaultResourceLoader;
  private model: Model<any> | undefined;
  private customTools: ToolDefinition[];
  private cwd: string;
  private agentDir: string;
  private interactive: boolean;
  private verbose: boolean;
  private quiet: boolean;
  private stats: AgentStats = {
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    toolCalls: 0,
    errors: 0,
    turns: 0,
    sessionDuration: 0,
    estimatedCost: 0,
  };
  private sessionStartTime: number = 0;
  private configFile?: string;
  private currentSettings: any = {};

  constructor(options: AgentCoreOptions = {}) {
    this.cwd = options.cwd ?? process.cwd();
    this.agentDir = options.agentDir ?? getAgentDir();
    this.customTools = options.customTools ?? [];
    this.model = options.model;
    this.interactive = options.interactive ?? false;
    this.verbose = options.verbose ?? false;
    this.quiet = options.quiet ?? false;
    this.configFile = options.configFile;
    this.sessionStartTime = Date.now();

    // 1. Auth storage (with persistence)
    const authPath = this.agentDir ? join(this.agentDir, "auth.json") : undefined;
    this.authStorage = AuthStorage.create(authPath);
    this.modelRegistry = ModelRegistry.create(this.authStorage);

    // 2. Settings - try to load from file if exists
    const settingsPath = this.agentDir ? join(this.agentDir, "settings.json") : undefined;
    if (settingsPath && existsSync(settingsPath)) {
      this.log(`Loading settings from ${settingsPath}`);
      this.settingsManager = SettingsManager.create(this.cwd, this.agentDir);
      // Load settings into cache
      this.currentSettings = this.loadSettingsFromFile(settingsPath);
    } else {
      this.settingsManager = SettingsManager.inMemory({
        compaction: { enabled: true },
        retry: { enabled: true, maxRetries: 2 },
      });
      this.currentSettings = {
        compaction: { enabled: true, tokens: 2000 },
        retry: { enabled: true, maxRetries: 2 },
        model: undefined,
        thinkingLevel: "off",
      };
    }

    // 3. Session manager
    if (options.usePersistence !== false) {
      this.sessionManager = SessionManager.create(this.cwd);
    } else {
      this.sessionManager = SessionManager.inMemory(this.cwd);
    }

    // 4. Resource loader with system prompt
    this.resourceLoader = new DefaultResourceLoader({
      cwd: this.cwd,
      agentDir: this.agentDir,
      settingsManager: this.settingsManager,
      systemPromptOverride: this.buildSystemPrompt.bind(this),
    });
  }

  private buildSystemPrompt(): string {
    const prompt = `You are Pi - an AI coding assistant.

You have access to:
- File system tools (read, bash, edit, write)
- Custom tools (hello_world, current_datetime, system_info, list_files)
- Extensions and skills loaded from the system

Guidelines:
- Be concise and helpful
- Use tools to gather information before answering
- Explain your reasoning when appropriate
- Verify changes before making them
- Respect existing code style and conventions

Session Management:
- /new: start fresh session
- /fork: branch from current point
- /resume: continue previous work

Always strive to be accurate and thorough.`;

    // Append skills if loaded
    const skills = this.resourceLoader.getSkills();
    if (skills.skills.length > 0) {
      const skillTexts = skills.skills.map(s => `- ${s.name}: ${s.description || ''}`).join('\n');
      return prompt + `\n\nLoaded Skills:\n${skillTexts}`;
    }

    return prompt;
  }

  async initialize(): Promise<void> {
    this.log("🔧 Initializing Agent Core...");

    // Load resources (extensions, skills, prompts)
    await this.resourceLoader.reload();
    this.logResources();

    // Select model
    if (!this.model) {
      const available = await this.modelRegistry.getAvailable();
      if (available.length === 0) {
        throw new Error("No models available. Please set up API keys in ~/.pi/agent/auth.json");
      }
      this.model = available[0];
      this.log(`   📊 Model: ${this.model.provider}/${this.model.id}`);
    }

    // Create session
    await this.createSession();
  }

  private logResources(): void {
    const extensions = this.resourceLoader.getExtensions();
    const skills = this.resourceLoader.getSkills();
    const prompts = this.resourceLoader.getPrompts();

    this.log(`   📦 Resources loaded:`);
    this.log(`      - ${extensions.extensions.length} extensions`);
    this.log(`      - ${skills.skills.length} skills`);
    this.log(`      - ${prompts.prompts.length} slash commands`);
  }

  private async createSession(): Promise<void> {
    const { session } = await createAgentSession({
      cwd: this.cwd,
      agentDir: this.agentDir,
      model: this.model,
      customTools: this.customTools,
      sessionManager: this.sessionManager,
      authStorage: this.authStorage,
      modelRegistry: this.modelRegistry,
      settingsManager: this.settingsManager,
      resourceLoader: this.resourceLoader,
    });

    this.session = session;
    this.sessionStartTime = Date.now();

    // Subscribe to events for stats tracking
    session.subscribe((event: any) => {
      this.handleEvent(event);
    });

    this.log("   ✅ Session created");
  }

  private handleEvent(event: any): void {
    switch (event.type) {
      case 'message_update':
        if (event.assistantMessageEvent.type === 'text_delta') {
          // Already handled by CLI
        } else if (event.assistantMessageEvent.type === 'usage') {
          const usage = event.assistantMessageEvent.usage;
          this.stats.totalTokens += usage.totalTokens;
          this.stats.promptTokens += usage.promptTokens;
          this.stats.completionTokens += usage.completionTokens;
          // Estimate cost (very rough)
          this.stats.estimatedCost = this.estimateCost(this.stats.totalTokens, this.model);
        }
        break;
      case 'turn_end':
        this.stats.turns++;
        break;
      case 'tool_execution_start':
        this.stats.toolCalls++;
        break;
      case 'error':
        this.stats.errors++;
        break;
    }
  }

  private estimateCost(tokens: number, model?: Model<any>): number {
    // Rough cost estimates in USD per 1M tokens
    const costs: Record<string, number> = {
      'claude-opus-4-5': 15,
      'claude-sonnet-4-5': 3,
      'claude-haiku-4-5': 0.25,
      'gpt-4': 30,
      'gpt-4-turbo': 10,
      'gpt-3.5-turbo': 0.5,
      'gemini-1.5-pro': 7,
      'gemini-1.5-flash': 0.35,
    };

    if (!model) return 0;
    const key = `${model.provider}/${model.id}`;
    const rate = costs[key] || 1; // default $1/1M tokens
    return (tokens / 1_000_000) * rate;
  }

  getStats(): AgentStats {
    const duration = (Date.now() - this.sessionStartTime) / 1000;
    return {
      ...this.stats,
      sessionDuration: duration,
    };
  }

  getSession(): AgentSession | null {
    return this.session;
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  getResourceLoader(): DefaultResourceLoader {
    return this.resourceLoader;
  }

  getModel(): Model<any> | undefined {
    return this.model;
  }

  getSettingsManager(): SettingsManager {
    return this.settingsManager;
  }

  getAuthStorage(): AuthStorage {
    return this.authStorage;
  }

  /** Load settings from file (internal) */
  private loadSettingsFromFile(settingsPath: string): any {
    try {
      const content = readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      const validation = validateSettings(settings);
      if (!validation.valid) {
        const errors = validation.errors?.join('; ') || 'Unknown error';
        this.log(`⚠️ Settings validation failed: ${errors}`);
        this.log(`⚠️ Using default settings instead`);
        return this.getDefaultSettings();
      }
      return settings;
    } catch (error) {
      this.log(`⚠️ Failed to load settings from ${settingsPath}: ${error}`);
      return this.getDefaultSettings();
    }
  }

  /** Get default settings */
  private getDefaultSettings(): any {
    return {
      compaction: { enabled: true, tokens: 2000 },
      retry: { enabled: true, maxRetries: 2 },
      model: undefined,
      thinkingLevel: "off",
    };
  }

  /** Save current settings to file */
  saveSettings(): void {
    if (!this.agentDir) {
      throw new Error("Cannot save settings: agentDir not set");
    }
    const settingsPath = join(this.agentDir, "settings.json");
    try {
      if (!existsSync(this.agentDir)) {
        mkdirSync(this.agentDir, { recursive: true });
      }
      writeFileSync(settingsPath, JSON.stringify(this.currentSettings, null, 2));
      this.log(`💾 Settings saved to ${settingsPath}`);
    } catch (error) {
      this.log(`❌ Failed to save settings to ${settingsPath}: ${error}`);
      throw error;
    }
  }

  /** Get current settings */
  getSettings(): any {
    return { ...this.currentSettings };
  }

  /** Update a setting and persist to file */
  updateSetting(key: string, value: any): void {
    // Support nested keys like "compaction.enabled"
    const keys = key.split('.');
    if (keys.length === 1) {
      this.currentSettings[key] = value;
    } else {
      let current: any = this.currentSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
    }
    // Validate before saving
    const validation = validateSettings(this.currentSettings);
    if (!validation.valid) {
      const errors = validation.errors?.join('; ') || 'Unknown error';
      throw new Error(`Invalid settings after update: ${errors}`);
    }
    this.saveSettings();
    this.log(`⚙️ Updated setting: ${key} = ${JSON.stringify(value)}`);
  }

  /** Reset settings to defaults */
  resetSettings(): void {
    this.currentSettings = this.getDefaultSettings();
    this.saveSettings();
    this.log("🔄 Settings reset to defaults");
  }

  getModelRegistry(): ModelRegistry {
    return this.modelRegistry;
  }

  async cycleModel(): Promise<boolean> {
    const available = await this.modelRegistry.getAvailable();
    if (available.length <= 1) return false;

    const current = this.model;
    const idx = available.findIndex(m => m.id === current?.id && m.provider === current?.provider);
    const next = available[(idx + 1) % available.length];

    this.model = next;
    // Recreate session with new model
    await this.recreateSession();
    this.log(`🔄 Switched to model: ${next.provider}/${next.id}`);
    return true;
  }

  async setThinkingLevel(level: ThinkingLevel): Promise<void> {
    if (this.session) {
      await this.session.setThinkingLevel(level);
      this.log(`🧠 Thinking level: ${level}`);
    }
  }

  async setModel(model: Model<any>): Promise<void> {
    this.model = model;
    await this.recreateSession();
  }

  private async recreateSession(): Promise<void> {
    const currentMessages = this.session ? this.session.agent.state.messages : [];
    this.session?.dispose();

    const { session } = await createAgentSession({
      cwd: this.cwd,
      agentDir: this.agentDir,
      model: this.model,
      customTools: this.customTools,
      sessionManager: this.sessionManager,
      authStorage: this.authStorage,
      modelRegistry: this.modelRegistry,
      settingsManager: this.settingsManager,
      resourceLoader: this.resourceLoader,
      // Don't pass messages - session persistence handles it
    });

    this.session = session;
    this.session.subscribe((event: any) => this.handleEvent(event));
    this.log("   ✅ Session recreated with new model");
  }

  async compact(summary?: string): Promise<void> {
    if (this.session) {
      const result: any = await this.session.compact(summary);
      if (result) {
        this.log(`🗜️ Compacted: ${result.removedEntries} entries removed`);
      } else {
        this.log(`🗜️ Compaction: no result`);
      }
    }
  }

  async abort(): Promise<void> {
    if (this.session) {
      await this.session.abort();
      this.log("⏹️ Aborted");
    }
  }

  /** Export current session to JSONL file */
  async exportSession(filePath?: string): Promise<string> {
    const entries = this.sessionManager.getEntries();
    const jsonl = entries.map(e => JSON.stringify(e)).join('\n');
    const path = filePath || join(this.cwd, `session-export-${Date.now()}.jsonl`);
    writeFileSync(path, jsonl);
    this.log(`📤 Exported session to: ${path}`);
    return path;
  }

  /** Import session from JSONL file (replaces current session) */
  async importSession(filePath: string): Promise<void> {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const entries = lines.map(l => JSON.parse(l));
    // Validate header
    const header = entries.find((e: any) => e.type === 'session');
    if (!header) {
      throw new Error('Invalid session file: missing session header');
    }
    // Write to a new file in session directory
    const sessionDir = this.sessionManager.getSessionDir();
    const importFile = join(sessionDir, `import-${Date.now()}.jsonl`);
    writeFileSync(importFile, entries.map(e => JSON.stringify(e)).join('\n'));
    // Switch to imported session
    this.sessionManager.setSessionFile(importFile);
    this.log(`📥 Imported session from: ${filePath} (${entries.length} entries)`);
  }

  async reloadResources(): Promise<void> {
    await this.resourceLoader.reload();
    const exts = this.resourceLoader.getExtensions();
    const skills = this.resourceLoader.getSkills();
    const prompts = this.resourceLoader.getPrompts();
    this.log(`✅ Reloaded: ${exts.extensions.length} extensions, ${skills.skills.length} skills, ${prompts.prompts.length} commands`);
  }

  getConfig() {
    return {
      cwd: this.cwd,
      agentDir: this.agentDir,
      model: this.model,
      interactive: this.interactive,
      verbose: this.verbose,
      persisted: this.sessionManager.isPersisted(),
      stats: this.getStats(),
    };
  }

  subscribe(callback: (event: any) => void): () => void {
    if (!this.session) {
      throw new Error("Agent not initialized");
    }
    return this.session.subscribe(callback);
  }

  async prompt(text: string): Promise<void> {
    if (!this.session) {
      throw new Error("Agent not initialized");
    }
    await this.session.prompt(text);
  }

  log(...args: any[]): void {
    if (this.verbose && !this.quiet) {
      console.log('[AGENT]', ...args);
    }
  }

  dispose(): void {
    if (this.session) {
      this.session.dispose();
      this.session = null;
    }
    this.log("🛑 Agent disposed");
  }
}
