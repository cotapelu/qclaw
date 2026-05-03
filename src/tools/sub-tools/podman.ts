import { Type } from "typebox";

export const podmanSchema = Type.Object({
  command: Type.String({ description: "podman command (e.g., 'ps -a', 'images', 'run nginx', 'pull docker.io/library/nginx')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executePodman(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    const cmd = `podman ${command}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `podman error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}