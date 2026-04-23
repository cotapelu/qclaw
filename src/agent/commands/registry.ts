import type { ExtensionCommand } from "@mariozechner/pi-coding-agent";

export interface SlashCommand {
  name: string;
  description: string;
  execute: (ctx: CommandContext, ...args: string[]) => Promise<string | void>;
}

export interface CommandContext {
  agent: any;
  sessionManager: any;
  resourceLoader: any;
  settingsManager: any;
  tui?: any;
}

// Global singleton slash command registry
export const globalCommandRegistry = {
  private commands: Map<string, SlashCommand> = new Map(),

  register(command: SlashCommand): void {
    if (this.commands.has(command.name)) {
      console.warn(`Command "/${command.name}" is already registered, overwriting`);
    }
    this.commands.set(command.name, command);
  },

  unregister(name: string): boolean {
    return this.commands.delete(name);
  },

  get(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  },

  async execute(name: string, context: CommandContext, ...args: string[]): Promise<string | undefined> {
    const cmd = this.commands.get(name);
    if (!cmd) return undefined;
    try {
      return await cmd.execute(context, ...args);
    } catch (error) {
      console.error(`Error executing command /${name}:`, error);
      throw error;
    }
  },

  getNames(): string[] {
    return Array.from(this.commands.keys()).sort();
  },

  getAll(): SlashCommand[] {
    return Array.from(this.commands.values()).sort((a, b) => a.name.localeCompare(b.name));
  },

  clear(): void {
    this.commands.clear();
  },

  get count(): number {
    return this.commands.size;
  }
} as const;
