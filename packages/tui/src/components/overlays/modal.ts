import { TUI, Container, Text } from "@mariozechner/pi-tui";
import type { Component } from "@mariozechner/pi-tui";
import { ThemeManager } from "../../theme/theme-manager.js";
import { DynamicBorder, type BorderStyle } from "../layout/dynamic-border.js";

/**
 * Modal options
 */
export interface ModalOptions {
  title?: string;
  width?: number;
  borderStyle?: BorderStyle;
  closeOnEscape?: boolean;
}

/**
 * ModalComponent - Base class for modal dialogs
 * Provides a centered bordered container with title and optional close handling.
 */
export class ModalComponent extends Container implements Component {
  protected themeManager: ThemeManager;
  protected border: DynamicBorder;
  protected contentContainer: Container;
  protected width: number;
  protected handle: { hide: () => void; focus: () => void } | null = null;
  protected closeOnEscape: boolean;

  constructor(themeManager: ThemeManager, options: ModalOptions = {}) {
    super();
    this.themeManager = themeManager;
    this.width = options.width || 60;
    this.closeOnEscape = options.closeOnEscape !== false;

    this.border = new DynamicBorder(themeManager, {
      borderStyle: options.borderStyle || "double",
      title: options.title,
      padding: 1,
    });

    this.contentContainer = new Container();
    this.border.addChild(this.contentContainer);
    this.addChild(this.border);
  }

  /**
   * Show the modal as an overlay
   */
  show(tui: TUI): void {
    this.handle = tui.showOverlay(this, {
      width: this.width,
      anchor: "center",
      margin: 2,
    });
    this.handle?.focus();
  }

  /**
   * Hide the modal
   */
  hide(): void {
    this.handle?.hide();
    this.handle = null;
  }

  /**
   * Get the inner content container to add custom components
   */
  getContent(): Container {
    return this.contentContainer;
  }

  /**
   * Set modal title
   */
  setTitle(title: string): void {
    this.border.setTitle(title);
    this.invalidate();
  }

  /**
   * Handle input (default: close on ESC)
   */
  handleInput(data: string): void {
    if (this.closeOnEscape && data === "\x1b") {
      this.hide();
    }
  }

  render(_width: number): string[] {
    return this.border.render(this.width);
  }
}

/**
 * SimpleMessageModal - Modal with a message that closes on any key
 */
class SimpleMessageModal extends ModalComponent {
  constructor(themeManager: ThemeManager, message: string, options: ModalOptions = {}) {
    super(themeManager, options);
    this.getContent().addChild(new Text(message, 1, 0));
    this.getContent().addChild(new Text("", 1, 0));
    this.getContent().addChild(new Text("[Press any key to close]", 1, 0));
  }

  handleInput(_data: string): void {
    this.hide();
  }
}

/**
 * ConfirmModal - Modal with Yes/No confirmation
 */
class ConfirmModal extends ModalComponent {
  private resolve: ((value: boolean) => void) | null = null;

  constructor(themeManager: ThemeManager, message: string, options: ModalOptions = {}) {
    super(themeManager, { ...options, closeOnEscape: false });
    const content = this.getContent();
    content.addChild(new Text(message, 1, 0));
    content.addChild(new Text("", 1, 0));
    content.addChild(new Text("[Y] Yes    [N] No    [Esc] Cancel", 1, 0));
  }

  setResolver(resolve: (value: boolean) => void): void {
    this.resolve = resolve;
  }

  handleInput(data: string): void {
    if (data === "y" || data === "Y") {
      this.hide();
      this.resolve?.(true);
      return;
    }
    if (data === "n" || data === "N") {
      this.hide();
      this.resolve?.(false);
      return;
    }
    if (data === "\x1b") {
      this.hide();
      this.resolve?.(false);
      return;
    }
    super.handleInput(data);
  }
}

/**
 * Show a simple message modal
 */
export function showModalMessage(
  tui: TUI,
  themeManager: ThemeManager,
  message: string,
  options: ModalOptions = {}
): ModalComponent {
  const modal = new SimpleMessageModal(themeManager, message, options);
  modal.show(tui);
  return modal;
}

/**
 * Show a confirmation modal (returns Promise<boolean>)
 */
export function showModalConfirm(
  tui: TUI,
  themeManager: ThemeManager,
  message: string,
  options: ModalOptions = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = new ConfirmModal(themeManager, message, options);
    modal.setResolver(resolve);
    modal.show(tui);
  });
}
