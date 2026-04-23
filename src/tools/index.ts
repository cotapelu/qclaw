import { defineTool, type ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { formatBytes, truncateOutput, shouldStreamResult, estimateResultSize } from "./streaming.js";
import { getImageTools } from "./image.js";
import { validatePath, validateFileSize, checkOutputSize } from "./sandbox.js";
import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';

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
      content: [{ type: "text" as const, text: greetings[style] }],
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
      case "local":
        output = now.toLocaleString("en-US", { timeZone: timezone });
        break;
      case "utc":
        output = now.toUTCString();
        break;
      case "timestamp":
        output = now.getTime().toString();
        break;
      default:
        output = now.toISOString();
    }
    return {
      content: [{ type: "text" as const, text: `📅 ${output}` }],
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
        content: [{ type: "text" as const, text: `🖥️ ${baseInfo.platform} | ${baseInfo.nodeVersion} | ${baseInfo.arch}` }],
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
      content: [{ type: "text" as const, text: `🖥️ System:\n` +
        ` Platform: ${fullInfo.platform}\n` +
        ` Node: ${fullInfo.nodeVersion}\n` +
        ` Arch: ${fullInfo.arch}\n` +
        ` Uptime: ${Math.floor(fullInfo.uptime)}s\n` +
        ` PID: ${fullInfo.pid}\n` +
        ` CWD: ${fullInfo.cwd}\n` +
        ` Memory: ${JSON.stringify(fullInfo.memory)}` }],
      details: fullInfo,
    };
  },
});

export const listFilesTool: ToolDefinition = defineTool({
  name: "list_files",
  label: "List Files",
  description: "List files in a directory with streaming support for large results",
  parameters: Type.Object({
    path: Type.Optional(Type.String({ description: "Directory path" })),
    recursive: Type.Optional(Type.Boolean({ description: "List recursively" })),
    pattern: Type.Optional(Type.String({ description: "Glob pattern" })),
    limit: Type.Optional(Type.Number({ description: "Max files to return (0 = unlimited)", default: 500 })),
  }) as any,
  execute: async (ctx: any, params: any) => {
    const { path: dirPath = ".", recursive = false, pattern, limit = 500 } = params;
    const fs = await import('fs');
    const pathModule = await import('path');

    const emptyResult = {
      content: [{ type: "text" as const, text: "(empty)" }],
      details: { count: 0, returned: 0, files: [] as any[], totalSize: 0, estimatedBytes: 0, streamed: false }
    };

    try {
      // Validate path to prevent traversal attacks
      const validatedDirPath = validatePath(dirPath, process.cwd(), ctx?.settings);
      const fullPath = pathModule.resolve(validatedDirPath);
      if (!fs.existsSync(fullPath)) {
        return {
          content: [{ type: "text" as const, text: `❌ Not found: ${dirPath}` }],
          details: { error: "not_found", count: 0, returned: 0, files: [] as any[], totalSize: 0, estimatedBytes: 0, streamed: false }
        };
      }
      const stat = fs.statSync(fullPath);
      if (!stat.isDirectory()) {
        return {
          content: [{ type: "text" as const, text: `❌ Not a directory: ${dirPath}` }],
          details: { error: "not_dir", count: 0, returned: 0, files: [] as any[], totalSize: 0, estimatedBytes: 0, streamed: false }
        };
      }

      let entries: string[];
      if (recursive) {
        entries = getAllFiles(fullPath, pattern);
      } else {
        entries = fs.readdirSync(fullPath).map((name: string) => pathModule.join(fullPath, name));
        if (pattern) {
          const mm = await import('minimatch');
          entries = entries.filter((e: string) => mm.minimatch(pathModule.basename(e), pattern));
        }
      }

      if (entries.length === 0) {
        return emptyResult;
      }

      // Format file info with size validation
      let files = [];
      let totalSize = 0;
      const maxFileSize = ctx?.settings?.toolPermissions?.maxFileSize || 10 * 1024 * 1024; // 10MB default
      
      for (const entry of entries) {
        try {
          const s = fs.statSync(entry);
          const size = s.size;
          // Skip files exceeding max size
          if (size > maxFileSize) {
            continue; // Skip this file
          }
          const fileInfo = {
            path: pathModule.relative(process.cwd(), entry),
            type: s.isDirectory() ? 'dir' : 'file',
            size
          };
          files.push({ path: pathModule.relative(process.cwd(), entry), type: s.isDirectory() ? 'dir' : 'file', size } as any);
          totalSize += size;
        } catch {
          // Skip files we can't stat
        }
      }
      files.sort((a, b) => a.path.localeCompare(b.path));
      
      // Build output and check size limits
      const fullOutput = files.map(f => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}`).join('\n');
      const outputSize = Buffer.byteLength(fullOutput, 'utf8');
      const estimatedSize = estimateResultSize(fullOutput);
      const needsStreaming = shouldStreamResult(fullOutput, 10000) || files.length > limit;
      const maxTotalOutput = ctx?.settings?.toolPermissions?.maxTotalOutput || 100 * 1024; // 100KB default
      
      // If output exceeds total size limit, force truncation
      if (outputSize > maxTotalOutput) {
        const truncated = files.slice(0, limit);
        let output = truncated.map(f => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}`).join('\n');
        output = truncateOutput(output, 200) + `\n\n[... Output truncated: ${outputSize - maxTotalOutput} bytes over limit]`;
        return {
          content: [{ type: "text" as const, text: output }],
          details: {
            count: files.length,
            returned: truncated.length,
            files: truncated.slice(0, 50) as any[] ,
            totalSize,
            estimatedBytes: outputSize,
            streamed: true,
            truncated: true,
          },
        };
      }

      if (needsStreaming) {
        const truncated = files.slice(0, limit);
        let output = truncated.map(f => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}`).join('\n');
        if (files.length > limit) {
          output += `\n\n[... ${files.length - limit} more items - total: ${files.length}, ${formatBytes(totalSize)}]`;
        }
        output = truncateOutput(output, 200);
        return {
          content: [{ type: "text" as const, text: output }],
          details: {
            count: files.length,
            returned: truncated.length,
            files: truncated.slice(0, 50) as any[],
            totalSize,
            estimatedBytes: estimatedSize,
            streamed: true,
            truncated: true,
          },
        };
      }

      // Small result - return full
      return {
        content: [{ type: "text" as const, text: fullOutput || '(empty)' }],
        details: {
          count: files.length,
          files: files.slice(0, 100) as any[],
          totalSize,
          returned: files.length,
          estimatedBytes: estimatedSize,
          streamed: false,
          truncated: false,
        },
      };
    } catch (error: any) {
      return {
        content: [{ type: "text" as const, text: `❌ ${error.message}` }],
        details: { error: error.message, count: 0, returned: 0, files: [] as any[], totalSize: 0, estimatedBytes: 0, streamed: false, truncated: false }
      };
    }
  },
});

function getAllFiles(dir: string, pattern?: string): string[] {
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
          if (minimatch(name, pattern)) results.push(full);
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
    ...getImageTools(),
  ];
}

// Export sandbox utilities
export * from './sandbox.js';

