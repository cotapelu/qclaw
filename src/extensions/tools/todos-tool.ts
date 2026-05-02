#!/usr/bin/env node

/**
 * Phase-only Todo Tool - Clean Architecture
 *
 * Operations: replace, add_phase, add_task, update, remove_task, list
 * Features: auto-normalize in_progress, file persistence, session reconstruction,
 *           auto-continue, system notifications, theme-aware rendering.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import type { ToolDefinition, ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type, StringEnum } from "@mariozechner/pi-ai";
import type { Static } from "typebox";
import { Text } from "@mariozechner/pi-tui";

// ============================================================================
// Types (Phase-only)
// ============================================================================

export type TodoStatus = "pending" | "in_progress" | "completed" | "abandoned";

export interface TodoItem {
	id: string;
	content: string;
	status: TodoStatus;
	notes?: string;
	details?: string;
}

export interface TodoPhase {
	id: string;
	name: string;
	tasks: TodoItem[];
}

export interface TodoFile {
	phases: TodoPhase[];
	nextTaskId: number;
	nextPhaseId: number;
}

interface PersistedTodo {
	version: 1;
	phases: TodoPhase[];
	nextTaskId: number;
	nextPhaseId: number;
	updatedAt: string;
}

export interface TodoToolDetails {
	phases: TodoPhase[];
	storage: "session" | "memory" | "file";
	error?: string;
}

// ============================================================================
// Schemas
// ============================================================================

const StatusEnum = StringEnum(["pending", "in_progress", "completed", "abandoned"] as const, {
	description: "Task status: pending, in_progress, completed, or abandoned",
});

const InputTask = Type.Object({
	content: Type.String({ description: "Task description (required)" }),
	status: Type.Optional(StatusEnum),
	notes: Type.Optional(Type.String({ description: "Additional context or notes (optional)" })),
	details: Type.Optional(Type.String({ description: "Implementation details, file paths, and specifics (optional)" })),
});

const InputPhase = Type.Object({
	name: Type.String({ description: "Phase name (required)" }),
	tasks: Type.Optional(Type.Array(InputTask)),
});

const ReplaceOp = Type.Object({
	phases: Type.Array(InputPhase),
});

const AddPhaseOp = Type.Object({
	name: Type.String({ description: "Phase name (required) - must be a string, not an object" }),
	tasks: Type.Optional(Type.Array(InputTask)),
});

const AddTaskOp = Type.Object({
	phase: Type.String({ description: "Phase ID, e.g. phase-1 (required)" }),
	content: Type.String({ description: "Task description (required)" }),
	notes: Type.Optional(Type.String({ description: "Additional context or notes (optional)" })),
	details: Type.Optional(Type.String({ description: "Implementation details, file paths, and specifics (optional)" })),
});

const UpdateOp = Type.Object({
	id: Type.String({ description: "Task ID, e.g. task-3 (required)" }),
	status: Type.Optional(StatusEnum),
	content: Type.Optional(Type.String({ description: "Updated task description (optional)" })),
	notes: Type.Optional(Type.String({ description: "Updated notes (optional)" })),
	details: Type.Optional(Type.String({ description: "Updated details (optional)" })),
});

const RemoveTaskOp = Type.Object({
	id: Type.String({ description: "Task ID, e.g. task-3 (required)" }),
});

const ListOp = Type.Object({}, { description: "List current todo list without modification" });

const todoWriteSchema = Type.Object({
	replace: Type.Optional(ReplaceOp),
	add_phase: Type.Optional(AddPhaseOp),
	add_task: Type.Optional(AddTaskOp),
	update: Type.Optional(UpdateOp),
	remove_task: Type.Optional(RemoveTaskOp),
	list: Type.Optional(ListOp),
});

type TodoWriteParams = Static<typeof todoWriteSchema>;

// ============================================================================
// File Persistence (Async)
// ============================================================================

const TODO_FILE_NAME = ".piclaw/agent/todos.json";

function getProjectTodoFilePath(): string {
	return join(process.cwd(), TODO_FILE_NAME);
}

async function loadTodoFromFile(): Promise<TodoFile | null> {
	const filePath = getProjectTodoFilePath();
	if (!existsSync(filePath)) return null;

	try {
		const content = await fs.readFile(filePath, "utf-8");
		const parsed: PersistedTodo = JSON.parse(content);
		if (parsed.version !== 1) return null;
		return { phases: parsed.phases, nextTaskId: parsed.nextTaskId, nextPhaseId: parsed.nextPhaseId };
	} catch (e) {
		console.error("Failed to load todos from file:", e);
		return null;
	}
}

async function saveTodoToFile(todo: TodoFile): Promise<void> {
	const filePath = getProjectTodoFilePath();
	const dir = dirname(filePath);
	if (!existsSync(dir)) {
		await fs.mkdir(dir, { recursive: true });
	}

	const persisted: PersistedTodo = {
		version: 1,
		phases: todo.phases,
		nextTaskId: todo.nextTaskId,
		nextPhaseId: todo.nextPhaseId,
		updatedAt: new Date().toISOString(),
	};
	await fs.writeFile(filePath, JSON.stringify(persisted, null, 2));
}

// ============================================================================
// Phase Helpers
// ============================================================================

function findTask(phases: TodoPhase[], id: string): TodoItem | undefined {
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
): { phase: TodoPhase; nextTaskId: number } {
	const tasks: TodoItem[] = [];
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

function getNextIds(phases: TodoPhase[]): { nextTaskId: number; nextPhaseId: number } {
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

function makeEmptyFile(): TodoFile {
	return { phases: [], nextTaskId: 1, nextPhaseId: 1 };
}

function fileFromPhases(phases: TodoPhase[]): TodoFile {
	const { nextTaskId, nextPhaseId } = getNextIds(phases);
	return { phases, nextTaskId, nextPhaseId };
}

function clonePhases(phases: TodoPhase[]): TodoPhase[] {
	return phases.map((phase) => ({ ...phase, tasks: phase.tasks.map((task) => ({ ...task })) }));
}

export function normalizeInProgressTask(phases: TodoPhase[]): void {
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

// ============================================================================
// Formatting
// ============================================================================

function formatSummary(phases: TodoPhase[], errors: string[]): string {
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

	// Find current phase (first with pending/in_progress tasks, or last)
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
// State Management (In-Memory + File)
// ============================================================================

class TodoState {
	private _phases: TodoPhase[] = [];
	private _nextTaskId = 1;
	private _nextPhaseId = 1;
	private _lock = false;
	private listeners: Set<() => void> = new Set();

	get phases(): readonly TodoPhase[] {
		return this._phases;
	}

	get nextTaskId(): number {
		return this._nextTaskId;
	}

	set nextTaskId(val: number) {
		this._nextTaskId = val;
	}

	get nextPhaseId(): number {
		return this._nextPhaseId;
	}

	set nextPhaseId(val: number) {
		this._nextPhaseId = val;
	}

	get isLocked(): boolean {
		return this._lock;
	}

	// Add method to get next phase id without incrementing
	getNextPhaseId(): number {
		return this._nextPhaseId;
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		for (const l of this.listeners) l();
	}

	// Load from file (async)
	async loadFromFile(): Promise<boolean> {
		if (this._lock) return false;
		this._lock = true;
		try {
			const fileData = await loadTodoFromFile();
			if (!fileData) {
				this._phases = [];
				this._nextTaskId = 1;
				this._nextPhaseId = 1;
				return false;
			}
			this._phases = clonePhases(fileData.phases);
			this._nextTaskId = fileData.nextTaskId;
			this._nextPhaseId = fileData.nextPhaseId;
			this.notify();
			return true;
		} finally {
			this._lock = false;
		}
	}

	// Save to file (async)
	async saveToFile(): Promise<void> {
		if (this._lock) return;
		const ids = getNextIds(this._phases);
		const file: TodoFile = {
			phases: clonePhases(this._phases),
			nextTaskId: ids.nextTaskId,
			nextPhaseId: ids.nextPhaseId, // FIX: Use getNextIds, not parse last phase
		};
		await saveTodoToFile(file);
	}

	// Reconstruct from session entries (called on session start)
	reconstructFromEntries(entries: any[]): void {
		// Scan backwards for most recent todo entry
		for (let i = entries.length - 1; i >= 0; i--) {
			const entry = entries[i];
			if (entry.type !== "message") continue;
			const msg = entry.message;
			if (msg.role !== "toolResult") continue;
			// Check both 'todos' and 'todo_write' for compatibility
			const toolName = msg.toolName as string;
			if (toolName !== "todos" && toolName !== "todo_write") continue;

			const details = msg.details as TodoToolDetails | undefined;
			if (!details) continue;

			if (details.phases) {
				this._phases = clonePhases(details.phases);
				// Recalculate next IDs from phases
				const ids = getNextIds(this._phases);
				this._nextTaskId = ids.nextTaskId;
				this._nextPhaseId = ids.nextPhaseId;
				break;
			}
		}
	}

	// Phase operations
	addPhase(name: string, tasks?: Array<{ content: string; status?: TodoStatus; notes?: string; details?: string }>): TodoPhase {
		// FIX: Use nextPhaseId for phase ID, not nextTaskId
		const phaseId = `phase-${this._nextPhaseId++}`;
		const { phase, nextTaskId } = buildPhaseFromInput({ name, tasks }, phaseId, this._nextTaskId);
		this._nextTaskId = nextTaskId;
		this._phases.push(phase);
		normalizeInProgressTask(this._phases);
		this.notify();
		return phase;
	}

	addTask(phaseId: string, content: string, notes?: string, details?: string): TodoItem | null {
		const phase = this._phases.find((p) => p.id === phaseId);
		if (!phase) return null;

		const task: TodoItem = {
			id: `task-${this._nextId()}`,
			content,
			status: "pending",
			notes,
			details,
		};
		phase.tasks.push(task);
		normalizeInProgressTask(this._phases);
		this.notify();
		return task;
	}

	updateTask(taskId: string, updates: Partial<Pick<TodoItem, 'status' | 'content' | 'notes' | 'details'>>): TodoItem | null {
		const task = findTask(this._phases, taskId);
		if (!task) return null;

		if (updates.status !== undefined) task.status = updates.status;
		if (updates.content !== undefined) task.content = updates.content;
		if (updates.notes !== undefined) task.notes = updates.notes;
		if (updates.details !== undefined) task.details = updates.details;

		normalizeInProgressTask(this._phases);
		this.notify();
		return task;
	}

	removeTask(taskId: string): boolean {
		for (const phase of this._phases) {
			const idx = phase.tasks.findIndex((t) => t.id === taskId);
			if (idx !== -1) {
				phase.tasks.splice(idx, 1);
				normalizeInProgressTask(this._phases);
				this.notify();
				return true;
			}
		}
		return false;
	}

	replacePhases(phases: TodoPhase[]): void {
		this._phases = clonePhases(phases);
		normalizeInProgressTask(this._phases);
		// Recalculate next IDs
		const ids = getNextIds(this._phases);
		this._nextTaskId = ids.nextTaskId;
		this._nextPhaseId = ids.nextPhaseId;
		this.notify();
	}

	getPhases(): TodoPhase[] {
		return clonePhases(this._phases);
	}

	private _nextId(): number {
		return this._nextTaskId++;
	}
}

// ============================================================================
// Tool Definition
// ============================================================================

function createTodoTool(api: ExtensionAPI): ToolDefinition<typeof todoWriteSchema, TodoToolDetails> {
	const state = new TodoState();
	let autoTriggerInProgress = false; // Auto-continue flag to prevent recursion

	// Load persisted state on startup
	api.on("session_start", async (_event, ctx) => {
		await state.loadFromFile();
		// Also try to reconstruct from session entries (if any)
		state.reconstructFromEntries(ctx.sessionManager.getBranch());
	});

	api.on("session_tree", async (_event, ctx) => {
		// Session tree changed (branch switch, compaction, etc.)
		state.reconstructFromEntries(ctx.sessionManager.getBranch());
		await state.loadFromFile();
	});

	const tool: ToolDefinition<typeof todoWriteSchema, TodoToolDetails> = {
		name: "todos",
		label: "Todo",
		description: "Manages a structured todo list that persists across turns. NEVER create TODO.md files - always use this tool for task tracking. View progress with /todos command.",
		promptSnippet: "todos({ add_phase:{ name:'Phase 1', tasks:[{content:'Task 1'}] }, add_task:{ phase:'phase-1', content:'Task 2' }, update:{ id:'task-1', status:'completed' }, list:{} })",
		promptGuidelines: [
			"📌 NESTED FORMAT: { op: { params } } e.g., { add_phase: { name: 'Phase 1', tasks: [{ content: 'Task 1' }] } }",
			"📌 OPS: add_phase(name, tasks[]), add_task(phase, content), update(id, status|content), remove_task(id), replace(phases[]), list()",
			"📌 STATUS: pending, in_progress, completed, abandoned. Auto-normalizes to ONE in_progress at a time.",
			"📌 PHASES: Group tasks by phase for project planning. Phase IDs auto-generated (phase-1, phase-2, ...).",
			"📌 LIST: { list: {} } to view current todos.",
			"📌 PERSISTENCE: Saved to ./.piclaw/agent/todos.json automatically.",
			"📌 After todos, state: 'Todo updated: X remaining, Y completed'. Suggest next action.",
			"📌 Examples:",
			"    - Add phase: { add_phase: { name: 'Build API', tasks: [{ content: 'Design endpoints', status: 'pending' }] } }",
			"    - Add task: { add_task: { phase: 'phase-1', content: 'Implement auth' } }",
			"    - Update task: { update: { id: 'task-1', status: 'completed' } }",
			"    - Remove task: { remove_task: { id: 'task-2' } }",
			"    - List todos: { list: {} }",
			"⚠️  NOTE: All parameters are OBJECTS, not strings. Do not JSON.stringify.",
		],
		parameters: todoWriteSchema,
		executionMode: "sequential" as const,
		renderShell: "self" as const,
		async execute(toolCallId, params, _signal, _onUpdate, ctx) {
			// Normalize params (handle stringified JSON etc.)
			let normalized: TodoWriteParams;
			try {
				normalized = normalizeParams(params);
			} catch (e) {
				return {
					content: [{ type: "text", text: `❌ Error: ${e instanceof Error ? e.message : String(e)}` }],
					details: { phases: state.getPhases(), storage: "memory" },
					isError: false,
				};
			}

			const errors: string[] = [];
			const op = detectOperation(normalized);

			// Apply operation
			try {
				if (op === "replace") applyReplace(state, normalized.replace!.phases, errors);
				else if (op === "add_phase") applyAddPhase(state, normalized.add_phase!, errors);
				else if (op === "add_task") applyAddTask(state, normalized.add_task!, errors);
				else if (op === "update") applyUpdate(state, normalized.update!, errors);
				else if (op === "remove_task") applyRemoveTask(state, normalized.remove_task!, errors);
				else if (op === "list") { /* read-only */ }
				else errors.push("No operation specified");
			} catch (e) {
				errors.push(e instanceof Error ? e.message : String(e));
			}

			// Save to file after modification
			if (op && ["replace", "add_phase", "add_task", "update", "remove_task"].includes(op) && errors.length === 0) {
				await state.saveToFile();
			}

			const phases = state.getPhases();
			const summary = formatSummary(phases, errors);

			// Send system message for modifications (excluding list)
			if (op && op !== "list" && errors.length === 0 && !state.isLocked) {
				try {
					await sendUpdateMessage(api, ctx, op, phases, state);
				} catch {
					// Ignore if UI not ready
				}
			}
		// Auto-continue: after any modification (except list), suggest next task
		if (op && op !== "list" && errors.length === 0 && !autoTriggerInProgress) {
			autoTriggerInProgress = true;
			try {
				await api.sendMessage(
					{
						customType: "todo-auto-continue",
						content: "Continue with the next task. If no tasks remain, validate the work and immediately add new tasks.",
						display: false,
						details: { autoTrigger: true, timestamp: Date.now() },
					},
					{ triggerTurn: true }
				);
			} catch {
				// ignore
			}
			setTimeout(() => {
				autoTriggerInProgress = false;
			}, 500);
		}

			return {
				content: [{ type: "text", text: summary }],
				details: { phases, storage: "file" as const, error: errors.length > 0 ? errors.join("; ") : undefined },
				isError: false,
			};
		},
		renderCall: (args, theme) => {
			const op = detectOperation(args as any) || "list";
			const text = `${theme.fg("toolTitle", theme.bold("todos"))} ${theme.fg("muted", op)}`;
			return new Text(text, 0, 0);
		},
		renderResult: (result, options, theme) => {
			const details = result.details as TodoToolDetails | undefined;
			if (!details) return new Text("", 0, 0);

			if (details.error) {
				return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
			}

			if (options.isPartial) {
				return new Text(theme.fg("warning", "Processing..."), 0, 0);
			}

			const phases = details.phases.filter((p) => p.tasks.length > 0);
			const allTasks = phases.flatMap((p) => p.tasks);

			if (allTasks.length === 0) {
				return new Text(theme.fg("dim", "No todos"), 0, 0);
			}

			const lines: string[] = [theme.fg("toolTitle", `Todos: ${allTasks.length} tasks`)];

			for (const phase of phases) {
				if (phases.length > 1) {
					lines.push(theme.fg("accent", `▼ ${phase.name}`));
				}
				for (const task of phase.tasks) {
					const statusColor = task.status === "completed" || task.status === "abandoned" ? "dim" : "text";
					const prefix = task.status === "in_progress" ? "→" : task.status === "completed" ? "✓" : task.status === "abandoned" ? "✗" : " ";
					const line = `${theme.fg(statusColor, `  ${prefix} ${task.id} ${task.content}`)}`;
					lines.push(line);
					if (task.status === "in_progress" && task.details) {
						for (const line of task.details.split("\n")) {
							lines.push(theme.fg("dim", `    ${line}`));
						}
					}
				}
			}

			return new Text(lines.join("\n"), 0, 0);
		},
	};

	return tool;
}

