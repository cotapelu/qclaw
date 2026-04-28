#!/usr/bin/env node

/**
 * QClaw - Simplified version using only @mariozechner/pi-coding-agent
 */

import { createAgentSession, SessionManager } from "@mariozechner/pi-coding-agent";
import * as readline from "readline";

interface CliOptions {
  cwd?: string;
  tools?: string[];
  sessionDir?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const options: CliOptions = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--cwd" && args[i + 1]) options.cwd = args[++i];
    if (args[i] === "--tools" && args[i + 1]) options.tools = args[i + 1].split(",");
    if (args[i] === "--sessionDir" && args[i + 1]) options.sessionDir = args[++i];
  }

  console.log("Initializing QClaw...");

  try {
    const sessionManager = SessionManager.create(options.cwd || process.cwd(), options.sessionDir);

    const result = await createAgentSession({
      cwd: options.cwd || process.cwd(),
      tools: options.tools,
      sessionManager,
    });
    // Use any to bypass missing type methods
    const session: any = result.session;

    console.log("Agent ready. Type your message (or /exit to quit).\n");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed === "/exit" || trimmed === "/quit") {
        await session.shutdown();
        process.exit(0);
        return;
      }
      if (trimmed === "/clear") {
        session.clearMessages();
        console.clear();
        return;
      }
      if (trimmed === "/help") {
        console.log("Slash commands: /clear, /exit, /help");
        return;
      }

      try {
        await session.sendMessage(trimmed);
      } catch (error: any) {
        console.error("Error:", error.message);
      }
    });

    rl.on('close', async () => {
      await session.shutdown();
      process.exit(0);
    });
  } catch (error: any) {
    console.error("Failed to start:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);
