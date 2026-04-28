export interface CliOptions {
  cwd?: string;
  tools?: string[];
  sessionDir?: string;
  theme?: "dark" | "light" | "auto";
}

export function parseCliOptions(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--cwd" && args[i + 1]) options.cwd = args[++i];
    if (args[i] === "--tools" && args[i + 1]) options.tools = args[i + 1].split(",");
    if (args[i] === "--sessionDir" && args[i + 1]) options.sessionDir = args[++i];
    if (args[i] === "--theme" && args[i + 1]) options.theme = args[++i] as any;
  }

  return options;
}

export function printHelp(): void {
  console.log(`
PiClaw CLI - AI Coding Assistant

Options:
  --cwd <path>       Working directory (default: process.cwd())
  --tools <list>     Comma-separated tool allowlist
  --sessionDir <dir> Session directory
  --theme <mode>     Theme: dark|light|auto
  -h, --help         Show this help

Slash commands (in REPL):
  /clear   Clear chat history
  /exit    Exit application
  /help    Show help
`);
}
