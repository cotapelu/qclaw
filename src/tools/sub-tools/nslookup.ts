import { Type } from "typebox";

export const nslookupSchema = Type.Object({
  host: Type.String(),
  type: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeNslookup(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { host, type = "A", timeout } = args as {
    host: string;
    type?: string;
    timeout?: number;
  };
  try {
    const cmd = `nslookup -type=${type} ${host}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, host, type },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `nslookup error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
