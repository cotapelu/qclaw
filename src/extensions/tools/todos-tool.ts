#!/usr/bin/env node

/**
 * Enhanced Todo Tool - Full CRUD with Interactive UI
 *
 * Operations: add, list, edit, delete, clear
 * Features: priority, due dates, tags, fuzzy search, keyboard shortcuts
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type, StringEnum } from "@mariozechner/pi-ai";
import { matchesKey, SelectList, Text, truncateToWidth } from "@mariozechner/pi-tui";

// ============================================================================
// Types
// ============================================================================

export type Priority = "low" | "medium" | "high" | "critical";

export interface Todo {
  id: number;
  text: string;
  done: boolean;
  priority?: Priority;
  due?: string; // ISO date YYYY-MM-DD
  tags?: string[];
  created: number;
  updated: number;
  _deleted?: boolean; // internal flag for soft delete in session
}

export interface TodoDetails {
  action: "list" | "add" | "edit" | "delete" | "clear";
  todos: Todo[];
  nextId: number;
  error?: string;
  stats?: TodoStats;
  targetId?: number;
  affectedIds?: number[];
}

export interface TodoStats {
  total: number;
  done: number;
  pending: number;
  byPriority: Record<string, number>;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
}

export interface TodoFilter {
  done?: boolean;
  priority?: Priority;
  dueAfter?: string;
  dueBefore?: string;
  search?: string;
  tags?: string[];
}

export interface TodoEdit {
  text?: string;
  done?: boolean;
  priority?: Priority;
  due?: string;
  tags?: string[];
}

// ============================================================================
// TypeBox Schemas (separated to avoid deep instantiation)
// ============================================================================

const TodoFilterSchema = Type.Object({
  done: Type.Optional(Type.Boolean()),
  priority: Type.Optional(StringEnum(["low", "medium", "high", "critical"] as const)),
  dueAfter: Type.Optional(Type.String()),
  dueBefore: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.String())),
});

const TodoEditSchema = Type.Object({
  text: Type.Optional(Type.String()),
  done: Type.Optional(Type.Boolean()),
  priority: Type.Optional(StringEnum(["low", "medium", "high", "critical"] as const)),
  due: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.String())),
});

// ============================================================================
// Constants
// =

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const MAX_SEARCH_RESULTS = 100;

// ============================================================================
// State Management (Immutable Updates)
// ============================================================================

class TodoState {
  private _todos: Todo[] = [];
  private _nextId = 1;
  private listeners: Set<() => void> = new Set();

  get todos(): readonly Todo[] {
    return this._todos;
  }

  get nextId(): number {
    return this._nextId;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  reconstructFromEntries(entries: any[]): void {
    this._todos = [];
    this._nextId = 1;

    for (const entry of entries) {
      if (entry.type !== "message") continue;
      const msg = entry.message;
      if (msg.role !== "toolResult" || msg.toolName !== "todos") continue;

      const details = msg.details as TodoDetails | undefined;
      if (!details) continue;

      // Handle soft deletes
      if (details.action === "delete" || details.action === "clear") {
        // Deleted todos are marked with _deleted in appendEntry
        // We skip them in reconstruction (they're already removed from active list)
        // But we need to keep nextId progression
        this._nextId = Math.max(this._nextId, details.nextId);
      } else {
        this._todos = details.todos;
        this._nextId = details.nextId;
      }
    }
  }

  add(texts: string[], priority?: Priority, due?: string): Todo[] {
    const added: Todo[] = [];
    const now = Date.now();

    for (const text of texts) {
      const todo: Todo = {
        id: this._nextId++,
        text: text.trim(),
        done: false,
        priority,
        due,
        tags: [],
        created: now,
        updated: now,
      };
      this._todos.push(todo);
      added.push(todo);
    }

    this.notify();
    return added;
  }

  edit(id: number, updates: TodoEdit): Todo | null {
    const index = this._todos.findIndex(t => t.id === id);
    if (index === -1) return null;

    const old = this._todos[index];
    const updated: Todo = {
      ...old,
      ...updates,
      updated: Date.now(),
    };

    // Remove empty tags
    if (updated.tags && updated.tags.length === 0) {
      updated.tags = undefined;
    }

    this._todos.splice(index, 1, updated);
    this.notify();
    return updated;
  }

  toggle(id: number): Todo | null {
    return this.edit(id, { done: !this._todos.find(t => t.id === id)?.done });
  }

  delete(ids: number | number[]): Todo[] {
    const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
    const deleted: Todo[] = [];
    const newTodos: Todo[] = [];

    for (const todo of this._todos) {
      if (idSet.has(todo.id)) {
        deleted.push({ ...todo, _deleted: true });
      } else {
        newTodos.push(todo);
      }
    }

    this._todos = newTodos;
    this.notify();
    return deleted;
  }

  clear(): Todo[] {
    const cleared = this._todos.map(t => ({ ...t, _deleted: true }));
    this._todos = [];
    this.notify();
    return cleared;
  }

  getAll(): Todo[] {
    return [...this._todos];
  }

  getStats(): TodoStats {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekFromNow = today + 7 * 24 * 60 * 60 * 1000;

    const total = this._todos.length;
    const done = this._todos.filter(t => t.done).length;
    const pending = total - done;

    const byPriority: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    for (const t of this._todos) {
      if (t.priority) byPriority[t.priority]++;
    }

    const overdue = this._todos.filter(t => !t.done && t.due && new Date(t.due).getTime() < today).length;
    const dueToday = this._todos.filter(t => !t.done && t.due && new Date(t.due).getTime() === today).length;
    const dueThisWeek = this._todos.filter(t => {
      if (!t.done || !t.due) return false;
      const due = new Date(t.due).getTime();
      return due >= today && due < weekFromNow;
    }).length;

    return { total, done, pending, byPriority, overdue, dueToday, dueThisWeek };
  }

  filter(filter: TodoFilter): Todo[] {
    let result = [...this._todos];

    if (filter.done !== undefined) {
      result = result.filter(t => t.done === filter.done);
    }

    if (filter.priority) {
      result = result.filter(t => t.priority === filter.priority);
    }

    if (filter.dueAfter) {
      const after = new Date(filter.dueAfter).getTime();
      result = result.filter(t => !t.due || new Date(t.due).getTime() > after);
    }

    if (filter.dueBefore) {
      const before = new Date(filter.dueBefore).getTime();
      result = result.filter(t => !t.due || new Date(t.due).getTime() < before);
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(t => t.text.toLowerCase().includes(q) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q))));
    }

    if (filter.tags && filter.tags.length > 0) {
      result = result.filter(t => t.tags && filter.tags!.some(tag => t.tags!.includes(tag)));
    }

    return result;
  }

  sort(todos: Todo[], sortBy: "id" | "priority" | "due" | "created" = "id", descending: boolean = false): Todo[] {
    const sorted = [...todos].sort((a, b) => {
      switch (sortBy) {
        case "priority": {
          const pa = a.priority || "low";
          const pb = b.priority || "low";
          return PRIORITY_ORDER[pa] - PRIORITY_ORDER[pb];
        }
        case "due": {
          if (!a.due && !b.due) return 0;
          if (!a.due) return descending ? -1 : 1;
          if (!b.due) return descending ? 1 : -1;
          return new Date(a.due).getTime() - new Date(b.due).getTime();
        }
        case "created":
          return a.created - b.created;
        default:
          return a.id - b.id;
      }
    });

    return descending ? sorted.reverse() : sorted;
  }
}

// ============================================================================
// Interactive UI Component
// ============================================================================

class EnhancedTodoListComponent {
  private state: TodoState;
  private theme: any;
  private onClose: () => void;
  private filter: TodoFilter = {};
  private sortBy: "id" | "priority" | "due" | "created" = "id";
  private sortDesc: boolean = false;
  private selectedId: number | null = null;
  private searchInput: string = "";
  private page: number = 0;
  private pageSize: number = 20;
  private cachedWidth?: number;
  private cachedLines?: string[];

  constructor(state: TodoState, theme: any, onClose: () => void) {
    this.state = state;
    this.theme = theme;
    this.onClose = onClose;
    this.state.subscribe(() => this.invalidate());
  }

  handleInput(data: string): void {
    const filtered = this.getDisplayed();

    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
      this.onClose();
      return;
    }

    if (matchesKey(data, "enter") && this.selectedId !== null) {
      const todo = this.state.getAll().find(t => t.id === this.selectedId);
      if (todo) {
        // Toggle selected todo
        this.state.toggle(this.selectedId);
      }
      return;
    }

    if (matchesKey(data, "d") && this.selectedId !== null) {
      this.state.delete(this.selectedId);
      this.selectedId = null;
      return;
    }

    if (matchesKey(data, "e") && this.selectedId !== null) {
      const todo = this.state.getAll().find(t => t.id === this.selectedId);
      if (todo) {
        this.promptEditTodo(todo);
      }
      return;
    }

    if (matchesKey(data, "n")) {
      this.promptAddTodo();
      return;
    }

    if (matchesKey(data, "a")) {
      this.filter = {};
      this.searchInput = "";
      this.selectedId = null;
      this.invalidate();
      return;
    }

    if (matchesKey(data, "ctrl+d")) {
      this.filter.done = this.filter.done === undefined ? true : undefined;
      this.invalidate();
      return;
    }

    if (matchesKey(data, "ctrl+p")) {
      this.filter.done = this.filter.done === false ? undefined : false;
      this.invalidate();
      return;
    }

    if (matchesKey(data, "ctrl+shift+p")) {
      const priorities: Priority[] = ["low", "medium", "high", "critical"];
      if (!this.filter.priority) {
        this.filter.priority = "low";
      } else {
        const idx = priorities.indexOf(this.filter.priority);
        this.filter.priority = idx < priorities.length - 1 ? priorities[idx + 1] : undefined;
      }
      this.invalidate();
      return;
    }

    if (matchesKey(data, "ctrl+s")) {
      const sorts: Array<"id" | "priority" | "due" | "created"> = ["id", "priority", "due", "created"];
      const idx = sorts.indexOf(this.sortBy);
      if (idx < sorts.length - 1) {
        this.sortBy = sorts[idx + 1];
      } else {
        this.sortBy = "id";
      }
      this.invalidate();
      return;
    }

    if (matchesKey(data, "ctrl+r")) {
      this.sortDesc = !this.sortDesc;
      this.invalidate();
      return;
    }

    if (matchesKey(data, "ctrl+up")) {
      this.page = Math.max(0, this.page - 1);
      this.invalidate();
      return;
    }

    if (matchesKey(data, "ctrl+down")) {
      const totalPages = Math.ceil(filtered.length / this.pageSize);
      this.page = Math.min(totalPages - 1, this.page + 1);
      this.invalidate();
      return;
    }

    if (matchesKey(data, "up") && filtered.length > 0) {
      if (this.selectedId === null) {
        this.selectedId = filtered[0].id;
      } else {
        const idx = filtered.findIndex(t => t.id === this.selectedId);
        if (idx > 0) {
          this.selectedId = filtered[idx - 1].id;
        } else {
          this.selectedId = filtered[filtered.length - 1].id;
        }
      }
      this.invalidate();
      return;
    }

    if (matchesKey(data, "down") && filtered.length > 0) {
      if (this.selectedId === null) {
        this.selectedId = filtered[0].id;
      } else {
        const idx = filtered.findIndex(t => t.id === this.selectedId);
        if (idx < filtered.length - 1) {
          this.selectedId = filtered[idx + 1].id;
        } else {
          this.selectedId = filtered[0].id;
        }
      }
      this.invalidate();
      return;
    }

    // Simple search: append single character (avoid control keys)
    if (data && data.length === 1 && !data.startsWith("ctrl+") && !data.startsWith("shift+") && !data.startsWith("alt+")) {
      this.searchInput += data;
      this.filter.search = this.searchInput;
      this.selectedId = null;
      this.page = 0;
      this.invalidate();
      // Clear search after 5 seconds of no typing
      setTimeout(() => {
        this.searchInput = "";
        this.invalidate();
      }, 5000);
      return;
    }
  }

  private async promptAddTodo(): Promise<void> {
    // For now, we can't easily prompt in this component without ui.input
    // The user would use the todos tool directly
    // This is a placeholder for future interactive add
  }

  private async promptEditTodo(todo: Todo): Promise<void> {
    // Similar limitation - would need ui.input
    // Use todos tool directly: todos({ action: 'edit', id: X, updates: { ... } })
  }

  private getDisplayed(): Todo[] {
    let result = this.state.filter(this.filter);
    result = this.state.sort(result, this.sortBy, this.sortDesc);

    const start = this.page * this.pageSize;
    return result.slice(start, start + this.pageSize);
  }

  private getFilteredCount(): number {
    return this.state.filter(this.filter).length;
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }

  render(width: number): string[] {
    if (this.cachedWidth === width && this.cachedLines) {
      return this.cachedLines;
    }

    const lines: string[] = [];
    const th = this.theme;
    const stats = this.state.getStats();
    const displayed = this.getDisplayed();
    const totalFiltered = this.getFilteredCount();

    lines.push("");
    const title = th.fg("accent", " Todos ");
    const headerLine =
      th.fg("borderMuted", "─".repeat(3)) + title + th.fg("borderMuted", "─".repeat(Math.max(0, width - 10)));
    lines.push(truncateToWidth(headerLine, width));
    lines.push("");

    // Stats line
    const statsText = `${stats.total} total, ${stats.done} ✓, ${stats.pending} pending`;
    lines.push(truncateToWidth(`  ${th.fg("muted", statsText)}`, width));

    // Overdue/due warnings
    if (stats.overdue > 0) {
      lines.push(truncateToWidth(`  ${th.fg("error", `⚠ ${stats.overdue} overdue`)}`, width));
    }
    if (stats.dueToday > 0) {
      lines.push(truncateToWidth(`  ${th.fg("warning", `📅 ${stats.dueToday} due today`)}`, width));
    }

    if (this.filter.search) {
      lines.push(truncateToWidth(`  Search: ${th.fg("accent", this.filter.search)}`, width));
    }

    const filterParts: string[] = [];
    if (this.filter.done === true) filterParts.push(th.fg("success", "Done"));
    if (this.filter.done === false) filterParts.push(th.fg("warning", "Pending"));
    if (this.filter.priority) filterParts.push(th.fg("accent", `P:${this.filter.priority}`));
    if (filterParts.length > 0) {
      lines.push(truncateToWidth(`  Filter: ${filterParts.join(", ")}`, width));
    }

    lines.push(truncateToWidth(`  Sort: ${this.sortBy}${this.sortDesc ? " ↓" : ""} (Ctrl+S)`, width));
    lines.push(truncateToWidth(`  Showing: ${totalFiltered} items (page ${this.page + 1}/${Math.max(1, Math.ceil(totalFiltered / this.pageSize))})`, width));
    lines.push("");

    if (displayed.length === 0) {
      lines.push(truncateToWidth(`  ${th.fg("dim", "No todos match filter.")}`, width));
    } else {
      for (const todo of displayed) {
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
        const sel = this.selectedId === todo.id ? th.fg("selected", "> ") : "  ";
        const textColor = todo.done ? "dim" : "text";
        const text = th.fg(textColor, todo.text);
        lines.push(truncateToWidth(`${sel}${check} ${id} ${priorityText} ${dueText} ${text}`, width));
      }
    }

    lines.push("");
    lines.push(truncateToWidth(`  ${th.fg("dim", "Keys: Esc=Close ↑↓=Select Enter=Toggle E=Edit D=Delete N=New A=All Ctrl+D=Done Ctrl+P=Pending Ctrl+Shift+P=Prio Ctrl+S=Sort Ctrl+R=Reverse Ctrl+Up/Down=Page")}`, width));
    lines.push("");

    this.cachedWidth = width;
    this.cachedLines = lines;
    return lines;
  }
}

// ============================================================================
// Tool Registration
// ============================================================================

export function registerTodosTool(api: ExtensionAPI): void {
  const state = new TodoState();

  const reconstructState = (ctx: ExtensionContext) => {
    state.reconstructFromEntries(ctx.sessionManager.getBranch());
  };

  api.on("session_start", async (_event, ctx) => reconstructState(ctx));
  api.on("session_tree", async (_event, ctx) => reconstructState(ctx));

  const tool: any = {
    name: "todos",
    label: "Todo",
    description: "Manage a todo list with full CRUD, priorities, due dates, tags, filtering, and sorting. State persists across branches via session.",
    promptSnippet: "todos({ action: 'add'|'list'|'edit'|'delete'|'clear', ... })",
    promptGuidelines: [
      "📌 ADD: todos({ action: 'add', items: ['Task A', 'Task B'], priority?: 'low|medium|high|critical', due?: 'YYYY-MM-DD' })",
      "   Example: todos({ action: 'add', items: ['Fix login bug', 'Write docs'], priority: 'high', due: '2025-05-15' })",
      "📋 LIST: todos() or todos({ action: 'list', filter?: { done?, priority?, dueAfter?, dueBefore?, search?, tags? } })",
      "   Example: todos({ action: 'list', filter: { done: false, priority: 'high' } })",
      "✏️  EDIT: todos({ action: 'edit', id: 123, updates: { text?, done?, priority?, due?, tags? } })",
      "   Example: todos({ action: 'edit', id: 5, updates: { done: true, priority: 'medium' } })",
      "🗑️  DELETE: todos({ action: 'delete', ids: 123 }) or todos({ action: 'delete', ids: [1,2,3] })",
      "   Example: todos({ action: 'delete', ids: [2, 4] }) - bulk delete supported",
      "💥 CLEAR: todos({ action: 'clear' }) - deletes all todos",
      "💡 TIP: Use tags for categorization (e.g., 'bug', 'feature', 'refactor'). Filter by tags: todos({ action: 'list', filter: { tags: ['bug'] } })",
      "💡 TIP: Due dates support 'overdue', 'today', 'this week' in stats. Sort implementation sorts by priority then due date internally.",
      "⚠️  NOTE: State is stored in session entries; branching automatically preserves todo state at each point.",
      "📊 After each change, stats show: total, done, pending, overdue, due today, due this week.",
    ],
    parameters: Type.Object({
      action: StringEnum(["list", "add", "edit", "delete", "clear"] as const),

      // add
      items: Type.Optional(Type.Array(Type.String())),
      priority: Type.Optional(StringEnum(["low", "medium", "high", "critical"] as const)),
      due: Type.Optional(Type.String()),

      // list
      filter: Type.Optional(Type.Any()),

      // edit
      id: Type.Optional(Type.Number()),
      updates: Type.Optional(Type.Any()),

      // delete
      ids: Type.Optional(Type.Union([Type.Number(), Type.Array(Type.Number())])),
    }),

    async execute(_toolCallId: string, params: any, _signal: AbortSignal | undefined, _onUpdate: any, ctx: any) {
      const action = params.action as "list" | "add" | "edit" | "delete" | "clear";

      const makeDetails = (action: string, todos?: Todo[], targetId?: number, affectedIds?: number[], error?: string): TodoDetails => {
        const allTodos = state.getAll();
        const stats: TodoStats = {
          total: allTodos.length,
          done: allTodos.filter(t => t.done).length,
          pending: allTodos.filter(t => !t.done).length,
          byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
          overdue: 0,
          dueToday: 0,
          dueThisWeek: 0,
        };
        for (const t of allTodos) {
          if (t.priority) stats.byPriority[t.priority]++;
        }
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const weekFromNow = today + 7 * 24 * 60 * 60 * 1000;
        for (const t of allTodos) {
          if (!t.done && t.due) {
            const due = new Date(t.due).getTime();
            if (due < today) stats.overdue++;
            else if (due === today) stats.dueToday++;
            else if (due < weekFromNow) stats.dueThisWeek++;
          }
        }
        return {
          action: action as any,
          todos: todos || allTodos,
          nextId: state.nextId,
          stats,
          targetId,
          affectedIds,
          error,
        };
      };

      switch (action) {
        case "list": {
          const filter = params.filter as TodoFilter | undefined;
          let todos = filter ? state.filter(filter) : state.getAll();
          todos = state.sort(todos, "id", false);
          const details = makeDetails("list", todos.slice(0, MAX_SEARCH_RESULTS));
          if (todos.length > MAX_SEARCH_RESULTS) {
            details.stats!.total = todos.length; // Show actual total in stats
          }
          return {
            content: [{ type: "text" as const, text: formatListOutput(todos, details.stats) }],
            details,
            isError: false,
          } as any;
        }

        case "add": {
          const items = params.items as string[] | undefined;
          if (!items || items.length === 0) {
            return {
              content: [{ type: "text" as const, text: "Error: items array required for add" }],
              details: makeDetails("add", undefined, undefined, undefined, "items array required"),
              isError: false,
            } as any;
          }
          const added = state.add(items, params.priority, params.due);
          for (const todo of added) {
            api.appendEntry("todos", todo);
          }
          const details = makeDetails("add", state.getAll(), added[added.length - 1].id, added.map(a => a.id));
          return {
            content: [{ type: "text", text: `Added ${added.length} todo(s): ${added.map(t => `#${t.id}`).join(", ")}` }],
            details,
            isError: false,
          } as any;
        }

        case "edit": {
          const id = params.id as number | undefined;
          const updates = params.updates as TodoEdit | undefined;
          if (id === undefined) {
            return {
              content: [{ type: "text", text: "Error: id required for edit" }],
              details: makeDetails("edit", undefined, undefined, undefined, "id required"),
              isError: false,
            };
          }
          if (!updates || Object.keys(updates).length === 0) {
            return {
              content: [{ type: "text", text: "Error: updates object required for edit" }],
              details: makeDetails("edit", undefined, id, undefined, "updates required"),
              isError: false,
            };
          }
          const edited = state.edit(id, updates);
          if (!edited) {
            return {
              content: [{ type: "text", text: `Todo #${id} not found` }],
              details: makeDetails("edit", state.getAll(), id, undefined, `#${id} not found`),
              isError: false,
            };
          }
          api.appendEntry("todos", edited);
          const details = makeDetails("edit", state.getAll(), id, [id]);
          return {
            content: [{ type: "text", text: `Edited todo #${id}` }],
            details,
            isError: false,
          } as any;
        }

        case "delete": {
          const ids = params.ids as number | number[] | undefined;
          if (ids === undefined) {
            return {
              content: [{ type: "text", text: "Error: ids required for delete" }],
              details: makeDetails("delete", undefined, undefined, undefined, "ids required"),
              isError: false,
            };
          }
          const idList = Array.isArray(ids) ? ids : [ids];
          const deleted = state.delete(idList);
          for (const todo of deleted) {
            api.appendEntry("todos", todo);
          }
          const details = makeDetails("delete", state.getAll(), undefined, idList);
          return {
            content: [{ type: "text", text: `Deleted ${deleted.length} todo(s): ${deleted.map(t => `#${t.id}`).join(", ")}` }],
            details,
            isError: false,
          } as any;
        }

        case "clear": {
          const cleared = state.clear();
          for (const todo of cleared) {
            api.appendEntry("todos", todo);
          }
          const details = makeDetails("clear", []);
          return {
            content: [{ type: "text", text: `Cleared ${cleared.length} todos` }],
            details,
            isError: false,
          } as any;
        }

        default: {
          return {
            content: [{ type: "text", text: `Unknown action: ${action}` }],
            details: makeDetails("list", state.getAll()),
            isError: false,
          } as any;
        }
      }
    },

    renderCall(args: any, theme: any, _context: any) {
      const th = theme;
      let text = th.fg("toolTitle", th.bold("todos ")) + th.fg("muted", args.action);
      if (args.items) text += ` ${th.fg("dim", `"${args.items.length} items"`)}`;
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

      const { action, todos: todosList, stats, targetId, affectedIds } = details;

      switch (action) {
        case "list": {
          if (todosList.length === 0) {
            return new Text(th.fg("dim", "No todos"), 0, 0);
          }
          return new Text(renderListResult(todosList, stats, th), 0, 0);
        }

        case "add": {
          const added = affectedIds || [];
          return new Text(
            th.fg("success", "✓ Added ") +
              th.fg("accent", added.join(", ")) +
              th.fg("muted", ` (${stats?.pending}/${stats?.total} pending)`),
            0,
            0
          );
        }

        case "edit": {
          return new Text(
            th.fg("success", "✓ Edited ") +
              th.fg("accent", `#${targetId}`) +
              th.fg("muted", ` (${stats?.pending}/${stats?.total} pending)`),
            0,
            0
          );
        }

        case "delete": {
          const ids = affectedIds || [];
          return new Text(
            th.fg("success", "✓ Deleted ") +
              th.fg("accent", ids.join(", ")) +
              th.fg("muted", ` (${stats?.pending}/${stats?.total} remaining)`),
            0,
            0
          );
        }

        case "clear":
          return new Text(th.fg("success", "✓ Cleared all todos"), 0, 0);

        default:
          return new Text(th.fg("muted", result.content?.[0]?.text || ""), 0, 0);
      }
    },

    renderShell: "self" as const,
  };

  api.registerTool(tool);

  // Show updated todo list after changes
  api.on("tool_execution_end", async (event, ctx) => {
    if (event.toolName !== "todos") return;

    const result = event.result as any;
    const details = result?.details as TodoDetails | undefined;
    if (!details) return;

    if (!["add", "edit", "delete", "clear"].includes(details.action as any)) return;

    // Build summary message
    const stats = details.stats || state.getStats();
    const pending = stats.pending;
    const total = stats.total;

    let msg = `[System: Todo ${details.action}] Updated: ${pending}/${total} pending`;
    if (details.action === "add" && details.affectedIds) {
      msg += `\nAdded: ${details.affectedIds.map(id => `#${id}`).join(", ")}`;
    }
    if (details.action === "delete" && details.affectedIds) {
      msg += `\nDeleted: ${details.affectedIds.map(id => `#${id}`).join(", ")}`;
    }
    if (details.action === "edit" && details.targetId) {
      msg += `\nEdited: #${details.targetId}`;
    }
    if (details.action === "clear") {
      msg += `\nAll todos cleared.`;
    }

    // Show recent todos (last 10)
    const recent = state.sort(state.getAll(), "id", false).slice(-10);
    if (recent.length > 0) {
      msg += "\nRecent:";
      for (const t of recent) {
        const check = t.done ? "✓" : "○";
        const prio = t.priority ? `[${t.priority[0].toUpperCase()}]` : "";
        const due = t.due ? `📅${new Date(t.due).toLocaleDateString()}` : "";
        msg += `\n${check} #${t.id} ${prio} ${due} ${t.text}`;
      }
    }

    try {
      api.sendMessage({
        customType: "todo_update",
        content: msg,
        display: true,
      }, { triggerTurn: true });
    } catch {
      // Ignore if turn in progress
    }
  });

  // Render the update message
  api.registerMessageRenderer("todo_update", (msg, _opts, theme) => {
    const content = (msg.content as string) || "";
    return new Text(theme.fg("accent", `📋 ${content}`), 0, 0);
  });

}

// ============================================================================
// Helpers
// ============================================================================

function formatListOutput(todos: Todo[], stats?: TodoStats): string {
  if (todos.length === 0) {
    return "No todos.";
  }

  const th = {
    fg: (c: string, t: string) => t,
    bold: (t: string) => t,
    dim: (t: string) => t,
    muted: (t: string) => t,
    accent: (t: string) => t,
    success: (t: string) => t,
    warning: (t: string) => t,
    error: (t: string) => t,
  };

  let out = `✓ ${todos.length} todo${todos.length > 1 ? 's' : ''}`;
  if (stats) {
    out += ` (${stats.done}/${stats.total} done`;
    if (stats.overdue > 0) out += `, ${stats.overdue} overdue`;
    if (stats.dueToday > 0) out += `, ${stats.dueToday} due today`;
    out += ")";
  }
  out += "\n";

  for (const t of todos) {
    const check = t.done ? "✓" : "○";
    const id = `#${t.id}`;
    const priority = t.priority ? `[${t.priority[0].toUpperCase()}]` : "";
    const due = t.due ? `📅${new Date(t.due).toLocaleDateString()}` : "";
    const text = t.text;
    out += `${check} ${id} ${priority} ${due} ${text}\n`;
  }

  return out.trim();
}

function renderListResult(todos: Todo[], stats?: TodoStats, theme?: any): string {
  if (!theme) {
    return formatListOutput(todos, stats);
  }

  const th = theme;
  if (todos.length === 0) {
    return th.fg("dim", "No todos");
  }

  let out = th.fg("success", "✓") + th.fg("muted", ` ${todos.length} todos`);
  if (stats) {
    out += th.fg("muted", ` (${stats.done}/${stats.total} done`);
    if (stats.overdue > 0) out += th.fg("error", `, ${stats.overdue} overdue`);
    if (stats.dueToday > 0) out += th.fg("warning", `, ${stats.dueToday} due today`);
    out += th.fg("muted", ")");
  }
  out += "\n";

  for (const t of todos) {
    const check = t.done ? th.fg("success", "✓") : th.fg("dim", "○");
    const id = th.fg("accent", `#${t.id}`);
    const priorityColor = t.priority === 'critical' ? 'error' : t.priority === 'high' ? 'warning' : 'muted';
    const priority = t.priority ? th.fg(priorityColor, `[${t.priority[0].toUpperCase()}]`) : "";
    const due = t.due ? th.fg("accent", `📅${new Date(t.due).toLocaleDateString()}`) : "";
    const text = th.fg(t.done ? "dim" : "text", t.text);
    out += `${check} ${id} ${priority} ${due} ${text}\n`;
  }

  return out.trim();
}
