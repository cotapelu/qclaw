import { Type } from "typebox";

export const terraformSchema = Type.Object({
  command: Type.String({ description: "Terraform command: init, plan, apply, destroy, fmt" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
  varFile: Type.Optional(Type.String()),
  varArgs: Type.Optional(Type.Array(Type.String())),
});

export async function executeTerraform(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, cwd: targetCwd, timeout, varFile, varArgs = [] } = args as {
    command: string;
    cwd?: string;
    timeout?: number;
    varFile?: string;
    varArgs?: string[];
  };
  try {
    let cmd = `terraform ${command}`;
    if (varFile) cmd += ` -var-file ${varFile}`;
    if (varArgs.length > 0) cmd += ` ${varArgs.map((v) => `-var '${v}'`).join(" ")}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd: targetCwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, cwd: targetCwd },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `Terraform error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
