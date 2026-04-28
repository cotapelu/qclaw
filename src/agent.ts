import { createAgentSession, SessionManager } from "@mariozechner/pi-coding-agent";

export class PiClawAgent {
  private session: any;
  private agent: any;

  async initialize(options: { cwd?: string; tools?: string[]; sessionDir?: string }) {
    const sessionManager = SessionManager.create(options.cwd || process.cwd(), options.sessionDir);
    const result = await createAgentSession({
      cwd: options.cwd || process.cwd(),
      tools: options.tools,
      sessionManager,
    });

    this.session = result.session;
    this.agent = this.session.agent;
  }

  async sendMessage(text: string): Promise<void> {
    await this.agent.sendMessage(text);
  }

  clearMessages(): void {
    this.agent.state.messages = [];
  }

  dispose(): void {
    this.session.dispose();
  }

  getAgent(): any {
    return this.agent;
  }
}
