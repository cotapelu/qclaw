import { Type } from "typebox";

export const ufwSchema = Type.Object({
  action: Type.Union([
    Type.Literal("status"),
    Type.Literal("enable"),
    Type.Literal("disable"),
    Type.Literal("allow"),
    Type.Literal("deny"),
    Type.Literal("delete"),
    Type.Literal("reload"),
    Type.Literal("reset"),
  ]),
  rule: Type.Optional(Type.String()),
  port: Type.Optional(Type.Number()),
  proto: Type.Optional(Type.String()),
  fromIp: Type.Optional(Type.String()),
  toIp: Type.Optional(Type.String()),
  comment: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeUfw(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { action, rule, port, proto = "tcp", fromIp, toIp, comment, timeout } = args as {
    action: string;
    rule?: string;
    port?: number;
    proto?: string;
    fromIp?: string;
    toIp?: string;
    comment?: string;
    timeout?: number;
  };
  try {
    let cmd = "ufw";
    if (action === "status") {
      cmd += " status verbose";
    } else if (action === "enable") {
      cmd += " enable";
    } else if (action === "disable") {
      cmd += " disable";
    } else if (action === "reload") {
      cmd += " reload";
    } else if (action === "reset") {
      cmd += " --force reset";
    } else if (action === "allow" || action === "deny") {
      const targetRule = rule || `${port}/${proto}`;
      cmd += ` ${action} ${targetRule}`;
      if (fromIp) cmd += ` from ${fromIp}`;
      if (toIp) cmd += ` to ${toIp}`;
      if (comment) cmd += ` comment '${comment}'`;
    } else if (action === "delete" && rule) {
      cmd += ` delete ${rule}`;
    } else {
      return { content: [{ type: "text", text: `Unknown ufw action or missing rule` }], details: undefined, isError: true } as const;
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, action, rule, fromIp, toIp },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `ufw error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
