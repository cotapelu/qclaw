import * as readline from 'readline';
import { AgentCore } from "./core.js";
import { commandRegistry } from "./commands.js";
import type { CommandHandlers } from "./commands.js";

export class AgentCLI {
  private agent: AgentCore;
  private rl: readline.Interface;
  private commandHandlers: CommandHandlers;
  private verbose: boolean = false;

  constructor(agent: AgentCore, verbose: boolean = false) {
    this.agent = agent;
    this.verbose = verbose;
    this.commandHandlers = {
      agent,
      sessionManager: agent.getSessionManager(),
      resourceLoader: agent.getResourceLoader(),
    };

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '👤 > ',
    });

    this.rl.on('SIGINT', () => this.shutdown());
  }

  async start(): Promise<void> {
    console.log("\n🎮 Pi SDK Agent CLI\n");
    console.log("Type /help for commands, or just chat.\n");

    this.rl.on('line', async (input: string) => {
      await this.handleInput(input.trim());
    });

    this.rl.on('close', () => this.shutdown());

    this.rl.prompt();

    // Subscribe to agent events
    this.agent.subscribe((event: any) => this.handleEvent(event));
  }

  private async handleInput(input: string): Promise<void> {
    if (!input) {
      this.rl.prompt();
      return;
    }

    // Slash command
    if (input.startsWith('/')) {
      const [cmd, ...args] = input.slice(1).split(' ');
      const result = await commandRegistry.execute(cmd, this.commandHandlers, ...args);
      if (result) console.log(`\n${result}\n`);
    } else {
      // Chat prompt
      try {
        await this.agent.prompt(input);
      } catch (error: any) {
        console.error(`\n❌ Error: ${error.message}\n`);
      }
    }

    this.rl.prompt();
  }

  private handleEvent(event: any): void {
    switch (event.type) {
      case 'agent_start':
        console.log("\n🤔 Agent is thinking...");
        break;
      case 'message_update':
        if (event.assistantMessageEvent.type === 'text_delta') {
          process.stdout.write(event.assistantMessageEvent.delta);
        } else if (event.assistantMessageEvent.type === 'thinking_delta') {
          // Could show thinking in different color
          if (this.verbose) {
            process.stdout.write(`\n[thinking] ${event.assistantMessageEvent.delta}`);
          }
        }
        break;
      case 'tool_execution_start':
        console.log(`\n🔧 [Tool: ${event.toolName}]`);
        if (this.verbose && event.args) {
          console.log(`   Args: ${JSON.stringify(event.args)}`);
        }
        break;
      case 'tool_execution_end':
        if (event.isError) {
          console.log(`❌ Tool execution failed`);
          if (this.verbose && event.error) {
            console.log(`   Error: ${event.error}`);
          }
        } else if (this.verbose) {
          console.log(`   ✓ Done`);
        }
        break;
      case 'turn_end':
        if (this.verbose) {
          console.log("\n--- Turn completed ---\n");
        }
        break;
      case 'error':
        console.error(`❌ Agent error: ${event.message}\n`);
        break;
      case 'compaction_start':
        if (this.verbose) {
          console.log("\n🗜️ Compacting context...\n");
        }
        break;
      case 'compaction_end':
        if (this.verbose) {
          console.log(`🗜️ Compaction complete: ${event.removedEntries} entries removed\n`);
        }
        break;
    }
  }

  private shutdown(): void {
    console.log('\n👋 Goodbye!');
    
    // Show stats if verbose
    if (this.verbose) {
      const stats = this.agent.getStats();
      console.log("\n📊 Session Statistics:");
      console.log(`   Duration: ${stats.sessionDuration.toFixed(1)}s`);
      console.log(`   Turns: ${stats.turns}`);
      console.log(`   Tool calls: ${stats.toolCalls}`);
      console.log(`   Total tokens: ${stats.totalTokens.toLocaleString()}`);
      console.log(`   Estimated cost: $${stats.estimatedCost.toFixed(4)}`);
      if (stats.errors > 0) {
        console.log(`   Errors: ${stats.errors}`);
      }
    }

    this.agent.dispose();
    process.exit(0);
  }
}
