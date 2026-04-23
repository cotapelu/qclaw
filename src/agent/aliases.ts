import * as fs from "node:fs";
import * as path from "node:path";
import { homedir } from "node:os";

/**
 * Alias manager for slash command aliases.
 * Persists aliases in ~/.pi/agent/aliases.json.
 */
export class AliasManager {
  private aliases: Map<string, string> = new Map();
  private aliasesFile: string;

  constructor(agentDir: string) {
    const expanded = this.expandPath(agentDir);
    this.aliasesFile = path.join(expanded, "aliases.json");
    this.loadAliases();
  }

  private expandPath(p: string): string {
    if (p.startsWith("~")) {
      return path.join(homedir(), p.slice(1));
    }
    return p;
  }

  private loadAliases(): void {
    try {
      if (fs.existsSync(this.aliasesFile)) {
        const content = fs.readFileSync(this.aliasesFile, "utf-8");
        const aliases = JSON.parse(content);
        for (const [key, value] of Object.entries(aliases)) {
          if (typeof value === "string") {
            this.aliases.set(key, value);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load aliases:", error);
    }
  }

  private saveAliases(): void {
    try {
      const dir = path.dirname(this.aliasesFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const aliasesObj = Object.fromEntries(this.aliases);
      fs.writeFileSync(this.aliasesFile, JSON.stringify(aliasesObj, null, 2), "utf-8");
    } catch (error) {
      console.error("Failed to save aliases:", error);
    }
  }

  /**
   * Get alias expansion for a command name
   */
  get(name: string): string | undefined {
    return this.aliases.get(name);
  }

  /**
   * Set an alias
   */
  set(name: string, command: string): void {
    this.aliases.set(name, command);
    this.saveAliases();
  }

  /**
   * Delete an alias
   */
  delete(name: string): boolean {
    const result = this.aliases.delete(name);
    if (result) this.saveAliases();
    return result;
  }

  /**
   * List all alias names
   */
  list(): string[] {
    return Array.from(this.aliases.keys());
  }

  /**
   * Get all aliases as map
   */
  getAll(): Map<string, string> {
    return new Map(this.aliases);
  }

  /**
   * Clear all aliases (for testing)
   */
  clear(): void {
    this.aliases.clear();
    this.saveAliases();
  }
}
