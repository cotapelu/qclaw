import { Type } from "typebox";

export const qemuSchema = Type.Object({
  command: Type.String({ description: "qemu command (e.g., 'img create -f qcow2 disk.qcow2 10G', 'img convert -f raw -O qcow2 input.img output.qcow2', 'system-x86_64 -m 2G -hda disk.img')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeQemu(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    const cmd = `qemu-${command}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `qemu error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}