// ============================================================================
// Operation Handlers
// ============================================================================

function detectOperation(params: TodoWriteParams): string | null {
	if (params.replace) return "replace";
	if (params.add_phase) return "add_phase";
	if (params.add_task) return "add_task";
	if (params.update) return "update";
	if (params.remove_task) return "remove_task";
	if (params.list !== undefined) return "list";
	return null;
}

function applyReplace(state: TodoState, phasesInput: any[], errors: string[]): void {
	if (!Array.isArray(phasesInput)) {
		errors.push("replace.phases must be an array");
		return;
	}
	const newPhases: TodoPhase[] = [];
	for (const inputPhase of phasesInput) {
		if (!inputPhase || typeof inputPhase !== "object") {
			errors.push("Each phase must be an object");
			continue;
		}
		if (!inputPhase.name || typeof inputPhase.name !== "string") {
			errors.push("Each phase must have a name (string)");
			continue;
		}
		if (inputPhase.tasks && !Array.isArray(inputPhase.tasks)) {
			errors.push(`Phase "${inputPhase.name}": tasks must be an array`);
			continue;
		}
		// FIX: Use nextPhaseId for phase IDs, increment after use
		const phaseId = `phase-${state.nextPhaseId++}`;
		const { phase, nextTaskId } = buildPhaseFromInput(inputPhase, phaseId, state.nextTaskId);
		newPhases.push(phase);
		state.nextTaskId = nextTaskId;
		// Note: state.replacePhases() will recalc nextPhaseId from all phases
		// So we don't manually set state.nextPhaseId here
}
	state.replacePhases(newPhases);
}

