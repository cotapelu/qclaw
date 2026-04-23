import { CustomEditor } from "@mariozechner/pi-coding-agent";
import { getGlobalEventBus } from "../core/event-bus.js";
import type { SubmitEvent, KeyPressEvent } from "../types/events.js";
import { getEditorTheme } from "../themes/theme-manager.js";

/**
 * ChatEditor wraps the pi-coding-agent CustomEditor.
 * It provides a clean interface for the TUI and emits events.
 */
export class ChatEditor extends CustomEditor {
  private eventBus = getGlobalEventBus();
  private editorId: string;

  constructor(tui: any, options?: { multiline?: boolean }) {
    // Pass tui and editor theme
    super(tui, getEditorTheme(), {
      // Accept custom keybindings if needed
    });

    this.editorId = `editor-${Math.random().toString(36).slice(2)}`;

    // Setup custom keybindings
    this.setupKeybindings();

    // Wire up submit handler to emit event
    this.onSubmit = (value: string) => {
      this.eventBus.emitSimple<SubmitEvent>('editor.submit', { value });
    };

    // Emit keypress events for debugging / extensions
    this.onKeyPress = (key: string, modifiers: string[]) => {
      this.eventBus.emitSimple<KeyPressEvent>('key.press', {
        key,
        modifiers,
        raw: key, // Could enhance with actual key event parsing
      });
    };
  }

  private setupKeybindings(): void {
    // CustomEditor already has good defaults, but we can add more
    // Example: Ctrl+D to duplicate line is already in CustomEditor
    // Add Ctrl+Shift+Enter for force submit (even with shift+enter for newline)
  }

  /**
   * Set placeholder text
   */
  setPlaceholder(text: string): void {
    this.setValue("");
    // CustomEditor doesn't have placeholder exposed, we could overlay a Text component
    // For now, skip or implement via parent Container overlay
  }

  /**
   * Programmatically set value and move cursor to end
   */
  setValue(value: string): void {
    super.setValue(value);
  }

  /**
   * Get current value
   */
  getValue(): string {
    return this.getValue() || "";
  }

  /**
   * Clear the editor
   */
  clear(): void {
    this.setValue("");
  }

  /**
   * Enable/disable submit
   */
  setSubmitEnabled(enabled: boolean): void {
    this.disableSubmit = !enabled;
  }

  /**
   * Focus the editor
   */
  focus(): void {
    this.focus();
  }

  /**
   * Get editor ID (for debugging)
   */
  getId(): string {
    return this.editorId;
  }

  /**
   * Set autocomplete provider
   */
  setAutocomplete(provider: any): void {
    this.setAutocompleteProvider(provider);
  }
}
