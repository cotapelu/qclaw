import { Type } from "typebox";

export const ssSchema = Type.Object({
  all: Type.Optional(Type.Boolean()),
  tcp: Type.Optional(Type.Boolean()),
  udp: Type.Optional(Type.Boolean()),
  listening: Type.Optional(Type.Boolean()),
  process: Type.Optional(Type.Boolean()),
  state: Type.Optional(Type.String()),
  port: Type.Optional(Type.Number()),
  ipv4: Type.Optional(Type.Boolean()),
  ipv6: Type.Optional(Type.Boolean()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeSs(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const {
    all = false,
    tcp = false,
    udp = false,
    listening = false,
    process = false,
    timeout,
    state,
    port,
    ipv4 = false,
    ipv6 = false,
  } = args as {
    all?: boolean;
    tcp?: boolean;
    udp?: boolean;
    listening?: boolean;
    process?: boolean;
    timeout?: number;
    state?: string;
    port?: number;
    ipv4?: boolean;
    ipv6?: boolean;
  };
  try {
    let cmd = "ss";
    if (ipv4) cmd += " -4";
    if (ipv6) cmd += " -6";
    if (all) cmd += " -a";
    if (tcp) cmd += " -t";
    if (udp) cmd += " -u";
    if (listening) cmd += " -l";
    if (process) cmd += " -p";
    if (state) cmd += ` state ${state}`;
    if (port) cmd += ` dport = :${port} or sport = :${port}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, all, tcp, udp, listening, process, state, port },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `ss error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