function applyAddPhase(state: TodoState, op: any, errors: string[]): void {
	if (!op || typeof op !== "object") {
		errors.push("add_phase must be an object");
		return;
	}
	if (!op.name || typeof op.name !== "string") {
		errors.push("add_phase.name must be a string");
		return;
	}
	if (op.tasks && !Array.isArray(op.tasks)) {
		errors.push("add_phase.tasks must be an array");
		return;
	}
	state.addPhase(op.name, op.tasks);
}

function applyAddTask(state: TodoState, op: any, errors: string[]): void {
	if (!op || typeof op !== "object") {
		errors.push("add_task must be an object");
		return;
	}
	if (!op.phase || typeof op.phase !== "string") {
		errors.push("add_task.phase must be a string (e.g., 'phase-1')");
		return;
	}
	if (!op.content || typeof op.content !== "string") {
		errors.push("add_task.content must be a string");
		return;
	}
	const task = state.addTask(op.phase, op.content, op.notes, op.details);
	if (!task) {
		errors.push(`Phase "${op.phase}" not found`);
	}
}

function applyUpdate(state: TodoState, op: any, errors: string[]): void {
	if (!op || typeof op !== "object") {
		errors.push("update must be an object");
		return;
	}
	if (!op.id || typeof op.id !== "string") {
		errors.push("update.id must be a string (e.g., 'task-1')");
		return;
	}
	const task = state.updateTask(op.id, op);
	if (!task) {
		errors.push(`Task "${op.id}" not found`);
	}
}

