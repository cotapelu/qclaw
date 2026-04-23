import { getGlobalEventBus } from "./event-bus.js";

/**
 * Configuration interface for TUI components
 */
export interface TUIConfig {
  theme: string;
  locale: string;
  showLineNumbers: boolean;
  tabSize: number;
  autoSave: boolean;
  maxHistory: number;
}

const DEFAULT_CONFIG: TUIConfig = {
  theme: 'dark',
  locale: 'en',
  showLineNumbers: false,
  tabSize: 2,
  autoSave: true,
  maxHistory: 1000,
};

/**
 * Configuration manager with change notifications
 */
export class ConfigManager {
  private config: TUIConfig;
  private eventBus: ReturnType<typeof getGlobalEventBus>;
  private validators: Map<keyof TUIConfig, (value: any) => boolean> = new Map();

  constructor(initialConfig: Partial<TUIConfig> = {}, eventBus?: ReturnType<typeof getGlobalEventBus>) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
    this.eventBus = eventBus || getGlobalEventBus();
    this.setupDefaultValidators();
  }

  private setupDefaultValidators(): void {
    this.validators.set('theme', (v) => ['dark', 'light'].includes(v));
    this.validators.set('locale', (v) => /^[a-z]{2}(-[A-Z]{2})?$/.test(v));
    this.validators.set('showLineNumbers', (v) => typeof v === 'boolean');
    this.validators.set('tabSize', (v) => Number.isInteger(v) && v > 0 && v <= 8);
    this.validators.set('autoSave', (v) => typeof v === 'boolean');
    this.validators.set('maxHistory', (v) => Number.isInteger(v) && v > 0);
  }

  /**
   * Get a config value
   */
  get<K extends keyof TUIConfig>(key: K): TUIConfig[K] {
    return this.config[key];
  }

  /**
   * Get all config as frozen object
   */
  getAll(): Readonly<TUIConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Set a config value with validation
   */
  set<K extends keyof TUIConfig>(key: K, value: TUIConfig[K]): boolean {
    const validator = this.validators.get(key);
    if (validator && !validator(value)) {
      console.warn(`Invalid value for config "${key}":`, value);
      return false;
    }

    const oldValue = this.config[key];
    if (oldValue === value) return false;

    this.config[key] = value;
    this.eventBus.emitSimple('config.change', { key, oldValue, newValue: value });
    return true;
  }

  /**
   * Set multiple config values at once
   */
  setMultiple(updates: Partial<TUIConfig>): void {
    let changed = false;
    for (const [key, value] of Object.entries(updates)) {
      if (this.set(key as keyof TUIConfig, value)) {
        changed = true;
      }
    }
    if (changed) {
      this.eventBus.emitSimple('config.update', this.getAll());
    }
  }

  /**
   * Add a custom validator
   */
  addValidator<K extends keyof TUIConfig>(key: K, validator: (value: any) => boolean): void {
    this.validators.set(key, validator);
  }

  /**
   * Listen for config changes
   */
  onChange(handler: (key: keyof TUIConfig, oldValue: any, newValue: any) => void): () => void {
    return this.eventBus.on('config.change', (event) => {
      if (event.payload) {
        handler(event.payload.key, event.payload.oldValue, event.payload.newValue);
      }
    });
  }

  /**
   * Subscribe to all config updates
   */
  onUpdate(handler: (config: Readonly<TUIConfig>) => void): () => void {
    return this.eventBus.on('config.update', (event) => {
      if (event.payload) {
        handler(event.payload);
      }
    });
  }
}

// Global singleton config instance
let globalConfig: ConfigManager | null = null;

export function getGlobalConfig(): ConfigManager {
  if (!globalConfig) {
    globalConfig = new ConfigManager({});
  }
  return globalConfig;
}

export function initializeGlobalConfig(initialConfig: Partial<TUIConfig>): ConfigManager {
  globalConfig = new ConfigManager(initialConfig);
  return globalConfig;
}

export function resetGlobalConfig(): void {
  globalConfig = null;
}
