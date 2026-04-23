import { type ThinkingLevel } from "@mariozechner/pi-ai";
import { SessionManager, DefaultResourceLoader } from "@mariozechner/pi-coding-agent";
import { AgentCore } from "./core.js";
import { AgentManager } from "./manager.js";
import { AliasManager } from "./aliases.js";
import { execSync, spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { homedir } from "os";
import { TemplateManager, type SessionTemplate } from "../templates/index.js";

export interface CommandHandlers {
  agent: AgentCore;
  sessionManager: SessionManager;
  resourceLoader: DefaultResourceLoader;
  manager?: AgentManager;
}

export type CommandHandler = (handlers: CommandHandlers, ...args: string[]) => Promise<string>;

export class CommandRegistry {
  private commands: Map<string, CommandHandler> = new Map();
  private history: Array<{ command: string; args: string[]; timestamp: number }> = [];
  private readonly MAX_HISTORY = 1000;

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

    this.register("resume", async (handlers) => {
      const sessions = await SessionManager.list(process.cwd());
      if (sessions.length === 0) {
        return "❌ No previous sessions to resume";
      }
      const recent = sessions[0];
      try {
        // Dispose current session if active
        const currentSession = handlers.agent.getSession();
        if (currentSession) {
          handlers.agent.dispose();
        }
        // Switch to the most recent session file
        handlers.agent.getSessionManager().setSessionFile(recent.path);
        // Reinitialize agent to load the resumed session
        await handlers.agent.initialize();
        return `🔄 Resumed session: ${recent.path} (${recent.messageCount} messages)`;
      } catch (error: any) {
        return `❌ Failed to resume session: ${error.message}`;
      }
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

    this.register("sessions-switch", async (handlers, ...args) => {
      if (args.length === 0) {
        return "Usage: /sessions-switch <index>\nUse /sessions to see index numbers.";
      }
      const idx = parseInt(args[0]) - 1; // 1-based for user
      if (isNaN(idx) || idx < 0) {
        return "❌ Invalid index";
      }
      try {
        const sessions = await SessionManager.list(process.cwd());
        if (idx >= sessions.length) {
          return `❌ Index out of range (max ${sessions.length})`;
        }
        const target = sessions[idx];
        // Dispose current session if active
        const currentSession = handlers.agent.getSession();
        if (currentSession) {
          handlers.agent.dispose();
        }
        // Switch
        handlers.agent.getSessionManager().setSessionFile(target.path);
        await handlers.agent.initialize();
        return `🔄 Switched to session #${idx + 1}: ${target.path} (${target.messageCount} messages)`;
      } catch (error: any) {
        return `❌ Failed to switch: ${error.message}`;
      }
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

    
    this.register("image", async (handlers, ...args) => {
      if (args.length === 0) {
        return "📷 Usage: /image <path> [question] - Read and analyze an image file";
      }
      
      const imagePath = args[0];
      const question = args.slice(1).join(' ') || "Describe this image";
      
      await handlers.agent.prompt(`Read and analyze the image at "${imagePath}". ${question}`);
      return "";
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

    this.register("metrics", async () => {
      try {
        const { getMetricsString, initMetrics } = await import('../observability/metrics.js');
        initMetrics();
        return await getMetricsString();
      } catch (error: any) {
        return `❌ Metrics unavailable: ${error.message}`;
      }
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
    // Budget & Cost Analytics (Phase 8)
    // ============================================================================

    this.register("cost project", async (handlers) => {
      const history = handlers.agent.getCostHistory();
      if (history.length === 0) return '📊 No cost history available for projection.';
      // Aggregate costs by date
      const daily = new Map<string, number>();
      for (const e of history) {
        const date = (e as any).date as string;
        daily.set(date, (daily.get(date) || 0) + (e as any).cost);
      }
      const days = daily.size;
      const totalCost = Array.from(daily.values()).reduce((sum, c) => sum + c, 0);
      const avgDaily = totalCost / days;
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysSoFar = now.getDate();
      const projectedMonth = avgDaily * daysInMonth;
      const projectedRest = avgDaily * (daysInMonth - daysSoFar);
      return `💰 Cost Projection:\n\n  Average daily: $${avgDaily.toFixed(2)}\n  Projected for this month (${daysInMonth} days): $${projectedMonth.toFixed(2)}\n  Remaining (${daysInMonth - daysSoFar} days): $${projectedRest.toFixed(2)}`;
    });

    this.register("budget", async (handlers, ...args) => {
      if (args.length === 0) {
        const settings = handlers.agent.getSettings();
        const b = (settings.budget as any) || {};
        return `Budget thresholds:\n  Daily: ${b.daily ? '$' + b.daily.toFixed(2) : 'not set'}\n  Monthly: ${b.monthly ? '$' + b.monthly.toFixed(2) : 'not set'}\n\nSet with: /budget daily <amount>\n      or: /budget monthly <amount>`;
      }
      if (args[0] === 'daily' && args[1]) {
        const amount = parseFloat(args[1]);
        if (isNaN(amount)) return '❌ Invalid amount';
        handlers.agent.updateSetting('budget.daily', amount);
        return `✅ Daily budget set to $${amount}`;
      }
      if (args[0] === 'monthly' && args[1]) {
        const amount = parseFloat(args[1]);
        if (isNaN(amount)) return '❌ Invalid amount';
        handlers.agent.updateSetting('budget.monthly', amount);
        return `✅ Monthly budget set to $${amount}`;
      }
      return 'Usage: /budget [daily <amount> | monthly <amount>]';
    });

    this.register("cost breakdown", async (handlers) => {
      const history = handlers.agent.getCostHistory();
      if (history.length === 0) return '📊 No cost history available.';
      const byModel = new Map<string, {cost: number, tokens: number}>();
      for (const e of history) {
        const model = (e as any).model || 'unknown';
        if (!byModel.has(model)) byModel.set(model, {cost: 0, tokens: 0});
        const agg = byModel.get(model)!;
        agg.cost += (e as any).cost;
        agg.tokens += (e as any).tokens;
      }
      let out = '💰 Cost breakdown by model:\n\n';
      const sorted = Array.from(byModel.entries()).sort((a, b) => b[1].cost - a[1].cost);
      for (const [model, data] of sorted) {
        out += `  ${model}: $${data.cost.toFixed(4)} (${data.tokens.toLocaleString()} tokens)\n`;
      }
      return out;
    });

    // ============================================================================
    // Backup & Restore (Phase 14)
    // ============================================================================

    this.register("backup", async (handlers, ...args) => {
      const { createBackup, listBackups } = await import("../utils/backup.js");
      const agentDir = handlers.agent.getAgentDir();
      
      if (args[0] === 'list') {
        const backupDir = path.join(agentDir, '.backups');
        const backups = listBackups(backupDir);
        if (backups.length === 0) {
          return "📭 No backups found";
        }
        let output = `📦 Backups (${backups.length}):\n\n`;
        backups.slice(0, 10).forEach((b, i) => {
          const size = (b.size / 1024 / 1024).toFixed(2);
          output += `${i + 1}. ${b.name} (${size} MB) - ${b.date.toLocaleString()}\n`;
        });
        return output;
      }
      
      const timestamp = new Date().toISOString().split('T')[0];
      const backupDir = path.join(agentDir, '.backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const outputPath = args[0] 
        ? path.resolve(args[0])
        : path.join(backupDir, `backup-${timestamp}.tar.gz`);
      
      const result = await createBackup(agentDir, outputPath, {
        includeLogs: args.includes('--logs'),
        includeSessions: true,
        includeExtensions: true,
      });
      
      if (result.success) {
        const size = (result.size / 1024 / 1024).toFixed(2);
        return `✅ Backup created:\n File: ${result.filePath}\n Size: ${size} MB\n Files: ${result.filesIncluded}\n Duration: ${(result.duration / 1000).toFixed(1)}s`;
      } else {
        return `❌ Backup failed: ${result.error}`;
      }
    });

    this.register("restore", async (handlers, ...args) => {
      const { restoreBackup, listBackups } = await import("../utils/backup.js");
      
      if (args.length === 0) {
        const agentDir = handlers.agent.getAgentDir();
        const backupDir = path.join(agentDir, '.backups');
        const backups = listBackups(backupDir);
        
        if (backups.length === 0) {
          return "❌ No backups found. Usage: /restore <backup-file>";
        }
        
        let output = "📦 Available backups (select with /restore <number>):\n\n";
        backups.slice(0, 10).forEach((b, i) => {
          const size = (b.size / 1024 / 1024).toFixed(2);
          output += `${i + 1}. ${b.name} (${size} MB) - ${b.date.toLocaleString()}\n`;
        });
        output += "\nUsage: /restore <backup-file> or /restore <number> from list";
        return output;
      }
      
      let backupPath = args[0];
      const numMatch = backupPath.match(/^\d+$/);
      if (numMatch) {
        const index = parseInt(backupPath) - 1;
        const agentDir = handlers.agent.getAgentDir();
        const backupDir = path.join(agentDir, '.backups');
        const backups = listBackups(backupDir);
        if (index < 0 || index >= backups.length) {
          return `❌ Invalid backup number: ${backupPath}`;
        }
        backupPath = backups[index].path;
      }
      
      if (!fs.existsSync(backupPath)) {
        return `❌ Backup file not found: ${backupPath}`;
      }
      
      const targetDir = handlers.agent.getAgentDir();
      const merge = args.includes('--merge');
      
      const result = await restoreBackup(backupPath, targetDir);
      
      if (result.success) {
        return `✅ Restored from backup:\n From: ${backupPath}\n To: ${result.extractedTo}\n Files: ${result.filesRestored}\n Duration: ${(result.duration / 1000).toFixed(1)}s\n\nNote: You may need to restart the agent for changes to take effect.`;
      } else {
        return `❌ Restore failed: ${result.error}`;
      }
    });

    this.register("auto-backup", async (handlers, ...args) => {
      const { BackupAutomation, loadBackupSchedule, saveBackupSchedule } = await import("../utils/backup-automation.js");
      const agentDir = handlers.agent.getAgentDir();
      const schedule = loadBackupSchedule(agentDir);

      if (args.length === 0 || args[0] === 'status') {
        const stats = new BackupAutomation(agentDir, schedule).getStats();
        return `🔄 Auto-backup Status:
Enabled: ${stats.enabled ? 'Yes' : 'No'}
Interval: ${stats.interval}
Max backups: ${stats.maxBackups}
Total auto-backups: ${stats.autoBackupsCount}
Last backup: ${stats.lastBackup || 'Never'}`;
      }

      if (args[0] === 'enable') {
        const interval = (args[1] as 'daily' | 'weekly') || 'daily';
        const maxBackups = parseInt(args[2]) || 7;
        
        const newSchedule = {
          enabled: true,
          interval,
          maxBackups,
        };
        
        saveBackupSchedule(agentDir, newSchedule);
        const automation = new BackupAutomation(agentDir, newSchedule);
        automation.start();
        
        return `✅ Auto-backup enabled: ${interval}, keeping ${maxBackups} backups`;
      }

      if (args[0] === 'disable') {
        schedule.enabled = false;
        saveBackupSchedule(agentDir, schedule);
        return '🔄 Auto-backup disabled';
      }

      return 'Usage: /auto-backup [enable <daily|weekly> <max>] | [disable] | [status]';
    });


    // ============================================================================
    // Session Previews (Phase 4)
    // ============================================================================

    this.register('preview', async (handlers) => {
      const entries = handlers.sessionManager.getEntries();
      const messages = entries.filter(e => e.type === 'message');
      const recent = messages.slice(-6); // last 6 messages (3 turns)
      if (recent.length === 0) return '📭 No messages yet.';
      let out = '📋 Recent Messages (preview):\n\n';
      recent.forEach(e => {
        const anyE = e as any;
        const role = anyE.message.role;
        const content = anyE.message.content || [];
        const text = content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join(' ');
        const snippet = text.length > 80 ? text.substring(0, 80) + '...' : text;
        out += `[${role}] ${snippet}\n`;
      });
      return out;
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
      const logDir = logCfg.dir || path.join(homedir(), '.pi', 'agent', 'logs');
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
    // Session Templates (Phase 6)
    // ============================================================================

    this.register("templates", async () => {
      const templates = templateManager.list();
      let output = "📋 Available Templates:\n\n";
      for (const t of templates) {
        output += `  ${t.name} - ${t.description}\n`;
        if (t.tags && t.tags.length > 0) {
          output += `    Tags: ${t.tags.join(', ')}\n`;
        }
        const comp = t.config.compaction?.enabled !== false ? `enabled${t.config.compaction?.tokens ? `(${t.config.compaction.tokens}toks)` : ''}` : 'disabled';
        output += `    Config: thinking=${t.config.thinkingLevel || 'default'}, compaction=${comp}\n\n`;
      }
      output += `Use: /template use <name> to apply a template\n`;
      return output;
    });

    this.register("template use", async (handlers, ...args) => {
      if (args.length === 0) {
        return "Usage: /template use <name>\nSee /templates for available options.";
      }
      const name = args[0];
      const template = templateManager.get(name);
      if (!template) {
        return `❌ Template '${name}' not found. Use /templates to list.`;
      }
      try {
        const agent = handlers.agent;
        if (template.config.model) {
          const registry = agent.getModelRegistry();
          const available = await registry.getAvailable();
          const match = available.find(m => `${m.provider}/${m.id}` === template.config.model);
          if (match) {
            await agent.setModel(match);
          } else {
            return `❌ Model '${template.config.model}' not available`;
          }
        }
        if (template.config.thinkingLevel) {
          await agent.setThinkingLevel(template.config.thinkingLevel as ThinkingLevel);
        }
        if (template.config.compaction) {
          agent.updateSetting('compaction.enabled', template.config.compaction.enabled);
          if (template.config.compaction.tokens !== undefined) {
            agent.updateSetting('compaction.tokens', template.config.compaction.tokens);
          }
        }
        if (template.config.retry) {
          agent.updateSetting('retry.enabled', template.config.retry.enabled);
          if (template.config.retry.maxRetries !== undefined) {
            agent.updateSetting('retry.maxRetries', template.config.retry.maxRetries);
          }
        }
        if (template.config.budget) {
          if (template.config.budget.daily) agent.updateSetting('budget.daily', template.config.budget.daily);
          if (template.config.budget.monthly) agent.updateSetting('budget.monthly', template.config.budget.monthly);
        }
        if (template.config.toolPermissions) {
          if (template.config.toolPermissions.allowedTools) {
            agent.updateSetting('toolPermissions.allowedTools', template.config.toolPermissions.allowedTools);
          }
          if (template.config.toolPermissions.deniedTools) {
            agent.updateSetting('toolPermissions.deniedTools', template.config.toolPermissions.deniedTools);
          }
          if (template.config.toolPermissions.confirmDestructive !== undefined) {
            agent.updateSetting('toolPermissions.confirmDestructive', template.config.toolPermissions.confirmDestructive);
          }
        }
        let response = `✅ Applied template '${name}'.`;
        if (template.initialPrompt) {
          response += `\n💡 Suggestion: ${template.initialPrompt}`;
        }
        return response;
      } catch (error: any) {
        return `❌ Failed to apply template: ${error.message}`;
      }
    });

    // ============================================================================
    // Aliases (Phase 6)
    // ============================================================================

    // Note: AliasManager initialized in AgentTUI, stored in agent config for access
    this.register("aliases", async (handlers) => {
      // Get alias manager from agent (stored as a secret property)
      const agentAny = handlers.agent as any;
      const aliasMgr = agentAny.aliasManager;
      if (!aliasMgr) {
        return "❌ Aliases not available (CLI only)";
      }
      const aliases = aliasMgr.list();
      const entries = Object.entries(aliases);
      if (entries.length === 0) {
        return "No aliases defined.";
      }
      let out = "📛 Aliases:\n\n";
      for (const [key, val] of entries) {
        out += `  :${key} -> ${(val as string[]).join(' ')}\n`;
      }
      return out;
    });

    this.register("alias add", async (handlers, ...args) => {
      if (args.length < 2) {
        return "Usage: /alias add <name> <command> [args...]";
      }
      const [name, ...cmdArgs] = args;
      const agentAny = handlers.agent as any;
      const aliasMgr = agentAny.aliasManager;
      if (!aliasMgr) {
        return "❌ Aliases not available (CLI only)";
      }
      aliasMgr.set(name, cmdArgs);
      return `✅ Alias ':${name}' set to '${cmdArgs.join(' ')}'`;
    });

    this.register("alias rm", async (handlers, ...args) => {
      if (args.length === 0) {
        return "Usage: /alias rm <name>";
      }
      const [name] = args;
      const agentAny = handlers.agent as any;
      const aliasMgr = agentAny.aliasManager;
      if (!aliasMgr) {
        return "❌ Aliases not available (CLI only)";
      }
      const removed = aliasMgr.delete(name);
      if (removed) {
        return `✅ Alias ':${name}' removed`;
      } else {
        return `❌ Alias ':${name}' not found`;
      }
    });

    this.register("alias reset", async (handlers) => {
      const agentAny = handlers.agent as any;
      const aliasMgr = agentAny.aliasManager;
      if (!aliasMgr) {
        return "❌ Aliases not available (CLI only)";
      }
      aliasMgr.reset();
      return "✅ Aliases reset to defaults";
    });

    // ============================================================================
    // Git Integration (Phase 6)
    // ============================================================================

    this.register("git", async (handlers, ...args) => {
      if (args.length === 0) {
        const settings = handlers.agent.getSettings();
        const git = (settings.git as any) || {};
        let out = `🔧 Git Integration:\n`;
        out += `  Auto-commit: ${git.autoCommit ? 'ON' : 'OFF'}\n`;
        out += `  Commit message: ${git.commitMessage || 'Agent session update'}\n`;
        out += `\nCommands:`;
        out += `\n  /git on - Enable auto-commit`;
        out += `\n  /git off - Disable auto-commit`;
        out += `\n  /git msg <text> - Set commit message`;
        out += `\n  /git status - Show git status in cwd`;
        return out;
      }
      const sub = args[0];
      if (sub === 'on') {
        handlers.agent.updateSetting('git.autoCommit', true);
        return "✅ Git auto-commit enabled";
      }
      if (sub === 'off') {
        handlers.agent.updateSetting('git.autoCommit', false);
        return "✅ Git auto-commit disabled";
      }
      if (sub === 'msg') {
        const msg = args.slice(1).join(' ');
        if (!msg) return '❌ Usage: /git msg <commit message>';
        handlers.agent.updateSetting('git.commitMessage', msg);
        return `✅ Commit message set to: ${msg}`;
      }
      if (sub === 'status') {
        try {
          const { execSync } = require('child_process');
          const output = execSync('git status --short', { cwd: handlers.agent.getConfig().cwd, encoding: 'utf-8' });
          return `📊 Git Status:\n${output || '(clean)'}`;
        } catch (e: any) {
          return `❌ Not a git repository or git not available: ${e.message}`;
        }
      }
      return "❌ Unknown subcommand. Use /git for help.";
    });

    // ============================================================================
    // Test Generation (Phase 7)
    // ============================================================================

    this.register("gen-test", async (handlers, ...args) => {
      if (args.length < 2) {
        return `Usage: /gen-test <language> <spec>\nGenerates test code from a specification.\nExample: /gen-test typescript "Unit test for add function that returns sum of two numbers"`;
      }
      const [language, ...specParts] = args;
      const spec = specParts.join(' ');
      const validLangs = ['typescript', 'javascript', 'python', 'go', 'rust', 'java'];
      if (!validLangs.includes(language)) {
        return `❌ Unsupported language: ${language}. Supported: ${validLangs.join(', ')}`;
      }
      const prompt = `Generate a comprehensive test suite in ${language} for the following specification:\n\n${spec}\n\nInclude: test setup, edge cases, and assertions. Use appropriate testing frameworks.`;
      await handlers.agent.prompt(prompt);
      return `🧪 Generating ${language} tests...`;
    });

    // ============================================================================
    // Plugin Development (Phase 8)
    // ============================================================================

    this.register("create-extension", async (handlers, ...args) => {
      if (args.length === 0) {
        return "Usage: /create-extension <name>\nCreates a new extension boilerplate in ./extensions/\nExample: /create-extension my-tool";
      }
      const extName = args[0];
      const cwd = handlers.agent.getConfig().cwd;
      const extDir = path.resolve(cwd, 'extensions', extName);
      try {
        if (fs.existsSync(extDir)) {
          return `❌ Extension directory already exists: ${extDir}`;
        }
        fs.mkdirSync(extDir, { recursive: true });
        // Create package.json
        const pkg = {
          name: `qclaw-extension-${extName}`,
          version: '0.1.0',
          description: 'Custom qclaw extension',
          main: 'dist/index.js',
          types: 'dist/index.d.ts',
          scripts: {
            build: 'tsc',
            watch: 'tsc -w'
          },
          dependencies: {
            '@mariozechner/pi-coding-agent': '^0.68.0'
          },
          devDependencies: {
            typescript: '^5.0.0'
          }
        };
        fs.writeFileSync(path.join(extDir, 'package.json'), JSON.stringify(pkg, null, 2));
        // Create tsconfig
        const tsconfig = {
          compilerOptions: {
            target: 'ES2020',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            outDir: 'dist',
            rootDir: 'src',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            resolveJsonModule: true
          },
          include: ['src/**/*'],
          exclude: ['node_modules', 'dist']
        };
        fs.writeFileSync(path.join(extDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
        // Create src directory and index.ts
        const srcDir = path.join(extDir, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        const indexContent = `import { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function(pi: ExtensionAPI) {
  pi.on("agent_start", () => {
    console.log("Extension ${extName} loaded!");
  });

  // Register tools, hooks, etc.
}
`;
        fs.writeFileSync(path.join(srcDir, 'index.ts'), indexContent);
        // Create README
        fs.writeFileSync(path.join(extDir, 'README.md'), `# ${extName} Extension\n\nCustom extension for qclaw.\n\n## Development\n\n1. npm install\n2. npm run build\n3. Reload agent with /reload\n`);
        // Install dependencies
        try {
          const { spawnSync } = require('child_process');
          spawnSync('npm', ['install'], { cwd: extDir, stdio: 'ignore' });
        } catch (e) {
          // ignore
        }
        return `✅ Extension boilerplate created at: ${extDir}\n\nNext steps:\n1. cd ${extDir}\n2. npm install\n3. Edit src/index.ts\n4. Run \`npm run build\`\n5. Use /reload in qclaw to load\n`;
      } catch (error: any) {
        return `❌ Failed to create extension: ${error.message}`;
      }
    });

    // ============================================================================
    // Codebase Search & Refactoring (Phase 7)
    // ============================================================================


    this.register("grep", async (handlers, ...args) => {
      if (args.length < 2) {
        return "Usage: /grep <pattern> [glob]\nSearch files for pattern. Example: /grep 'TODO' **/*.ts";
      }
      const [pattern, glob = '**/*'] = args;
      const cwd = handlers.agent.getConfig().cwd;
      try {
        const { readdirSync, statSync } = await import('fs');
        const { minimatch } = await import('minimatch');
        const results: string[] = [];
        const fs = await import('fs');
        const walk = (dir: string) => {
          const fsEntries = fs.readdirSync(dir);
          for (const name of fsEntries) {
            const full = path.join(dir, name);
            try {
              const s = fs.statSync(full);
              if (s.isDirectory()) {
                walk(full);
              } else if (minimatch(full.replace(cwd + '/', ''), glob)) {
                const content = fs.readFileSync(full, 'utf-8');
                const lines = content.split('\n');
                lines.forEach((line: string, idx: number) => {
                  if (line.includes(pattern)) {
                    results.push(`${full}:${idx + 1}: ${line.trim()}`);
                  }
                });
              }
            } catch {}
          }
        };
        walk(cwd);
        if (results.length === 0) return `No matches for: ${pattern}`;
        const output = `🔍 Found ${results.length} matches:\n\n` + results.slice(0, 50).join('\n') + (results.length > 50 ? `\n... and ${results.length - 50} more` : '');
        return output;
      } catch (error: any) {
        return `❌ Search failed: ${error.message}`;
      }
    });

    this.register("refactor", async (handlers, ...args) => {
      if (args.length === 0) {
        return "Usage: /refactor <file> <suggestion>\nAsk AI to refactor code. Example: /refactor src/utils.ts extract error handling";
      }
      const [file, ...suggestionParts] = args;
      const suggestion = suggestionParts.join(' ');
      const cwd = handlers.agent.getConfig().cwd;
      const targetPath = path.resolve(cwd, file);
      try {
        const { readFileSync } = await import('fs');
        const content = readFileSync(targetPath, 'utf-8');
        const prompt = `Refactor the following code based on the suggestion. Provide the complete refactored code.\n\nFile: ${file}\nSuggestion: ${suggestion}\n\nCode:\n\n\`\`\`\n${content}\n\`\`\``;
        await handlers.agent.prompt(prompt);
        return `🔧 Refactoring ${file}...`;
      } catch (error: any) {
        return `❌ Refactor failed: ${error.message}`;
      }
    });

    this.register("migrate", async (handlers, ...args) => {
      if (args.length < 2) {
        return "Usage: /migrate <target> <description>\nMigrate code to new version/framework. Example: /migrate react 18 upgrade hooks";
      }
      const [target, ...descParts] = args;
      const description = descParts.join(' ');
      const prompt = `You are a migration expert. Help migrate the codebase to ${target}. Focus on: ${description}. Provide step-by-step instructions and code changes.`;
      await handlers.agent.prompt(prompt);
      return `🚀 Starting migration to ${target}...`;
    });

    // ============================================================================
    // Plugin Marketplace (Phase 10)
    // ============================================================================

    this.register("marketplace", async (handlers, ...args) => {
      if (args.length === 0 || args[0] === 'help') {
        return `📦 Plugin Marketplace\n\nCommands:` +
          `\n  /marketplace search <query> - Search npm for qclaw extensions` +
          `\n  /marketplace install <package> - Install extension from npm`;
      }
      const sub = args[0];
      if (sub === 'search') {
        const query = args.slice(1).join(' ');
        if (!query) return '❌ Usage: /marketplace search <query>';
        try {
          const { execSync } = require('child_process');
          const cmd = `npm search ${query} --json`;
          const output = execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
          const results = JSON.parse(output || '[]');
          if (results.length === 0) return `No packages found for: ${query}`;
          const list = results.slice(0, 10).map((p: any) => 
            `  ${p.name} (v${p.version})\n    ${p.description || ''}\n    keywords: ${p.keywords?.join(', ') || ''}\n`
          ).join('\n');
          return `🔍 Search results (${results.length} total):\n\n${list}${results.length > 10 ? '\n... and more' : ''}`;
        } catch (error: any) {
          return `❌ Search failed: ${error.message}`;
        }
      }
      if (sub === 'install') {
        const pkg = args[1];
        if (!pkg) return '❌ Usage: /marketplace install <package>';
        try {
          const { spawnSync } = require('child_process');
          const result = spawnSync('npm', ['install', pkg, '--global'], { stdio: 'inherit' });
          if (result.status === 0) {
            return `✅ Installed ${pkg}. Add to ~/.qclaw/extensions/ or symlink.`;
          } else {
            return `❌ Install failed with exit code ${result.status}`;
          }
        } catch (error: any) {
          return `❌ Install error: ${error.message}`;
        }
      }
      return '❌ Unknown command. Use /marketplace help';
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

    this.register("editor", async (handlers, ...args) => {
      const file = args[0];
      if (!file) {
        return "Usage: /editor <file>\nOpens file in external editor ($EDITOR or default).";
      }
      return "📝 Editor integration placeholder";
    });

    this.register("analyze-image", async (handlers, ...args) => {
      if (args.length === 0) {
        return "Usage: /analyze-image <path> [question]\nAnalyzes an image using vision capabilities.";
      }
      const path = args[0];
      const question = args.slice(1).join(' ') || "Describe this image in detail";
      await handlers.agent.prompt(`Use the analyze_image tool to analyze "${path}". Question: ${question}`);
      return "📷 Analyzing image...";
    });

    // ============================================================================
    // Multi-Agent Collaboration (Phase 10)
    // ============================================================================

    this.register("agent-create", async (handlers, ...args) => {
      if (args.length === 0) {
        return "Usage: /agent-create <id> [config]\nCreates a new agent instance for collaboration.\nExample: /agent-create reviewer \"--thinking high\"";
      }
      const [agentId, ...configParts] = args;
      if (handlers.manager) {
        try {
          await handlers.manager.createAgent(agentId, {
            ...handlers.agent.getConfig(),
            ...parseConfig(configParts.join(' '))
          });
          return `✅ Created agent '${agentId}'. Use /agent-switch ${agentId} to activate.`;
        } catch (error: any) {
          return `❌ Failed: ${error.message}`;
        }
      }
      return "❌ Agent manager not available";
    });
    this.register("agent-switch", async (handlers, ...args) => {
      if (args.length === 0) {
        return "Usage: /agent-switch <id>\nSwitches active agent. Use /agents to list.";
      }
      const [agentId] = args;
      if (handlers.manager) {
        const ok = await handlers.manager.switchTo(agentId);
        if (ok) {
          return `🔀 Switched to agent '${agentId}'`;
        } else {
          return `❌ No such agent: ${agentId}`;
        }
      }
      return "❌ Agent manager not available";
    });
    this.register("agents", async (handlers) => {
      if (!handlers.manager) return "❌ Agent manager not available";
      const list = handlers.manager.listAgents();
      if (list.length === 0) {
        return "No agents created. Use /agent-create <id>";
      }
      let out = `👥 Agents (${list.length}):\n\n`;
      list.forEach(a => {
        out += `  ${a.id} ${a.active ? '(active)' : ''}\n`;
        out += `    Stats: ${a.stats.turns} turns, ${a.stats.totalTokens} tokens\n`;
        out += `    Model: ${a.config.model || 'default'}\n\n`;
      });
      return out;
    });
    this.register("agent-collab", async (handlers, ...args) => {
      if (args.length < 1) {
        return "Usage: /agent-collab <prompt> [maxAgents]\nBroadcast prompt to all agents and summarize responses.";
      }
      const maxAgents = args[args.length - 1] === '1' || args[args.length - 1] === '2' || args[args.length - 1] === '3'
        ? parseInt(args[args.length - 1])
        : undefined;
      const prompt = maxAgents ? args.slice(0, -1).join(' ') : args.join(' ');
      if (handlers.manager) {
        const summary = await handlers.manager.collaborate(prompt, maxAgents);
        return summary;
      }
      return "❌ Agent manager not available";
    });

    this.register("logs", async (handlers, ...args) => {
      return "📜 Logs command - implement later";
    });

    // ============================================================================
    // Code Diff & Patching (Phase 7)
    // ============================================================================

    this.register("diff-files", async (handlers, ...args) => {
      if (args.length < 2) {
        return "Usage: /diff-files <file1> <file2>\nShows unified diff between two files.";
      }
      const [file1, file2] = args;
      const cwd = handlers.agent.getConfig().cwd;
      const path1 = path.resolve(cwd, file1);
      const path2 = path.resolve(cwd, file2);
      try {
        const { readFileSync } = await import('fs');
        const content1 = readFileSync(path1, 'utf-8');
        const content2 = readFileSync(path2, 'utf-8');
        const lines1 = content1.split('\n');
        const lines2 = content2.split('\n');
        const diff = computeDiff(path1, path2, lines1, lines2);
        return diff || "No differences found.";
      } catch (error: any) {
        return `❌ Diff failed: ${error.message}`;
      }
    });

    this.register("patch-create", async (handlers, ...args) => {
      if (args.length < 2) {
        return "Usage: /patch-create <original> <modified> [output.patch]\nCreates a unified diff patch.";
      }
      const [original, modified, outputFile] = args;
      const cwd = handlers.agent.getConfig().cwd;
      const origPath = path.resolve(cwd, original);
      const modPath = path.resolve(cwd, modified);
      const outPath = outputFile ? path.resolve(cwd, outputFile) : path.join(cwd, 'changes.patch');
      try {
        const { readFileSync, writeFileSync } = await import('fs');
        const content1 = readFileSync(origPath, 'utf-8');
        const content2 = readFileSync(modPath, 'utf-8');
        const diff = computeDiff(origPath, modPath, content1.split('\n'), content2.split('\n'));
        if (!diff) return "No differences to patch.";
        const patchContent = `--- ${original}\n+++ ${modified}\n${diff}`;
        writeFileSync(outPath, patchContent, 'utf-8');
        return `✅ Patch created: ${outPath}`;
      } catch (error: any) {
        return `❌ Patch creation failed: ${error.message}`;
      }
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
    // Inject manager if not present
    if (!handlers.manager && (agentManager as any)) {
      handlers.manager = agentManager as any;
    }
    try {
      const result = await handler(handlers, ...args);
      // Record command in history (including errors)
      this.history.unshift({ command: name, args, timestamp: Date.now() });
      if (this.history.length > this.MAX_HISTORY) {
        this.history.pop();
      }
      return result;
    } catch (error: any) {
      // Also record failed commands
      this.history.unshift({ command: name, args, timestamp: Date.now() });
      if (this.history.length > this.MAX_HISTORY) {
        this.history.pop();
      }
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

/**
 * Computes a unified diff between two files (line-based)
 */
function computeDiff(file1: string, file2: string, lines1: string[], lines2: string[]): string | null {
  // Simple line-by-line diff (LCS could be used for more accurate results)
  const max = Math.max(lines1.length, lines2.length);
  let hunkStart1: number | null = null;
  let hunkStart2: number | null = null;
  let hunkLines: string[] = [];
  let diffOutput = '';

  const flushHunk = () => {
    if (hunkLines.length === 0) return;
    const start1 = hunkStart1 !== null ? hunkStart1 + 1 : 1;
    const start2 = hunkStart2 !== null ? hunkStart2 + 1 : 1;
    const count1 = hunkLines.filter(l => l.startsWith('-')).length;
    const count2 = hunkLines.filter(l => l.startsWith('+')).length;
    diffOutput += `@@ -${start1},${count1} +${start2},${count2} @@\n`;
    diffOutput += hunkLines.join('\n');
    if (!diffOutput.endsWith('\n')) diffOutput += '\n';
    hunkLines = [];
    hunkStart1 = null;
    hunkStart2 = null;
  };

  for (let i = 0; i < max; i++) {
    const line1 = lines1[i] ?? null;
    const line2 = lines2[i] ?? null;

    if (line1 === line2) {
      // Same line
      if (hunkLines.length > 0) {
        hunkLines.push(`  ${line1}`);
      }
      continue;
    }

    // Different or missing lines
    if (hunkStart1 === null) {
      hunkStart1 = i;
      hunkStart2 = i;
    }

    // Collect differences within a hunk (simplified)
    // We'll just mark removals and additions without complex LCS
    if (line1 !== null) {
      hunkLines.push(`-${line1}`);
    }
    if (line2 !== null) {
      hunkLines.push(`+${line2}`);
    }

    // Flush after a reasonable gap of equal lines
    // For simplicity, flush at every diff point here
    flushHunk();
  }

  return diffOutput || null;
}

/** Parse simple key=value config string into object */
function parseConfig(str: string): any {
  const result: any = {};
  if (!str) return result;
  const parts = str.split(' ');
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith('--')) {
      const key = parts[i].slice(2);
      let value: any = true;
      if (i + 1 < parts.length && !parts[i + 1].startsWith('--')) {
        value = parts[++i];
        // Try parse boolean/number
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(Number(value))) value = Number(value);
      }
      result[key] = value;
    }
  }
  return result;
}

// Template manager singleton for session templates
const templateManager = new TemplateManager();

// Agent manager singleton (for multi-agent mode)
const agentManager = new AgentManager();

export const commandRegistry = new CommandRegistry();
