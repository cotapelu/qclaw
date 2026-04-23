import type { Extension, ExtensionFactory, ExtensionRuntime, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { discoverAndLoadExtensions, type LoadExtensionsResult } from "@mariozechner/pi-coding-agent";
import { EventBus } from "../../tui/core/event-bus.js";

/**
 * Extension manager wraps pi-coding-agent's extension system.
 * Handles discovery, loading, lifecycle, and hook dispatching.
 */
export class ExtensionManager {
  private eventBus: EventBus;
  private loadedExtensions: LoadExtensionsResult | null = null;
  private extensionRuntimes: Map<string, ExtensionRuntime> = new Map();
  private hotReload = true;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || new EventBus();
  }

  /**
   * Load extensions from configured directories
   */
  async loadExtensions(cwd: string, agentDir: string, additionalDirs?: string[]): Promise<LoadExtensionsResult> {
    this.eventBus.emitSimple('extensions.loading', { cwd, agentDir });

    try {
      // Use pi-coding-agent's discovery
      const result = await discoverAndLoadExtensions({
        cwd,
        agentDir,
        extensionsDirs: additionalDirs,
      });

      this.loadedExtensions = result;

      // Create runtimes for each extension
      for (const ext of result.extensions) {
        const runtime = this.createRuntime(ext);
        this.extensionRuntimes.set(ext.name, runtime);
      }

      this.eventBus.emitSimple('extensions.loaded', {
        count: result.extensions.length,
        extensions: result.extensions.map(e => e.name),
      });

      return result;
    } catch (error) {
      this.eventBus.emitSimple('extensions.error', { error });
      throw error;
    }
  }

  /**
   * Create ExtensionRuntime for an extension
   */
  private createRuntime(extension: Extension): ExtensionRuntime {
    // The extension is already initialized by discoverAndLoadExtensions
    // We just need to wrap it for our event bus integration

    const runtime: ExtensionRuntime = {
      extension,
      // The actual runtime methods are on the extension itself
      // We can proxy events if needed
    };

    return runtime;
  }

  /**
   * Get loaded extensions
   */
  getExtensions(): LoadExtensionsResult | null {
    return this.loadedExtensions;
  }

  /**
   * Get extension by name
   */
  getExtension(name: string): Extension | undefined {
    return this.loadedExtensions?.extensions.find(e => e.name === name);
  }

  /**
   * Get runtime for an extension
   */
  getRuntime(name: string): ExtensionRuntime | undefined {
    return this.extensionRuntimes.get(name);
  }

  /**
   * Get all extension runtimes
   */
  getAllRuntimes(): ExtensionRuntime[] {
    return Array.from(this.extensionRuntimes.values());
  }

  /**
   * Reload extensions (hot-reload)
   */
  async reload(): Promise<LoadExtensionsResult> {
    this.extensionRuntimes.clear();
    this.loadedExtensions = null;
    // Use current cwd/agentDir from somewhere - need to store them
    // For now, require explicit cwd/agentDir
    throw new Error("Reload requires cwd and agentDir - call loadExtensions() with those");
  }

  /**
   * Enable/disable hot-reload
   */
  setHotReload(enabled: boolean): void {
    this.hotReload = enabled;
  }

  /**
   * Get extension count
   */
  getCount(): number {
    return this.loadedExtensions?.extensions.length || 0;
  }

  /**
   * List extension names
   */
  getNames(): string[] {
    return this.loadedExtensions?.extensions.map(e => e.name) || [];
  }

  /**
   * Dispose all extensions
   */
  async dispose(): Promise<void> {
    for (const runtime of this.extensionRuntimes.values()) {
      try {
        // Extensions might have dispose method? Check pi-coding-agent Extension interface
        // For now, just clear
      } catch (error) {
        console.error(`Error disposing extension ${runtime.extension.name}:`, error);
      }
    }
    this.extensionRuntimes.clear();
    this.loadedExtensions = null;
    this.eventBus.emitSimple('extensions.disposed');
  }
}

// Global singleton
let globalExtensionManager: ExtensionManager | null = null;

export function getExtensionManager(): ExtensionManager {
  if (!globalExtensionManager) {
    globalExtensionManager = new ExtensionManager();
  }
  return globalExtensionManager;
}
