import { defineTool, type ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { extname } from "path";
import { validatePath, validateFileSize } from "./sandbox.js";

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
  execute: async (ctx: any, params: any) => {
    const { path: imagePath, question = "Describe this image in detail" } = params;
    
    try {
      // Validate path to prevent traversal
      const validatedPath = validatePath(imagePath, process.cwd(), ctx?.settings);
      const fs = await import('fs');
      
      // Check file exists and get stats
      const stats = fs.statSync(validatedPath);
      if (!stats.isFile()) {
        return {
          content: [{ type: "text" as const, text: `❌ Not a file: ${imagePath}` }],
          details: { error: "not_a_file", path: imagePath } as any,
        };
      }
      
      // Validate file size (max 50MB for images)
      try {
        validateFileSize(stats.size, ctx?.settings?.toolPermissions?.maxFileSize || 50 * 1024 * 1024);
      } catch (error: any) {
        return {
          content: [{ type: "text" as const, text: `❌ ${error.message}` }],
          details: { error: error.message, path: imagePath } as any,
        };
      }

      const ext = extname(validatedPath).toLowerCase();
      const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
      if (!allowedExts.includes(ext)) {
        return {
          content: [{ type: "text" as const, text: `❌ Unsupported image format: ${ext}. Supported: ${allowedExts.join(', ')}` }],
          details: { error: "unsupported_format", path: imagePath, extension: ext } as any,
        };
      }

      const imageBuffer = fs.readFileSync(validatedPath);
      const base64 = imageBuffer.toString('base64');
      const mimeType = getMimeType(ext);

      return {
        content: [{ type: "text" as const, text: `📷 Image: ${imagePath}\n📊 ${formatBytes(imageBuffer.length)}\n🔍 Ready for vision analysis.` }],
        details: { path: imagePath, size: imageBuffer.length, format: ext.slice(1), hasBase64: true, question } as any,
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return {
          content: [{ type: "text" as const, text: `❌ Image not found: ${imagePath}` }],
          details: { error: "not_found", path: imagePath } as any,
        };
      }
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
  execute: async (ctx: any, params: any) => {
    try {
      if (process.platform !== 'darwin') {
        return {
          content: [{ type: "text" as const, text: "❌ Screenshot not supported on this platform (macOS only)" }],
          details: { error: "unsupported_platform", platform: process.platform } as any,
        };
      }

      const { spawn } = await import('child_process');
      const timestamp = Date.now();
      const path = `/tmp/screenshot-${timestamp}.png`;
      const timeoutMs = ctx?.settings?.toolPermissions?.timeoutMs || 30000; // 30s default
      
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('screencapture', ['-x', path]);
        
        const timeout = setTimeout(() => {
          proc.kill('SIGKILL');
          reject(new Error('Screenshot timeout after ' + timeoutMs + 'ms'));
        }, timeoutMs);
        
        proc.on('close', (code) => {
          clearTimeout(timeout);
          if (code === 0) resolve();
          else reject(new Error(`screencapture exited with code ${code}`));
        });
        
        proc.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      const fs = await import('fs');
      if (!fs.existsSync(path)) {
        return {
          content: [{ type: "text" as const, text: `❌ Screenshot failed - no file created` }],
          details: { error: "no_file", path } as any,
        };
      }

      // Check file size
      const stats = fs.statSync(path);
      const sizeMB = stats.size / (1024 * 1024);
      if (sizeMB > 50) {
        // Clean up large file
        fs.unlinkSync(path);
        return {
          content: [{ type: "text" as const, text: `❌ Screenshot too large: ${sizeMB.toFixed(1)}MB (max 50MB)` }],
          details: { error: "file_too_large", size: stats.size } as any,
        };
      }

      return {
        content: [{ type: "text" as const, text: `📸 Screenshot: ${path} (${(sizeMB).toFixed(1)}MB)` }],
        details: { path, size: stats.size, format: 'png' } as any,
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
