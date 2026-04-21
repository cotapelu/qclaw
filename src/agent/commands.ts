import { type ThinkingLevel } from "@mariozechner/pi-ai";
import { SessionManager, DefaultResourceLoader } from "@mariozechner/pi-coding-agent";
import { AgentCore } from "./core.js";
import * as path from "path";
import * as fs from "fs";
import { homedir } from "os";

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

    this.register("diff", async (handlers, ...args) => {
      const sessionManager = handlers.sessionManager;
      const tree = sessionManager.getTree();
      const leaf = sessionManager.getLeafEntry();
      if (!leaf) {
        return "❌ No current session";;
      }
      // If no target specified, show available branches
      if (args.length === 0) {
        // Collect all leaf nodes (branches)
        const leaves: any[] = [];
        const collect = (node: any) => {
          if (node.children.length === 0) {
            leaves.push(node.entry);
          } else {
            node.children.forEach(collect);
          }
        };
        tree.forEach((root: any) => collect(root));
        const list = leaves.map(e => {
          const isCurrent = e.id === leaf.id;
          return `  ${e.id.substring(0, 12)}... ${isCurrent ? '(current)' : ''}`;
        });
        return `Usage: /diff <branch-id>\n\nBranches (leaves):\n${list.join('\n')}\n\nUse first 8+ chars of branch ID to diff against current.`;
      }
      // Find target leaf by ID prefix
      const targetIdPrefix = args[0];
      const allLeaves: any[] = [];
      const collectLeaves = (node: any) => {
        if (node.children.length === 0) allLeaves.push(node.entry);
        else node.children.forEach(collectLeaves);
      };
      tree.forEach((root: any) => collectLeaves(root));
      const target = allLeaves.find(e => e.id.startsWith(targetIdPrefix));
      if (!target) {
        return `❌ No branch found with ID starting with "${targetIdPrefix}"`;
      }
      if (target.id === leaf.id) {
        return "⚠️ Cannot diff current branch against itself";
      }
      // Get entry IDs for current branch and target branch
      const getEntryIds = (leafEntry: any): Set<string> => {
        const ids = new Set<string>();
        // Walk up to root to include all ancestors
        let current: any = leafEntry;
        while (current) {
          ids.add(current.id);
          // Find parent by scanning tree
          const findParent = (node: any): any => {
            if (node.children.some((c: any) => c.id === current.id)) {
              return node.entry;
            }
            for (const child of node.children) {
              const p = findParent(child);
              if (p) return p;
            }
            return null;
          };
          const parent = tree.length > 0 ? tree.map((root: any) => findParent(root)).find((p: any) => p) : null;
          current = parent;
        }
        return ids;
      };
      const currentIds = getEntryIds(leaf);
      const targetIds = getEntryIds(target);
      // Compute differences
      const onlyInCurrent = [...currentIds].filter(id => !targetIds.has(id));
      const onlyInTarget = [...targetIds].filter(id => !currentIds.has(id));
      // Build output
      let output = `📊 Diff: current vs ${target.id.substring(0, 8)}...\n\n`;
      output += `Current branch entries: ${currentIds.size}\n`;
      output += `Target branch entries: ${targetIds.size}\n\n`;
      if (onlyInCurrent.length === 0 && onlyInTarget.length === 0) {
        output += "✅ Branches are identical (same set of entries)";
        return output;
      }
      if (onlyInCurrent.length > 0) {
        output += `Only in current (${onlyInCurrent.length}):\n`;
        onlyInCurrent.slice(0, 10).forEach(id => {
          output += `  - ${id.substring(0, 8)}...\n`;
        });
        if (onlyInCurrent.length > 10) {
          output += `  ... and ${onlyInCurrent.length - 10} more\n`;
        }
      }
      if (onlyInTarget.length > 0) {
        output += `\nOnly in target (${onlyInTarget.length}):\n`;
        onlyInTarget.slice(0, 10).forEach(id => {
          output += `  - ${id.substring(0, 8)}...\n`;
        });
        if (onlyInTarget.length > 10) {
          output += `  ... and ${onlyInTarget.length - 10} more\n`;
        }
      }
      return output;
    });

    this.register("graph", async (handlers) => {
      const tree = handlers.sessionManager.getTree();
      if (tree.length === 0) {
        return "📭 Session tree is empty";
      }
      let output = "📊 Session Graph:\n\n";
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
        const branch = isLast ? '└──' : '├──';
        output += `${indent}${branch} ${meta} ${entry.id.substring(0, 8)}...\n`;
        const childCount = node.children.length;
        node.children.forEach((child: any, i: number) => {
          print(child, indent + (isLast ? '    ' : '│   '), i === childCount - 1);
        });
      };
      tree.forEach((root: any, i: number) => print(root, '', i === tree.length - 1));
      return output;
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

    this.register("models", async (handlers, ...args) => {
      const model = handlers.agent.getModel();
      const registry = handlers.agent.getModelRegistry();
      let available = await registry.getAvailable();
      
      // Parse filters
      let capabilityFilter: string | undefined;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--capability' || args[i] === '-c') {
          if (i + 1 < args.length) capabilityFilter = args[++i];
        }
      }

      if (capabilityFilter) {
        const m = model as any;
        if (m.capabilities && !m.capabilities.includes(capabilityFilter)) {
          available = available.filter(m => {
            const mi = m as any;
            return mi.capabilities && mi.capabilities.includes(capabilityFilter);
          });
        } else {
          // Current model already has capability, filter list for display
          available = available.filter(m => {
            const mi = m as any;
            return mi.capabilities && mi.capabilities.includes(capabilityFilter);
          });
        }
      }
      
      let output = `📊 Model Information\n\n`;
      output += `Current: ${model ? `${model.provider}/${model.id}` : 'None'}\n`;
      if (model) {
        const m = model as any;
        output += `  Context: ${m.contextSize || 'Unknown'} tokens\n`;
        output += `  Pricing: ${m.pricing ? `$${m.pricing.prompt || 0}/1M prompt, $${m.pricing.completion || 0}/1M completion` : 'Unknown'}\n`;
        if (m.capabilities && m.capabilities.length > 0) {
          output += `  Capabilities: ${m.capabilities.join(', ')}\n`;
        }
      }
      output += `\nAvailable models (${available.length}):\n`;
      available.forEach((m, idx) => {
        const mi = m as any;
        output += `  ${idx + 1}. ${m.provider}/${m.id}`;
        if (mi.contextSize) output += ` (ctx: ${mi.contextSize})`;
        if (mi.pricing) output += ` [$${mi.pricing.prompt || 0}/$${mi.pricing.completion || 0}]`;
        if (mi.capabilities) output += ` {${mi.capabilities.join(',')}}`;
        output += `\n`;
      });
      return output;
    });

    this.register("select-model", async (handlers) => {
      const registry = handlers.agent.getModelRegistry();
      const available = await registry.getAvailable();
      if (available.length === 0) {
        return "❌ No models available";
      }
      // Show list and prompt for selection (simple version for CLI)
      let output = `Select a model (1-${available.length}):\n\n`;
      available.forEach((m, idx) => {
        const mi = m as any;
        output += `  ${idx + 1}. ${m.provider}/${m.id}`;
        if (mi.contextSize) output += ` (ctx: ${mi.contextSize})`;
        if (mi.pricing) output += ` [$${mi.pricing.prompt || 0}/$${mi.pricing.completion || 0}/1M]`;
        output += `\n`;
      });
      output += `\nEnter number (or press Enter to cancel): `;
      // In CLI mode, we can use readline. For now, just show list and remind to use /cycle
      output += `\nNote: Use /cycle to toggle through models, or set via /set model <provider/model>`;
      return output;
    });

    this.register("search", async (handlers, ...args) => {
      const sessionManager = handlers.sessionManager;
      const entries = sessionManager.getEntries();
      if (entries.length === 0) {
        return "❌ No session entries to search.";
      }
      const query = args[0];
      if (!query) {
        return "Usage: /search <query> [--user|--assistant|--tool]\n";
      }
      // Simple filtering
      let filtered = entries.filter(e => e.type === 'message');
      // Filter by role if specified
      const roleFilter = args.find(a => a === '--user' || a === '--assistant');
      if (roleFilter === '--user') {
        filtered = filtered.filter((e: any) => e.message.role === 'user');
      } else if (roleFilter === '--assistant') {
        filtered = filtered.filter((e: any) => e.message.role === 'assistant');
      }
      // Text search (case-insensitive substring)
      const lowerQuery = query.toLowerCase();
      const results = filtered.filter((e: any) => {
        const content = e.message.content
          .map((c: any) => (c.type === 'text' ? c.text : ''))
          .join(' ')
          .toLowerCase();
        return content.includes(lowerQuery);
      });

      if (results.length === 0) {
        return `No results for "${query}"`;
      }

      let output = `🔍 Search results for "${query}" (${results.length} matches):\n\n`;
      results.slice(0, 20).forEach((e: any, idx: number) => {
        const role = e.message.role;
        const text = e.message.content
          .map((c: any) => (c.type === 'text' ? c.text : ''))
          .join(' ')
          .trim();
        const snippet = text.length > 80 ? text.substring(0, 80) + '...' : text;
        output += `${idx + 1}. [${role}] ${snippet}\n`;
      });
      if (results.length > 20) {
        output += `\n... and ${results.length - 20} more`;
      }
      return output;
    });

    // ============================================================================
    // Session Metadata (Labels & Notes)
    // ============================================================================

    this.register("labels", async (handlers) => {
      const sessionManager = handlers.sessionManager;
      const sessionDir = sessionManager.getSessionDir();
      if (!sessionDir) {
        return "❌ Session directory not available";
      }
      const metaPath = path.join(sessionDir,  'metadata.json');
      if (!fs.existsSync(metaPath)) {
        return "No labels set. Use /labels set <comma-separated> to add.";
      }
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      if (!meta.labels || meta.labels.length === 0) {
        return "No labels. Use /labels set <label1,label2> to add.";
      }
      return `🏷️  Labels: ${meta.labels.join(', ')}`;
    });

    this.register("labels set", async (handlers, ...args) => {
      const labelsStr = args.join(' ');
      const labels = labelsStr.split(',').map(l => l.trim()).filter(l => l);
      const sessionManager = handlers.sessionManager;
      const sessionDir = sessionManager.getSessionDir();
      if (!sessionDir) {
        return "❌ Session directory not available";
      }
      const metaPath = path.join(sessionDir,  'metadata.json');
      let meta: any = { labels: [], notes: [] };
      if (fs.existsSync(metaPath)) {
        try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch {}
      }
      meta.labels = labels;
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      return `✅ Labels set: ${labels.join(', ')}`;
    });

    this.register("labels clear", async (handlers) => {
      const sessionManager = handlers.sessionManager;
      const sessionDir = sessionManager.getSessionDir();
      if (!sessionDir) {
        return "❌ Session directory not available";
      }
      const metaPath = path.join(sessionDir,  'metadata.json');
      if (!fs.existsSync(metaPath)) {
        return "No labels to clear.";
      }
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      meta.labels = [];
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      return "✅ Labels cleared";
    });

    this.register("notes", async (handlers, ...args) => {
      const sessionManager = handlers.sessionManager;
      const sessionDir = sessionManager.getSessionDir();
      if (!sessionDir) {
        return "❌ Session directory not available";
      }
      const metaPath = path.join(sessionDir,  'metadata.json');
      if (!fs.existsSync(metaPath)) {
        return "No notes. Use /notes add <text> to create.";
      }
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      if (!meta.notes || meta.notes.length === 0) {
        return "No notes. Use /notes add <text> to create.";
      }
      let output = `📝 Notes (${meta.notes.length}):\n\n`;
      meta.notes.forEach((n: any, idx: number) => {
        const date = new Date(n.time).toLocaleString();
        output += `${idx + 1}. [${date}] ${n.text}\n`;
      });
      return output;
    });

    this.register("notes add", async (handlers, ...args) => {
      const text = args.join(' ');
      if (!text) return "Usage: /notes add <note text>";
      const sessionManager = handlers.sessionManager;
      const sessionDir = sessionManager.getSessionDir();
      if (!sessionDir) {
        return "❌ Session directory not available";
      }
      const metaPath = path.join(sessionDir,  'metadata.json');
      let meta: any = { labels: [], notes: [] };
      if (fs.existsSync(metaPath)) {
        try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch {}
      }
      if (!meta.notes) meta.notes = [];
      meta.notes.push({ text, time: Date.now() });
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      return `✅ Note added`;
    });

    this.register("notes clear", async (handlers) => {
      const sessionManager = handlers.sessionManager;
      const sessionDir = sessionManager.getSessionDir();
      if (!sessionDir) {
        return "❌ Session directory not available";
      }
      const metaPath = path.join(sessionDir,  'metadata.json');
      if (!fs.existsSync(metaPath)) {
        return "No notes to clear.";
      }
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      meta.notes = [];
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      return "✅ Notes cleared";
    });

    this.register("metadata", async (handlers) => {
      const sessionManager = handlers.sessionManager;
      const sessionDir = sessionManager.getSessionDir();
      if (!sessionDir) {
        return "❌ Session directory not available";
      }
      const metaPath = path.join(sessionDir,  'metadata.json');
      if (!fs.existsSync(metaPath)) {
        return "No metadata available.";
      }
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      let output = `📋 Session Metadata\n\n`;
      output += `Labels: ${meta.labels?.join(', ') || 'None'}\n`;
      output += `Notes: ${meta.notes?.length || 0} entries\n`;
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
      const avgToolTime = stats.toolCalls > 0 ? (stats.toolExecutionTime / stats.toolCalls) : 0;
      return `📊 Session Statistics:\n\nDuration:    ${stats.sessionDuration.toFixed(1)}s\nTurns:       ${stats.turns}\nTool calls:  ${stats.toolCalls}\nTool time:   ${stats.toolExecutionTime.toFixed(0)}ms (avg: ${avgToolTime.toFixed(0)}ms)\nErrors:      ${stats.errors}\n\nTokens:\n  Prompt:    ${stats.promptTokens.toLocaleString()}\n  Completion: ${stats.completionTokens.toLocaleString()}\n  Total:      ${stats.totalTokens.toLocaleString()}\n\nEstimated cost: $${stats.estimatedCost.toFixed(4)}\nVerbose:      ${config.verbose ? 'ON' : 'OFF'}\nPersistence:  ${config.persisted ? 'Yes' : 'No'}`;
    });

    this.register("perf", async (handlers) => {
      const stats = handlers.agent.getStats();
      const duration = stats.sessionDuration || 1;
      const tokensPerMin = (stats.totalTokens / (duration / 60)).toFixed(0);
      const toolPercent = stats.turns > 0 ? ((stats.toolExecutionTime / (duration * 1000)) * 100).toFixed(1) : 0;
      const errorRate = ((stats.errors / Math.max(stats.turns, 1)) * 100).toFixed(1);

      let output = `⚡ Performance Dashboard:\n\n`;
      output += `Session Duration: ${duration.toFixed(2)}s\n`;
      output += `Turns: ${stats.turns}\n`;
      output += `Token Rate: ${tokensPerMin} tokens/min\n`;
      output += `Tool Time: ${stats.toolExecutionTime}ms (${toolPercent}% of session)\n`;
      output += `Avg Tool Call: ${stats.toolCalls > 0 ? (stats.toolExecutionTime / stats.toolCalls).toFixed(0) : 0}ms\n`;
      output += `Errors: ${stats.errors} (${errorRate}% of turns)\n`;
      output += `Estimated Cost: $${stats.estimatedCost.toFixed(4)}\n`;
      return output;
    });

    this.register("cost", async (handlers, ...args) => {
      if (args[0] === 'history' || args[0] === 'stats') {
        const history = handlers.agent.getCostHistory();
        if (history.length === 0) {
          return '📊 No cost history available yet.';
        }
        // Aggregate daily
        const daily = new Map<string, {cost: number, tokens: number}>();
        for (const entry of history) {
          const d = entry.date as string;
          if (!daily.has(d)) daily.set(d, {cost: 0, tokens: 0});
          const agg = daily.get(d)!;
          agg.cost += entry.cost;
          agg.tokens += entry.tokens;
        }
        const sortedDaily = Array.from(daily.entries()).sort((a, b) => b[0].localeCompare(a[0]));
        let output = '💰 Cost History (daily totals):\n\n';
        for (const [date, data] of sortedDaily) {
          output += `${date}: $${data.cost.toFixed(4)} (${data.tokens.toLocaleString()} tokens)\n`;
        }
        // Monthly aggregates
        const monthly = new Map<string, {cost: number, tokens: number}>();
        for (const entry of history) {
          const month = (entry.date as string).slice(0, 7); // YYYY-MM
          if (!monthly.has(month)) monthly.set(month, {cost: 0, tokens: 0});
          const agg = monthly.get(month)!;
          agg.cost += entry.cost;
          agg.tokens += entry.tokens;
        }
        output += '\nMonthly aggregates:\n';
        const sortedMonthly = Array.from(monthly.entries()).sort((a, b) => b[0].localeCompare(a[0]));
        for (const [month, data] of sortedMonthly) {
          output += `${month}: $${data.cost.toFixed(4)} (${data.tokens.toLocaleString()} tokens)\n`;
        }
        return output;
      }
      // Current session
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

    // ============================================================================
    // Export (Phase 4 - Session Enhancements)
    // ============================================================================

    this.register("export", async (handlers, ...args) => {
      const sessionManager = handlers.sessionManager;
      const entries = sessionManager.getEntries();
      if (entries.length === 0) {
        return "❌ No entries to export";
      }

      let format = 'jsonl';
      let fileArg: string | undefined;

      // Parse args
      const knownFormats = ['jsonl', 'json', 'yaml', 'markdown', 'md'];
      if (args.length > 0 && knownFormats.includes(args[0])) {
        format = args[0];
        if (args[1]) fileArg = args[1];
      } else if (args.length > 0) {
        fileArg = args[0]; // assume file path, infer format from extension
        const ext = path.extname(fileArg).slice(1).toLowerCase();
        if (knownFormats.includes(ext)) format = ext;
      }

      const extMap: Record<string, string> = {
        jsonl: 'jsonl',
        json: 'json',
        yaml: 'yaml',
        markdown: 'md',
        md: 'md'
      };
      const filePath = fileArg || path.join(process.cwd(), `session-export-${Date.now()}.${extMap[format]}`);

      let content: string;
      if (format === 'jsonl' || format === 'json') {
        content = entries.map((e: any) => JSON.stringify(e)).join('\n');
      } else if (format === 'yaml') {
        content = entries.map((e: any) => simpleYaml(e)).join('\n---\n');
      } else if (format === 'markdown' || format === 'md') {
        content = entriesToMarkdown(entries);
      } else {
        return `❌ Unknown format: ${format}`;
      }

      try {
        fs.writeFileSync(filePath, content, 'utf-8');
        return `📤 Exported ${entries.length} entries to ${filePath}`;
      } catch (error: any) {
        return `❌ Export failed: ${error.message}`;
      }
    });

    // ============================================================================
    // Import (Phase 4 - Session Enhancements)
    // ============================================================================

    this.register("import", async (handlers, ...args) => {
      if (args.length === 0) {
        return "Usage: /import <file>\nImports a session from a JSONL file and switches to it.";
      }
      const filePath = args[0];
      if (!fs.existsSync(filePath)) {
        return `❌ File not found: ${filePath}`;
      }
      try {
        await handlers.agent.importSession(filePath);
        return `📥 Imported session from ${filePath}`;
      } catch (error: any) {
        return `❌ Import failed: ${error.message}`;
      }
    });

    // ============================================================================
    // Profiles (Phase 10 - Multi-Project)
    // ============================================================================

    this.register("profiles", async (handlers) => {
      const agentDir = handlers.agent.getAgentDir();
      const profilesPath = path.join(agentDir, 'profiles.json');
      let profiles: Record<string, any> = {};
      if (fs.existsSync(profilesPath)) {
        try { profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8')); } catch (e) {}
      }
      const settings = handlers.agent.getSettings();
      // @ts-ignore
      const active = (settings.activeProfile as string | undefined) || 'none';
      let output = "📂 Profiles:\n";
      const names = Object.keys(profiles);
      if (names.length === 0) {
        output += "  (none)\n";
      } else {
        names.forEach(name => {
          const marker = name === active ? ' (*)' : '';
          output += `  ${name}${marker}\n`;
        });
      }
      output += `\nActive: ${active}\n`;
      output += "\nCommands:\n  /profile create <name> - create from current settings\n  /profile use <name> - activate profile\n  /profile delete <name> - remove profile";
      return output;
    });

    this.register("profile", async (handlers, ...args) => {
      if (args.length < 1) return "Usage: /profile <create|use|delete> <name>";
      const cmd = args[0];
      const name = args[1];
      if (!name) return "❌ Profile name required";
      const agent = handlers.agent;
      const agentDir = agent.getAgentDir();
      const profilesPath = path.join(agentDir, 'profiles.json');
      // Ensure profiles file exists
      if (!fs.existsSync(profilesPath)) {
        fs.writeFileSync(profilesPath, JSON.stringify({}, null, 2));
      }
      let profiles: Record<string, any> = {};
      try {
        profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
      } catch (e) {
        profiles = {};
      }
      if (cmd === 'create') {
        if (profiles[name]) return `❌ Profile '${name}' already exists`;
        const current = agent.getSettings();
        const { activeProfile, ...rest } = current as any;
        profiles[name] = rest;
        fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
        return `✅ Created profile '${name}'`;
      } else if (cmd === 'use') {
        if (!profiles[name]) return `❌ Profile '${name}' not found`;
        try {
          agent.applySettings(profiles[name]);
          agent.updateSetting('activeProfile', name);
          return `🔀 Switched to profile '${name}'. Some settings may require restart for full effect.`;
        } catch (error: any) {
          return `❌ Failed to apply profile: ${error.message}`;
        }
      } else if (cmd === 'delete') {
        if (!profiles[name]) return `❌ Profile '${name}' not found`;
        delete profiles[name];
        fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
        const settings = agent.getSettings();
        // @ts-ignore
        if (settings.activeProfile === name) {
          try { agent.updateSetting('activeProfile', null); } catch (e) {}
        }
        return `🗑️ Deleted profile '${name}'`;
      } else {
        return "❌ Unknown command. Use create, use, delete.";
      }
    });

    // ============================================================================
    // Setup Wizard (Phase 9)
    // ============================================================================

    this.register("health", async (handlers) => {
      const agent = handlers.agent;
      const checks: string[] = [];
      // Agent directory
      const agentDir = agent.getAgentDir();
      checks.push(`Agent dir: ${agentDir}`);
      // Settings
      const settings = agent.getSettings();
      checks.push(`Settings: valid`);
      // Model
      const model = agent.getModel();
      checks.push(`Model: ${model ? `${model.provider}/${model.id}` : 'None'}`);
      // Session
      const session = agent.getSession();
      checks.push(`Session: ${session ? 'Active' : 'Inactive'}`);
      // Logging
      const logCfg = settings.logging as any || {};
      const logDir = logCfg.dir || path.join(require('os').homedir(), '.pi', 'agent', 'logs');
      checks.push(`Logging: ${logCfg.format || 'text'} format to ${logDir}`);
      // Performance
      const stats = agent.getStats();
      checks.push(`Tokens: ${stats.totalTokens} (cost: $${stats.estimatedCost.toFixed(4)})`);

      return `🩺 Health Check:\n` + checks.map(c => `  ✓ ${c}`).join('\n');
    });

    this.register("init", async (handlers) => {
      const agent = handlers.agent;
      const agentDir = agent.getAgentDir();
      // Ensure agent directory exists
      try {
        if (!fs.existsSync(agentDir)) {
          fs.mkdirSync(agentDir, { recursive: true });
        }
        // Create subdirectories
        const subdirs = ['extensions', 'skills', 'prompts', 'logs'];
        for (const name of subdirs) {
          const dir = path.join(agentDir, name);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        }
        // Check for auth.json
        const authPath = path.join(agentDir, 'auth.json');
        if (!fs.existsSync(authPath)) {
          return `✅ Initialized agent directory in ${agentDir}\n\nSubdirectories created: extensions, skills, prompts, logs\n\nNext steps:\n1. Create ${authPath} with your API keys (see README)\n2. Optionally copy ${path.join(agentDir, 'settings.example.json')} to ${path.join(agentDir, 'settings.json')} and customize\n3. Use /reload to load any extensions/skills you add\n4. Use /set to configure preferences\n`;
        }
        return `✅ Agent already initialized in ${agentDir}. Directories ensured.`;
      } catch (error: any) {
        return `❌ Initialization failed: ${error.message}`;
      }
    });

    // ============================================================================
    // Logging (Phase 6)
    // ============================================================================

    this.register("logs", async (handlers, ...args) => {
      const settings = handlers.agent.getSettings();
      const logConfig = settings.logging || {};
      const logDir = (logConfig.dir as string) || path.join(homedir(), '.pi', 'agent', 'logs');
      const rotation = (logConfig.rotation as string) || 'daily';
      const level = (logConfig.level as string) || 'info';

      // Determine log file name based on rotation
      const now = new Date();
      let filename = `agent-${now.toISOString().split('T')[0]}.log`;
      if (rotation === 'hourly') {
        const hour = String(now.getHours()).padStart(2, '0');
        filename = `agent-${now.toISOString().split('T')[0]}-${hour}.log`;
      }
      const logPath = path.join(logDir, filename);

      if (!fs.existsSync(logPath)) {
        return `📜 No log file found at ${logPath}`;
      }

      // Tail lines
      const tail = args[0] ? parseInt(args[0]) : 50;
      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      const recent = lines.slice(-tail);

      return `📜 Recent logs (${recent.length} lines, level >= ${level}):\n\n` + recent.join('\n');
    });

    // ============================================================================
    // Settings
    // ============================================================================

    this.register("settings", async (handlers) => {
      const settings = handlers.agent.getSettings();
      let output = `⚙️ Current Settings:\n\n`;
      output += `Compaction:\n`;
      output += `  enabled: ${settings.compaction?.enabled ?? 'N/A'}\n`;
      output += `  tokens: ${settings.compaction?.tokens ?? 'N/A'}\n\n`;
      output += `Retry:\n`;
      output += `  enabled: ${settings.retry?.enabled ?? 'N/A'}\n`;
      output += `  maxRetries: ${settings.retry?.maxRetries ?? 'N/A'}\n\n`;
      output += `Model: ${settings.model ?? 'Not set (auto-select)'}\n`;
      output += `Thinking Level: ${settings.thinkingLevel ?? 'off'}\n`;
      return output;
    });

    this.register("set", async (handlers, ...args) => {
      if (args.length < 2) {
        return `❌ Usage: /set <key> <value>\nExample: /set compaction.enabled false\nKeys: compaction.enabled, compaction.tokens, retry.enabled, retry.maxRetries, model, thinkingLevel`;
      }
      const key = args[0];
      const valueStr = args.slice(1).join(' ');
      // Parse value (boolean, number, string)
      let value: any = valueStr;
      if (valueStr === 'true') value = true;
      else if (valueStr === 'false') value = false;
      else if (!isNaN(Number(valueStr))) value = Number(valueStr);

      try {
        handlers.agent.updateSetting(key, value);
        return `✅ Set ${key} = ${JSON.stringify(value)}`;
      } catch (error: any) {
        return `❌ Failed to update setting: ${error.message}`;
      }
    });

    this.register("reset-settings", async (handlers) => {
      handlers.agent.resetSettings();
      return "🔄 Settings reset to defaults";
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

// ============================================================================
// Export helpers (JSON, YAML, Markdown)
// ============================================================================

function simpleYaml(obj: any, indent = 0): string {
  const pad = '  '.repeat(indent);
  let result = '';
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const value = obj[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      result += `${pad}${key}:\n` + simpleYaml(value, indent + 1);
    } else if (Array.isArray(value)) {
      result += `${pad}${key}:\n`;
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          result += `${pad}  -\n` + simpleYaml(item, indent + 2);
        } else {
          result += `${pad}  - ${item}\n`;
        }
      }
    } else {
      const str = String(value);
      if (/[\n:\#\[\]{}]/.test(str) || str.includes('"')) {
        result += `${pad}${key}: "${str.replace(/"/g, '\"')}"\n`;
      } else {
        result += `${pad}${key}: ${str}\n`;
      }
    }
  }
  return result;
}

function entriesToMarkdown(entries: any[]): string {
  let md = `# Session Export\n\nTotal entries: ${entries.length}\n\n`;
  entries.forEach((e, idx) => {
    md += `## Entry ${idx + 1}: ${e.id.substring(0, 8)}...\n\n`;
    md += `- Type: ${e.type}\n`;
    if (e.type === 'message') {
      const role = e.message.role;
      md += `- Role: ${role}\n`;
      const textParts = e.message.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text);
      if (textParts.length) {
        md += `- Content:\n\n\`\`\`
${textParts.join('\n')}
\`\`\`\n`;
      }
    } else if (e.type === 'branch_summary') {
      md += `- Summary: ${e.summary}\n`;
    }
    md += '\n';
  });
  return md;
}

export const commandRegistry = new CommandRegistry();
