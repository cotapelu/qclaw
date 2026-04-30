import { Type } from "typebox";

export const yumSchema = Type.Object({
  command: Type.Union([
    Type.Literal("install"),
    Type.Literal("remove"),
    Type.Literal("update"),
    Type.Literal("search"),
    Type.Literal("info"),
    Type.Literal("list"),
    Type.Literal("check-update"),
  ]),
  packages: Type.Optional(Type.Array(Type.String())),
  timeout: Type.Optional(Type.Number()),
});

export async function executeYum(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, packages = [], timeout } = args as {
    command: string;
    packages?: string[];
    timeout?: number;
  };
  try {
    let cmd = "yum";
    if (command === "list") {
      cmd = `yum list ${packages.join(" ")}`;
    } else if (command === "search") {
      cmd = `yum search ${packages.join(" ")}`;
    } else if (command === "info") {
      cmd = `yum info ${packages.join(" ")}`;
    } else if (command === "check-update") {
      cmd = "yum check-update";
    } else {
      cmd += ` -y ${command} ${packages.join(" ")}`;
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, command },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `yum error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
