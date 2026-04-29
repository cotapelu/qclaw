#!/usr/bin/env node

/**
 * Auto-Memory Integration
 *
 * Injects system prompt instructions to encourage the AI to use the memory tool
 * proactively when the user provides important information or asks to remember something.
 *
 * This extension connects the memory tool with the conversation context.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // Inject enhanced memory usage guidelines into system prompt
  pi.on("before_agent_start", (event: any, _ctx) => {
    const memoryGuidelines = `
Memory Tool Usage:
- If the user says "remember this", "save this", "note that", or provides important information (facts, decisions, code snippets, URLs, deadlines), proactively use the memory tool with action 'add' to store it.
- Include relevant tags: e.g., ['project', 'code'], ['meeting'], ['decision'], ['research'].
- Use memory.search to retrieve stored information when the user asks "what did we say about X", "do you remember", or references past info.
- Prefer storing concise, factual statements rather than long conversational exchanges.
- When uncertain if something should be remembered, ask the user: "Should I save this to memory?"
`.trim();

    // Append to the current system prompt
    const enhancedPrompt = `${event.systemPrompt  }\n\n${  memoryGuidelines}`;

    return {
      systemPrompt: enhancedPrompt,
    };
  });
}
