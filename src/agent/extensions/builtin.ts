import { defineTool, type Extension, type ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentFacade } from "../facade.js";

// Simple tools
const helloTool = defineTool({
  name: "hello",
  label: "Hello",
  description: "Say hello to someone",
  parameters: Type.Object({ name: Type.String() }),
  execute: async (ctx: any, params: any) => {
    return {
      content: [{ type: "text" as const, text: `👋 Hello, ${params.name || 'world'}!` }],
      details: { greeted: params.name },
    };
  },
});

const datetimeTool = defineTool({
  name: "datetime",
  label: "Datetime",
  description: "Get current date and time",
  parameters: Type.Object({}),
  execute: async () => {
    const now = new Date();
    return {
      content: [{ type: "text" as const, text: now.toISOString() }],
      details: { timestamp: now.getTime(), iso: now.toISOString() },
    };
  },
});

const sysinfoTool = defineTool({
  name: "sysinfo",
  label: "System Info",
  description: "Show system information",
  parameters: Type.Object({}),
  execute: async () => {
    const info = {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      cwd: process.cwd(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(info, null, 2) }],
      details: info,
    };
  },
});

// Commands
function createCommand(name: string, description: string, execute: (ctx: ExtensionContext, ...args: string[]) => Promise<string | void>) {
  return { name, description, execute };
}

const helpCommand = createCommand(
  "help",
  "Show help",
  async (ctx: ExtensionContext) => {
    // @ts-expect-error - accessing facade via extension.agent (we'll patch later)
    const agent = ctx.agent as AgentFacade;
    const extensions = agent.getExtensionManager().getNames();
    const skills = agent.getResourceLoader().getSkills().skills.map((s: any) => s.name);
    return `Extensions: ${extensions.join(", ")}\nSkills: ${skills.join(", ")}`;
  }
);

const clearCommand = createCommand(
  "clear",
  "Clear screen",
  async (ctx: ExtensionContext) => {
    // @ts-expect-error
    if (ctx.agent?.getEventBus) {
      ctx.agent.getEventBus().emitSimple('tui.clear');
    }
  }
);

const statsCommand = createCommand(
  "stats",
  "Show statistics",
  async (ctx: ExtensionContext) => {
    // @ts-expect-error
    const agent = ctx.agent as AgentFacade;
    const stats = agent.getStats();
    return JSON.stringify(stats, null, 2);
  }
);

const settingsCommand = createCommand(
  "settings",
  "Show settings",
  async (ctx: ExtensionContext) => {
    // @ts-expect-error
    const agent = ctx.agent as AgentFacade;
    const settings = agent.getSettings();
    return JSON.stringify(settings, null, 2);
  }
);

const thinkingCommand = createCommand(
  "thinking",
  "Set thinking level",
  async (ctx: ExtensionContext, level?: string) => {
    if (!level) return "Usage: /thinking <off|minimal|low|medium|high|xhigh>";
    // @ts-expect-error
    const session = ctx.agent?.getSession();
    if (session?.setThinkingLevel) {
      await session.setThinkingLevel(level as any);
      return `Thinking level set to ${level}`;
    }
    return "Session not available";
  }
);

export const builtinExtension: Extension = {
  name: "qclaw-builtin",
  description: "Built-in commands and tools for qclaw",
  version: "1.0.0",
  commands: [helpCommand, clearCommand, statsCommand, settingsCommand, thinkingCommand],
  tools: [helloTool, datetimeTool, sysinfoTool],
};

export function createBuiltinExtension(): Extension {
  return builtinExtension;
}
