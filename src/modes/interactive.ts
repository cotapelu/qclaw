import * as readline from "readline";
import { PiClawAgent } from "../agent.js";

export async function startInteractive(agent: PiClawAgent): Promise<void> {
  console.log("Agent ready. Type your message (or /exit to quit).\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed === "/exit" || trimmed === "/quit") {
      agent.dispose();
      process.exit(0);
      return;
    }
    if (trimmed === "/clear") {
      agent.clearMessages();
      console.clear();
      return;
    }
    if (trimmed === "/help") {
      console.log("Slash commands: /clear, /exit, /help");
      return;
    }

    try {
      await agent.sendMessage(trimmed);
    } catch (error: any) {
      console.error("Error:", error.message);
    }
  });

  rl.on("close", async () => {
    agent.dispose();
    process.exit(0);
  });
}
