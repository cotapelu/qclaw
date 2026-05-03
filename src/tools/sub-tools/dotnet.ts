import { Type } from "typebox";

export const dotnetSchema = Type.Object({
  command: Type.String({ description: "dotnet/msbuild command (e.g., 'dotnet build', 'dotnet run', 'dotnet test', 'dotnet restore', 'msbuild')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeDotnet(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    let cmd: string;
    if (command.startsWith("dotnet ") || command.startsWith("dotnet,")) {
      cmd = command;
    } else if (command.startsWith("msbuild")) {
      cmd = command;
    } else {
      // Default to dotnet
      cmd = `dotnet ${command}`;
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `dotnet error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}