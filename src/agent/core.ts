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
import { readFileSync, existsSync, writeFileSync, mkdirSync, watch, createWriteStream, WriteStream } from "fs";
import { homedir } from "os";
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
  toolExecutionTime: number; // Total time spent in tools (ms)
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

class FileLogger {
  private dir: string;
  private level: string;
  private rotation: 'daily' | 'hourly' | 'none';
  private format: 'text' | 'json';
  private stream: WriteStream | null = null;
  private currentDate: string = '';

  constructor(settings: any) {
    const defaults = {
      dir: join(homedir(), '.pi', 'agent', 'logs'),
      level: 'info',
      rotation: 'daily' as const,
      format: 'text' as const
    };
    this.dir = settings.dir ?? defaults.dir;
    this.level = (settings.level as string) ?? defaults.level;
    this.rotation = (settings.rotation as 'daily' | 'hourly' | 'none') ?? defaults.rotation;
    this.format = (settings.format as 'text' | 'json') ?? defaults.format;
  }

  async init(): Promise<void> {
    this.ensureDir(this.dir);
    this.rotate();
  }

  private ensureDir(dir: string): void {
    try {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Failed to create directory ${dir}: ${error}`);
    }
  }

  private rotate(): void {
    if (this.stream) {
      this.stream.end();
    }
    const now = new Date();
    let date = now.toISOString().split('T')[0];
    if (this.rotation === 'hourly') {
      date += '-' + String(now.getHours()).padStart(2, '0');
    }
    if (date === this.currentDate) return;
    this.currentDate = date;
    const filename = join(this.dir, `agent-${date}.log`);
    this.stream = createWriteStream(filename, { flags: 'a' });
  }

  private rotateIfNeeded(): void {
    if (this.rotation === 'daily' || this.rotation === 'hourly') {
      const now = new Date();
      let date = now.toISOString().split('T')[0];
      if (this.rotation === 'hourly') {
        date += '-' + String(now.getHours()).padStart(2, '0');
      }
      if (date !== this.currentDate) {
        this.rotate();
      }
    }
  }

  log(level: string, message: string): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) < levels.indexOf(this.level)) {
      return;
    }
    this.rotateIfNeeded();
    const timestamp = new Date().toISOString();
    const line = this.format === 'json'
      ? JSON.stringify({ timestamp, level, message })
      : `${timestamp} [${level.toUpperCase()}] ${message}\n`;
    if (this.stream) {
      this.stream.write(line);
    }
  }

  close(): void {
    if (this.stream) {
      this.stream.end();
    }
  }
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
    toolExecutionTime: 0,
    errors: 0,
    turns: 0,
    sessionDuration: 0,
    estimatedCost: 0,
  };
  private toolExecutionStart: number | null = null;
  private maxRetries: number;
  private sessionStartTime: number = 0;
  private configFile?: string;
  private currentSettings: any = {};
  private settingsWatcher?: any;
  private settingsReloadTimer?: any;
  private logger: FileLogger | null = null;
  private resourceWatchers: Array<{ dir: string; watcher: any }> = [];
  private resourceReloadTimer?: any;

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
    this.maxRetries = this.currentSettings.retry?.maxRetries ?? 2;

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
      this.currentSettings = this.getDefaultSettings();
    }
    // Merge project-specific settings from .pi/settings.json if present
    const projectSettingsPath = join(this.cwd, '.pi', 'settings.json');
    if (existsSync(projectSettingsPath)) {
      try {
        const proj = JSON.parse(readFileSync(projectSettingsPath, 'utf-8'));
        this.currentSettings = { ...this.currentSettings, ...proj };
        this.log(`Loaded project-specific settings from ${projectSettingsPath}`);
      } catch (error) {
        this.log(`⚠️ Failed to load project settings: ${error}`);
      }
    }
    // Start watching settings file for hot-reload
    this.startSettingsWatcher();

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

    // 5. Initialize file logger
    this.logger = null;
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

    // Initialize file logging
    try {
      this.logger = new FileLogger(this.currentSettings.logging || {});
      await this.logger.init();
      this.log(`📝 File logging enabled: ${this.logger['dir']}`);
    } catch (e) {
      this.log(`⚠️ File logging disabled: ${e}`);
      this.logger = null;
    }

    // Load resources (extensions, skills, prompts)
    await this.resourceLoader.reload();
    this.logResources();

    // Start watching for resource changes (hot-reload)
    this.startResourceWatchers();

    // Select model
    if (!this.model) {
      const available = await this.modelRegistry.getAvailable();
      if (available.length === 0) {
        throw new Error("No models available. Please set up API keys in ~/.pi/agent/auth.json");
      }
      // Check for preferred model from settings
      const preferred = this.currentSettings.model;
      if (preferred) {
        const found = available.find(m => `${m.provider}/${m.id}` === preferred);
        if (found) {
          this.model = found;
          this.log(`   📊 Using preferred model from settings: ${preferred}`);
        } else {
          this.model = available[0];
          this.log(`   📊 Preferred model not found, using: ${available[0].provider}/${available[0].id}`);
        }
      } else {
        this.model = available[0];
        this.log(`   📊 Model: ${this.model.provider}/${this.model.id}`);
      }
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
        this.toolExecutionStart = Date.now();
        // Check permissions
        const toolName = event.tool?.name || (event.toolCall && event.toolCall.tool);
        if (toolName) {
          this.checkToolPermission(toolName, event.toolCall?.parameters);
        }
        break;
      case 'tool_execution_end':
        if (this.toolExecutionStart) {
          const duration = Date.now() - this.toolExecutionStart;
          this.stats.toolExecutionTime += duration;
          this.toolExecutionStart = null;
        }
        // Audit logging
        this.logToolExecution(event);
        break;
      case 'error':
        this.stats.errors++;
        break;
    }
  }

  /** Check if a tool is allowed to execute */
  private checkToolPermission(toolName: string, params: any = null): void {
    const perms = this.currentSettings.toolPermissions || {};
    const allowed = perms.allowedTools as string[] | undefined;
    const denied = perms.deniedTools as string[] | undefined;

    // If allowed list is non-empty, tool must be in it
    if (allowed && allowed.length > 0 && !allowed.includes(toolName)) {
      throw new Error(`Tool '${toolName}' is not in allowed list: ${allowed.join(', ')}`);
    }
    // If denied list contains tool, block it
    if (denied && denied.includes(toolName)) {
      throw new Error(`Tool '${toolName}' is denied by policy`);
    }
    // Path restrictions for file tools
    if (params?.path && perms.allowedPaths && perms.allowedPaths.length > 0) {
      const path = require('path').resolve(params.path);
      const allowed = perms.allowedPaths.some((allowedPath: string) =>
        path.startsWith(require('path').resolve(allowedPath))
      );
      if (!allowed) {
        throw new Error(`Path '${params.path}' is not in allowed paths: ${perms.allowedPaths.join(', ')}`);
      }
    }
    // Confirmation for destructive tools
    if (perms.confirmDestructive && (toolName === 'write' || toolName === 'bash')) {
      // In a real TUI, we'd prompt user. For now, just warn in verbose mode
      if (this.verbose) {
        this.log(`⚠️ Destructive tool '${toolName}' executed (params: ${JSON.stringify(params)})`);
      }
    }
  }

  /** Audit log for tool execution */
  private logToolExecution(event: any): void {
    const toolName = event.tool?.name || (event.toolCall && event.toolCall.tool);
    const duration = this.toolExecutionStart ? (Date.now() - this.toolExecutionStart) : 0;
    this.log(`🔧 Tool: ${toolName}, duration: ${duration}ms`);
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
      toolPermissions: {
        allowedTools: [], // empty = allow all
        deniedTools: ['write', 'bash'], // dangerous tools by default
        confirmDestructive: true,
        allowedPaths: [], // empty = allow all
      },
      logging: {
        dir: join(homedir(), '.pi', 'agent', 'logs'),
        level: 'info', // debug, info, warn, error
        rotation: 'daily', // daily, hourly, none
        format: 'text', // text, json
      },
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
    // Save preference to settings
    this.updateSetting('model', `${next.provider}/${next.id}`);
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
    // Save preference to settings
    this.updateSetting('model', `${model.provider}/${model.id}`);
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

  getAgentDir(): string {
    return this.agentDir;
  }

  /** Watch extension/skill/prompt directories for hot-reloading */
  private startResourceWatchers(): void {
    const watchDirs = [
      join(this.agentDir, 'extensions'),
      join(this.agentDir, 'skills'),
      join(this.agentDir, 'prompts'),
      join(this.cwd, '.pi', 'extensions'),
      join(this.cwd, '.pi', 'skills'),
      join(this.cwd, '.pi', 'prompts')
    ];

    watchDirs.forEach(dir => {
      try {
        if (existsSync(dir)) {
          const watcher = watch(dir, { persistent: true, recursive: true }, (event: string, filename: string | null) => {
            if (filename) {
              clearTimeout(this.resourceReloadTimer);
              this.resourceReloadTimer = setTimeout(() => {
                this.log(`📦 Resource change detected in ${dir}: ${filename}. Reloading...`);
                this.reloadResources().catch((err: any) => {
                  this.log(`❌ Resource reload failed: ${err.message}`);
                });
              }, 500);
            }
          });
          this.resourceWatchers.push({ dir, watcher });
          this.log(`👀 Watching resources in ${dir}`);
        }
      } catch (error) {
        // Ignore watch errors (e.g., permission denied)
      }
    });
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
    let lastError: any;
    const maxAttempts = Math.min(this.maxRetries + 1, 3); // retries + fallback, max 3 total
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Inner retry loop for transient errors with exponential backoff
      for (let retry = 0; retry < this.maxRetries; retry++) {
        try {
          await this.session.prompt(text);
          return; // Success
        } catch (error: any) {
          lastError = error;
          const isRetryable = this.isRetryableError(error);
          if (!isRetryable || retry >= this.maxRetries - 1) {
            // Not retryable or out of retries, break to fallback/throw
            break;
          }
          // Exponential backoff before retry
          const delay = 1000 * Math.pow(2, retry); // 1s, 2s, 4s
          this.log(`⏳ Retrying after error (${retry + 1}/${this.maxRetries}) in ${delay}ms: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      // After retries exhausted, check if we should try another model
      if (attempt < maxAttempts - 1 && this.shouldFallbackOnError(lastError)) {
        const available = await this.modelRegistry.getAvailable();
        if (available.length > 1) {
          const current = this.model;
          const idx = available.findIndex(m => m.id === current?.id && m.provider === current?.provider);
          const next = available[(idx + 1) % available.length];
          if (next.id !== current?.id) {
            this.log(`🔀 Falling back to model ${next.provider}/${next.id} after error: ${lastError.message}`);
            await this.setModel(next); // This saves to settings and recreates session
            continue; // Try again with new model (with its own retries)
          }
        }
      }
      // No more fallbacks or not a fallbackable error
      throw lastError;
    }
    throw lastError;
  }