function applyRemoveTask(state: TodoState, op: any, errors: string[]): void {
	if (!op || typeof op !== "object") {
		errors.push("remove_task must be an object");
		return;
	}
	if (!op.id || typeof op.id !== "string") {
		errors.push("remove_task.id must be a string (e.g., 'task-1')");
		return;
	}
	const removed = state.removeTask(op.id);
	if (!removed) {
		errors.push(`Task "${op.id}" not found`);
	}
}

async function sendUpdateMessage(api: ExtensionAPI, ctx: ExtensionContext, action: string, phases: TodoPhase[], state: TodoState): Promise<void> {
	// Build summary for system message
	const tasks = phases.flatMap((p) => p.tasks);
	const pending = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length;
	const completed = tasks.filter((t) => t.status === "completed" || t.status === "abandoned").length;

	// Get recent tasks (last 10 by creation order)
	const recent = [...tasks]
		.map(t => {
			const parts = t.id.split('-');
			const phaseId = parts[0] ?? '';
			const taskNum = parseInt(parts[1] ?? '0', 10);
			return {
				task: t,
				phaseIdx: phases.findIndex(p => p.id === phaseId),
				taskNum
			};
		})
		.sort((a, b) => a.phaseIdx - b.phaseIdx || a.taskNum - b.taskNum)
		.map(x => x.task)
		.slice(-10);

	const lines: string[] = [`[System: Todo ${action}] Updated: ${pending}/${tasks.length} pending`];
	if (action === "add_phase") {
		const added = phases[phases.length - 1]?.tasks.map(t => `#${t.id}`) ?? [];
		lines.push(`Added phase: ${added.join(", ")}`);
	}
	if (action === "add_task") {
		const phase = phases.find(p => p.tasks.some(t => t.status === "pending" || t.status === "in_progress"));
		const newTask = phase?.tasks[phase.tasks.length - 1];
		if (newTask) lines.push(`Added: #${newTask.id} ${newTask.content}`);
	}
	if (action === "remove_task") {
		lines.push(`Removed task`);
	}
	if (action === "clear") {
		lines.push(`All todos cleared.`);
	}

	if (recent.length > 0) {
		lines.push("Recent:");
		for (const t of recent) {
			const check = t.status === "completed" || t.status === "abandoned" ? "✓" : t.status === "in_progress" ? "→" : "○";
			lines.push(`  ${check} #${t.id} ${t.content}`);
		}
	}

	const msg = lines.join("\n");

	try {
		await api.sendMessage(
			{
				customType: "todo_update",
				content: msg,
				display: true,
			},
			{ triggerTurn: true },
		);
	} catch {
		// Ignore - likely turn already in progress
	}
}

