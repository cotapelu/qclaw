import { loadConfig } from "../config/loader.js";
import { AgentFacade } from "../agent/facade.js";
import { AgentTUI } from "../tui/agent-tui.js";

/**
 * Run the interactive TUI mode.
 */
export async function runInteractiveMode(options: { configPath?: string } = {}): Promise<void> {
  const config = await loadConfig(process.cwd(), options.configPath);
  const agent = new AgentFacade(config);
  await agent.initialize();

  const tui = new AgentTUI(agent, config.tui.showLineNumbers);
  await tui.start();
}
