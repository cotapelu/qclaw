import { TUI } from "@mariozechner/pi-tui";
import { getGlobalEventBus } from "../core/event-bus.js";
import type { OverlayOptions, OverlayHandle } from "@mariozechner/pi-tui";

/**
 * OverlayManager provides a clean interface for showing/hiding overlays.
 * It wraps TUI's overlay system and emits events.
 */
export class OverlayManager {
  private tui: TUI;
  private eventBus = getGlobalEventBus();
  private activeOverlays: Map<string, OverlayHandle> = new Map();

  constructor(tui: TUI) {
    this.tui = tui;
  }

  /**
   * Show an overlay with options
   * Returns an overlay handle that can be used to hide/focus
   */
  show<P extends { width: number; anchor?: any; margin?: number; maxHeight?: number | string }>(
    component: any,
    options: OverlayOptions & P,
    overlayId?: string
  ): string {
    const id = overlayId || `overlay-${Math.random().toString(36).slice(2)}`;

    const handle = this.tui.showOverlay(component, {
      ...options,
      // Ensure nonCapturing is false for proper focus handling
      nonCapturing: false,
    });

    this.activeOverlays.set(id, handle);
    this.eventBus.emitSimple('overlay.show', { overlayId: id, component: component.constructor.name });

    // Auto-emit focus event when overlay gets focus (handle doesn't provide callback)
    // We rely on TUI's internal focus management

    return id;
  }

  /**
   * Hide an overlay by ID
   */
  hide(overlayId: string): boolean {
    const handle = this.activeOverlays.get(overlayId);
    if (handle) {
      handle.hide();
      this.activeOverlays.delete(overlayId);
      this.eventBus.emitSimple('overlay.hide', { overlayId });
      return true;
    }
    return false;
  }

  /**
   * Focus an overlay (bring to front)
   */
  focus(overlayId: string): boolean {
    const handle = this.activeOverlays.get(overlayId);
    if (handle) {
      handle.focus();
      this.eventBus.emitSimple('overlay.focus', { overlayId });
      return true;
    }
    return false;
  }

  /**
   * Hide all active overlays
   */
  hideAll(): void {
    for (const [id, handle] of this.activeOverlays) {
      handle.hide();
      this.eventBus.emitSimple('overlay.hide', { overlayId: id });
    }
    this.activeOverlays.clear();
  }

  /**
   * Check if an overlay with given ID exists
   */
  has(overlayId: string): boolean {
    return this.activeOverlays.has(overlayId);
  }

  /**
   * Get all active overlay IDs
   */
  getActiveOverlayIds(): string[] {
    return Array.from(this.activeOverlays.keys());
  }

  /**
   * Get overlay count
   */
  getOverlayCount(): number {
    return this.activeOverlays.size;
  }

  /**
   * Hide topmost overlay
   */
  hideTopmost(): boolean {
    const ids = this.getActiveOverlayIds();
    if (ids.length > 0) {
      return this.hide(ids[ids.length - 1]);
    }
    return false;
  }

  /**
   * Get the TUI instance
   */
  getTUI(): TUI {
    return this.tui;
  }

  /**
   * Clear all overlays and reset state (for cleanup)
   */
  clear(): void {
    this.hideAll();
  }
}
