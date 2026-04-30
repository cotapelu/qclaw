import { Type } from "typebox";

export const k8sSchema = Type.Object({
  command: Type.String({ description: "kubectl command (e.g., 'get pods', 'apply -f manifest.yaml')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
  context: Type.Optional(Type.String({ description: "K8s context" })),
});

export async function executeK8s(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout, context } = args as { command: string; timeout?: number; context?: string };
  try {
    const cmd = context ? `kubectl --context ${context} ${command}` : `kubectl ${command}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `kubectl error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
