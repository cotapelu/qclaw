import { Type } from "typebox";

export const netstatSchema = Type.Object({
  all: Type.Optional(Type.Boolean()),
  tcp: Type.Optional(Type.Boolean()),
  udp: Type.Optional(Type.Boolean()),
  listening: Type.Optional(Type.Boolean()),
  route: Type.Optional(Type.Boolean()),
  iface: Type.Optional(Type.Boolean()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeNetstat(
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
    route = false,
    iface = false,
    timeout,
  } = args as {
    all?: boolean;
    tcp?: boolean;
    udp?: boolean;
    listening?: boolean;
    route?: boolean;
    iface?: boolean;
    timeout?: number;
  };
  try {
    let cmd = "netstat";
    if (route) cmd += " -rn";
    else if (iface) cmd += " -i";
    else {
      if (all) cmd += " -a";
      if (tcp) cmd += " -t";
      if (udp) cmd += " -u";
      if (listening) cmd += " -l";
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, all, tcp, udp, listening, route, iface },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `netstat error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
