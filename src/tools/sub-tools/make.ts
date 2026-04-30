import { Type } from "typebox";

export const makeSchema = Type.Object({
  target: Type.Optional(Type.String()),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
  jobs: Type.Optional(Type.Number()),
});

export async function executeMake(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { target = "", cwd: targetCwd, timeout, jobs } = args as {
    target?: string;
    cwd?: string;
    timeout?: number;
    jobs?: number;
  };
  try {
    let cmd = "make";
    if (jobs && jobs > 1) cmd += ` -j ${jobs}`;
    if (target) cmd += ` ${target}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd: targetCwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, cwd: targetCwd, target },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `Make error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
