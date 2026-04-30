import { Type } from "typebox";

export const redisSchema = Type.Object({
  command: Type.String({ description: "redis-cli command (e.g., 'GET key', 'SET key value')" }),
  host: Type.Optional(Type.String()),
  port: Type.Optional(Type.Number()),
  db: Type.Optional(Type.Number()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeRedis(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, host = "localhost", port = 6379, db = 0, timeout } = args as {
    command: string;
    host?: string;
    port?: number;
    db?: number;
    timeout?: number;
  };
  try {
    const fullCmd = `redis-cli -h ${host} -p ${port} -n ${db} ${command}`;
    const result = await ctx!.exec("bash", ["-c", fullCmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, host, port, db },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `Redis error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
