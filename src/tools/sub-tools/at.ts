import { Type } from "typebox";

export const atSchema = Type.Object({
  action: Type.Union([Type.Literal("list"), Type.Literal("add"), Type.Literal("remove"), Type.Literal("show")]),
  time: Type.Optional(Type.String()),
  command: Type.Optional(Type.String()),
  jobId: Type.Optional(Type.Number()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeAt(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { action, time, command, jobId, timeout } = args as {
    action: string;
    time?: string;
    command?: string;
    jobId?: number | string;
    timeout?: number;
  };
  try {
    let cmd = "";
    if (action === "list") {
      cmd = "atq";
    } else if (action === "add" && time && command) {
      cmd = `echo "${command}" | at ${time}`;
    } else if (action === "remove" && jobId) {
      cmd = `atrm ${jobId}`;
    } else if (action === "show" && jobId) {
      cmd = `at -c ${jobId}`;
    } else {
      return { content: [{ type: "text", text: `Invalid action or missing parameters` }], details: undefined, isError: true } as const;
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, action, jobId, time },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `at error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
