import { Container } from "@mariozechner/pi-tui";
import type { Component } from "@mariozechner/pi-tui";
import type { ThemeManager } from "../theme";

/**
 * Props for ChatContainer
 */
export interface ChatContainerProps {
  /** Theme manager instance */
  themeManager: ThemeManager;
  /** Maximum number of messages to keep in memory (0 = unlimited) */
  maxMessages?: number;
  /** Whether to auto-scroll to bottom on new message */
  autoScroll?: boolean;
  /** Padding between messages */
  messageSpacing?: number;
}

/**
 * ChatContainer - A scrollable container for chat messages
 * Manages message list with auto-scroll and message limiting
 */
export class ChatContainer extends Container implements Component {
  private props: ChatContainerProps;
  private themeManager: ThemeManager;
  private _scrollPosition: number = 0;
  private messages: Component[] = [];

  constructor(props: ChatContainerProps) {
    super();
    this.props = {
      maxMessages: 0,
      autoScroll: true,
      messageSpacing: 1,
      ...props,
    };
    this.themeManager = props.themeManager;
  }

  /**
   * Add a message component to the chat
   */
  addMessage(component: Component): void {
    this.messages.push(component);
    this.addChild(component);

    // Enforce max messages if set
    if (this.props.maxMessages > 0 && this.messages.length > this.props.maxMessages) {
      const removed = this.messages.shift();
      if (removed) {
        this.removeChild(removed);
      }
    }

    this.invalidate();
  }

  /**
   * Remove a specific message
   */
  removeMessage(component: Component): boolean {
    const index = this.messages.indexOf(component);
    if (index !== -1) {
      this.messages.splice(index, 1);
      this.removeChild(component);
      this.invalidate();
      return true;
    }
    return false;
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    while (this.children.length > 0) {
      this.removeChild(this.children[0]);
    }
    this.messages = [];
    this.invalidate();
  }

  /**
   * Get all messages
   */
  getMessages(): Component[] {
    return [...this.messages];
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom(): void {
    this._scrollPosition = 0;
    this.invalidate();
  }

  /**
   * Get total height of all messages
   */
  getTotalHeight(): number {
    let total = 0;
    for (const msg of this.messages) {
      total += msg.render(80).length;
      total += this.props.messageSpacing;
    }
    return total;
  }

  render(width: number): string[] {
    const lines: string[] = [];
    const spacing = this.props.messageSpacing;

    for (const child of this.messages) {
      const childLines = child.render(width);
      lines.push(...childLines);
      if (spacing > 0) {
        lines.push(...Array(spacing).fill(""));
      }
    }

    // Remove trailing spacing
    if (spacing > 0 && lines.length > 0) {
      lines.splice(lines.length - spacing, spacing);
    }

    return lines;
  }
}

/**
 * Create a styled chat border with theme support
 */
export function createChatBorder(width: number, borderChar: string = "─"): string {
  // Simple border, theme applied by caller
  return borderChar.repeat(width);
}

/**
 * Create a chat separator line
 */
export function createSeparator(width: number, style: "single" | "double" | "dashed" = "single"): string {
  const chars: Record<string, string> = {
    single: "─",
    double: "═",
    dashed: "┈",
  };
  return chars[style].repeat(width);
}
