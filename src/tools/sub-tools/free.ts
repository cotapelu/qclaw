import { Type } from "typebox";

export const freeSchema = Type.Object({
  human: Type.Optional(Type.Boolean()),
  total: Type.Optional(Type.Boolean()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeFree(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { human = true, total = false, timeout } = args as {
    human?: boolean;
    total?: boolean;
    timeout?: number;
  };
  try {
    let cmd = "free";
    if (human) cmd += " -h";
    if (total) cmd += " -t";
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, human, total },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `free error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
