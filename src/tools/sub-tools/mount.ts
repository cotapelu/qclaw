import { Type } from "typebox";

export const mountSchema = Type.Object({
  command: Type.String({ description: "mount/umount command (e.g., '-a' to mount all, '/dev/sdb1 /mnt/usb' to mount, '/mnt/point' to umount)" }),
  timeout: Type.Optional(Type.Number()),
});

export async function executeMount(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    const cmd = `mount ${command}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `mount error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}