import { Type } from "typebox";

export const rsyncSchema = Type.Object({
  source: Type.String(),
  destination: Type.String(),
  recursive: Type.Optional(Type.Boolean()),
  archive: Type.Optional(Type.Boolean()),
  compress: Type.Optional(Type.Boolean()),
  delete: Type.Optional(Type.Boolean()),
  dryRun: Type.Optional(Type.Boolean()),
  verbose: Type.Optional(Type.Boolean()),
  progress: Type.Optional(Type.Boolean()),
  port: Type.Optional(Type.Number()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeRsync(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const {
    source,
    destination,
    recursive = true,
    archive = false,
    compress = true,
    delete: del = false,
    dryRun = false,
    verbose = false,
    progress = false,
    port,
    timeout,
  } = args as {
    source: string;
    destination: string;
    recursive?: boolean;
    archive?: boolean;
    compress?: boolean;
    delete?: boolean;
    dryRun?: boolean;
    verbose?: boolean;
    progress?: boolean;
    port?: number;
    timeout?: number;
  };
  try {
    let cmd = "rsync";
    if (recursive) cmd += " -r";
    if (archive) cmd += " -a";
    if (compress) cmd += " -z";
    if (del) cmd += " --delete";
    if (dryRun) cmd += " -n";
    if (verbose) cmd += " -v";
    if (progress) cmd += " --progress";
    if (port) cmd += ` -e 'ssh -p ${port}'`;
    cmd += ` ${source} ${destination}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, source, destination, archive, compress },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `rsync error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
