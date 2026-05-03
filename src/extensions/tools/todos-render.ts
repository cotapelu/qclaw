/**
 * Renderer functions for todos tool
 * Extracted for reusability and testability
 */

import { Text } from "@mariozechner/pi-tui";
import type { TodoToolDetails, TodoPhase } from "./todos-tool.js";

/**
 * Detect operation from args (same as in todos-tool.ts)
 */
export function detectOperation(params: any): string | undefined {
	if (!params) return "list";
	if (params.replace) return "replace";
	if (params.add_phase) return "add_phase";
	if (params.add_task) return "add_task";
	if (params.update) return "update";
	if (params.remove_task) return "remove_task";
	if (params.list) return "list";
	if (params.dashboard) return "dashboard";
	return undefined;
}

/**
 * Generate a visual progress bar
 */
function renderProgressBar(percentage: number, theme: any, width: number = 20): string {
	const filled = Math.round((percentage / 100) * width);
	const empty = width - filled;
	const bar = theme.fg("accent", "█".repeat(filled)) + theme.fg("dim", "░".repeat(empty));
	return `${bar} ${Math.round(percentage)}%`;
}

/**
 * Calculate completion percentage for a phase
 */
function calculatePhaseProgress(phase: TodoPhase): number {
	if (phase.tasks.length === 0) return 0;
	const completed = phase.tasks.filter((t) => t.status === "completed" || t.status === "abandoned").length;
	return (completed / phase.tasks.length) * 100;
}

/**
 * Render the tool call (when user invokes the tool)
 */
export function renderTodosCall(args: any, theme: any): Text {
	const op = detectOperation(args) || "list";
	const text = `${theme.fg("toolTitle", theme.bold("todos"))} ${theme.fg("muted", op)}`;
	return new Text(text, 0, 0);
}

/**
 * Render options for the result
 */
export interface RenderResultOptions {
	expanded: boolean;
	isPartial: boolean;
	dashboard?: boolean;  // If true, show dashboard view with detailed stats
}

/**
 * Render the result of tool execution
 */
export function renderTodosResult(result: { details?: TodoToolDetails }, options: RenderResultOptions, theme: any): Text {
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
			// Show progress bar for each phase
			const progress = calculatePhaseProgress(phase);
			const progressBar = renderProgressBar(progress, theme);
			lines.push(theme.fg("accent", `▼ ${phase.name}`) + "  " + theme.fg("muted", progressBar));
		} else {
			// Single phase - just show name
			lines.push(theme.fg("accent", `▼ ${phase.name}`));
		}
		for (const task of phase.tasks) {
			const statusColor = task.status === "completed" || task.status === "abandoned" ? "dim" : "text";
			const prefix = task.status === "in_progress" ? "→" : task.status === "completed" ? "✓" : task.status === "abandoned" ? "✗" : " ";
			const line = `${theme.fg(statusColor, `  ${prefix} ${task.id} ${task.content}`)}`;
			lines.push(line);
			if (task.status === "in_progress" && task.details) {
				for (const detailLine of task.details.split("\n")) {
					lines.push(theme.fg("dim", `    ${detailLine}`));
				}
			}
		}
	}

	if (options.expanded || options.dashboard) {
		const total = allTasks.length;
		const completed = allTasks.filter((t) => t.status === "completed").length;
		const inProgress = allTasks.filter((t) => t.status === "in_progress").length;
		const pending = allTasks.filter((t) => t.status === "pending").length;
		lines.push("");
		lines.push(theme.fg("muted", `Summary: ${completed} completed, ${inProgress} in progress, ${pending} pending`));
		// Overall progress bar
		const overallProgress = total > 0 ? (completed / total) * 100 : 0;
		lines.push(theme.fg("muted", `Overall: `) + renderProgressBar(overallProgress, theme, 30));
	}

	// Dashboard view - show detailed statistics
	if (options.dashboard) {
		lines.push("");
		lines.push(theme.fg("toolTitle", theme.bold("═══ Dashboard ═══")));
		
		// Velocity (tasks completed per phase)
		lines.push("");
		lines.push(theme.fg("accent", "Velocity (completed per phase):"));
		for (const phase of phases) {
			const phaseCompleted = phase.tasks.filter((t) => t.status === "completed").length;
			const phaseTotal = phase.tasks.length;
			lines.push(theme.fg("text", `  ${phase.name}: ${phaseCompleted}/${phaseTotal} tasks`));
		}
		
		// Burndown simulation (simple estimate based on completion)
		lines.push("");
		lines.push(theme.fg("accent", "Burndown (estimated):"));
		const remaining = allTasks.filter((t) => t.status !== "completed" && t.status !== "abandoned").length;
		const done = allTasks.filter((t) => t.status === "completed" || t.status === "abandoned").length;
		const total_ = allTasks.length;
		if (total_ > 0) {
			const completionRate = (done / total_) * 100;
			lines.push(theme.fg("text", `  Completion rate: ${completionRate.toFixed(1)}%`));
			lines.push(theme.fg("text", `  Remaining: ${remaining} tasks`));
			lines.push(theme.fg("text", `  Done: ${done} tasks`));
			
			// Simple burndown bar
			const burndownWidth = 30;
			const doneBar = Math.round((done / total_) * burndownWidth);
			const remainingBar = burndownWidth - doneBar;
			lines.push(theme.fg("text", `  Burndown: `) + theme.fg("accent", "█".repeat(doneBar)) + theme.fg("dim", "░".repeat(remainingBar)));
		}
		
		// Priority distribution
		const byPriority = { critical: 0, high: 0, medium: 0, low: 0, none: 0 };
		for (const task of allTasks) {
			if (task.priority === "critical") byPriority.critical++;
			else if (task.priority === "high") byPriority.high++;
			else if (task.priority === "medium") byPriority.medium++;
			else if (task.priority === "low") byPriority.low++;
			else byPriority.none++;
		}
		lines.push("");
		lines.push(theme.fg("accent", "Priority Distribution:"));
		if (byPriority.critical > 0) lines.push(theme.fg("error", `  🔴 Critical: ${byPriority.critical}`));
		if (byPriority.high > 0) lines.push(theme.fg("warning", `  🟠 High: ${byPriority.high}`));
		if (byPriority.medium > 0) lines.push(theme.fg("text", `  🟡 Medium: ${byPriority.medium}`));
		if (byPriority.low > 0) lines.push(theme.fg("dim", `  🟢 Low: ${byPriority.low}`));
		if (byPriority.none > 0) lines.push(theme.fg("dim", `  ⚪ None: ${byPriority.none}`));
	}

	const output = lines.join("\n");
	return new Text(output, 0, 0);
}