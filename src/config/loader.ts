import * as fs from "node:fs";
import * as path from "node:path";
import { homedir } from "node:os";
import { DEFAULT_CONFIG } from "./defaults.js";

function isObject(item: any): item is Record<string, any> {
  return item && typeof item === "object" && !Array.isArray(item);
}

function deepMerge(target: any, source: any): any {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] });
        else output[key] = deepMerge(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    }
  }
  return output;
}

function expandPath(p: string): string {
  if (p.startsWith("~")) return path.join(homedir(), p.slice(1));
  return p;
}

export class ConfigLoader {
  private cwd: string;
  private configPath?: string;
  private loadedConfig: any = null;

  constructor(cwd: string, configPath?: string) {
    this.cwd = cwd;
    this.configPath = configPath;
  }

  async load(): Promise<any> {
    const fileConfig = await this.loadFromFile();
    const merged = deepMerge(DEFAULT_CONFIG, fileConfig);
    this.loadedConfig = merged;
    return merged;
  }

  get(): any {
    if (!this.loadedConfig) throw new Error("Config not loaded");
    return this.loadedConfig;
  }

  private async loadFromFile(): Promise<any> {
    const paths = [
      this.configPath,
      path.join(this.cwd, ".pi", "config.yaml"),
      path.join(this.cwd, ".pi", "config.json"),
      path.join(this.cwd, "qclaw.config.yaml"),
      path.join(this.cwd, "qclaw.config.json"),
    ].filter(Boolean);

    for (const p of paths) {
      const resolved = expandPath(p);
      if (fs.existsSync(resolved)) {
        try {
          const content = fs.readFileSync(resolved, "utf-8");
          if (p.endsWith(".yaml") || p.endsWith(".yml")) {
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

  async save(config: any, path?: string): Promise<void> {
    const target = path || this.configPath || path.join(this.cwd, ".pi", "config.yaml");
    const resolved = expandPath(target);
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(resolved, JSON.stringify(config, null, 2), "utf-8");
  }
}

export async function loadConfig(cwd: string, configPath?: string): Promise<any> {
  const loader = new ConfigLoader(cwd, configPath);
  return loader.load();
}
