import { Container } from "@mariozechner/pi-tui";
import type { Component } from "@mariozechner/pi-tui";
import type { ThemeManager } from "../../theme/theme-manager";

/**
 * Configuration props for ChatContainer
 */
export interface ChatContainerProps {
  /**
   * Theme manager instance for theme-aware rendering
   */
  themeManager: ThemeManager;
  /**
   * Maximum number of messages to keep in memory.
   * Set to 0 for unlimited (default: 0)
   */
  maxMessages?: number;
  /**
   * Whether to automatically scroll to bottom when new messages are added.
   * Default: true
   */
  autoScroll?: boolean;
  /**
   * Number of empty lines between messages.
   * Default: 1
   */
  messageSpacing?: number;
}

/**
 * ChatContainer - A specialized Container for displaying chat message history.
 *
 * Manages a collection of message components (UserMessageComponent,
 * AssistantMessageComponent, etc.) with optional message limiting
 * and spacing. Inherits from pi-tui's Container for layout composition.
 *
 * @example
 * ```typescript
 * const chat = new ChatContainer({
 *   themeManager: theme,
 *   maxMessages: 100,
 *   messageSpacing: 1,
 * });
 * chat.addMessage(new UserMessageComponent("Hello!", theme));
 * ```
 */
export class ChatContainer extends Container implements Component {
  private props: ChatContainerProps;
  private themeManager: ThemeManager;
  private messages: Component[] = [];

  /**
   * Create a new ChatContainer.
   *
   * @param props - Configuration options
   */
  constructor(props: ChatContainerProps) {
    super();
    this.props = props;
    this.themeManager = props.themeManager;
  }

  /**
   * Add a message component to the chat.
   *
   * If `maxMessages` is set and exceeded, the oldest message is removed.
   * Triggers a re-render on the next tick.
   *
   * @param component - Message component to add (UserMessageComponent, etc.)
   *
   * @example
   * ```typescript
   * chat.addMessage(new UserMessageComponent("Hi", theme));
   * ```
   */
  addMessage(component: Component): void {
    this.messages.push(component);
    super.addChild(component);

    // Enforce maxMessages limit if configured
    const maxMessages = this.props.maxMessages;
    if (maxMessages && maxMessages > 0) {
      while (this.messages.length > maxMessages) {
        const oldest = this.messages[0];
        this.messages.splice(0, 1);
        super.removeChild(oldest);
      }
    }

    this.invalidate();
  }

  /**
   * Remove a specific message component from the chat.
   *
   * @param component - Message component to remove
   * @returns true if the component was found and removed
   */
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

  /**
   * Remove all messages from the chat.
   * Equivalent to clearing the entire message history.
   */
  clearMessages(): void {
    while (this.children.length > 0) {
      const child = this.children[0];
      super.removeChild(child);
      const idx = this.messages.indexOf(child);
      if (idx !== -1) this.messages.splice(idx, 1);
    }
    this.invalidate();
  }

  /**
   * Get all message components currently in the chat.
   *
   * Returns a shallow copy to prevent external mutation.
   *
   * @returns Array of message components
   */
  getMessages(): Component[] {
    return [...this.messages];
  }

  /**
   * Render the chat container.
   *
   * Renders all child messages with configured spacing between them.
   * Override from Container to inject spacing.
   *
   * @param width - Available width in character cells
   * @returns Array of rendered lines (each line must be ≤ width)
   */
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

    // Remove trailing spacing for cleaner bottom edge
    if (spacing > 0 && lines.length > 0) {
      lines.splice(lines.length - spacing, spacing);
    }

    return lines;
  }
}

/**
 * Create a horizontal line spanning the given width.
 *
 * @param width - Total width in character cells
 * @param borderChar - Character to repeat (default: "─")
 * @returns A string containing the border line
 *
 * @example
 * ```typescript
 * const line = createChatBorder(80, "─");
 * ```
 */
export function createChatBorder(width: number, borderChar: string = "─"): string {
  return borderChar.repeat(width);
}

/**
 * Create a separator line with various styles.
 *
 * @param width - Total width in character cells
 * @param style - Border style: "single" (─), "double" (═), or "dashed" (┈)
 * @returns A string containing the separator line
 *
 * @example
 * ```typescript
 * const sep = createSeparator(60, "double");
 * ```
 */
export function createSeparator(width: number, style: "single" | "double" | "dashed" = "single"): string {
  const chars: Record<string, string> = {
    single: "─",
    double: "═",
    dashed: "┈",
  };
  return chars[style].repeat(width);
}
