import type { Extension } from "@mariozechner/pi-coding-agent";
import { discoverAndLoadExtensions, type LoadExtensionsResult } from "@mariozechner/pi-coding-agent";
import { EventBus } from "../../tui/core/event-bus.js";
import { globalCommandRegistry } from "../commands/registry.js";

export class ExtensionManager {
  private eventBus: EventBus;
  private loadedExtensions: LoadExtensionsResult | null = null;
  private registeredExtensions: Map<string, Extension> = new Map();
  private cwd?: string;
  private agentDir?: string;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || new EventBus();
  }

  registerExtension(extension: Extension): void {
    this.registeredExtensions.set(extension.name, extension);
    this.eventBus.emitSimple('extensions.registered', { name: extension.name });
  }

  async loadExtensions(cwd: string, agentDir: string): Promise<LoadExtensionsResult> {
    this.cwd = cwd;
    this.agentDir = agentDir;
    this.eventBus.emitSimple('extensions.loading', { cwd, agentDir });

    try {
      const result = await discoverAndLoadExtensions({ cwd, agentDir });
      this.loadedExtensions = result;

      const mergedExtensions = [...result.extensions];
      for (const [name, ext] of this.registeredExtensions) {
        const idx = mergedExtensions.findIndex(e => (e as any).name === name);
        if (idx >= 0) mergedExtensions[idx] = ext;
        else mergedExtensions.push(ext);
      }

      // Register commands
      for (const ext of mergedExtensions) {
        const extension = ext as any;
        if (extension.commands) {
          for (const cmd of extension.commands) {
            globalCommandRegistry.register(cmd as any);
          }
        }
      }

      this.loadedExtensions = { ...result, extensions: mergedExtensions };
      this.eventBus.emitSimple('extensions.loaded', {
        count: mergedExtensions.length,
        extensions: mergedExtensions.map((e: any) => e.name),
      });
      return this.loadedExtensions;
    } catch (error) {
      this.eventBus.emitSimple('extensions.error', { error });
      throw error;
    }
  }

  getExtensions(): any[] {
    return this.loadedExtensions?.extensions || [];
  }

  getExtension(name: string): any {
    return this.loadedExtensions?.extensions.find((e: any) => e.name === name);
  }

  getCount(): number {
    return this.loadedExtensions?.extensions.length || 0;
  }

  getNames(): string[] {
    return this.loadedExtensions?.extensions.map((e: any) => e.name) || [];
  }

  async reload(): Promise<void> {
    if (!this.cwd || !this.agentDir) throw new Error("Cannot reload - cwd/agentDir not set");
    await this.loadExtensions(this.cwd, this.agentDir);
  }

  async dispose(): Promise<void> {
    this.loadedExtensions = null;
    this.registeredExtensions.clear();
    this.eventBus.emitSimple('extensions.disposed');
  }
}

let globalExtensionManager: ExtensionManager | null = null;
export function getExtensionManager(): ExtensionManager {
  if (!globalExtensionManager) globalExtensionManager = new ExtensionManager();
  return globalExtensionManager;
}
