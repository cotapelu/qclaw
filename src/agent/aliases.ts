import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface Aliases {
  [key: string]: string[];
}

const DEFAULT_ALIASES: Aliases = {
  // Quick commands
  'h': ['help'],
  's': ['stats'],
  'c': ['clear'],
  'p': ['perf'],
  'co': ['cost'],
  't': ['tokens'],
  'n': ['new'],
  'r': ['resume'],
  'f': ['fork'],
  'ses': ['sessions'],
  'sesh': ['sessions'],
  // Template shortcuts
  'tfast': ['template use fast'],
  'tthorough': ['template use thorough'],
  'tdebug': ['template use debugger'],
  'treview': ['template use reviewer'],
  'tarch': ['template use architect'],
};

/**
 * Manages command aliases with persistence to ~/.pi/agent/aliases.json
 */
export class AliasManager {
  private aliases: Aliases;
  private aliasPath: string;

  constructor(agentDir?: string) {
    this.aliasPath = agentDir
      ? join(agentDir, 'aliases.json')
      : join(homedir(), '.pi', 'agent', 'aliases.json');

    this.aliases = this.load();
  }

  private load(): Aliases {
    try {
      if (existsSync(this.aliasPath)) {
        const content = readFileSync(this.aliasPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      // ignore and use defaults
    }
    return { ...DEFAULT_ALIASES };
  }

  save(): void {
    try {
      const dir = this.aliasPath.substring(0, this.aliasPath.lastIndexOf('/'));
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.aliasPath, JSON.stringify(this.aliases, null, 2));
    } catch (error) {
      // Silently fail - aliases are non-critical
    }
  }

  get(alias: string): string[] | undefined {
    return this.aliases[alias];
  }

  set(alias: string, command: string[]): void {
    this.aliases[alias] = command;
    this.save();
  }

  delete(alias: string): boolean {
    if (this.aliases[alias]) {
      delete this.aliases[alias];
      this.save();
      return true;
    }
    return false;
  }

  list(): Aliases {
    return { ...this.aliases };
  }

  reset(): void {
    this.aliases = { ...DEFAULT_ALIASES };
    this.save();
  }
}
