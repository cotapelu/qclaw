import { Type } from "typebox";

export const yarnSchema = Type.Object({
  command: Type.String({ description: "yarn/pnpm command (e.g., 'yarn install', 'yarn add lodash', 'pnpm install', 'pnpm add lodash')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeYarn(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    let cmd: string;
    if (command.startsWith("yarn ") || command.startsWith("yarn,")) {
      cmd = command;
    } else if (command.startsWith("pnpm ") || command.startsWith("pnpm,")) {
      cmd = command;
    } else {
      // Default to yarn
      cmd = `yarn ${command}`;
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `yarn/pnpm error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}