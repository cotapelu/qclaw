import { Type } from "typebox";

export const psSchema = Type.Object({
  options: Type.Optional(Type.String()),
  filter: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executePs(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { options = "aux", filter, timeout } = args as {
    options?: string;
    filter?: string;
    timeout?: number;
  };
  try {
    let cmd = `ps ${options}`;
    if (filter) cmd += ` | grep ${filter}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, options, filter },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `ps error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
