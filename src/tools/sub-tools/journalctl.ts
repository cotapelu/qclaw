import { Type } from "typebox";

export const journalctlSchema = Type.Object({
  unit: Type.Optional(Type.String()),
  since: Type.Optional(Type.String()),
  lines: Type.Optional(Type.Number()),
  follow: Type.Optional(Type.Boolean()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeJournalctl(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { unit, since, lines = 100, follow = false, timeout } = args as {
    unit?: string;
    since?: string;
    lines?: number;
    follow?: boolean;
    timeout?: number;
  };
  try {
    let cmd = `journalctl -n ${lines}`;
    if (unit) cmd += ` -u ${unit}`;
    if (since) cmd += ` --since "${since}"`;
    if (follow) cmd += " -f";
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, unit, since, lines, follow },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `journalctl error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
