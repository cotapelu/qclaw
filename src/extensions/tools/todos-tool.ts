#!/usr/bin/env node

/**
 * Todos Tool
 *
 * Allows the LLM to create and manage a todo list.
 * Todos are stored as custom entries in the session.
 */

import type { ExtensionAPI, ToolDefinition, ExtensionContext } from "@mariozechner/pi-coding-agent";

interface TodoEntry {
  text: string;
  created: number;
}

export function registerTodosTool(api: ExtensionAPI): void {
  const tool: any = {
    name: "todos",
    label: "Todos",
    description: "Manage a todo list. Provide new items to add, or call without items to list current todos.",
    promptSnippet: "Use `todos` to keep track of tasks and check progress.",
    promptGuidelines: [
      "Call todos with items to add new tasks.",
      "Call todos without items to see the current list.",
      "Mark tasks as done by noting progress in your response; todos are simple items without state."
    ],
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { type: "string" },
          description: "Todo items to add to the list. Omit to list existing todos."
        }
      },
      required: []
    },
    execute: async (toolCallId: string, params: Record<string, unknown>, _signal: AbortSignal | undefined, _onUpdate: any, ctx: any) => {
      const inputItems = params.items as string[] | undefined;

      if (!inputItems || inputItems.length === 0) {
        // List todos
        const allEntries = ctx.sessionManager.getEntries();
        const todos: TodoEntry[] = [];
        for (const entry of allEntries) {
          if (entry.type === "custom" && entry.customType === "todo") {
            todos.push(entry.data as TodoEntry);
          }
        }
        if (todos.length === 0) {
          return {
            content: [{ type: "text", text: "No todos yet." }],
            details: []
          };
        }
        const lines = todos.map((t, i) => `${i + 1}. ${t.text}`);
        return {
          content: [{ type: "text", text: lines.join("\n") }],
          details: todos
        };
      } else {
        // Add todos
        const added: TodoEntry[] = [];
        for (const text of inputItems) {
          const todo: TodoEntry = { text, created: Date.now() };
          api.appendEntry("todo", todo);
          added.push(todo);
        }
        return {
          content: [{ type: "text", text: `Added ${added.length} todo(s).` }],
          details: added
        };
      }
    }
  };

  api.registerTool(tool);
}
