import { loadConfig } from "../config/loader.js";
import { AgentFacade } from "../agent/facade.js";

/**
 * Run the RPC server mode (JSON-RPC over stdio).
 */
export async function runRpcMode(options: { configPath?: string } = {}): Promise<void> {
  const config = await loadConfig(process.cwd(), options.configPath);
  const agent = new AgentFacade(config);
  await agent.initialize();

  // TODO: Implement JSON-RPC server
  // Example: read from stdin, write to stdout with proper framing
  // Use stdio transport from pi-ai or custom

  console.error("RPC mode not implemented yet");
  await agent.shutdown();
}
