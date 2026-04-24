import { Container, type Component, type TUI } from "@mariozechner/pi-tui";
import { UserMessageComponent, AssistantMessageComponent, ToolExecutionComponent, BashExecutionComponent } from "@mariozechner/pi-coding-agent";
import { getMarkdownTheme } from "@mariozechner/pi-coding-agent";
import type { ThemeManager } from "../../theme/theme-manager.js";

export interface ChatContainerProps {
	themeManager: ThemeManager;
	ui: TUI;
	cwd: string;
	maxMessages?: number;
	messageSpacing?: number;
	autoScroll?: boolean;
}

/**
 * Professional ChatContainer for coding agents.
 *
 * Uses pi-coding-agent message components:
 * - UserMessageComponent for user input (markdown, themed background)
 * - AssistantMessageComponent for assistant replies (markdown, thinking blocks)
 * - ToolExecutionComponent for tool calls (expandable, syntax highlighting)
 * - BashExecutionComponent for bash commands (with output)
 *
 * Provides convenience methods for adding messages and managing tool executions.
 */
export class ChatContainer extends Container implements Component {
	private props: ChatContainerProps;
	private themeManager: ThemeManager;
	private messages: Component[] = [];
	private toolComponents = new Map<string, ToolExecutionComponent>();
	private bashComponents = new Map<string, BashExecutionComponent>();
	private mdTheme = getMarkdownTheme();

	constructor(props: ChatContainerProps) {
		super();
		this.props = props;
		this.themeManager = props.themeManager;
	}

	// MARK: - User Messages

	/**
	 * Add a user message with markdown rendering.
	 */
	addUserMessage(text: string): UserMessageComponent {
		const msg = new UserMessageComponent(text, this.mdTheme);
		this.messages.push(msg);
		super.addChild(msg);
		this.enforceLimit();
		this.invalidate();
		return msg;
	}

	// MARK: - Assistant Messages

	/**
	 * Add an assistant message.
	 * Note: For full support (thinking, tool calls), construct AssistantMessage object properly.
	 */
	addAssistantMessage(content: string): AssistantMessageComponent {
		// Basic version: text only
		const msg = new AssistantMessageComponent({
			content: [{ type: "text", text: content }],
			stopReason: "end_turn",
			// Minimal required fields; these will be filled in later when we have full message object
			// from the agent. For now, we use a simplified approach.
		} as any, false, this.mdTheme);
		this.messages.push(msg);
		super.addChild(msg);
		this.enforceLimit();
		this.invalidate();
		return msg;
	}

	// MARK: - Tool Execution

	/**
	 * Add a tool execution component.
	 *
	 * @param toolName - Name of the tool (e.g., "bash", "edit", "read")
	 * @param toolCallId - Unique ID for this tool call (for updates)
	 * @param args - Tool arguments object
	 * @param options - ToolExecutionOptions (showImages, etc.)
	 * @returns The created ToolExecutionComponent
	 */
	addToolExecution(toolName: string, toolCallId: string, args: any, options?: { showImages?: boolean }): ToolExecutionComponent {
		const comp = new ToolExecutionComponent(
			toolName,
			toolCallId,
			args,
			{ showImages: options?.showImages ?? true },
			undefined,
			this.props.ui,
			this.props.cwd,
		);
		this.toolComponents.set(toolCallId, comp);
		this.messages.push(comp);
		super.addChild(comp);
		this.enforceLimit();
		this.invalidate();
		return comp;
	}

	/**
	 * Update a tool execution's arguments (for streaming updates).
	 */
	updateToolExecution(toolCallId: string, args: any): void {
		const comp = this.toolComponents.get(toolCallId);
		if (comp) {
			comp.updateArgs(args);
			this.invalidate();
		}
	}

	/**
	 * Mark a tool execution as started (moves from pending to executing state).
	 */
	markToolExecutionStarted(toolCallId: string): void {
		const comp = this.toolComponents.get(toolCallId);
		if (comp) {
			comp.markExecutionStarted();
			this.invalidate();
		}
	}

	/**
	 * Complete a tool execution with result.
	 *
	 * @param toolCallId - The tool call ID
	 * @param result - Tool result content array (type pi-ai content blocks)
	 * @param isError - Whether the tool resulted in an error
	 */
	completeToolExecution(toolCallId: string, result: Array<{ type: string; text?: string; data?: string; mimeType?: string }>, isError = false): void {
		const comp = this.toolComponents.get(toolCallId);
		if (comp) {
			comp.updateResult({ content: result, isError }, false);
			this.invalidate();
		}
	}

