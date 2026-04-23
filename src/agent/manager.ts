import { AgentCore } from '../agent/core.js';
import { AgentCoreOptions } from '../agent/core.js';

/**
 * Manages multiple agent instances for collaboration
 */
export class AgentManager {
  private agents: Map<string, AgentCore> = new Map();
  private activeAgentId: string | null = null;

  async createAgent(id: string, options: AgentCoreOptions = {}): Promise<AgentCore> {
    if (this.agents.has(id)) {
      throw new Error(`Agent '${id}' already exists`);
    }
    const agent = new AgentCore(options);
    await agent.initialize();
    this.agents.set(id, agent);
    this.activeAgentId = id;
    return agent;
  }

  getAgent(id: string): AgentCore | undefined {
    return this.agents.get(id);
  }

  getActiveAgent(): AgentCore | null {
    if (!this.activeAgentId) return null;
    return this.agents.get(this.activeAgentId) ?? null;
  }

  async switchTo(id: string): Promise<boolean> {
    if (!this.agents.has(id)) {
      return false;
    }
    this.activeAgentId = id;
    return true;
  }

  listAgents(): Array<{ id: string; active: boolean; stats: any; config: any }> {
    return Array.from(this.agents.entries()).map(([id, agent]) => ({
      id,
      active: id === this.activeAgentId,
      stats: agent.getStats(),
      config: agent.getConfig(),
    }));
  }

  async disposeAgent(id: string): Promise<boolean> {
    const agent = this.agents.get(id);
    if (!agent) return false;
    agent.dispose();
    this.agents.delete(id);
    if (this.activeAgentId === id) {
      this.activeAgentId = this.agents.size > 0 ? this.agents.keys().next().value ?? null : null;
    }
    return true;
  }

  async disposeAll(): Promise<void> {
    for (const agent of this.agents.values()) {
      agent.dispose();
    }
    this.agents.clear();
    this.activeAgentId = null;
  }

  /**
   * Broadcast a message to all agents (for coordination)
   */
  async broadcast(prompt: string): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const promises = Array.from(this.agents.entries()).map(async ([id, agent]) => {
      try {
        // Create a session entry to capture response
        await agent.prompt(prompt);
        // Get last message from session
        const session = agent.getSession();
        const entries = agent.getSessionManager().getEntries();
        const lastMsg = entries[entries.length - 1] as any;
        let response = '(no response)';
        if (lastMsg && lastMsg.type === 'message') {
          const content = lastMsg.message?.content || [];
          const textParts = content.filter((c: any) => c.type === 'text').map((c: any) => c.text);
          response = textParts.join(' ');
        }
        results.set(id, response);
      } catch (error: any) {
        results.set(id, `Error: ${error.message}`);
      }
    });
    await Promise.all(promises);
    return results;
  }

  /**
   * Ask agents to collaborate on a task (voting/consensus)
   */
  async collaborate(prompt: string, maxAgents: number = 3): Promise<string> {
    let agents: (AgentCore | undefined)[];
    if (this.activeAgentId) {
      const active = this.agents.get(this.activeAgentId);
      agents = active ? [active] : [];
    } else {
      agents = Array.from(this.agents.values()).slice(0, maxAgents);
    }

    if (agents.length === 0) {
      return 'No active agents';
    }

    const results = await Promise.all(
      agents.map(async (agent) => {
        if (!agent) return 'Unknown agent';
        try {
          await agent.prompt(prompt);
          const entries = agent.getSessionManager().getEntries();
          const lastMsg = entries[entries.length - 1] as any;
          let response = '';
          if (lastMsg && lastMsg.type === 'message') {
            // @ts-ignore - complex session entry type
            const content = lastMsg.message?.content || [];
            const textParts = content.filter((c: any) => c.type === 'text').map((c: any) => c.text);
            response = textParts.join(' ');
          }
          const agentId = agents.indexOf(agent) + 1;
          return `Agent ${agentId} [${agent.getAgentDir?.() || 'unknown'}]: ${response || '(no response)'}`;
        } catch (error: any) {
          return `[${agent.getAgentDir?.() || 'unknown'}] Error: ${error.message}`;
        }
      })
    );

    const summary = results.filter(r => r).join('\n\n');
    return `Collaboration summary (${agents.length} agents):\n\n${summary}`;
  }
}
