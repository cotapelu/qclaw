import { matchesKey, Key, type Keybinding, getKeybindings, setKeybindings, TUI_KEYBINDINGS } from "@mariozechner/pi-tui";
import { getGlobalEventBus } from "../core/event-bus.js";

/**
 * Keybinding utilities for TUI components
 */
export class KeybindingHelper {
  private eventBus = getGlobalEventBus();
  private customBindings: Map<string, string[]> = new Map();

  constructor() {
    this.setupGlobalKeybindings();
  }

  private setupGlobalKeybindings(): void {
    // Get the global keybindings manager
    const kb = getKeybindings();
    if (kb) {
      // Add some common custom bindings
      this.addBinding('submit', ['enter']);
      this.addBinding('newline', ['shift+enter', 'ctrl+enter']);
      this.addBinding('cancel', ['escape']);
      this.addBinding('navUp', ['up']);
      this.addBinding('navDown', ['down']);
      this.addBinding('navLeft', ['left']);
      this.addBinding('navRight', ['right']);
    }
  }

  /**
   * Add a custom keybinding
   */
  addBinding(action: string, keys: string[]): void {
    this.customBindings.set(action, keys);
    this.eventBus.emitSimple('keybinding.add', { action, keys });
  }

  /**
   * Remove a custom keybinding
   */
  removeBinding(action: string): boolean {
    return this.customBindings.delete(action);
  }

  /**
   * Check if a key matches an action
   */
  matchesAction(key: string, action: string): boolean {
    const bindings = this.customBindings.get(action);
    if (!bindings) return false;
    return bindings.some(binding => matchesKey(key, binding));
  }

  /**
   * Check if key matches a specific key definition
   */
  matches(key: string, keyDef: string | Key): boolean {
    return matchesKey(key, keyDef);
  }

  /**
   * Get all registered keybindings
   */
  getAllBindings(): Map<string, string[]> {
    return new Map(this.customBindings);
  }

  /**
   * Dispatch a key event to handlers
   */
  dispatch(key: string, modifiers: string[] = []): void {
    this.eventBus.emitSimple('key.dispatch', { key, modifiers });
  }

  /**
   * Get the Key enum (predefined keys)
   */
  get Key() {
    return Key;
  }

  /**
   * Get TUI default keybindings
   */
  getDefaultKeybindings(): typeof TUI_KEYBINDINGS {
    return TUI_KEYBINDINGS;
  }
}

// Global singleton
let globalKeybindings: KeybindingHelper | null = null;

export function getGlobalKeybindings(): KeybindingHelper {
  if (!globalKeybindings) {
    globalKeybindings = new KeybindingHelper();
  }
  return globalKeybindings;
}
