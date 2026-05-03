import { Type } from "typebox";

export const hardwareSchema = Type.Object({
  command: Type.String({ description: "Hardware command (e.g., 'lsusb', 'lspci', 'lscpu', 'lsblk', 'lsusb -v', 'lspci -v', 'lsblk -o NAME,SIZE,TYPE')" }),
  timeout: Type.Optional(Type.Number()),
});

export async function executeHardware(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    // Handle both separate commands and combined with lsusb/lspci/lscpu/lsblk prefix
    let cmd = command;
    // If command doesn't start with lsusb/lspci/lscpu/lsblk, prepend it
    if (!cmd.match(/^(lsusb|lspci|lscpu|lsblk)/)) {
      // Default to lsblk if no prefix
      cmd = `lsblk ${command}`;
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `hardware error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}