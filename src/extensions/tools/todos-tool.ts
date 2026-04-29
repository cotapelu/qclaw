#!/usr/bin/env node

/**
 * Todos Tool - Stateful Todo List Management
 *
 * Features: Full CRUD, state reconstruction, custom rendering, interactive /todos
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { matchesKey, Text, truncateToWidth } from "@mariozechner/pi-tui";

// ============================================================================
// Types
// ============================================================================

export type Priority = "low" | "medium" | "high" | "critical";

export interface Todo {
  id: number;
  text: string;
  done: boolean;
  priority?: Priority;
  due?: string;
  created: number;
}

export interface TodoDetails {
  action: "list" | "add" | "toggle" | "clear" | "delete";
  todos: Todo[];
  nextId: number;
  error?: string;
  stats?: {
    total: number;
    done: number;
    pending: number;
    byPriority: Record<string, number>;
  };
  targetId?: number;
}

// ============================================================================
// Custom UI Component for /todos command
// ============================================================================

class TodoListComponent {
  private todos: Todo[];
  private theme: any;
  private onClose: () => void;
  private filter: { done?: boolean; priority?: Priority } = {};
  private sortBy: "id" | "priority" | "due" = "id";
  private searchQuery: string = "";
  private cachedWidth?: number;
  private cachedLines?: string[];

  constructor(todos: Todo[], theme: any, onClose: () => void, searchQuery?: string) {
    this.todos = todos;
    this.theme = theme;
    this.onClose = onClose;
    this.searchQuery = searchQuery || "";
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
      this.onClose();
      return;
    }
    if (matchesKey(data, "ctrl+a")) {
      // Clear all filters
      this.filter = {};
      this.invalidate();
      return;
    }
    if (matchesKey(data, "ctrl+d")) {
      // Toggle done filter
      if (this.filter.done === true) {
        this.filter.done = undefined;
      } else {
        this.filter.done = true;
      }
      this.invalidate();
      return;
    }
    if (matchesKey(data, "ctrl+p")) {
      // Toggle pending filter
      if (this.filter.done === false) {
        this.filter.done = undefined;
      } else {
        this.filter.done = false;
      }
      this.invalidate();
      return;
    }
    if (matchesKey(data, "ctrl+shift+p")) {
      // Cycle priority filter
      const priorities: Priority[] = ["low", "medium", "high", "critical"];
      const current = this.filter.priority;
      if (current === undefined) {
        this.filter.priority = "low";
      } else {
        const idx = priorities.indexOf(current);
        this.filter.priority = idx < priorities.length - 1 ? priorities[idx + 1] : undefined;
      }
      this.invalidate();
      return;
    }
    if (matchesKey(data, "ctrl+s")) {
      // Cycle sort
      const sorts: Array<"id" | "priority" | "due"> = ["id", "priority", "due"];
      const idx = sorts.indexOf(this.sortBy);
      this.sortBy = idx < sorts.length - 1 ? sorts[idx + 1] : sorts[0];
      this.invalidate();
      return;
    }
  }

  private getFilteredAndSorted(): Todo[] {
    let result = this.todos;

    // Apply search query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(t => t.text.toLowerCase().includes(q));
    }

    // Apply done/pending filter
    if (this.filter.done !== undefined) {
      result = result.filter(t => t.done === this.filter.done);
    }

    // Apply priority filter
    if (this.filter.priority) {
      result = result.filter(t => t.priority === this.filter.priority);
    }

    // Apply sort
    const sorted = [...result].sort((a, b) => {
      switch (this.sortBy) {
        case "priority": {
          const order: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
          const pa = a.priority || "low";
          const pb = b.priority || "low";
          return order[pa as Priority] - order[pb as Priority];
        }
        case "due": {
          if (!a.due && !b.due) return 0;
          if (!a.due) return 1;
          if (!b.due) return -1;
          return new Date(a.due).getTime() - new Date(b.due).getTime();
        }
        default:
          return a.id - b.id;
      }
    });

    return sorted;
  }

  render(width: number): string[] {
    if (this.cachedWidth && this.cachedWidth === width && this.cachedLines) {
      return this.cachedLines;
    }

    const lines: string[] = [];
    const th = this.theme;

    lines.push("");
    const title = th.fg("accent", " Todos ");
    const headerLine =
      th.fg("borderMuted", "─".repeat(3)) + title + th.fg("borderMuted", "─".repeat(Math.max(0, width - 10)));
    lines.push(truncateToWidth(headerLine, width));
    lines.push("");

    const total = this.todos.length;
    const done = this.todos.filter(t => t.done).length;
    const pending = total - done;

    if (total === 0) {
      lines.push(truncateToWidth(`  ${th.fg("dim", "No todos yet. Ask the agent to add some!")}`, width));
    } else {
      // Statistics
      lines.push(truncateToWidth(`  ${th.fg("muted", `${total} total, ${done} ✓, ${pending} pending`)}`, width));

      // Search query
      if (this.searchQuery) {
        lines.push(truncateToWidth(`  Search: ${th.fg("accent", this.searchQuery)}`, width));
      }

      // Filter status
      const filterParts: string[] = [];
      if (this.filter.done === true) filterParts.push(th.fg("success", "Done"));
      if (this.filter.done === false) filterParts.push(th.fg("warning", "Pending"));
      if (this.filter.priority) filterParts.push(th.fg("accent", `Priority: ${this.filter.priority}`));
      if (filterParts.length > 0) {
        lines.push(truncateToWidth(`  Filter: ${filterParts.join(", ")}`, width));
      }

      // Sort status
      lines.push(truncateToWidth(`  Sort: ${this.sortBy} (Ctrl+S to cycle)`, width));
      lines.push("");

      const displayed = this.getFilteredAndSorted();
      const maxShow = 50;
      const toShow = displayed.slice(0, maxShow);

      for (const todo of toShow) {
        const check = todo.done ? th.fg("success", "✓") : th.fg("dim", "○");
        const id = th.fg("accent", `#${todo.id}`);
        const priorityColor = {
          critical: "error",
          high: "warning",
          medium: "muted",
          low: "dim"
        }[todo.priority || "low"];
        const priorityText = todo.priority ? th.fg(priorityColor, `[${todo.priority[0].toUpperCase()}]`) : "";
        const dueText = todo.due ? th.fg("accent", `📅${new Date(todo.due).toLocaleDateString()}`) : "";
        const textColor = todo.done ? "dim" : "text";
        const text = th.fg(textColor, todo.text);
        lines.push(truncateToWidth(`  ${check} ${id} ${priorityText} ${dueText} ${text}`, width));
      }

      if (displayed.length > maxShow) {
        lines.push(truncateToWidth(`  ${th.fg("dim", `...and ${displayed.length - maxShow} more.`)}`, width));
      }
    }

    lines.push("");
    lines.push(truncateToWidth(`  ${th.fg("dim", "Keys: Esc=Close Ctrl+A=All Ctrl+D=Done Ctrl+P=Pending Ctrl+Shift+P=Priority Ctrl+S=Sort")}`, width));
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

export function registerTodosTool(api: ExtensionAPI): void {
  let todos: Todo[] = [];
  let nextId = 1;

  const reconstructState = (ctx: ExtensionContext) => {
    todos = [];
    nextId = 1;
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "message" && entry.message.role === "toolResult" && entry.message.toolName === "todo") {
        const details = entry.message.details as TodoDetails | undefined;
        if (details) {
          todos = details.todos;
          nextId = details.nextId;
        }
      }
    }
  };

  api.on("session_start", async (_event, ctx) => reconstructState(ctx));
  api.on("session_tree", async (_event, ctx) => reconstructState(ctx));

  const tool: any = {
    name: "todos",
    label: "Todo",
    description: "Manage a todo list with priorities and due dates. Actions: list, add, toggle, delete, clear",
    promptSnippet: "Manage todos: list, add, toggle, clear, delete",
    promptGuidelines: [
      "Add: todos({ action: 'add', items: ['Task 1', 'Task 2'], priority?: 'high', due?: '2025-12-31' })",
      "List todos: todos() or todos({ action: 'list' })",
      "Mark tasks as done in your response; todos are simple items without a 'done' flag.",
      "Use todos to track multi-step work and show progress.",
      "Extended: toggle (id), delete (id), clear, priority (low/medium/high/critical), due (ISO date)",
    ],
    parameters: {},

    async execute(_toolCallId, params: any, _signal, _onUpdate, _ctx) {
      const action = params.action as "list" | "add" | "toggle" | "clear" | "delete";

      const computeStats = () => ({
        total: todos.length,
        done: todos.filter(t => t.done).length,
        pending: todos.filter(t => !t.done).length,
        byPriority: {
          low: todos.filter(t => t.priority === 'low').length,
          medium: todos.filter(t => t.priority === 'medium').length,
          high: todos.filter(t => t.priority === 'high').length,
          critical: todos.filter(t => t.priority === 'critical').length,
        }
      });

      switch (action) {
        case "list": {
          const stats = computeStats();
          const details: TodoDetails = { action: "list", todos: [...todos], nextId, stats };
          if (todos.length === 0) {
            return { content: [{ type: "text", text: "No todos yet." }], details, isError: false };
          }
          const lines = todos.map(t => {
            const status = t.done ? "✓" : "○";
            const prio = t.priority ? `[${t.priority[0].toUpperCase()}]` : "";
            const due = t.due ? `📅${new Date(t.due).toLocaleDateString()}` : "";
            return `[${status}] #${t.id}: ${t.text} ${prio} ${due}`.trim();
          });
          return { content: [{ type: "text", text: lines.join("\n") }], details, isError: false };
        }

        case "add": {
          const items = params.items as string[] | undefined;
          if (!items || items.length === 0) {
            const details: TodoDetails = { action: "add", todos: [...todos], nextId, error: "items required" };
            return { content: [{ type: "text", text: "Error: items array required for add" }], details, isError: false };
          }
          const added: Todo[] = [];
          for (const text of items) {
            const todo: Todo = {
              id: nextId++,
              text,
              done: false,
              priority: params.priority,
              due: params.due,
              created: Date.now(),
            };
            todos.push(todo);
            added.push(todo);
            api.appendEntry("todo", todo);
          }
          const details: TodoDetails = { action: "add", todos: [...todos], nextId, stats: computeStats() };
          return { content: [{ type: "text", text: `Added ${added.length} todo${added.length > 1 ? 's' : ''}: ${added.map(t => `#${t.id}`).join(', ')}` }], details, isError: false };
        }

        case "toggle": {
          const id = params.id as number | undefined;
          if (id === undefined) {
            const details: TodoDetails = { action: "toggle", todos: [...todos], nextId, error: "id required" };
            return { content: [{ type: "text", text: "Error: id required for toggle" }], details, isError: false };
          }
          const todo = todos.find(t => t.id === id);
          if (!todo) {
            const details: TodoDetails = { action: "toggle", todos: [...todos], nextId, error: `#${id} not found` };
            return { content: [{ type: "text", text: `Todo #${id} not found` }], details, isError: false };
          }
          todo.done = !todo.done;
          api.appendEntry("todo", todo);
          const details: TodoDetails = { action: "toggle", todos: [...todos], nextId, stats: computeStats(), targetId: id };
          return { content: [{ type: "text", text: `Todo #${todo.id} ${todo.done ? "completed" : "reopened"}` }], details, isError: false };
        }

        case "delete": {
          const id = params.id as number | undefined;
          if (id === undefined) {
            const details: TodoDetails = { action: "delete", todos: [...todos], nextId, error: "id required" };
            return { content: [{ type: "text", text: "Error: id required for delete" }], details, isError: false };
          }
          const index = todos.findIndex(t => t.id === id);
          if (index === -1) {
            const details: TodoDetails = { action: "delete", todos: [...todos], nextId, error: `#${id} not found` };
            return { content: [{ type: "text", text: `Todo #${id} not found` }], details, isError: false };
          }
          const deleted = todos.splice(index, 1)[0];
          api.appendEntry("todo", { ...deleted, _deleted: true });
          const details: TodoDetails = { action: "delete", todos: [...todos], nextId, stats: computeStats(), targetId: id };
          return { content: [{ type: "text", text: `Deleted todo #${id}` }], details, isError: false };
        }

        case "clear": {
          const count = todos.length;
          for (const todo of todos) {
            api.appendEntry("todo", { ...todo, _deleted: true });
          }
          todos = [];
          nextId = 1;
          const details: TodoDetails = { action: "clear", todos: [], nextId: 1, stats: computeStats() };
          return { content: [{ type: "text", text: `Cleared ${count} todos` }], details, isError: false };
        }

        default: {
          const details: TodoDetails = { action: "list", todos: [...todos], nextId };
          return { content: [{ type: "text", text: `Unknown action: ${action}` }], details, isError: false };
        }
      }
    },

    renderCall(args: any, theme: any, _context: any) {
      const th = theme;
      let text = th.fg("toolTitle", th.bold("todo ")) + th.fg("muted", args.action);
      if (args.text) text += ` ${th.fg("dim", `"${args.text}"`)}`;
      if (args.id !== undefined) text += ` ${th.fg("accent", `#${args.id}`)}`;
      if (args.priority) text += ` ${th.fg("warning", `[${String(args.priority)[0].toUpperCase()}]`)}`;
      if (args.due) text += ` ${th.fg("accent", `📅${args.due}`)}`;
      return new Text(text, 0, 0);
    },

    renderResult(result: any, options: { expanded: boolean; isPartial: boolean }, theme: any, _context: any) {
      const th = theme;
      const details = result.details as TodoDetails | undefined;

      if (options.isPartial) {
        return new Text(th.fg("warning", "Processing..."), 0, 0);
      }

      if (!details) {
        const txt = result.content?.[0]?.type === "text" ? result.content[0].text : "";
        return new Text(txt, 0, 0);
      }

      if (details.error) {
        return new Text(th.fg("error", `Error: ${details.error}`), 0, 0);
      }

      const { action, todos: todosList, stats, targetId } = details;

      switch (action) {
        case "list": {
          if (todosList.length === 0) {
            return new Text(th.fg("dim", "No todos"), 0, 0);
          }
          let out = th.fg("success", "✓") + th.fg("muted", ` ${todosList.length} todos (${stats?.done || 0} done)`);
          if (options.expanded) {
            out += "\n";
            const show = todosList.slice(0, 10);
            for (const t of show) {
              const check = t.done ? th.fg("success", "✓") : th.fg("dim", "○");
              const prio = t.priority ? th.fg(t.priority === 'critical' ? "error" : t.priority === 'high' ? "warning" : "muted", `[${t.priority[0].toUpperCase()}]`) : "";
              const due = t.due ? th.fg("accent", `📅${new Date(t.due).toLocaleDateString()}`) : "";
              out += `\n${check} ${th.fg("accent", `#${t.id}`)} ${prio} ${due} ${th.fg(t.done ? "dim" : "text", t.text)}`;
            }
            if (todosList.length > 10) {
              out += `\n${th.fg("dim", `...and ${todosList.length - 10} more`)}`;
            }
          }
          return new Text(out, 0, 0);
        }

        case "add": {
          const added = todosList[todosList.length - 1];
          return new Text(
            th.fg("success", "✓ Added ") +
              th.fg("accent", `#${added.id}`) +
              th.fg("muted", ` ${added.text}`) +
              (stats ? th.fg("dim", ` (${stats.done}/${stats.total} done)`) : ""),
            0,
            0
          );
        }

        case "toggle": {
          return new Text(
            th.fg("success", "✓ ") +
              th.fg("muted", `#${targetId} ${todosList.find((t: Todo) => t.id === targetId)?.done ? "completed" : "reopened"}`),
            0,
            0
          );
        }

        case "delete": {
          return new Text(th.fg("success", "✓ Deleted ") + th.fg("accent", `#${targetId}`), 0, 0);
        }

        case "clear":
          return new Text(th.fg("success", "✓ Cleared all todos"), 0, 0);

        default:
          return new Text(th.fg("muted", result.content?.[0]?.text || ""), 0, 0);
      }
    },

    renderShell: "self",
  };

  api.registerTool(tool);
}
