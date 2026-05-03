import { Type } from "typebox";

export const vagrantSchema = Type.Object({
  command: Type.String({ description: "vagrant command (e.g., 'up', 'halt', 'status', 'ssh', 'destroy', 'reload')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeVagrant(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    const cmd = `vagrant ${command}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `vagrant error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}