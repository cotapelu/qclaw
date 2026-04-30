import { Type } from "typebox";

export const scpSchema = Type.Object({
  source: Type.String(),
  destination: Type.String(),
  recursive: Type.Optional(Type.Boolean()),
  port: Type.Optional(Type.Number()),
  user: Type.Optional(Type.String()),
  preserve: Type.Optional(Type.Boolean()),
  compress: Type.Optional(Type.Boolean()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeScp(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const {
    source,
    destination,
    recursive = false,
    port,
    user,
    preserve = false,
    compress = false,
    timeout,
  } = args as {
    source: string;
    destination: string;
    recursive?: boolean;
    port?: number;
    user?: string;
    preserve?: boolean;
    compress?: boolean;
    timeout?: number;
  };
  try {
    let cmd = "scp";
    if (recursive) cmd += " -r";
    if (preserve) cmd += " -p";
    if (compress) cmd += " -C";
    if (port) cmd += ` -P ${port}`;
    cmd += ` ${source} ${destination}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, source, destination, recursive },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `scp error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