  /** Determine if an error should trigger model fallback */
  private shouldFallbackOnError(error: any): boolean {
    const msg = error.message?.toLowerCase() || '';
    // Common model-related error indicators
    const fallbackKeywords = [
      'rate limit', 'quota', 'overloaded', 'capacity', 'unavailable',
      'auth', 'invalid api key', 'permission', 'access', 'billing',
      'too many requests', '429', 'service unavailable'
    ];
    return fallbackKeywords.some(keyword => msg.includes(keyword));
  }

  /** Determine if an error is retryable (transient) */
  private isRetryableError(error: any): boolean {
    const msg = error.message?.toLowerCase() || '';
    const retryableKeywords = [
      'rate limit', 'too many requests', '429', 'timeout', 'network', 'eof',
      'connection', 'reset', 'overflow', 'overloaded', 'capacity', 'unavailable',
      'service unavailable', 'internal server error', '502', '503', '504'
    ];
    return retryableKeywords.some(keyword => msg.includes(keyword));
  }

  log(...args: any[]): void {
    if (this.verbose && !this.quiet) {
      console.log('[AGENT]', ...args);
    }
    // Also log to file if logger is available
    if (this.logger) {
      try {
        const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
        this.logger.log('info', msg);
      } catch (e) {
        // ignore file write errors
      }
    }
  }

