import { Type } from "typebox";

export const backupSchema = Type.Object({
  source: Type.Union([Type.String(), Type.Array(Type.String())]),
  destination: Type.String(),
  compress: Type.Optional(Type.String()),
  timestamp: Type.Optional(Type.Boolean()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeBackup(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const {
    source,
    destination,
    compress = "gz",
    timestamp = true,
    timeout,
  } = args as {
    source: string | string[];
    destination: string;
    compress?: "gz" | "bz2" | "xz" | "none";
    timestamp?: boolean;
    timeout?: number;
  };
  try {
    const sources = Array.isArray(source) ? source : [source];
    const timestampStr = timestamp ? `_$(date +%Y%m%d_%H%M%S)` : "";
    const extMap: Record<string, string> = { gz: ".tar.gz", bz2: ".tar.bz2", xz: ".tar.xz", none: ".tar" };
    const archiveExt = extMap[compress] || ".tar.gz";
    let tarFlags = "-c";
    if (compress === "gz") tarFlags += "z";
    else if (compress === "bz2") tarFlags += "j";
    else if (compress === "xz") tarFlags += "J";
    const destPath = destination.endsWith("/") ? destination : `${destination}/`;
    const archiveName = `backup${timestampStr}${archiveExt}`;
    const fullDest = `${destPath}${archiveName}`;
    const sourcePaths = sources.join(" ");
    const cmd = `tar -${tarFlags}f '${fullDest}' ${sourcePaths}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, sources: sources.length, destination: fullDest, compress },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `backup error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
