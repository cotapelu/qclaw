#!/usr/bin/env node

/**
 * Memory Tool - Persistent knowledge store with branching support
 *
 * Stores arbitrary text snippets (facts, code snippets, decisions) in the session.
 * Fully stateful: reconstructs from session branch automatically.
 *
 * Actions:
 * - add: Store a new memory with optional tags
 * - list: Show all memories with IDs
 * - get: Retrieve a specific memory by ID
 * - delete: Remove a memory by ID
 * - clear: Remove all memories
 * - search: Find memories by text/tag
 */

import type { ExtensionAPI, ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import { matchesKey, Text, truncateToWidth } from "@mariozechner/pi-tui";

export interface Memory {
  id: number;
  text: string;
  tags?: string[];
  created: number;
}

export interface MemoryDetails {
  action: "add" | "list" | "get" | "delete" | "clear" | "search";
  memories: Memory[];
  nextId: number;
  targetId?: number;
  error?: string;
}

class MemoryListComponent {
  private memories: Memory[];
  private theme: Theme;
  private onClose: () => void;
  private searchQuery: string = "";
  private filterTag: string | null = null;
  private cachedWidth?: number;
  private cachedLines?: string[];

  constructor(memories: Memory[], theme: Theme, onClose: () => void) {
    this.memories = memories;
    this.theme = theme;
    this.onClose = onClose;
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
      this.onClose();
    }
  }

  private getFiltered(): Memory[] {
    let result = this.memories;
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(m => m.text.toLowerCase().includes(q) || (m.tags?.some(t => t.toLowerCase().includes(q))));
    }
    if (this.filterTag) {
      result = result.filter(m => m.tags?.includes(this.filterTag));
    }
    return result;
  }

  render(width: number): string[] {
    if (this.cachedWidth && this.cachedWidth === width && this.cachedLines) {
      return this.cachedLines;
    }

    const lines: string[] = [];
    const th = this.theme;

    lines.push("");
    const title = th.fg("accent", " Memories ");
    const header = th.fg("borderMuted", "─".repeat(3)) + title + th.fg("borderMuted", "─".repeat(Math.max(0, width - 10)));
    lines.push(truncateToWidth(header, width));
    lines.push("");

    const total = this.memories.length;
    const filtered = this.getFiltered();
    if (total === 0) {
      lines.push(truncateToWidth(`  ${th.fg("dim", "No memories stored. Use memory tool to add.")}`, width));
    } else {
      lines.push(truncateToWidth(`  ${th.fg("muted", `${total} total, ${filtered.length} shown`)}`, width));

      if (this.searchQuery) {
        lines.push(truncateToWidth(`  Search: ${th.fg("accent", this.searchQuery)}`, width));
      }
      if (this.filterTag) {
        lines.push(truncateToWidth(`  Filter by tag: ${th.fg("accent", this.filterTag)}`, width));
      }
      lines.push("");

      const maxShow = 50;
      const toShow = filtered.slice(0, maxShow);

      for (const mem of toShow) {
        const id = th.fg("accent", `#${mem.id}`);
        const preview = mem.text.length > 60 ? mem.text.substring(0, 60) + "..." : mem.text;
        const text = th.fg("text", preview);
        const tags = mem.tags && mem.tags.length > 0
          ? th.fg("dim", ` [${mem.tags.join(", ")}]`)
          : "";
        lines.push(truncateToWidth(`  ${id} ${text}${tags}`, width));
      }

      if (filtered.length > maxShow) {
        lines.push(truncateToWidth(`  ${th.fg("dim", `...and ${filtered.length - maxShow} more.`)}`, width));
      }
    }

    lines.push("");
    lines.push(truncateToWidth(`  ${th.fg("dim", "Press Escape to close")}`, width));
    lines.push("");

    this.cachedWidth = width;
    this.cachedLines = lines;
    return lines;
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }
}

