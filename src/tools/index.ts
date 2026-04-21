import { defineTool, type ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

/**
 * Custom tools for the agent
 */

export const helloWorldTool: ToolDefinition = defineTool({
  name: "hello_world",
  label: "Hello World",
  description: "Greet someone with a friendly message",
  parameters: Type.Object({
    name: Type.Optional(Type.String({ description: "Name to greet" })),
    style: Type.Optional(Type.Union([
      Type.Literal("friendly"),
      Type.Literal("formal"),
      Type.Literal("casual"),
    ], { description: "Greeting style" })),
  }) as any,
  execute: async (_, params: any) => {
    const { name = "World", style = "friendly" } = params;
    const greetings: Record<string, string> = {
      friendly: `👋 Hello, ${name}! Welcome!`,
      formal: `Greetings, ${name}. It is a pleasure to assist you.`,
      casual: `Hey ${name}! What's up?`,
    };
    return {
      content: [{ type: "text", text: greetings[style] }],
      details: { style, timestamp: new Date().toISOString() },
    };
  },
});

export const currentDateTimeTool: ToolDefinition = defineTool({
  name: "current_datetime",
  label: "Current DateTime",
  description: "Get the current date and time",
  parameters: Type.Object({
    format: Type.Optional(Type.Union([
      Type.Literal("iso"),
      Type.Literal("local"),
      Type.Literal("utc"),
      Type.Literal("timestamp"),
    ])),
    timezone: Type.Optional(Type.String()),
  }) as any,
  execute: async (_, params: any) => {
    const { format = "iso", timezone = "UTC" } = params;
    const now = new Date();
    let output: string;
    switch (format) {
      case "local": output = now.toLocaleString("en-US", { timeZone: timezone }); break;
      case "utc": output = now.toUTCString(); break;
      case "timestamp": output = now.getTime().toString(); break;
      default: output = now.toISOString();
    }
    return {
      content: [{ type: "text", text: `📅 ${output}` }],
      details: { format, timezone },
    };
  },
});

export const systemInfoTool: ToolDefinition = defineTool({
  name: "system_info",
  label: "System Info",
  description: "Get system information",
  parameters: Type.Object({
    detail: Type.Optional(Type.Union([
      Type.Literal("brief"),
      Type.Literal("full"),
    ])),
  }) as any,
  execute: async (_, params: any) => {
    const { detail = "brief" } = params;
    const baseInfo = {
      platform: process.platform,
      nodeVersion: process.version,
      arch: process.arch,
      cwd: process.cwd(),
    };
    if (detail === "brief") {
      return {
        content: [{ type: "text", text: `🖥️ ${baseInfo.platform} | ${baseInfo.nodeVersion} | ${baseInfo.arch}` }],
        details: baseInfo,
      };
    }
    const fullInfo = {
      ...baseInfo,
      uptime: process.uptime(),
      pid: process.pid,
      memory: process.memoryUsage(),
    };
    return {
      content: [{
        type: "text",
        text: `🖥️ System:\n` +
          `  Platform: ${fullInfo.platform}\n` +
          `  Node: ${fullInfo.nodeVersion}\n` +
          `  Arch: ${fullInfo.arch}\n` +
          `  Uptime: ${Math.floor(fullInfo.uptime)}s\n` +
          `  PID: ${fullInfo.pid}\n` +
          `  CWD: ${fullInfo.cwd}\n` +
          `  Memory: ${JSON.stringify(fullInfo.memory)}`
      }],
      details: fullInfo,
    };
  },
});

export const listFilesTool: ToolDefinition = defineTool({
  name: "list_files",
  label: "List Files",
  description: "List files in a directory",
  parameters: Type.Object({
    path: Type.Optional(Type.String({ description: "Directory path" })),
    recursive: Type.Optional(Type.Boolean({ description: "List recursively" })),
    pattern: Type.Optional(Type.String({ description: "Glob pattern" })),
  }) as any,
  execute: async (_, params: any) => {
    const { path: dirPath = ".", recursive = false, pattern } = params;
    const fs = await import('fs');
    const pathModule = await import('path');

    try {
      const fullPath = pathModule.resolve(process.cwd(), dirPath);
      if (!fs.existsSync(fullPath)) {
        return { content: [{ type: "text", text: `❌ Not found: ${fullPath}` }], details: { error: "not_found", count: 0, files: [] } };
      }
      const stat = fs.statSync(fullPath);
      if (!stat.isDirectory()) {
        return { content: [{ type: "text", text: `❌ Not a directory: ${fullPath}` }], details: { error: "not_dir", count: 0, files: [] } };
      }

      let entries: string[];
      if (recursive) {
        entries = getAllFiles(fullPath, pattern);
      } else {
        entries = fs.readdirSync(fullPath).map(name => pathModule.join(fullPath, name));
        if (pattern) {
          const mm = require('minimatch');
          entries = entries.filter(e => mm(pathModule.basename(e), pattern));
        }
      }

      const files = entries.map(entry => {
        try {
          const s = fs.statSync(entry);
          return { path: pathModule.relative(process.cwd(), entry), type: s.isDirectory() ? 'dir' : 'file', size: s.size };
        } catch {
          return { path: entry, type: 'unknown', size: 0 };
        }
      });

      return {
        content: [{ type: "text", text: files.map(f => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}`).join('\n') || '(empty)' }],
        details: { count: files.length, files },
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `❌ ${error.message}` }], details: { error: error.message, count: 0, files: [] } };
    }
  },
});

function getAllFiles(dir: string, pattern?: string): string[] {
  const fs = require('fs');
  const path = require('path');
  const results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        results.push(...getAllFiles(full, pattern));
      } else {
        if (pattern) {
          const mm = require('minimatch');
          if (mm(name, pattern)) results.push(full);
        } else {
          results.push(full);
        }
      }
    } catch {
      // skip
    }
  }

  return results;
}

/**
 * All custom tools
 */
export function getCustomTools(): ToolDefinition[] {
  return [
    helloWorldTool,
    currentDateTimeTool,
    systemInfoTool,
    listFilesTool,
  ];
}
