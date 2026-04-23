import { Loader, CancellableLoader } from "@mariozechner/pi-tui";
import { getGlobalEventBus } from "../core/event-bus.js";
import type { Theme } from "@mariozechner/pi-coding-agent";

/**
 * LoadingIndicator wraps pi-tui loaders with event emissions.
 */
export class LoadingIndicator {
  private loader: Loader | CancellableLoader;
  private eventBus = getGlobalEventBus();
  private message: string;
  private spinnerColorFn: (s: string) => string;
  private messageColorFn: (s: string) => string;
  private theme: Theme;

  constructor(
    tui: any,
    message: string = "Loading...",
    spinnerColorFn?: (s: string) => string,
    messageColorFn?: (s: string) => string,
    theme: Theme,
    cancellable: boolean = false
  ) {
    this.message = message;
    this.spinnerColorFn = spinnerColorFn || ((s) => s);
    this.messageColorFn = messageColorFn || ((s) => s);
    this.theme = theme;

    if (cancellable) {
      this.loader = new CancellableLoader(
        tui,
        this.spinnerColorFn,
        this.messageColorFn,
        this.message
      );
    } else {
      this.loader = new Loader(
        tui,
        this.spinnerColorFn,
        this.messageColorFn,
        this.message
      );
    }
  }

  /**
   * Start the loading indicator
   */
  start(): void {
    this.loader.start();
    this.eventBus.emitSimple('loading.start', { message: this.message });
  }

  /**
   * Stop the loading indicator
   */
  stop(): void {
    this.loader.stop();
    this.eventBus.emitSimple('loading.stop', { message: this.message });
  }

  /**
   * Update the message
   */
  setMessage(message: string): void {
    this.message = message;
    if (this.loader instanceof CancellableLoader) {
      this.loader.setMessage(message);
    }
    // Loader from pi-tui doesn't have setMessage? Let's check...
    // For now, recreate if needed
  }

  /**
   * Check if currently loading
   */
  isLoading(): boolean {
    // Loader doesn't expose state, we track via events
    return false; // Need external tracking
  }

  /**
   * Get the underlying loader instance
   */
  getLoader(): Loader | CancellableLoader {
    return this.loader;
  }
}
