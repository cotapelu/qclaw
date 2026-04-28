#!/usr/bin/env node

/**
 * Memory Tool
 *
 * Allows the LLM to store and retrieve persistent key-value data within the session.
 * Useful for remembering facts, user preferences, or intermediate results.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

interface MemoryEntry {
  key: string;
  value: unknown;
  stored: number;
}

export function registerMemoryTool(api: ExtensionAPI): void {
  const tool: any = {
    name: "memory",
    label: "Memory",
    description: "Store and retrieve persistent key-value data in the session.",
    promptSnippet: "Use `memory` to remember information across the conversation.",
    promptGuidelines: [
      "Call memory with action 'set', a key, and a value to store data.",
      "Call memory with action 'get' and a key to retrieve stored data.",
      "Call memory with action 'list' (or no parameters) to see all stored keys.",
      "Stored data persists for the duration of the session and can be accessed later."
    ],
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["set", "get", "list"],
          description: "Operation: set (store), get (retrieve), list (show keys)"
        },
        key: {
          type: "string",
          description: "Key for the memory item"
        },
        value: {
          type: "object",
          description: "Value to store (any JSON-serializable value)"
        }
      },
      required: []
    },
    execute: async (toolCallId, params, signal, onUpdate, ctx) => {
      const action = (params as any).action as string | undefined;
      const key = (params as any).key as string | undefined;
      const value = (params as any).value;

      if (!action || action === "list") {
        // List all memory keys
        const allEntries = ctx.sessionManager.getEntries();
        const memories: MemoryEntry[] = [];
        for (const entry of allEntries) {
          if (entry.type === "custom" && entry.customType === "memory") {
            memories.push(entry.data as MemoryEntry);
          }
        }
        const keys = memories.map(m => m.key);
        if (keys.length === 0) {
          return {
            content: [{ type: "text", text: "Memory is empty." }],
            details: []
          };
        }
        return {
          content: [{ type: "text", text: `Stored keys: ${keys.join(", ")}` }],
          details: memories
        };
      }

      if (action === "set") {
        if (!key || value === undefined) {
          return {
            content: [{ type: "text", text: "Missing key or value for memory set." }],
            details: { error: "missing_params" }
          };
        }
        const entry: MemoryEntry = { key, value, stored: Date.now() };
        api.appendEntry("memory", entry);
        return {
          content: [{ type: "text", text: `Stored "${key}" in memory.` }],
          details: entry
        };
      }

      if (action === "get") {
        if (!key) {
          return {
            content: [{ type: "text", text: "Missing key for memory get." }],
            details: { error: "missing_key" }
          };
        }
        const allEntries = ctx.sessionManager.getEntries();
        // Find most recent entry for this key
        let found: MemoryEntry | null = null;
        for (let i = allEntries.length - 1; i >= 0; i--) {
          const entry = allEntries[i];
          if (entry.type === "custom" && entry.customType === "memory") {
            const data = entry.data as MemoryEntry;
            if (data.key === key) {
              found = data;
              break;
            }
          }
        }
        if (!found) {
          return {
            content: [{ type: "text", text: `No value found for key "${key}".` }],
            details: { key, found: false }
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(found.value, null, 2) }],
          details: found
        };
      }

      return {
        content: [{ type: "text", text: `Unknown action: ${action}` }],
        details: { error: "unknown_action" }
      };
    }
  };

  api.registerTool(tool);
}
