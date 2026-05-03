import { Type } from "typebox";

export const batterySchema = Type.Object({
  command: Type.String({ description: "Battery command (upower: '-i /org/freedesktop/UPower/devices/battery_BAT0', pmset: '-g batt', 'upower -d' to list devices)" }),
  timeout: Type.Optional(Type.Number()),
});

export async function executeBattery(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    // Try upower first (Linux), then pmset (macOS)
    let cmd = command;
    if (!cmd.startsWith("upower") && !cmd.startsWith("pmset")) {
      // Default command - try both
      cmd = "upower -i $(upower -e | grep BAT | head -1) 2>/dev/null || pmset -g batt 2>/dev/null || echo 'No battery found'";
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `battery error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}