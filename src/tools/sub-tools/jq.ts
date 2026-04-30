import { Type } from "typebox";

export const jqSchema = Type.Object({
  filter: Type.String(),
  input: Type.Optional(Type.Any()),
  inputFile: Type.Optional(Type.String()),
  outputFile: Type.Optional(Type.String()),
  rawOutput: Type.Optional(Type.Boolean()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeJq(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { filter, input, inputFile, outputFile, rawOutput = false, timeout } = args as {
    filter: string;
    input?: any;
    inputFile?: string;
    outputFile?: string;
    rawOutput?: boolean;
    timeout?: number;
  };
  try {
    let cmd = "jq";
    if (rawOutput) cmd += " -r";
    if (outputFile) cmd += ` -o ${outputFile}`;
    cmd += ` '${filter}'`;

    if (inputFile) {
      cmd += ` ${inputFile}`;
    } else if (input) {
      const jsonString = typeof input === "string" ? input : JSON.stringify(input, null, 2);
      const result = await ctx!.exec("bash", ["-c", `echo '${jsonString.replace(/'/g, "'\\''")}' | ${cmd}`], { cwd, signal, timeout });
      return {
        content: [{ type: "text", text: result.stdout || result.stderr }],
        details: { exitCode: result.code, killed: result.killed, filter },
        isError: result.code !== 0,
      } as const;
    } else {
      return { content: [{ type: "text", text: "Must provide input or inputFile" }], details: undefined, isError: true } as const;
    }
  } catch (error: any) {
    return { content: [{ type: "text", text: `jq error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
