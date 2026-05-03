import { Type } from "typebox";

export const mongodbSchema = Type.Object({
  command: Type.String({ description: "mongo/mongosh command (e.g., '', '--eval \"db.users.find()\"', 'mongodb://localhost:27017/mydb')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeMongodb(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    // Try mongosh first, fall back to mongo
    const cmd = command ? `mongosh ${command}` : `mongosh`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `mongodb error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}