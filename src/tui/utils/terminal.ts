import { getCapabilities, detectCapabilities, type TerminalCapabilities } from "@mariozechner/pi-tui";
import { getGlobalEventBus } from "../core/event-bus.js";

/**
 * Terminal utilities for capabilities detection and image support
 */
export class TerminalHelper {
  private eventBus = getGlobalEventBus();
  private cachedCapabilities: TerminalCapabilities | null = null;
  private capabilitiesChecked: boolean = false;

  constructor() {
    this.detectCapabilities();
  }

  /**
   * Detect and cache terminal capabilities
   */
  detectCapabilities(): void {
    this.cachedCapabilities = detectCapabilities();
    this.capabilitiesChecked = true;
    this.eventBus.emitSimple('terminal.capabilities', { capabilities: this.cachedCapabilities });
  }

  /**
   * Get cached capabilities (or detect if not yet)
   */
  getCapabilities(): TerminalCapabilities {
    if (!this.capabilitiesChecked) {
      this.detectCapabilities();
    }
    return this.cachedCapabilities!;
  }

  /**
   * Check if terminal supports images
   */
  supportsImages(): boolean {
    const caps = this.getCapabilities();
    return caps.images !== null;
  }

  /**
   * Get image protocol (kitty, iterm2, or null)
   */
  getImageProtocol(): 'kitty' | 'iterm2' | null {
    return this.getCapabilities().images;
  }

  /**
   * Check if terminal supports truecolor
   */
  supportsTrueColor(): boolean {
    return this.getCapabilities().truecolor;
  }

  /**
   * Check if terminal supports sixel
   */
  supportsSixel(): boolean {
    return this.getCapabilities().sixel;
  }

  /**
   * Listen for capability changes (if re-detection is implemented)
   */
  onChange(handler: (caps: TerminalCapabilities) => void): () => void {
    return this.eventBus.on('terminal.capabilities', (event) => {
      if (event.payload?.capabilities) {
        handler(event.payload.capabilities);
      }
    });
  }
}

// Global singleton
let globalTerminal: TerminalHelper | null = null;

export function getGlobalTerminal(): TerminalHelper {
  if (!globalTerminal) {
    globalTerminal = new TerminalHelper();
  }
  return globalTerminal;
}
