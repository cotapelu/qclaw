import { defineTool, type ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { existsSync, readFileSync } from "fs";
import { extname } from "path";

/**
 * Image analysis tool using vision-capable models
 */

export const analyzeImageTool: ToolDefinition = defineTool({
  name: "analyze_image",
  label: "Analyze Image",
  description: "Analyze an image file using the agent's vision capabilities",
  parameters: Type.Object({
    path: Type.String({ description: "Path to image file" }),
    question: Type.Optional(Type.String({ description: "Specific question about the image" })),
  }) as any,
  execute: async (_, params: any) => {
    const { path: imagePath, question = "Describe this image in detail" } = params;
    
    if (!existsSync(imagePath)) {
      return {
        content: [{ type: "text" as const, text: `❌ Image not found: ${imagePath}` }],
        details: { error: "not_found", path: imagePath } as any,
      };
    }

    const ext = extname(imagePath).toLowerCase();
    const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    if (!allowedExts.includes(ext)) {
      return {
        content: [{ type: "text" as const, text: `❌ Unsupported image format: ${ext}. Supported: ${allowedExts.join(', ')}` }],
        details: { error: "unsupported_format", path: imagePath, extension: ext } as any,
      };
    }

    try {
      const imageBuffer = readFileSync(imagePath);
      const base64 = imageBuffer.toString('base64');
      const mimeType = getMimeType(ext);

      return {
        content: [{ type: "text" as const, text: `📷 Image: ${imagePath}\n📊 ${formatBytes(imageBuffer.length)}\n🔍 Ready for vision analysis.` }],
        details: { path: imagePath, size: imageBuffer.length, format: ext.slice(1), hasBase64: true, question } as any,
      };
    } catch (error: any) {
      return {
        content: [{ type: "text" as const, text: `❌ Failed: ${error.message}` }],
        details: { error: error.message, path: imagePath } as any,
      };
    }
  },
});

/**
 * Screenshot tool - capture current screen (if supported)
 */
export const screenshotTool: ToolDefinition = defineTool({
  name: "screenshot",
  label: "Screenshot",
  description: "Take a screenshot of the current screen (macOS only currently)",
  parameters: Type.Object({}) as any,
  execute: async () => {
    try {
      if (process.platform !== 'darwin') {
        return {
          content: [{ type: "text" as const, text: "❌ Screenshot not supported on this platform (macOS only)" }],
          details: { error: "unsupported_platform", platform: process.platform } as any,
        };
      }

      const { spawn } = await import('child_process');
      const path = `/tmp/screenshot-${Date.now()}.png`;
      
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('screencapture', ['-x', path]);
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`screencapture exited with code ${code}`));
        });
      });

      if (!existsSync(path)) {
        return {
          content: [{ type: "text" as const, text: `❌ Screenshot failed` }],
          details: { error: "no_file" } as any,
        };
      }

      return {
        content: [{ type: "text" as const, text: `📸 Screenshot: ${path}` }],
        details: { path, exists: true } as any,
      };
    } catch (error: any) {
      return {
        content: [{ type: "text" as const, text: `❌ Failed: ${error.message}` }],
        details: { error: error.message } as any,
      };
    }
  },
});

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

/**
 * All image-related tools
 */
export function getImageTools(): ToolDefinition[] {
  return [
    analyzeImageTool,
    screenshotTool,
  ];
}