  /** Start watching settings file for changes */
  private startSettingsWatcher(): void {
    if (!this.agentDir) return;
    const settingsPath = join(this.agentDir, "settings.json");
    if (!existsSync(settingsPath)) return;

    this.log(`👀 Watching settings file: ${settingsPath}`);
    this.settingsWatcher = watch(settingsPath, { persistent: true }, (eventType, filename) => {
      if (eventType === 'change') {
        clearTimeout(this.settingsReloadTimer);
        this.settingsReloadTimer = setTimeout(() => {
          this.reloadSettingsFromFile();
        }, 500); // debounce
      }
    });
  }

  /** Reload settings from file (hot-reload) */
  private reloadSettingsFromFile(): void {
    if (!this.agentDir) return;
    const settingsPath = join(this.agentDir, "settings.json");
    try {
      const newSettings = this.loadSettingsFromFile(settingsPath);
      this.currentSettings = newSettings;
      this.log(`✅ Settings reloaded from file (hot-reload)`);
    } catch (error: any) {
      this.log(`❌ Error reloading settings: ${error.message}`);
    }
  }

  dispose(): void {
    if (this.session) {
      this.session.dispose();
      this.session = null;
    }
    if (this.settingsWatcher) {
      this.settingsWatcher.close();
    }
    if (this.settingsReloadTimer) {
      clearTimeout(this.settingsReloadTimer);
    }
    // Close resource watchers
    this.resourceWatchers.forEach(w => w.watcher.close());
    if (this.resourceReloadTimer) {
      clearTimeout(this.resourceReloadTimer);
    }
    if (this.logger) {
      this.logger.close();
    }
    this.log("🛑 Agent disposed");
  }
}
