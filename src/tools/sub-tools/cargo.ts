import { Type } from "typebox";

export const cargoSchema = Type.Object({
  command: Type.String({ description: "cargo/rustup command (e.g., 'cargo build', 'cargo run', 'cargo test', 'rustup update', 'rustup show')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeCargo(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    let cmd: string;
    if (command.startsWith("cargo ") || command.startsWith("cargo,")) {
      cmd = command;
    } else if (command.startsWith("rustup ")) {
      cmd = command;
    } else {
      // Default to cargo
      cmd = `cargo ${command}`;
    }
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `cargo error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}