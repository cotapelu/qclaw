import { DefaultResourceLoader, loadProjectContextFiles } from "@mariozechner/pi-coding-agent";

export class ResourceManager {
  private loader: any;
  private cwd: string;
  private agentDir: string;

  constructor(cwd: string, agentDir: string) {
    this.cwd = cwd;
    this.agentDir = agentDir;
    this.loader = new DefaultResourceLoader(cwd, agentDir);
  }

  async loadAll() {
    const extensions = this.loader.getExtensions().extensions || [];
    const skills = this.loader.getSkills().skills || [];
    const prompts = this.loader.getPrompts().prompts || [];
    return { extensions, skills, prompts };
  }

  getLoader() {
    return this.loader;
  }

  getExtensions() {
    return this.loader.getExtensions().extensions || [];
  }

  getSkills() {
    return this.loader.getSkills().skills || [];
  }

  getPrompts() {
    return this.loader.getPrompts().prompts || [];
  }

  async reload() {
    await this.loader.reload();
  }
}
