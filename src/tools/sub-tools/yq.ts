import { Type } from "typebox";

export const yqSchema = Type.Object({
  filter: Type.String(),
  input: Type.Optional(Type.Any()),
  inputFile: Type.Optional(Type.String()),
  outputFile: Type.Optional(Type.String()),
  format: Type.Optional(Type.String()),
  rawOutput: Type.Optional(Type.Boolean()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeYq(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { filter, input, inputFile, outputFile, format = "yaml", rawOutput = false, timeout } = args as {
    filter: string;
    input?: any;
    inputFile?: string;
    outputFile?: string;
    format?: "json" | "yaml" | "yml";
    rawOutput?: boolean;
    timeout?: number;
  };
  try {
    let cmd = "yq";
    if (rawOutput) cmd += " -r";
    if (outputFile) cmd += ` -o ${outputFile}`;
    if (format === "json") cmd += " -o=json";
    else if (format === "yaml") cmd += " -o=yaml";
    cmd += ` '${filter}'`;

    if (inputFile) {
      cmd += ` ${inputFile}`;
    } else if (input) {
      const content = typeof input === "string" ? input : JSON.stringify(input);
      const result = await ctx!.exec("bash", ["-c", `echo '${content.replace(/'/g, "'\\''")}' | ${cmd}`], { cwd, signal, timeout });
      return {
        content: [{ type: "text", text: result.stdout || result.stderr }],
        details: { exitCode: result.code, killed: result.killed, filter },
        isError: result.code !== 0,
      } as const;
    } else {
      return { content: [{ type: "text", text: "Must provide input or inputFile" }], details: undefined, isError: true } as const;
    }
  } catch (error: any) {
    return { content: [{ type: "text", text: `yq error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
