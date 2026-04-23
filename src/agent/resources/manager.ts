import type { ResourceLoader, Extension, Skill, Prompt } from "@mariozechner/pi-coding-agent";
import { DefaultResourceLoader, loadProjectContextFiles } from "@mariozechner/pi-coding-agent";
import { EventBus } from "../../tui/core/event-bus.js";

/**
 * Resource manager wraps pi-coding-agent's ResourceLoader.
 * Provides event integration and additional utilities.
 */
export class ResourceManager {
  private eventBus: EventBus;
  private loader: ResourceLoader;
  private cwd: string;
  private agentDir: string;

  constructor(
    cwd: string,
    agentDir: string,
    eventBus?: EventBus
  ) {
    this.cwd = cwd;
    this.agentDir = agentDir;
    this.eventBus = eventBus || new EventBus();
    this.loader = new DefaultResourceLoader(cwd, agentDir);
  }

  /**
   * Load all resources (extensions, skills, prompts, context)
   */
  async loadAll(): Promise<{
    extensions: Extension[];
    skills: Skill[];
    prompts: Prompt[];
  }> {
    this.eventBus.emitSimple('resources.loading');

    try {
      const [extensions, skills, prompts] = await Promise.all([
        this.loader.loadExtensions(),
        this.loader.loadSkills(),
        this.loader.loadPrompts(),
      ]);

      this.eventBus.emitSimple('resources.loaded', {
        extensions: extensions.length,
        skills: skills.length,
        prompts: prompts.length,
      });

      return { extensions, skills, prompts };
    } catch (error) {
      this.eventBus.emitSimple('resources.error', { error });
      throw error;
    }
  }

  /**
   * Load context files (auto-injected into system prompt)
   */
  async loadContext(): Promise<string[]> {
    return loadProjectContextFiles(this.cwd, this.agentDir);
  }

  /**
   * Get extensions
   */
  getExtensions(): Extension[] {
    return this.loader.getExtensions().extensions;
  }

  /**
   * Get skills
   */
  getSkills(): Skill[] {
    return this.loader.getSkills().skills;
  }

  /**
   * Get prompts
   */
  getPrompts(): Prompt[] {
    return this.loader.getPrompts().prompts;
  }

  /**
   * Reload all resources (hot-reload)
   */
  async reload(): Promise<void> {
    this.eventBus.emitSimple('resources.reloading');
    await this.loader.reload();
    this.eventBus.emitSimple('resources.reloaded');
  }

  /**
   * Get the underlying ResourceLoader
   */
  getLoader(): ResourceLoader {
    return this.loader;
  }

  /**
   * Get CWD
   */
  getCwd(): string {
    return this.cwd;
  }

  /**
   * Get agent dir
   */
  getAgentDir(): string {
    return this.agentDir;
  }

  /**
   * Add custom extension directory
   */
  addExtensionsDir(dir: string): void {
    // DefaultResourceLoader doesn't support dynamic dir addition
    // Need to recreate loader or use custom implementation
    console.warn("addExtensionsDir not implemented - use constructor options");
  }

  /**
   * Check if hot-reload is enabled
   */
  isHotReloadEnabled(): boolean {
    return this.loader.isWatching?.() ?? false;
  }
}
