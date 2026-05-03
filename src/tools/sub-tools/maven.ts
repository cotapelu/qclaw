import { Type } from "typebox";

export const mavenSchema = Type.Object({
  command: Type.String({ description: "mvn/gradle/ant command (e.g., 'mvn clean install', 'mvn test', 'gradle build', 'gradle test', 'ant compile')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeMaven(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    let cmd: string;
    if (command.startsWith("mvn ") || command.startsWith("mvn,")) {
      cmd = command;
    } else if (command.startsWith("gradle ")) {
      cmd = command;
    } else if (command.startsWith("ant ")) {
      cmd = command;
    } else {
      // Default to mvn
      cmd = `mvn ${command}`;
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `maven error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}