#!/usr/bin/env node

/**
 * Enhanced Todo Tool - Full CRUD with Interactive UI
 *
 * Operations: add, list, edit, delete, clear, replace, add_phase, add_task, update, remove_task
 * Features: priority, due dates, tags, fuzzy search, keyboard shortcuts, phases, status, auto-continue
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type, StringEnum } from "@mariozechner/pi-ai";
import { matchesKey, SelectList, Text, truncateToWidth } from "@mariozechner/pi-tui";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// ============================================================================
// Types
// ============================================================================

export type Priority = "low" | "medium" | "high" | "critical";
export type TodoStatus = "pending" | "in_progress" | "completed" | "abandoned";

// Phase grouping (like todo_write backup)
export interface Phase {
  id: string;
  name: string;
  tasks: PhaseTodo[];
}

// Enhanced Todo with status (replaces 'done' boolean)
export interface PhaseTodo {
  id: string;
  content: string;
  status: TodoStatus;
  notes?: string;
  details?: string;
}

// Backward compatible wrapper
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
  // Phase mapping (for display)
  phaseId?: string;
  phaseName?: string;
}

export interface TodoDetails {
  action: string;
  todos: Todo[];
  nextId: number;
  error?: string;
  stats?: TodoStats;
  targetId?: number;
  affectedIds?: number[];
  phases?: Phase[];
}

export interface TodoStats {
  total: number;
  done: number;
  pending: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  currentPhase?: string;
  phaseProgress?: string;
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
  status?: TodoStatus;
  priority?: Priority;
  due?: string;
  tags?: string[];
  notes?: string;
  details?: string;
}

// ============================================================================
// TypeBox Schemas
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
  status: Type.Optional(StringEnum(["pending", "in_progress", "completed", "abandoned"] as const)),
  priority: Type.Optional(StringEnum(["low", "medium", "high", "critical"] as const)),
  due: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.String())),
  notes: Type.Optional(Type.String()),
  details: Type.Optional(Type.String()),
});

// Phase schemas
const PhaseTodoSchema = Type.Object({
  content: Type.String({ description: "Task description (required)" }),
  status: Type.Optional(StringEnum(["pending", "in_progress", "completed", "abandoned"] as const)),
  notes: Type.Optional(Type.String({ description: "Additional context or notes (optional)" })),
  details: Type.Optional(Type.String({ description: "Implementation details, file paths, and specifics (optional)" })),
});

const PhaseSchema = Type.Object({
  name: Type.String({ description: "Phase name (required)" }),
  tasks: Type.Optional(Type.Array(PhaseTodoSchema)),
});

// Operation schemas
const ReplaceOp = Type.Object({
  phases: Type.Array(PhaseSchema),
});

const AddPhaseOp = Type.Object({
  name: Type.String({ description: "Phase name (required)" }),
  tasks: Type.Optional(Type.Array(PhaseTodoSchema)),
});

const AddTaskOp = Type.Object({
  phase: Type.String({ description: "Phase ID, e.g. phase-1 (required)" }),
  content: Type.String({ description: "Task description (required)" }),
  notes: Type.Optional(Type.String({ description: "Additional context or notes (optional)" })),
  details: Type.Optional(Type.String({ description: "Implementation details, file paths, and specifics (optional)" })),
});

const UpdateTaskOp = Type.Object({
  id: Type.String({ description: "Task ID, e.g. task-3 (required)" }),
  status: Type.Optional(StringEnum(["pending", "in_progress", "completed", "abandoned"] as const)),
  content: Type.Optional(Type.String({ description: "Updated task description (optional)" })),
  notes: Type.Optional(Type.String({ description: "Updated notes (optional)" })),
  details: Type.Optional(Type.String({ description: "Updated details (optional)" })),
});

const RemoveTaskOp = Type.Object({
  id: Type.String({ description: "Task ID, e.g. task-3 (required)" }),
});

const ListOp = Type.Object({}, { description: "List current todo list without modification" });

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const MAX_SEARCH_RESULTS = 100;

// ============================================================================
// File Persistence
// ============================================================================

interface TodoFile {
  phases: Phase[];
  nextTaskId: number;
  nextPhaseId: number;
}

interface PersistedTodo {
  version: 1;
  phases: Phase[];
  nextTaskId: number;
  nextPhaseId: number;
  updatedAt: string;
}

function getProjectTodoFilePath(): string {
  return join(process.cwd(), ".pi", "agent", "todos.json");
}

function loadTodoFromFile(): TodoFile | null {
  const filePath = getProjectTodoFilePath();
  if (!existsSync(filePath)) return null;

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed: PersistedTodo = JSON.parse(content);
    if (parsed.version !== 1) return null;
    return { phases: parsed.phases, nextTaskId: parsed.nextTaskId, nextPhaseId: parsed.nextPhaseId };
  } catch {
    return null;
  }
}

function saveTodoToFile(_sessionDir: string, todo: TodoFile): void {
  const filePath = getProjectTodoFilePath();
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const persisted: PersistedTodo = {
    version: 1,
    phases: todo.phases,
    nextTaskId: todo.nextTaskId,
    nextPhaseId: todo.nextPhaseId,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(filePath, JSON.stringify(persisted, null, 2));
}

// ============================================================================
// Normalization
// ============================================================================

function normalizeParams(params: unknown): any {
  if (typeof params === "string") {
    try {
      params = JSON.parse(params);
    } catch (e) {
      throw new Error(`Invalid JSON string: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (typeof params !== "object" || params === null) {
    throw new Error("Parameters must be an object");
  }

  const normalized = params as Record<string, unknown>;

  // Backward compatibility: lift nested objects to root
  if (normalized.add_phase && typeof normalized.add_phase === "object") {
    const addPhase = normalized.add_phase as Record<string, unknown>;
    if (!normalized.name && addPhase.name !== undefined) normalized.name = addPhase.name;
    if (!normalized.tasks && addPhase.tasks !== undefined) normalized.tasks = addPhase.tasks;
    delete normalized.add_phase;
  }

  if (normalized.replace && typeof normalized.replace === "object") {
    const replace = normalized.replace as Record<string, unknown>;
    if (!normalized.phases && replace.phases !== undefined) normalized.phases = replace.phases;
    delete normalized.replace;
  }

  if (normalized.update && typeof normalized.update === "object") {
    const update = normalized.update as Record<string, unknown>;
    const lifted: Record<string, unknown> = {};
    if (update.id !== undefined && !normalized.id) lifted.id = update.id;
    if (update.status !== undefined && !normalized.status) lifted.status = update.status;
    if (update.content !== undefined && !normalized.content) lifted.content = update.content;
    if (update.notes !== undefined && !normalized.notes) lifted.notes = update.notes;
    if (update.details !== undefined && !normalized.details) lifted.details = update.details;
    Object.assign(normalized, lifted);
    delete normalized.update;
  }

  if (normalized.remove_task && typeof normalized.remove_task === "object") {
    const removeTask = normalized.remove_task as Record<string, unknown>;
    if (!normalized.id && removeTask.id !== undefined) normalized.id = removeTask.id;
    delete normalized.remove_task;
  }

  if (normalized.add_task && typeof normalized.add_task === "object") {
    const addTask = normalized.add_task as Record<string, unknown>;
    if (!normalized.phase && addTask.phase !== undefined) normalized.phase = addTask.phase;
    if (!normalized.content && addTask.content !== undefined) normalized.content = addTask.content;
    if (!normalized.notes && addTask.notes !== undefined) normalized.notes = addTask.notes;
    if (!normalized.details && addTask.details !== undefined) normalized.details = addTask.details;
    delete normalized.add_task;
  }

  return normalized;
}

// ============================================================================
// Phase helpers
// ============================================================================

function findTask(phases: Phase[], id: string): PhaseTodo | undefined {
  for (const phase of phases) {
    const task = phase.tasks.find((t) => t.id === id);
    if (task) return task;
  }
  return undefined;
}

function buildPhaseFromInput(
  input: { name: string; tasks?: Array<{ content: string; status?: TodoStatus; notes?: string; details?: string }> },
  phaseId: string,
  nextTaskId: number,
): { phase: Phase; nextTaskId: number } {
  const tasks: PhaseTodo[] = [];
  let tid = nextTaskId;
  for (const t of input.tasks ?? []) {
    tasks.push({
      id: `task-${tid++}`,
      content: t.content,
      status: t.status ?? "pending",
      notes: t.notes,
      details: t.details,
    });
  }
  return { phase: { id: phaseId, name: input.name, tasks }, nextTaskId: tid };
}

function getNextIds(phases: Phase[]): { nextTaskId: number; nextPhaseId: number } {
  let maxTaskId = 0;
  let maxPhaseId = 0;

  for (const phase of phases) {
    const phaseMatch = /^phase-(\d+)$/.exec(phase.id);
    if (phaseMatch) {
      const value = Number.parseInt(phaseMatch[1], 10);
      if (Number.isFinite(value) && value > maxPhaseId) maxPhaseId = value;
    }

    for (const task of phase.tasks) {
      const taskMatch = /^task-(\d+)$/.exec(task.id);
      if (!taskMatch) continue;
      const value = Number.parseInt(taskMatch[1], 10);
      if (Number.isFinite(value) && value > maxTaskId) maxTaskId = value;
    }
  }

  return { nextTaskId: maxTaskId + 1, nextPhaseId: maxPhaseId + 1 };
}

function fileFromPhases(phases: Phase[]): TodoFile {
  const { nextTaskId, nextPhaseId } = getNextIds(phases);
  return { phases, nextTaskId, nextPhaseId };
}

function clonePhases(phases: Phase[]): Phase[] {
  return phases.map((phase) => ({ ...phase, tasks: phase.tasks.map((task) => ({ ...task })) }));
}

function normalizeInProgressTask(phases: Phase[]): void {
  const orderedTasks = phases.flatMap((phase) => phase.tasks);
  if (orderedTasks.length === 0) return;

  const inProgressTasks = orderedTasks.filter((task) => task.status === "in_progress");
  if (inProgressTasks.length > 1) {
    for (const task of inProgressTasks.slice(1)) {
      task.status = "pending";
    }
  }

  if (inProgressTasks.length > 0) return;

  const firstPendingTask = orderedTasks.find((task) => task.status === "pending");
  if (firstPendingTask) firstPendingTask.status = "in_progress";
}

function formatSummary(phases: Phase[], errors: string[]): string {
  const tasks = phases.flatMap((p) => p.tasks);
  if (tasks.length === 0) return errors.length > 0 ? `Errors: ${errors.join("; ")}` : "Todo list cleared.";

  const remainingByPhase = phases
    .map((phase) => ({
      name: phase.name,
      tasks: phase.tasks.filter((task) => task.status === "pending" || task.status === "in_progress"),
    }))
    .filter((phase) => phase.tasks.length > 0);
  const remainingTasks = remainingByPhase.flatMap((phase) =>
    phase.tasks.map((task) => ({ ...task, phase: phase.name })),
  );

  let currentIdx = phases.findIndex((p) => p.tasks.some((t) => t.status === "pending" || t.status === "in_progress"));
  if (currentIdx === -1) currentIdx = phases.length - 1;
  const current = phases[currentIdx];
  const done = current?.tasks.filter((t) => t.status === "completed" || t.status === "abandoned").length ?? 0;

  const lines: string[] = [];
  if (errors.length > 0) {
    lines.push(`⚠️ Errors: ${errors.join("; ")}`);
  } else {
    const pending = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length;
    const completed = tasks.filter((t) => t.status === "completed" || t.status === "abandoned").length;
    lines.push(`✅ Todo updated: ${pending} remaining, ${completed} completed.`);
    lines.push(`📊 Use /todos to view, or continue with next task.`);
    lines.push("");
  }
  if (remainingTasks.length === 0) {
    lines.push("Remaining items: none.");
  } else {
    lines.push(`Remaining items (${remainingTasks.length}):`);
    for (const task of remainingTasks) {
      lines.push(`  - ${task.id} ${task.content} [${task.status}] (${task.phase})`);
      if (task.status === "in_progress" && task.details) {
        for (const line of task.details.split("\n")) {
          lines.push(`      ${line}`);
        }
      }
    }
  }
  lines.push(
    `Phase ${currentIdx + 1}/${phases.length} "${current?.name ?? "unknown"}" — ${done}/${current?.tasks.length ?? 0} tasks complete`,
  );
  return lines.join("\n");
}

// ============================================================================
// State Management
// ============================================================================

class TodoState {
  private _todos: Todo[] = [];
  private _nextId = 1;
  private _phases: Phase[] = [];
  private listeners: Set<() => void> = new Set();
  autoTriggerInProgress = false;

  get todos(): readonly Todo[] {
    return this._todos;
  }

  get phases(): readonly Phase[] {
    return this._phases;
  }

  get nextId(): number {
    return this._nextId;
  }

  set nextId(val: number) {
    this._nextId = val;
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
    this._phases = [];

    // Try to load from project file first
    const fileData = loadTodoFromFile();
    if (fileData) {
      this._phases = clonePhases(fileData.phases);
      this._nextId = fileData.nextTaskId;
      this.syncTodosFromPhases();
      return;
    }

    // Fallback to session entries (legacy format)
    for (const entry of entries) {
      if (entry.type !== "message") continue;
      const msg = entry.message;
      if (msg.role !== "toolResult" || msg.toolName !== "todos") continue;

      const details = msg.details as TodoDetails | undefined;
      if (!details) continue;

      if (details.action === "delete" || details.action === "clear") {
        this._nextId = Math.max(this._nextId, details.nextId);
      } else {
        this._todos = details.todos;
        this._nextId = details.nextId;
        if (details.phases) {
          this._phases = clonePhases(details.phases);
        }
      }
    }
  }

  private syncTodosFromPhases(): void {
    this._todos = [];
    for (const phase of this._phases) {
      for (const task of phase.tasks) {
        const todo: Todo = {
          id: parseInt(task.id.replace("task-", "")),
          text: task.content,
          done: task.status === "completed" || task.status === "abandoned",
          priority: "medium",
          phaseId: phase.id,
          phaseName: phase.name,
          created: Date.now(),
          updated: Date.now(),
        };
        this._todos.push(todo);
      }
    }
    this._todos.sort((a, b) => {
      const phaseA = this._phases.find(p => p.id === a.phaseId);
      const phaseB = this._phases.find(p => p.id === b.phaseId);
      const phaseCmp = (this._phases.indexOf(phaseA!) - this._phases.indexOf(phaseB!));
      if (phaseCmp !== 0) return phaseCmp;
      return a.id - b.id;
    });
  }

  // Legacy operations
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
    // Map status to done if provided
    let done = old.done;
    if (updates.status !== undefined) {
      done = updates.status === 'completed' || updates.status === 'abandoned';
    }

    const updated: Todo = {
      ...old,
      ...updates,
      done,
      updated: Date.now(),
    };

    // Remove status from updates since Todo doesn't have it
    delete (updated as any).status;

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
    this._phases = [];
    this.notify();
    return cleared;
  }

  getAll(): Todo[] {
    return [...this._todos];
  }

  getPhases(): Phase[] {
    return clonePhases(this._phases);
  }

  // Phase-based operations
  addPhase(name: string, tasks?: Array<{ content: string; status?: TodoStatus; notes?: string; details?: string }>): Phase {
    const phaseId = `phase-${this._nextId++}`;
    const { phase, nextTaskId } = buildPhaseFromInput({ name, tasks }, phaseId, this._nextId);
    this._phases.push(phase);
    this._nextId = nextTaskId;
    this.syncTodosFromPhases();
    this.notify();
    return phase;
  }

  addTask(phaseId: string, content: string, notes?: string, details?: string): PhaseTodo | null {
    const phase = this._phases.find(p => p.id === phaseId);
    if (!phase) return null;

    const task: PhaseTodo = {
      id: `task-${this._nextId++}`,
      content,
      status: "pending",
      notes,
      details,
    };
    phase.tasks.push(task);
    this.syncTodosFromPhases();
    this.notify();
    return task;
  }

  updateTask(taskId: string, updates: Partial<Pick<PhaseTodo, 'status' | 'content' | 'notes' | 'details'>>): PhaseTodo | null {
    const task = findTask(this._phases, taskId);
    if (!task) return null;

    if (updates.status !== undefined) task.status = updates.status;
    if (updates.content !== undefined) task.content = updates.content;
    if (updates.notes !== undefined) task.notes = updates.notes;
    if (updates.details !== undefined) task.details = updates.details;

    normalizeInProgressTask(this._phases);
    this.syncTodosFromPhases();
    this.notify();
    return task;
  }

  removeTask(taskId: string): boolean {
    for (const phase of this._phases) {
      const idx = phase.tasks.findIndex(t => t.id === taskId);
      if (idx !== -1) {
        phase.tasks.splice(idx, 1);
        this.syncTodosFromPhases();
        this.notify();
        return true;
      }
    }
    return false;
  }

  replacePhases(phases: Phase[]): void {
    this._phases = clonePhases(phases);
    normalizeInProgressTask(this._phases);
    this.syncTodosFromPhases();
    this.notify();
  }

  getStats(): TodoStats {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekFromNow = today + 7 * 24 * 60 * 60 * 1000;

    const total = this._todos.length;
    const done = this._todos.filter(t => t.done).length;
    const pending = total - done;

    const byPriority: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const t of this._todos) {
      if (t.priority) byPriority[t.priority]++;
    }

    const byStatus: Record<string, number> = { pending: 0, in_progress: 0, completed: 0, abandoned: 0 };
    for (const phase of this._phases) {
      for (const task of phase.tasks) {
        byStatus[task.status]++;
      }
    }

    const overdue = this._todos.filter(t => !t.done && t.due && new Date(t.due).getTime() < today).length;
    const dueToday = this._todos.filter(t => !t.done && t.due && new Date(t.due).getTime() === today).length;
    const dueThisWeek = this._todos.filter(t => {
      if (!t.done || !t.due) return false;
      const due = new Date(t.due).getTime();
      return due >= today && due < weekFromNow;
    }).length;

    let currentPhase: string | undefined;
    let phaseProgress: string | undefined;
    if (this._phases.length > 0) {
      const currentPhaseIdx = this._phases.findIndex(p => p.tasks.some(t => t.status === "pending" || t.status === "in_progress"));
      const idx = currentPhaseIdx === -1 ? this._phases.length - 1 : currentPhaseIdx;
      const phase = this._phases[idx];
      currentPhase = phase.name;
      const doneCount = phase.tasks.filter(t => t.status === "completed" || t.status === "abandoned").length;
      phaseProgress = `${doneCount}/${phase.tasks.length}`;
    }

    return { total, done, pending, byPriority, byStatus, overdue, dueToday, dueThisWeek, currentPhase, phaseProgress };
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
    if (filter.search && typeof filter.search === 'string') {
      const q = filter.search.toLowerCase();
      result = result.filter(t => t.text.toLowerCase().includes(q) || (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q))));
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

  // Persistence
  saveToFile(): void {
    const file: TodoFile = {
      phases: clonePhases(this._phases),
      nextTaskId: this._nextId,
      nextPhaseId: this._phases.length > 0 ? parseInt(this._phases[this._phases.length - 1].id.replace("phase-", "")) + 1 : 1,
    };
    saveTodoToFile("", file);
  }

  loadFromFile(): boolean {
    const fileData = loadTodoFromFile();
    if (!fileData) return false;
    this._phases = clonePhases(fileData.phases);
    this._nextId = fileData.nextTaskId;
    this.syncTodosFromPhases();
    this.notify();
    return true;
  }
}

// ============================================================================
// Tool Execution
// ============================================================================

function formatListOutput(todos: Todo[], stats?: TodoStats): string {
  if (todos.length === 0) {
    return "No todos.";
  }

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
    const phase = t.phaseName ? `[${t.phaseName}]` : "";
    const text = t.text;
    out += `${check} ${id} ${priority} ${phase} ${due} ${text}\n`;
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
    const phase = t.phaseName ? th.fg("dim", `[${t.phaseName}]`) : "";
    const text = th.fg(t.done ? "dim" : "text", t.text);
    out += `${check} ${id} ${priority} ${phase} ${due} ${text}\n`;
  }

  return out.trim();
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
    description: "Manage a todo list with full CRUD, priorities, due dates, tags, phases, status, filtering, and sorting. State persists across branches via session and file.",
    promptSnippet: "todos({ action: 'add'|'list'|'edit'|'delete'|'clear'|'add_phase'|'add_task'|'update'|'remove_task', ... })",
    promptGuidelines: [
      "📌 LEGACY ADD: todos({ action: 'add', items: ['Task A', 'Task B'], priority?: 'low|medium|high|critical', due?: 'YYYY-MM-DD' })",
      "📌 PHASE ADD: todos({ action: 'add_phase', name: 'Phase 1', tasks: [{ content: 'Task 1', status?: 'pending|in_progress|completed|abandoned', notes?: '...', details?: '...' }] })",
      "📌 TASK ADD: todos({ action: 'add_task', phase: 'phase-1', content: 'Task 2', notes?: '...', details?: '...' })",
      "📋 LIST: todos() or todos({ action: 'list', filter?: { done?, priority?, dueAfter?, dueBefore?, search?, tags? } })",
      "✏️  EDIT: todos({ action: 'edit', id: 123, updates: { text?, status?, priority?, due?, tags?, notes?, details? } })",
      "🗑️  DELETE: todos({ action: 'delete', ids: 123 }) or todos({ action: 'delete', ids: [1,2,3] })",
      "💥 CLEAR: todos({ action: 'clear' }) - deletes all todos",
      "🔄 REPLACE: todos({ action: 'replace', phases: [{ name: 'Phase 1', tasks: [...] }] }) - complete replacement",
      "📝 UPDATE TASK: todos({ action: 'update', id: 'task-1', status: 'completed', details: 'Implementation notes' })",
      "❌ REMOVE TASK: todos({ action: 'remove_task', id: 'task-1' })",
      "💡 STATUS: pending, in_progress, completed, abandoned. Auto-normalizes to single in_progress.",
      "💡 PHASES: Group tasks by phase for better organization. Each task belongs to a phase.",
      "💡 TIP: Due dates support 'overdue', 'today', 'this week' in stats.",
      "⚠️  NOTE: State persists to ./.pi/agent/todos.json and survives branches.",
      "📊 After each change, stats show: total, done, pending, by status, phase progress.",
    ],
    parameters: Type.Object({
      action: StringEnum(["list", "add", "edit", "delete", "clear", "replace", "add_phase", "add_task", "update", "remove_task"] as const),

      // Legacy actions
      items: Type.Optional(Type.Array(Type.String())),
      priority: Type.Optional(StringEnum(["low", "medium", "high", "critical"] as const)),
      due: Type.Optional(Type.String()),
      filter: Type.Optional(Type.Any()),
      id: Type.Optional(Type.Number()),
      updates: Type.Optional(TodoEditSchema),
      ids: Type.Optional(Type.Union([Type.Number(), Type.Array(Type.Number())])),

      // Phase-based operations
      phases: Type.Optional(Type.Array(PhaseSchema)),
      name: Type.Optional(Type.String()),
      tasks: Type.Optional(Type.Array(PhaseTodoSchema)),
      phase: Type.Optional(Type.String()),
      content: Type.Optional(Type.String()),
      notes: Type.Optional(Type.String()),
      details: Type.Optional(Type.String()),
    }),

    async execute(_toolCallId: string, params: any, _signal: AbortSignal | undefined, _onUpdate: any, ctx: any) {
      try {
        params = normalizeParams(params);
      } catch (e) {
        return {
          content: [{ type: "text", text: `❌ Error: ${e instanceof Error ? e.message : String(e)}` }],
          details: { action: "list", todos: [], nextId: state.nextId, phases: state.getPhases() } as TodoDetails,
          isError: false,
        } as any;
      }

      const action = params.action as string;

      const makeDetails = (action: string, todos?: Todo[], targetId?: number, affectedIds?: number[], error?: string): TodoDetails => {
        const allTodos = state.getAll();
        const stats = state.getStats();
        return {
          action: action as any,
          todos: todos || allTodos,
          nextId: state.nextId,
          stats,
          targetId,
          affectedIds,
          error,
          phases: state.getPhases(),
        };
      };

      try {
        if (action === "list" || action === "add" || action === "edit" || action === "delete" || action === "clear") {
          return this.executeLegacy(action, params, makeDetails, api);
        }

        if (action === "replace" || action === "add_phase" || action === "add_task" || action === "update" || action === "remove_task") {
          return this.executePhaseBased(action, params, makeDetails, api);
        }

        return {
          content: [{ type: "text", text: `Unknown action: ${action}` }],
          details: makeDetails("list"),
          isError: false,
        } as any;
      } finally {
        state.saveToFile();
      }
    },

    executeLegacy(action: string, params: any, makeDetails: any, api: any) {
      switch (action) {
        case "list": {
          const filter = params.filter as TodoFilter | undefined;
          let todos = filter ? state.filter(filter) : state.getAll();
          todos = state.sort(todos, "id", false);
          const details = makeDetails("list", todos.slice(0, MAX_SEARCH_RESULTS));
          if (todos.length > MAX_SEARCH_RESULTS) {
            details.stats!.total = todos.length;
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

        default:
          return {
            content: [{ type: "text", text: `Unknown action: ${action}` }],
            details: makeDetails("list", state.getAll()),
            isError: false,
          } as any;
      }
    },

    executePhaseBased(action: string, params: any, makeDetails: any, api: any) {
      const errors: string[] = [];
      let triggeredAutoContinue = false;

      try {
        if (action === "replace") {
          const phases = params.phases;
          if (!Array.isArray(phases)) {
            errors.push("replace.phases must be an array");
          } else {
            const newPhases: Phase[] = [];
            for (const inputPhase of phases) {
              if (!inputPhase || typeof inputPhase !== "object") {
                errors.push("Each phase must be an object");
                continue;
              }
              if (!inputPhase.name || typeof inputPhase.name !== "string") {
                errors.push("Each phase must have a name (string)");
                continue;
              }
              const phaseId = `phase-${state.nextId++}`;
              const { phase, nextTaskId } = buildPhaseFromInput(inputPhase, phaseId, state.nextId);
              newPhases.push(phase);
              state.nextId = nextTaskId;
            }
            state.replacePhases(newPhases);
          }
        } else if (action === "add_phase") {
          const name = params.name;
          const tasks = params.tasks;
          if (!name || typeof name !== "string") {
            errors.push("add_phase.name must be a string");
          } else {
            if (tasks && !Array.isArray(tasks)) {
              errors.push("add_phase.tasks must be an array");
            } else {
              state.addPhase(name, tasks);
            }
          }
        } else if (action === "add_task") {
          const phase = params.phase;
          const content = params.content;
          const notes = params.notes;
          const details = params.details;
          if (!phase || typeof phase !== "string") {
            errors.push("add_task.phase must be a string (e.g., 'phase-1')");
          } else if (!content || typeof content !== "string") {
            errors.push("add_task.content must be a string");
          } else {
            const task = state.addTask(phase, content, notes, details);
            if (!task) {
              errors.push(`Phase "${phase}" not found`);
            }
          }
        } else if (action === "update") {
          const id = params.id;
          const status = params.status;
          const content = params.content;
          const notes = params.notes;
          const details = params.details;
          if (!id || typeof id !== "string") {
            errors.push("update.id must be a string (e.g., 'task-1')");
          } else {
            const updates: any = {};
            if (status !== undefined) updates.status = status;
            if (content !== undefined) updates.content = content;
            if (notes !== undefined) updates.notes = notes;
            if (details !== undefined) updates.details = details;
            const task = state.updateTask(id, updates);
            if (!task) {
              errors.push(`Task "${id}" not found`);
            }
          }
        } else if (action === "remove_task") {
          const id = params.id;
          if (!id || typeof id !== "string") {
            errors.push("remove_task.id must be a string (e.g., 'task-1')");
          } else {
            const removed = state.removeTask(id);
            if (!removed) {
              errors.push(`Task "${id}" not found`);
            }
          }
        }

        const phases = state.getPhases();
        const summary = formatSummary(phases, errors);

        // Auto-continue trigger
        const isModifyingOp = ["replace", "add_phase", "add_task", "update", "remove_task"].includes(action);
        if (isModifyingOp && errors.length === 0 && !state.autoTriggerInProgress) {
          state.autoTriggerInProgress = true;
          api.sendMessage(
            {
              customType: "todo-auto-continue",
              content: summary,
              display: true,
            },
            { triggerTurn: true },
          );
          setTimeout(() => {
            state.autoTriggerInProgress = false;
          }, 1000);
          triggeredAutoContinue = true;
        }

        return {
          content: triggeredAutoContinue ? [] : [{ type: "text", text: summary }],
          details: makeDetails(action, state.getAll(), undefined, undefined, errors.length > 0 ? errors.join("; ") : undefined, phases),
          isError: false,
        } as any;
      } catch (e) {
        return {
          content: [{ type: "text", text: `❌ Error: ${e instanceof Error ? e.message : String(e)}` }],
          details: makeDetails(action, state.getAll(), undefined, undefined, errors.length > 0 ? errors.join("; ") : e instanceof Error ? e.message : String(e), state.getPhases()),
          isError: false,
        } as any;
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

  // Load persisted state on startup
  state.loadFromFile();

  // Show updated todo list after changes
  api.on("tool_execution_end", async (event, ctx) => {
    if (event.toolName !== "todos") return;

    const result = event.result as any;
    const details = result?.details as TodoDetails | undefined;
    if (!details) return;

    if (!["add", "edit", "delete", "clear", "replace", "add_phase", "add_task", "update", "remove_task"].includes(details.action as any)) return;

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
        const phase = t.phaseName ? `[${t.phaseName}]` : "";
        msg += `\n${check} #${t.id} ${prio} ${phase} ${due} ${t.text}`;
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
