import { Container } from "@mariozechner/pi-tui";
import {
  UserMessageComponent,
  AssistantMessageComponent,
  ToolExecutionComponent,
  CustomMessageComponent,
} from "@mariozechner/pi-coding-agent";
import { getGlobalEventBus } from "../core/event-bus.js";
import type { MessageEvent, ToolExecutionEvent } from "../types/events.js";

/**
 * MessageContainer manages all chat messages in the conversation.
 * It handles adding, updating, and removing messages using pi-coding-agent components.
 */
export class MessageContainer extends Container {
  private eventBus = getGlobalEventBus();
  private messages: Map<string, Container> = new Map();
  private currentAssistantId: string | null = null;
  private currentToolId: string | null = null;

  constructor() {
    super();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // User messages
    this.eventBus.on<MessageEvent>('message.add', (event) => {
      const { messageId, role, content } = event.payload;
      this.addMessage(messageId, role, content);
    });

    // Assistant message updates (streaming)
    this.eventBus.on<MessageEvent>('message.update', (event) => {
      const { messageId, content } = event.payload;
      this.updateMessageContent(messageId, content);
    });

    // Delta updates (for streaming)
    this.eventBus.on<MessageUpdateEvent>('message.delta', (event) => {
      const { messageId, delta } = event.payload;
      this.appendToMessage(messageId, delta);
    });

    // Tool execution
    this.eventBus.on<ToolExecutionEvent>('tool.execution.start', (event) => {
      const { toolCallId, toolName, input } = event.payload;
      this.addToolExecution(toolCallId, toolName, input);
    });

    this.eventBus.on<ToolExecutionEvent>('tool.execution.end', (event) => {
      const { toolCallId, output } = event.payload;
      this.updateToolResult(toolCallId, output);
    });

    this.eventBus.on<ToolExecutionEvent>('tool.execution.error', (event) => {
      const { toolCallId, error } = event.payload;
      this.updateToolError(toolCallId, error);
    });

    // Clear messages
    this.eventBus.on('messages.clear', () => {
      this.clearAllMessages();
    });
  }

  /**
   * Add a new message to the container
   */
  private addMessage(messageId: string, role: 'user' | 'assistant' | 'system' | 'error', content: string): void {
    // Don't add if already exists (idempotent)
    if (this.messages.has(messageId)) return;

    let component: Container;

    if (role === 'user') {
      component = new UserMessageComponent(content);
    } else if (role === 'assistant') {
      component = new AssistantMessageComponent("", false);
      this.currentAssistantId = messageId;
    } else if (role === 'system' || role === 'error') {
      component = new CustomMessageComponent(content, role === 'error' ? 'error' : 'system');
    } else {
      console.warn(`Unknown message role: ${role}`);
      return;
    }

    this.messages.set(messageId, component);
    this.addChild(component);
  }

  /**
   * Update entire content of a message
   */
  private updateMessageContent(messageId: string, content: string): void {
    const component = this.messages.get(messageId);
    if (!component) return;

    if (component instanceof AssistantMessageComponent) {
      component.updateContent(content);
    } else if (component instanceof CustomMessageComponent) {
      component.updateContent(content);
    }
    // Force re-render
    this.invalidate();
  }

  /**
   * Append delta to existing message (for streaming)
   */
  private appendToMessage(messageId: string, delta: string): void {
    const component = this.messages.get(messageId);
    if (!component) return;

    const currentContent = component instanceof AssistantMessageComponent
      ? component.getContent() || ""
      : "";

    if (component instanceof AssistantMessageComponent) {
      component.updateContent(currentContent + delta);
    } else if (component instanceof CustomMessageComponent) {
      component.updateContent(currentContent + delta);
    }
    this.invalidate();
  }

  /**
   * Add tool execution component
   */
  private addToolExecution(toolCallId: string, toolName: string, input: Record<string, any>): void {
    const toolComponent = new ToolExecutionComponent(
      toolName,
      toolCallId,
      input,
      { showImages: true },
      undefined, // toolDefinition - can be provided via options
      this // container parent
    );

    this.messages.set(toolCallId, toolComponent as Container);
    this.currentToolId = toolCallId;
    this.addChild(toolComponent);
    this.invalidate();
  }

  /**
   * Update tool result
   */
  private updateToolResult(toolCallId: string, output: any): void {
    const component = this.messages.get(toolCallId);
    if (component instanceof ToolExecutionComponent) {
      component.updateResult(output);
      this.invalidate();
    }
  }

  /**
   * Update tool error
   */
  private updateToolError(toolCallId: string, error: string): void {
    const component = this.messages.get(toolCallId);
    if (component instanceof ToolExecutionComponent) {
      component.updateResult({ error });
      this.invalidate();
    }
  }

  /**
   * Clear all messages
   */
  clearAllMessages(): void {
    this.messages.clear();
    this.currentAssistantId = null;
    this.currentToolId = null;
    this.children = [];
    this.invalidate();
  }

  /**
   * Get current assistant message ID (for streaming updates)
   */
  getCurrentAssistantId(): string | null {
    return this.currentAssistantId;
  }

  /**
   * Invalidate the container to trigger re-render
   */
  invalidate(): void {
    // Container might have its own invalidate, but we also need to notify TUI
    if (this.parent) {
      (this.parent as any).requestRender?.();
    }
  }

  /**
   * Get all message IDs (for debugging / testing)
   */
  getMessageIds(): string[] {
    return Array.from(this.messages.keys());
  }
}
