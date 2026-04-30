import { Type } from "typebox";

export const awsSchema = Type.Object({
  command: Type.String({ description: "AWS CLI command (e.g., 's3 ls', 'ec2 describe-instances')" }),
  profile: Type.Optional(Type.String()),
  region: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeAws(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, profile, region, timeout } = args as {
    command: string;
    profile?: string;
    region?: string;
    timeout?: number;
  };
  try {
    let cmd = `aws ${command}`;
    if (profile) cmd = `aws --profile ${profile} ${command}`;
    if (region) cmd += ` --region ${region}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, profile, region },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `AWS error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
