import { Type } from "typebox";

export const denoSchema = Type.Object({
  command: Type.String({ description: "deno/bun command (e.g., 'deno run main.ts', 'deno test', 'bun run main.ts', 'bun test')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeDeno(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    let cmd: string;
    if (command.startsWith("deno ") || command.startsWith("deno,")) {
      cmd = command;
    } else if (command.startsWith("bun ") || command.startsWith("bun,")) {
      cmd = command;
    } else {
      // Default to deno
      cmd = `deno ${command}`;
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `deno/bun error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}