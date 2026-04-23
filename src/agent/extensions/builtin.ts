import { defineTool, type Extension } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

/**
 * Built-in tools for qclaw
 */
const helloTool = defineTool({
  name: "hello",
  label: "Hello",
  description: "Say hello to someone",
  parameters: Type.Object({
    name: Type.String({ description: "Name to greet", default: "world" }),
  }),
  execute: async (ctx, params) => {
    return {
      content: [{ type: "text" as const, text: `👋 Hello, ${params.name}!` }],
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

/**
 * Built-in extension with custom commands/tools
 */
export const builtinExtension: Extension = {
  name: "qclaw-builtin",
  description: "Built-in commands and tools for qclaw",
  version: "1.0.0",
  tools: [helloTool, datetimeTool, sysinfoTool],
};

/**
 * Extension factory
 */
export function createBuiltinExtension(): Extension {
  return builtinExtension;
}
