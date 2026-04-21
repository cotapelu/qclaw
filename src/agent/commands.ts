import { type ThinkingLevel } from "@mariozechner/pi-ai";
import { SessionManager, DefaultResourceLoader } from "@mariozechner/pi-coding-agent";
import { AgentCore } from "./core.js";

export interface CommandHandlers {
  agent: AgentCore;
  sessionManager: SessionManager;
  resourceLoader: DefaultResourceLoader;
}

export type CommandHandler = (handlers: CommandHandlers, ...args: string[]) => Promise<string>;

export class CommandRegistry {
  private commands: Map<string, CommandHandler> = new Map();

  constructor() {
    this.registerBuiltins();
  }

  private registerBuiltins(): void {
    // ============================================================================
    // Session Management
    // ============================================================================

    this.register("new", async (handlers) => {
      handlers.sessionManager.newSession();
      // Session automatically created fresh
      return "✅ Created new session";
    });

    this.register("resume", async () => {
      const sessions = await SessionManager.list(process.cwd());
      if (sessions.length === 0) {
        return "❌ No previous sessions to resume";
      }
      const recent = sessions[0];
      // Note: resuming requires setting session file on manager
      // For now, just show info
      return `🔄 Most recent session: ${recent.path} (${recent.messageCount} messages)`;
    });

    this.register("fork", async (handlers) => {
      const leaf = handlers.sessionManager.getLeafEntry();
      if (!leaf) {
        return "❌ No current leaf to fork from";
      }
      handlers.sessionManager.branch(leaf.id);
      return "✅ Forked current branch";
    });

    this.register("sessions", async () => {
      const sessions = await SessionManager.list(process.cwd());
      if (sessions.length === 0) {
        return "No sessions found.";
      }
      const list = sessions.slice(0, 20).map(s => {
        const date = new Date(s.modified).toLocaleDateString();
        const msg = s.firstMessage ? `"${s.firstMessage.substring(0, 30)}..."` : "(empty)";
        return `  ${s.path}\n    ├─ ${date}\n    ├─ ${s.messageCount} messages\n    └─ ${msg}`;
      });
      return `Recent sessions (${sessions.length} total):\n${list.join('\n')}` + (sessions.length > 20 ? `\n  ... and ${sessions.length - 20} more` : '');
    });

    this.register("session", async (handlers) => {
      const tree = handlers.sessionManager.getTree();
      const entries = handlers.sessionManager.getEntries();
      const leaf = handlers.sessionManager.getLeafEntry();
      const header = handlers.sessionManager.getHeader();

      let output = `📂 Session Info\n`;
      output += `  ID: ${header?.id || 'N/A'}\n`;
      output += `  CWD: ${handlers.sessionManager.getCwd()}\n`;
      output += `  Persisted: ${handlers.sessionManager.isPersisted() ? 'Yes' : 'No'}\n`;
      output += `  Entries: ${entries.length}\n`;
      output += `  Branches: ${tree.length}\n\n`;

      if (tree.length > 0) {
        output += "Tree structure:\n";
        const print = (node: any, indent: string, isLast: boolean) => {
          const entry = node.entry;
          let meta = '';
          if (entry.type === 'message') {
            meta = entry.message.role === 'user' ? '[USER]' : '[ASSISTANT]';
          } else if (entry.type === 'branch_summary') {
            meta = '[BRANCH]';
          } else if (entry.type === 'label') {
            meta = `[LABEL: ${(entry as any).label}]`;
          }
          const current = entry.id === leaf?.id ? ' ← current' : '';
          const branch = isLast ? '└──' : '├──';
          output += `${indent}${branch} ${meta} ${entry.id.substring(0, 8)}...${current}\n`;
          const childCount = node.children.length;
          node.children.forEach((child: any, i: number) => {
            print(child, indent + (isLast ? '    ' : '│   '), i === childCount - 1);
          });
        };
        tree.forEach((root, i) => print(root, '', i === tree.length - 1));
      }

      return output;
    });

    // ============================================================================
    // Resources
    // ============================================================================

    this.register("skills", async (handlers) => {
      const result = handlers.resourceLoader.getSkills();
      if (result.skills.length === 0) {
        return "No skills loaded. Add .pi/skills/ or ~/.pi/agent/skills/";
      }
      return "Loaded skills:\n" + result.skills.map(s => `  • ${s.name}: ${s.description || ''}`).join('\n');
    });

    this.register("extensions", async (handlers) => {
      const result = handlers.resourceLoader.getExtensions();
      if (result.extensions.length === 0) {
        return "No extensions loaded. Add .pi/extensions/ or ~/.pi/agent/extensions/";
      }
      return "Loaded extensions:\n" + result.extensions.map(e => `  • ${e.sourceInfo?.source || e.path}`).join('\n');
    });

    this.register("commands", async (handlers) => {
      const prompts = handlers.resourceLoader.getPrompts();
      const builtinCommands = [
        ["new", "Create fresh session"],
        ["resume", "Resume recent session"],
        ["fork", "Branch from current"],
        ["sessions", "List all sessions"],
        ["session", "Show session tree"],
        ["skills", "List loaded skills"],
        ["extensions", "List loaded extensions"],
        ["commands", "List all commands"],
        ["help", "Show help"],
        ["reload", "Reload resources"],
        ["models", "Show current model"],
        ["cycle", "Cycle to next model"],
        ["thinking", "Set thinking level"],
        ["stats", "Show session statistics"],
        ["cost", "Show cost estimate"],
        ["tokens", "Show token usage"],
        ["compact", "Compact context manually"],
        ["clear", "Clear screen"],
        ["verbose", "Toggle verbose mode"],
      ];

      let output = "Built-in commands:\n";
      output += builtinCommands.map(([cmd, desc]) => `  /${cmd.padEnd(12)} - ${desc}`).join('\n');

      if (prompts.prompts.length > 0) {
        output += "\n\nSlash commands (from .pi/prompts/):";
        prompts.prompts.forEach(p => {
          output += `\n  /${p.name.padEnd(12)} - ${p.description || ''}`;
        });
      }

      return output;
    });

    this.register("help", async () => {
      return `🤖 Pi SDK Agent - Help

SESSION MANAGEMENT:
  /new            Start a fresh session
  /resume         Continue the most recent session
  /fork           Create branch from current point
  /sessions       List all saved sessions
  /session        Show current session tree

RESOURCES:
  /skills         List loaded skills
  /extensions     List loaded extensions
  /commands       List all slash commands
  /reload         Reload extensions, skills, prompts

MODEL:
  /models         Show current model
  /cycle          Switch to next available model
  /thinking <lvl> Set thinking level (off/minimal/low/medium/high/xhigh)

INFO:
  /stats          Show session statistics
  /cost           Show estimated cost
  /tokens         Show token usage breakdown

TOOLS:
  /hello [name]   Test custom tool
  /datetime [fmt] Get current datetime
  /sysinfo [lvl]  Show system info
  /ls [path]      List files

NAVIGATION:
  /clear          Clear screen
  /verbose        Toggle verbose logging (current: see /stats)

Type /help for this message.
Start typing to chat with the agent!`;
    });

    this.register("reload", async (handlers) => {
      await handlers.resourceLoader.reload();
      const exts = handlers.resourceLoader.getExtensions();
      const skills = handlers.resourceLoader.getSkills();
      const prompts = handlers.resourceLoader.getPrompts();
      return `✅ Reloaded: ${exts.extensions.length} extensions, ${skills.skills.length} skills, ${prompts.prompts.length} commands`;
    });

    this.register("models", async (handlers) => {
      const model = handlers.agent.getModel();
      const registry = handlers.agent.getModelRegistry();
      const available = await registry.getAvailable();
      
      let output = `Current model: ${model ? `${model.provider}/${model.id}` : 'None'}\n\n`;
      output += `Available models (${available.length}):\n`;
      available.slice(0, 10).forEach(m => {
        output += `  ${m.provider}/${m.id}\n`;
      });
      if (available.length > 10) {
        output += `  ... and ${available.length - 10} more`;
      }
      return output;
    });

    this.register("cycle", async (handlers) => {
      const success = await handlers.agent.cycleModel();
      if (success) {
        const model = handlers.agent.getModel();
        return `🔄 Switched to: ${model?.provider}/${model?.id}`;
      }
      return "❌ Only one model available";
    });

    this.register("thinking", async (handlers, ...args) => {
      const level = args[0];
      const valid = ["off", "minimal", "low", "medium", "high", "xhigh"] as const;
      if (!level || !valid.includes(level as any)) {
        return `❌ Invalid level. Choose: ${valid.join(', ')}`;
      }
      await handlers.agent.setThinkingLevel(level as any);
      return `🧠 Thinking level set to: ${level}`;
    });

    this.register("stats", async (handlers) => {
      const stats = handlers.agent.getStats();
      const config = handlers.agent.getConfig();
      return `📊 Session Statistics:

Duration:    ${stats.sessionDuration.toFixed(1)}s
Turns:       ${stats.turns}
Tool calls:  ${stats.toolCalls}
Errors:      ${stats.errors}

Tokens:
  Prompt:    ${stats.promptTokens.toLocaleString()}
  Completion: ${stats.completionTokens.toLocaleString()}
  Total:      ${stats.totalTokens.toLocaleString()}

Estimated cost: $${stats.estimatedCost.toFixed(4)}
Verbose:      ${config.verbose ? 'ON' : 'OFF'}
Persistence:  ${config.persisted ? 'Yes' : 'No'}`;
    });

    this.register("cost", async (handlers) => {
      const stats = handlers.agent.getStats();
      return `💰 Estimated cost: $${stats.estimatedCost.toFixed(4)} (${stats.totalTokens.toLocaleString()} tokens)`;
    });

    this.register("tokens", async (handlers) => {
      const stats = handlers.agent.getStats();
      return `🎟️ Token Usage:
  Prompt:    ${stats.promptTokens.toLocaleString()}
  Completion: ${stats.completionTokens.toLocaleString()}
  Total:      ${stats.totalTokens.toLocaleString()}`;
    });

    this.register("compact", async (handlers, ...args) => {
      const summary = args.join(' ') || 'Manual compaction';
      await handlers.agent.compact(summary);
      return "🗜️ Compaction triggered";
    });

    this.register("clear", async () => {
      process.stdout.write('\x1bc');
      return "";
    });

    this.register("verbose", async (handlers) => {
      const config = handlers.agent.getConfig();
      return `Verbose mode: ${config.verbose ? 'ON' : 'OFF'}\nTo enable permanently, set PI_VERBOSE=true or use --verbose flag.`;
    });

    // Custom tool commands
    this.register("hello", async (handlers, ...args) => {
      const name = args[0] || "World";
      await handlers.agent.prompt(`Use the hello_world tool to greet ${name}`);
      return "";
    });

    this.register("datetime", async (handlers, ...args) => {
      const format = args[0] || "iso";
      await handlers.agent.prompt(`Use the current_datetime tool with format="${format}"`);
      return "";
    });

    this.register("sysinfo", async (handlers) => {
      await handlers.agent.prompt(`Use the system_info tool`);
      return "";
    });

    this.register("ls", async (handlers, ...args) => {
      const path = args[0] || ".";
      await handlers.agent.prompt(`Use the list_files tool to list ${path}`);
      return "";
    });
  }

  register(name: string, handler: CommandHandler): void {
    this.commands.set(name, handler);
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  async execute(name: string, handlers: CommandHandlers, ...args: string[]): Promise<string> {
    const handler = this.commands.get(name);
    if (!handler) {
      return `❌ Unknown command: /${name}. Type /help for available commands.`;
    }
    try {
      return await handler(handlers, ...args);
    } catch (error: any) {
      return `❌ Error: ${error.message}`;
    }
  }
}

export const commandRegistry = new CommandRegistry();
