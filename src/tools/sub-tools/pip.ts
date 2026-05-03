import { Type } from "typebox";

export const pipSchema = Type.Object({
  command: Type.String({ description: "pip/poetry/pipenv command (e.g., 'pip install requests', 'pip list', 'poetry install', 'poetry add requests', 'pipenv install', 'pipenv install requests')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executePip(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    let cmd: string;
    if (command.startsWith("pip ") || command.startsWith("pip2 ") || command.startsWith("pip3 ")) {
      cmd = command;
    } else if (command.startsWith("poetry ")) {
      cmd = command;
    } else if (command.startsWith("pipenv ")) {
      cmd = command;
    } else {
      // Default to pip
      cmd = `pip ${command}`;
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `pip error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}