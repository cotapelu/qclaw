import { Type } from "typebox";

export const sysctlSchema = Type.Object({
  command: Type.String({ description: "sysctl command (e.g., '-a', '-n net.ipv4.conf.all.rp_filter', '-w net.ipv4.tcp_syncookies=1')" }),
  timeout: Type.Optional(Type.Number()),
});

export async function executeSysctl(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    const cmd = `sysctl ${command}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `sysctl error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}