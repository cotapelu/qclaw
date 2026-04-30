import { Type } from "typebox";

export const ffmpegSchema = Type.Object({
  inputFile: Type.String(),
  outputFile: Type.String(),
  format: Type.Optional(Type.String()),
  codec: Type.Optional(Type.String()),
  bitrate: Type.Optional(Type.String()),
  resolution: Type.Optional(Type.String()),
  framerate: Type.Optional(Type.Number()),
  startTime: Type.Optional(Type.String()),
  duration: Type.Optional(Type.String()),
  extraArgs: Type.Optional(Type.Array(Type.String())),
  timeout: Type.Optional(Type.Number()),
});

export async function executeFfmpeg(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const {
    inputFile,
    outputFile,
    format,
    codec,
    bitrate,
    resolution,
    framerate,
    startTime,
    duration,
    extraArgs = [],
    timeout = 300,
  } = args as {
    inputFile: string;
    outputFile: string;
    format?: string;
    codec?: string;
    bitrate?: string;
    resolution?: string;
    framerate?: number;
    startTime?: string;
    duration?: string;
    extraArgs?: string[];
    timeout?: number;
  };
  try {
    let cmd = "ffmpeg";
    cmd += ` -i '${inputFile}'`;
    if (startTime) cmd += ` -ss ${startTime}`;
    if (duration) cmd += ` -t ${duration}`;
    if (codec) cmd += ` -c:v ${codec}`;
    if (codec && format === "mp3") cmd += ` -c:a mp3`;
    if (resolution) cmd += ` -s ${resolution}`;
    if (framerate) cmd += ` -r ${framerate}`;
    if (bitrate) cmd += ` -b:v ${bitrate}`;
    if (format) cmd += ` -f ${format}`;
    if (extraArgs.length > 0) cmd += ` ${extraArgs.join(" ")}`;
    cmd += ` '${outputFile}'`;
    const result = await ctx!.exec("bash", ["-c", cmd], { cwd, signal, timeout });
    return {
      content: [{ type: "text", text: result.stdout || result.stderr }],
      details: { exitCode: result.code, killed: result.killed, inputFile, outputFile, format, codec },
      isError: result.code !== 0,
    } as const;
  } catch (error: any) {
    return { content: [{ type: "text", text: `ffmpeg error: ${error.message}` }], details: undefined, isError: true } as const;
  }
}
