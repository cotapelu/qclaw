import { loadConfig } from "../config/loader.js";
import { AgentFacade } from "../agent/facade.js";

/**
 * Run the print mode (non-interactive, output to stdout).
 */
export async function runPrintMode(message: string, options: { configPath?: string } = {}): Promise<void> {
  const config = await loadConfig(process.cwd(), options.configPath);
  const agent = new AgentFacade(config);
  await agent.initialize();

  // Subscribe to events to print streaming response
  agent.on('message.update', (event: any) => {
    if (event.payload?.delta) {
      process.stdout.write(event.payload.delta);
    }
  });

  agent.on('turn.end', () => {
    process.stdout.write('\n');
  });

  agent.on('agent.error', (event: any) => {
    console.error('\nError:', event.payload?.error?.message || 'Unknown error');
  });

  await agent.prompt(message);
  await agent.shutdown();
}
