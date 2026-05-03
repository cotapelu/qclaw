import { Type } from "typebox";

export const chrootSchema = Type.Object({
  command: Type.String({ description: "chroot command (e.g., '/mychroot /bin/bash', '/mychroot /bin/sh -c \"ls /\"')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeChroot(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    const cmd = `chroot ${command}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `chroot error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}