export function registerMemoryTool(api: ExtensionAPI): void {
  let memories: Memory[] = [];
  let nextId = 1;

  const reconstructState = (ctx: ExtensionContext) => {
    memories = [];
    nextId = 1;
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "message" && entry.message.role === "toolResult" && entry.message.toolName === "memory") {
        const details = entry.message.details as MemoryDetails | undefined;
        if (details) {
          memories = details.memories;
          nextId = details.nextId;
        }
      }
    }
  };

  api.on("session_start", async (_event, ctx) => reconstructState(ctx));
  api.on("session_tree", async (_event, ctx) => reconstructState(ctx));

  api.registerTool({
    name: "memory",
    label: "Memory",
    description: "Store and retrieve arbitrary text snippets with optional tags. Supports add, list, get, delete, clear, search.",
    promptSnippet: "Store and search text memories",
    promptGuidelines: [
      "Add: memory({ action: 'add', text: 'Important fact', tags?: ['tag1', 'tag2'] })",
      "List: memory({ action: 'list' })",
      "Get: memory({ action: 'get', id: <number> })",
      "Delete: memory({ action: 'delete', id: <number> })",
      "Clear all: memory({ action: 'clear' })",
      "Search: memory({ action: 'search', query: 'text' })",
      "Memories persist in session and support branching.",
    ],
    parameters: {},

    async execute(_toolCallId, params: any, _signal, _onUpdate, _ctx) {
      const action = params.action as "add" | "list" | "get" | "delete" | "clear" | "search";

      const makeDetails = (action: MemoryDetails["action"], memories: Memory[], nextId: number, targetId?: number, error?: string): MemoryDetails => ({
        action,
        memories: [...memories],
        nextId,
        targetId,
        error,
      });

      switch (action) {
        case "add": {
          const text = params.text as string | undefined;
          if (!text) {
            return { content: [{ type: "text", text: "Error: text required for add" }], details: makeDetails("add", memories, nextId, undefined, "text required"), isError: false };
          }
          const mem: Memory = {
            id: nextId++,
            text,
            tags: params.tags as string[] | undefined,
            created: Date.now(),
          };
          memories.push(mem);
          api.appendEntry("memory", mem);
          return { content: [{ type: "text", text: `Stored memory #${mem.id}` }], details: makeDetails("add", memories, nextId), isError: false };
        }

        case "list": {
          const details = makeDetails("list", memories, nextId);
          if (memories.length === 0) {
            return { content: [{ type: "text", text: "No memories stored." }], details, isError: false };
          }
          const lines = memories.map(m => `#${m.id}: ${m.text.length > 80 ? m.text.substring(0, 80) + "..." : m.text}${m.tags ? ` [${m.tags.join(", ")}]` : ""}`);
          return { content: [{ type: "text", text: lines.join("\n") }], details, isError: false };
        }

        case "get": {
          const id = params.id as number | undefined;
          if (id === undefined) {
            return { content: [{ type: "text", text: "Error: id required for get" }], details: makeDetails("get", memories, nextId, undefined, "id required"), isError: false };
          }
          const mem = memories.find(m => m.id === id);
          if (!mem) {
            return { content: [{ type: "text", text: `Memory #${id} not found` }], details: makeDetails("get", memories, nextId, id, `#${id} not found`), isError: false };
          }
          return { content: [{ type: "text", text: mem.text }], details: makeDetails("get", memories, nextId, id), isError: false };
        }

        case "delete": {
          const id = params.id as number | undefined;
          if (id === undefined) {
            return { content: [{ type: "text", text: "Error: id required for delete" }], details: makeDetails("delete", memories, nextId, undefined, "id required"), isError: false };
          }
          const index = memories.findIndex(m => m.id === id);
          if (index === -1) {
            return { content: [{ type: "text", text: `Memory #${id} not found` }], details: makeDetails("delete", memories, nextId, id, `#${id} not found`), isError: false };
          }
          const deleted = memories.splice(index, 1)[0];
          api.appendEntry("memory", { ...deleted, _deleted: true });
          return { content: [{ type: "text", text: `Deleted memory #${id}` }], details: makeDetails("delete", memories, nextId, id), isError: false };
        }

        case "clear": {
          const count = memories.length;
          for (const mem of memories) {
            api.appendEntry("memory", { ...mem, _deleted: true });
          }
          memories = [];
          nextId = 1;
          return { content: [{ type: "text", text: `Cleared ${count} memories` }], details: makeDetails("clear", memories, nextId), isError: false };
        }

        case "search": {
          const query = params.query as string | undefined;
          if (!query) {
            return { content: [{ type: "text", text: "Error: query required for search" }], details: makeDetails("search", memories, nextId, undefined, "query required"), isError: false };
          }
          const results = memories.filter(m => m.text.toLowerCase().includes(query.toLowerCase()) || (m.tags?.some(t => t.toLowerCase().includes(query.toLowerCase()))));
          const lines = results.map(m => `#${m.id}: ${m.text}${m.tags ? ` [${m.tags.join(", ")}]` : ""}`);
          const summary = `Found ${results.length} of ${memories.length} memories:\n` + lines.join("\n");
          return { content: [{ type: "text", text: summary }], details: { ...makeDetails("search", memories, nextId), memories: results }, isError: false };
        }

        default: {
          return { content: [{ type: "text", text: `Unknown action: ${action}` }], details: makeDetails("list", memories, nextId), isError: false };
        }
      }
    },

    renderCall(args: any, theme: any, _context: any) {
      const th = theme;
      let text = th.fg("toolTitle", th.bold("memory ")) + th.fg("muted", args.action);
      if (args.text) text += ` ${th.fg("dim", `"${args.text.substring(0, 30)}${args.text.length > 30 ? "..." : ""}"`)}`;
      if (args.id !== undefined) text += ` ${th.fg("accent", `#${args.id}`)}`;
      if (args.tags) text += ` ${th.fg("warning", `[${args.tags.length} tags]`)}`;
      return new Text(text, 0, 0);
    },

    renderResult(result: any, options: { expanded: boolean; isPartial: boolean }, theme: any, _context: any) {
      const th = theme;
      const details = result.details as MemoryDetails | undefined;

      if (options.isPartial) {
        return new Text(th.fg("warning", "Processing..."), 0, 0);
      }

      if (!details) {
        return new Text(th.fg("muted", result.content?.[0]?.text || ""), 0, 0);
      }

      if (details.error) {
        return new Text(th.fg("error", `Error: ${details.error}`), 0, 0);
      }

      const { action, memories, targetId } = details;

      switch (action) {
        case "add": {
          const added = memories[memories.length - 1];
          return new Text(th.fg("success", "✓ Stored ") + th.fg("accent", `#${added.id}`) + th.fg("muted", ` ${added.text.substring(0, 40)}...`), 0, 0);
        }
        case "list": {
          if (memories.length === 0) return new Text(th.fg("dim", "No memories"), 0, 0);
          return new Text(th.fg("success", `✓ ${memories.length} memories`) + (options.expanded ? th.fg("muted", " (expand to see list)") : ""), 0, 0);
        }
        case "get": {
          const mem = memories.find(m => m.id === targetId);
          const preview = mem ? mem.text.substring(0, 100) : "";
          return new Text(th.fg("success", "✓ ") + th.fg("accent", `#${targetId}`) + th.fg("muted", ` ${preview}...`), 0, 0);
        }
        case "delete": {
          return new Text(th.fg("success", "✓ Deleted ") + th.fg("accent", `#${targetId}`), 0, 0);
        }
        case "clear": {
          return new Text(th.fg("success", "✓ Cleared all memories"), 0, 0);
        }
        case "search": {
          const results = memories.length;
          return new Text(th.fg("success", `✓ Found ${results} memories`) + (options.expanded ? th.fg("muted", " (expand to see results)") : ""), 0, 0);
        }
        default:
          return new Text(th.fg("muted", result.content?.[0]?.text || ""), 0, 0);
      }
    },

    renderShell: "self",
  });

  api.registerCommand("memory", {
    description: "Interactive memory viewer",
    handler: async (_args: string, ctx: ExtensionContext) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("/memory requires interactive mode", "error");
        return;
      }
      await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
        return new MemoryListComponent(memories, theme, () => done());
      });
    }
  });
}
