import { Type } from "typebox";

export const nftSchema = Type.Object({
  command: Type.String({ description: "nft command (e.g., 'list ruleset', 'add table ip filter', 'add rule ip filter input tcp dport 22 accept')" }),
  timeout: Type.Optional(Type.Number()),
});

export async function executeNft(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    const cmd = `nft ${command}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `nft error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}