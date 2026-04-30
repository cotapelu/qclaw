import { Type } from "typebox";

export const crontabSchema = Type.Object({
  action: Type.Union([Type.Literal("list"), Type.Literal("add"), Type.Literal("remove")]),
  user: Type.Optional(Type.String()),
  schedule: Type.Optional(Type.String()),
  command: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeCrontab(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { action, user, schedule, command, timeout } = args as {
    action: string;
    user?: string;
    schedule?: string;
    command?: string;
    timeout?: number;
  };
  try {
    let cmd = "";
    const userPart = user ? `-u ${user}` : "";

    if (action === "list") {
      cmd = `crontab ${userPart} -l`;
    } else if (action === "add" && schedule && command) {
      const newEntry = `${schedule} ${command}`;
      cmd = `(crontab ${userPart} -l 2>/dev/null; echo "${newEntry}") | crontab ${userPart} -`;
    } else if (action === "remove" && command) {
      cmd = `crontab ${userPart} -l 2>/dev/null | grep -v "${command}" | crontab ${userPart} -`;
    } else {
      return { content: [{ type: "text", text: `Invalid action or missing params` }], details: undefined, isError: true } as const;
    }

    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, action, user },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `crontab error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
