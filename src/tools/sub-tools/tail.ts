import { Type } from "typebox";

export const tailSchema = Type.Object({
  path: Type.String(),
  lines: Type.Optional(Type.Number()),
  follow: Type.Optional(Type.Boolean()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeTail(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { path, lines = 10, follow = false, timeout } = args as {
    path: string;
    lines?: number;
    follow?: boolean;
    timeout?: number;
  };
  try {
    let cmd = `tail -n ${lines} ${path}`;
    if (follow) cmd += " -f";
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, path, lines, follow },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `tail error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
