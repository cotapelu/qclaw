import { Type } from "typebox";

export const htopSchema = Type.Object({
  command: Type.String({ description: "htop command (e.g., '-p 1234' for specific PID, '-u username' for user)" }),
  timeout: Type.Optional(Type.Number()),
});

export async function executeHtop(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    const cmd = `htop ${command}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `htop error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}