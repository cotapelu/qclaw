import { Type } from "typebox";

export const goSchema = Type.Object({
  command: Type.String({ description: "go/godoc command (e.g., 'go build', 'go run main.go', 'go test', 'go get github.com/pkg/mod', 'godoc -http=:8080')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeGo(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    let cmd: string;
    if (command.startsWith("go ") || command.startsWith("go,")) {
      cmd = command;
    } else if (command.startsWith("godoc ")) {
      cmd = command;
    } else {
      // Default to go
      cmd = `go ${command}`;
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `go error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}