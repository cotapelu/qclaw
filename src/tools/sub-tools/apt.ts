import { Type } from "typebox";

export const aptSchema = Type.Object({
  command: Type.Union([
    Type.Literal("install"),
    Type.Literal("remove"),
    Type.Literal("update"),
    Type.Literal("upgrade"),
    Type.Literal("search"),
    Type.Literal("list"),
    Type.Literal("show"),
  ]),
  packages: Type.Optional(Type.Array(Type.String())),
  update: Type.Optional(Type.Boolean()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeApt(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, packages = [], update = false, timeout } = args as {
    command: string;
    packages?: string[];
    update?: boolean;
    timeout?: number;
  };
  try {
    let cmd = "";
    if (update) {
      await ctx!.exec("bash", ["-c", "apt-get update"], { cwd, signal, timeout });
    }
    if (command === "list") {
      cmd = `apt list ${packages.join(" ")} --installed 2>/dev/null || apt-cache policy ${packages.join(" ")}`;
    } else if (command === "search") {
      cmd = `apt-cache search ${packages.join(" ")}`;
    } else if (command === "show") {
      cmd = `apt-cache show ${packages.join(" ")}`;
    } else {
      cmd = `apt-get -y ${command} ${packages.join(" ")}`;
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, command },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `apt error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
