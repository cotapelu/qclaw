import { Type } from "typebox";

export const cmakeSchema = Type.Object({
  command: Type.String({ description: "cmake/ninja command (e.g., 'cmake .', 'cmake --build .', 'ninja', 'ninja test')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeCmake(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    let cmd: string;
    if (command.startsWith("cmake ") || command.startsWith("cmake,")) {
      cmd = command;
    } else if (command.startsWith("ninja")) {
      cmd = command;
    } else {
      // Default to cmake
      cmd = `cmake ${command}`;
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `cmake error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}