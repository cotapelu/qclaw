import { Type } from "typebox";

export const sshSchema = Type.Object({
  host: Type.String({ description: "SSH host" }),
  command: Type.String({ description: "Command to execute on remote host" }),
  user: Type.Optional(Type.String()),
  port: Type.Optional(Type.Number()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeSsh(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { host, command, user, port = 22, timeout } = args as {
    host: string;
    command: string;
    user?: string;
    port?: number;
    timeout?: number;
  };
  try {
    const sshUser = user || "";
    const sshCmd = sshUser
      ? `ssh -p ${port} ${sshUser}@${host} "${command.replace(/"/g, '\\"')}"`
      : `ssh -p ${port} ${host} "${command.replace(/"/g, '\\"')}"`;
    const result = await ctx!.exec("bash", ["-c", sshCmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, host, user: sshUser },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `SSH error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
