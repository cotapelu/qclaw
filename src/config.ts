import { type Model } from "@mariozechner/pi-ai";
import { type ToolDefinition } from "@mariozechner/pi-coding-agent";

export interface AgentConfig {
  cwd: string;
  agentDir: string;
  usePersistence: boolean;
  interactive: boolean;
  verbose: boolean;
  quiet: boolean; // Suppress logs (for print mode)
  customTools: ToolDefinition[];
  model?: Model<any>;
  thinkingLevel?: any;
  configFile?: string;
}

export const DEFAULT_CONFIG: Omit<AgentConfig, 'cwd' | 'agentDir'> = {
  usePersistence: true,
  interactive: true,
  verbose: false,
  quiet: false,
  customTools: [],
};
