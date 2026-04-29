#!/usr/bin/env node

/**
 * System Info Tool
 *
 * Returns system information (OS, architecture, Node version, etc).
 * Useful for diagnostics and environment introspection.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { platform, arch, release, uptime, totalmem, freemem, cpus } from "node:os";

export function registerSystemInfoTool(api: ExtensionAPI): void {
  const tool: any = {
    name: "system_info",
    label: "System Info",
    description: "Get system information (OS, architecture, memory, CPU, etc)",
    promptSnippet: "Use `system_info` to retrieve diagnostic information about the host system.",
    promptGuidelines: [
      "Use system_info when asked about the environment, OS, or system resources.",
      "The tool returns platform, architecture, memory stats, CPU info, and uptime."
    ],
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (toolCallId: string, params: any, signal: AbortSignal | undefined, onUpdate: any, ctx: any) => {
      const cpuInfo = cpus();
      const result = {
        platform: platform(),
        arch: arch(),
        osRelease: release(),
        nodeVersion: process.version,
        uptime: uptime(),
        totalMemoryMB: Math.round(totalmem() / 1024 / 1024),
        freeMemoryMB: Math.round(freemem() / 1024 / 1024),
        cpuCores: cpuInfo.length,
        cpuModel: cpuInfo[0]?.model || "unknown",
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  };

  api.registerTool(tool);
}