// ============================================================================
// Params Normalization (comprehensive - handles common LLM errors)
// ============================================================================

function normalizeParams(params: unknown): TodoWriteParams {
	// If params is a string, try to parse it
	if (typeof params === "string") {
		try {
			params = JSON.parse(params);
		} catch (e) {
			throw new Error(`Invalid JSON string: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	// Ensure params is an object
	if (typeof params !== "object" || params === null) {
		throw new Error("Parameters must be an object");
	}

	const normalized = params as Record<string, unknown>;

	// Handle add_phase being a string instead of object
	if (normalized.add_phase && typeof normalized.add_phase === "string") {
		try {
			normalized.add_phase = JSON.parse(normalized.add_phase);
		} catch (e) {
			throw new Error(
				`add_phase must be an object, not a string. Error parsing: ${e instanceof Error ? e.message : String(e)}`,
			);
		}
	}

	// Handle add_phase.name being a stringified object (LLM puts whole object in name field)
	if (normalized.add_phase && typeof normalized.add_phase === "object") {
		const addPhase = normalized.add_phase as Record<string, unknown>;
		if (addPhase.name && typeof addPhase.name === "string" && addPhase.name.startsWith("{")) {
			try {
				const parsed = JSON.parse(addPhase.name);
				if (typeof parsed === "object" && parsed !== null) {
					// LLM put the whole object in name field
					normalized.add_phase = parsed;
				}
			} catch {
				// Keep original if parse fails
			}
		}
	}

	// Handle tasks being a string instead of array (comma-separated)
	if (normalized.add_phase && typeof normalized.add_phase === "object") {
		const addPhase = normalized.add_phase as Record<string, unknown>;
		if (addPhase.tasks && typeof addPhase.tasks === "string") {
			try {
				addPhase.tasks = JSON.parse(addPhase.tasks);
			} catch {
				// If it's a comma-separated string, split it
				addPhase.tasks = (addPhase.tasks as string). split(",").map((s) => ({ content: s.trim() }));
			}
		}
	}

	// Handle replace.phases being a string
	if (normalized.replace && typeof normalized.replace === "object") {
		const replace = normalized.replace as Record<string, unknown>;
		if (replace.phases && typeof replace.phases === "string") {
			try {
				replace.phases = JSON.parse(replace.phases);
			} catch (e) {
				throw new Error(
					`replace.phases must be an array, not a string. Error parsing: ${e instanceof Error ? e.message : String(e)}`,
				);
			}
		}
	}

	// Handle add_task.phase being stringified
	if (normalized.add_task && typeof normalized.add_task === "object") {
		const addTask = normalized.add_task as Record<string, unknown>;
		if (addTask.phase && typeof addTask.phase === "string" && addTask.phase.startsWith("{")) {
			try {
				addTask.phase = JSON.parse(addTask.phase);
			} catch {
				// ignore
			}
		}
	}

	return normalized as TodoWriteParams;
}

// ============================================================================
// Export
// ============================================================================

export function registerTodosTool(api: ExtensionAPI): void {
	const tool = createTodoTool(api);
	api.registerTool(tool);
}
