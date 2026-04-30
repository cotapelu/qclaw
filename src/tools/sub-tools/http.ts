import { Type } from "typebox";

export const httpSchema = Type.Object({
  method: Type.Optional(Type.String({ description: "GET, POST, PUT, DELETE, PATCH (default: GET)" })),
  url: Type.String({ description: "URL to request" }),
  headers: Type.Optional(Type.Record(Type.String(), Type.String())),
  body: Type.Optional(Type.Any({ description: "Request body (will be JSON stringified if object)" })),
  timeout: Type.Optional(Type.Number({ description: "Timeout in seconds (default: 30)" })),
  insecure: Type.Optional(Type.Boolean()),
  user: Type.Optional(Type.String()),
  verbose: Type.Optional(Type.Boolean()),
});

export async function executeHttp(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const {
    method = "GET",
    url,
    headers = {},
    body,
    timeout = 30,
    insecure = false,
    user,
    verbose = false,
  } = args as {
    method?: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    insecure?: boolean;
    user?: string;
    verbose?: boolean;
  };

  try {
    const curlArgs: string[] = [];

    if (method !== "GET") curlArgs.push(`-X ${method}`);

    for (const [key, value] of Object.entries(headers)) {
      curlArgs.push(`-H '${key}: ${value}'`);
    }

    if (body && ["POST", "PUT", "PATCH"].includes(method)) {
      const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
      const tempFile = `/tmp/curl-data-${Date.now()}.json`;
      const fs = await import("node:fs/promises");
      await fs.writeFile(tempFile, bodyStr, "utf-8");
      curlArgs.push(`--data @${tempFile}`);
    }

    curlArgs.push(`--max-time ${timeout}`);

    if (insecure) curlArgs.push("-k");
    if (user) curlArgs.push(`-u ${user}`);
    if (verbose) curlArgs.push("-v");

    curlArgs.push(`'${url}'`);

    const cmd = `curl ${curlArgs.join(" ")}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal });

    // Cleanup temp file if created
    if (body && ["POST", "PUT", "PATCH"].includes(method)) {
      try {
        const tempFileMatch = result.stdout.match(/--data @(\S+)/);
        if (tempFileMatch) {
          await import("node:fs/promises").then((fs) => fs.unlink(tempFileMatch[1]).catch(() => {}));
        }
      } catch {}
    }

    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, url, method },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `HTTP error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