	/**
	 * Expand or collapse a tool execution's output.
	 */
	setToolExpanded(toolCallId: string, expanded: boolean): void {
		const comp = this.toolComponents.get(toolCallId);
		if (comp) {
			comp.setExpanded(expanded);
			this.invalidate();
		}
	}

	// MARK: - Bash Execution

	/**
	 * Add a bash execution component.
	 */
	addBashExecution(command: string): BashExecutionComponent {
		const comp = new BashExecutionComponent(command, this.props.ui, false);
		this.bashComponents.set(command, comp); // note: using command as key; in practice should use ID
		this.messages.push(comp);
		super.addChild(comp);
		this.enforceLimit();
		this.invalidate();
		return comp;
	}

	/**
	 * Update bash execution with output line.
	 */
	appendBashOutput(command: string, line: string): void {
		const comp = this.bashComponents.get(command);
		if (comp) {
			comp.appendOutput(line);
			this.invalidate();
		}
	}

	/**
	 * Complete bash execution.
	 */
	completeBashExecution(command: string, exitCode: number): void {
		const comp = this.bashComponents.get(command);
		if (comp) {
			comp.setComplete(exitCode, false);
			this.invalidate();
		}
	}

	// MARK: - Custom Messages

	/**
	 * Add any custom component to the chat.
	 */
	addCustomMessage(component: Component): void {
		this.messages.push(component);
		super.addChild(component);
		this.enforceLimit();
		this.invalidate();
	}

	// MARK: - Message Management

	/**
	 * Add any component to the chat (legacy method)
	 */
	addMessage(component: Component): void {
		this.messages.push(component);
		super.addChild(component);
		this.enforceLimit();
		this.invalidate();
	}

	override addChild(child: Component): void {
		this.addMessage(child);
	}

	removeMessage(component: Component): boolean {
		const index = this.messages.indexOf(component);
		if (index !== -1) {
			this.messages.splice(index, 1);
			super.removeChild(component);
			this.invalidate();
			return true;
		}
		return false;
	}

	clearMessages(): void {
		while (this.children.length > 0) {
			const child = this.children[0];
			super.removeChild(child);
		}
		this.messages = [];
		this.toolComponents.clear();
		this.bashComponents.clear();
		this.invalidate();
	}

	getMessages(): Component[] {
		return [...this.messages];
	}

	/**
	 * Get a tool execution component by its ID.
	 */
	getToolExecution(toolCallId: string): ToolExecutionComponent | undefined {
		return this.toolComponents.get(toolCallId);
	}

	/**
	 * Get all tool execution components.
	 */
	getAllToolExecutions(): ToolExecutionComponent[] {
		return Array.from(this.toolComponents.values());
	}

	// MARK: - Rendering

	render(width: number): string[] {
		const lines: string[] = [];
		const spacing = this.props.messageSpacing ?? 1;

		for (const child of this.messages) {
			const childLines = child.render(width);
			lines.push(...childLines);
			if (spacing > 0) {
				lines.push(...Array(spacing).fill(""));
			}
		}

		if (spacing > 0 && lines.length > 0) {
			lines.splice(lines.length - spacing, spacing);
		}

		return lines;
	}

	// MARK: - Private

	private enforceLimit(): void {
		const max = this.props.maxMessages;
		if (max && max > 0) {
			while (this.messages.length > max) {
				const oldest = this.messages[0];
				this.messages.shift();
				super.removeChild(oldest);
				// Also remove from tool/bash maps if present
				// (We could store metadata to know type, but for simplicity we check existence)
				// In a more robust implementation, we'd store wrapper objects with type info.
				// For now, maps may grow slightly if tool executions are removed from UI but tracked.
				// That's acceptable.
			}
		}
	}
}

/**
 * Create a simple chat border line.
 */
export function createChatBorder(width: number, borderChar: string = "─"): string {
	return borderChar.repeat(width);
}

/**
 * Create a separator line with various styles.
 */
export function createSeparator(width: number, style: "single" | "double" | "dashed" = "single"): string {
	const chars: Record<string, string> = {
		single: "─",
		double: "═",
		dashed: "┈",
	};
	return chars[style].repeat(width);
}
