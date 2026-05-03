import { Type } from "typebox";

export const lvmSchema = Type.Object({
  command: Type.String({ description: "LVM command (e.g., 'pvs', 'vgs', 'lvs', 'pvcreate /dev/sda1', 'vgcreate vg0 /dev/sda1', 'lvcreate -L 10G -n lv0 vg0')" }),
  timeout: Type.Optional(Type.Number()),
});

export async function executeLvm(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    const cmd = `lvm ${command}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `lvm error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}