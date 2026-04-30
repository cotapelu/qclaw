import { Type } from "typebox";

export const wgetSchema = Type.Object({
  url: Type.String(),
  output: Type.Optional(Type.String()),
  continueFlag: Type.Optional(Type.Boolean()),
  timeout: Type.Optional(Type.Number()),
  quiet: Type.Optional(Type.Boolean()),
  limitRate: Type.Optional(Type.String()),
  user: Type.Optional(Type.String()),
  headers: Type.Optional(Type.Record(Type.String(), Type.String())),
});

export async function executeWget(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const {
    url,
    output,
    continueFlag = false,
    timeout = 30,
    quiet = false,
    limitRate,
    user,
    headers = {},
  } = args as {
    url: string;
    output?: string;
    continueFlag?: boolean;
    timeout?: number;
    quiet?: boolean;
    limitRate?: string;
    user?: string;
    headers?: Record<string, string>;
  };
  try {
    const wgetArgs: string[] = [];

    if (output) wgetArgs.push(`-O ${output}`);
    if (continueFlag) wgetArgs.push("-c");
    if (quiet) wgetArgs.push("-q");
    if (limitRate) wgetArgs.push(`--limit-rate=${limitRate}`);
    if (timeout) wgetArgs.push(`--timeout=${timeout}`);
    if (user) wgetArgs.push(`--user=${user.split(":")[0]} --password=${user.split(":")[1] || ""}`);

    for (const [key, value] of Object.entries(headers)) {
      wgetArgs.push(`--header='${key}: ${value}'`);
    }

    wgetArgs.push(`'${url}'`);

    const cmd = `wget ${wgetArgs.join(" ")}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, url, output },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `wget error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
