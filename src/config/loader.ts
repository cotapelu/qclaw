import * as fs from "node:fs";
import * as path from "node:path";
import { homedir } from "node:os";
import { ConfigSchema, type Config } from "./schema.js";
import { validate } from "@sinclair/typebox/compiler";
import { DEFAULT_CONFIG } from "./defaults.js";

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    }
  }
  return output;
}

function isObject(item: any): item is Record<string, any> {
  return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Expand home directory in path
 */
function expandPath(p: string): string {
  if (p.startsWith("~")) {
    return path.join(homedir(), p.slice(1));
  }
  return p;
}

/**
 * Config loader with validation and merging
 */
export class ConfigLoader {
  private cwd: string;
  private configPath?: string;
  private loadedConfig: Config | null = null;
  private validator = validate(ConfigSchema);

  constructor(cwd: string, configPath?: string) {
    this.cwd = cwd;
    this.configPath = configPath;
  }

  /**
   * Load config from file (if exists) and merge with defaults
   */
  async load(): Promise<Config> {
    const fileConfig = await this.loadFromFile();
    const merged = deepMerge(DEFAULT_CONFIG, fileConfig);
    const errors = this.validator(merged);

    if (errors.length > 0) {
      const errorMessages = errors.map(e => `${e.path}: ${e.message}`).join("\n");
      throw new Error(`Invalid configuration:\n${errorMessages}`);
    }

    this.loadedConfig = merged;
    return merged;
  }

  /**
   * Get loaded config (must call load() first)
   */
  get(): Config {
    if (!this.loadedConfig) {
      throw new Error("Config not loaded. Call load() first.");
    }
    return this.loadedConfig;
  }

  /**
   * Load config from file
   */
  private async loadFromFile(): Promise<Partial<Config>> {
    const paths = [
      this.configPath,
      path.join(this.cwd, ".pi", "config.yaml"),
      path.join(this.cwd, ".pi", "config.json"),
      path.join(this.cwd, "qclaw.config.yaml"),
      path.join(this.cwd, "qclaw.config.json"),
    ].filter(Boolean) as string[];

    for (const p of paths) {
      const resolved = expandPath(p);
      if (fs.existsSync(resolved)) {
        try {
          const content = fs.readFileSync(resolved, "utf-8");
          if (p.endsWith(".yaml") || p.endsWith(".yml")) {
            // Dynamic import yaml
            const yaml = await import("yaml");
            return yaml.parse(content);
          } else {
            return JSON.parse(content);
          }
        } catch (error) {
          console.warn(`Failed to parse config file ${resolved}:`, error);
        }
      }
    }

    return {};
  }

  /**
   * Save config to file (optional)
   */
  async save(config: Config, path?: string): Promise<void> {
    const target = path || this.configPath || path.join(this.cwd, ".pi", "config.yaml");
    const resolved = expandPath(target);
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = JSON.stringify(config, null, 2);
    fs.writeFileSync(resolved, content, "utf-8");
  }
}

/**
 * Convenience function
 */
export async function loadConfig(cwd: string, configPath?: string): Promise<Config> {
  const loader = new ConfigLoader(cwd, configPath);
  return loader.load();
}
