import { Type } from "typebox";

export const kafkaConsoleSchema = Type.Object({
  command: Type.String({ description: "kafka-console-producer/consumer command (e.g., 'producer --broker-list localhost:9092 --topic mytopic', 'consumer --bootstrap-server localhost:9092 --topic mytopic')" }),
  cwd: Type.Optional(Type.String()),
  timeout: Type.Optional(Type.Number()),
});

export async function executeKafkaConsole(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { command, timeout } = args as { command: string; timeout?: number };
  try {
    const cmd = `kafka-console-${command}`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `kafka-console error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}