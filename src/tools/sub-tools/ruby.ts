import { Type } from "typebox";

export const rubySchema = Type.Object({
  command: Type.String({ description: "ruby/gem/bundle command (e.g., 'ruby -v', 'ruby script.rb', 'gem install rails', 'bundle install')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeRuby(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    let cmd: string;
    if (command.startsWith("ruby ") || command.startsWith("ruby,")) {
      cmd = command;
    } else if (command.startsWith("gem ") || command.startsWith("gem,")) {
      cmd = command;
    } else if (command.startsWith("bundle ") || command.startsWith("bundle,")) {
      cmd = command;
    } else {
      // Default to ruby
      cmd = `ruby ${command}`;
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `ruby error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}