import { Type } from "typebox";

export const sensorsSchema = Type.Object({
  command: Type.String({ description: "sensors command (e.g., '-f' for Fahrenheit, '-c' for Celsius, '-A' for all adapters)" }),
  timeout: Type.Optional(Type.Number()),
});

export async function executeSensors(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    const cmd = `sensors ${command}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `sensors error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}