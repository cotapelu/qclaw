import { Type } from "typebox";

export const digSchema = Type.Object({
  host: Type.String(),
  type: Type.Optional(Type.String()),
  server: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeDig(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { host, type = "A", server, timeout } = args as {
    host: string;
    type?: string;
    server?: string;
    timeout?: number;
  };
  try {
    let cmd = `dig ${host} ${type}`;
    if (server) cmd += ` @${server}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, host, type, server },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `dig error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
