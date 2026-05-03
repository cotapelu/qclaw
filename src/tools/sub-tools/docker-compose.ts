import { Type } from "typebox";

export const dockerComposeSchema = Type.Object({
  command: Type.String({ description: "docker-compose command (e.g., 'up -d', 'down', 'ps', 'build', 'logs -f')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeDockerCompose(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  const targetCwd = cwd;
  try {
    // Use docker compose (newer) or docker-compose (older)
    const cmd = `docker compose ${command}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd: targetCwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    // Fallback to docker-compose if docker compose fails
    try {
      const cmd = `docker-compose ${command}`;
      const result = await ctx!.exec("bash", ["-c", cmd], { cwd: targetCwd, signal, timeout });
      return {
        content: [{ type: "text", text: result.stdout || result.stderr }],
        details: { exitCode: result.code, killed: result.killed },
        isError: result.code !== 0,
      } as const;
    } catch (err: any) {
      return { content: [{ type: "text", text: `docker-compose error: ${err.message}` }], details: undefined, isError: true } as const;
    }
  }
}