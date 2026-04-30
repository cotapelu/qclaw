import { Type } from "typebox";

export const killSchema = Type.Object({
  pid: Type.Optional(Type.Number()),
  name: Type.Optional(Type.String()),
  signal: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeKill(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { pid, name, signal: sig = "TERM", timeout } = args as {
    pid?: number;
    name?: string;
    signal?: string;
    timeout?: number;
  };
  if (!pid && !name) {
    return { content: [{ type: "text", text: "Must provide pid or name" }], details: undefined, isError: true } as const;
  }
  try {
    let cmd = "";
    if (pid) {
      cmd = `kill -${sig} ${pid}`;
    } else {
      cmd = `pkill -${sig} ${name}`;
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, pid, name, signal: sig },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `kill error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
