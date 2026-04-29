#!/usr/bin/env node

/**
 * Echo Tool
 *
 * Simple tool that returns the input message.
 * Useful for testing custom tool integration.
 */

import type { ExtensionAPI, ToolDefinition } from "@mariozechner/pi-coding-agent";

export function registerEchoTool(api: ExtensionAPI): void {
  const tool: any = {
    name: "echo",
    label: "Echo",
    description: "Echo back a message. This is a demonstration tool for custom tool registration.",
    promptSnippet: "Use `echo` to repeat a message back to the user.",
    promptGuidelines: [
      "Use echo when you need to confirm or highlight a message.",
      "The message parameter should be clear and concise."
    ],
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Message to echo back",
        },
      },
      required: ["message"],
    },
    execute: async (toolCallId: string, params: any, signal: AbortSignal | undefined, onUpdate: any, ctx: any) => {
      const message = (params as any).message;
      return {
        content: [{ type: "text", text: `Echo: ${message}` }],
        details: message,
      };
    },
  };

  api.registerTool(tool);
}
