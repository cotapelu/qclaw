import { Type } from "typebox";

export const systemdNspawnSchema = Type.Object({
  command: Type.String({ description: "systemd-nspawn/machinectl command (e.g., 'machinectl list', 'machinectl start mycontainer', 'machinectl shell mycontainer', 'nspawn -D /path/to/container')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeSystemdNspawn(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    const cmd = `systemd-nspawn ${command}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `systemd-nspawn error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}