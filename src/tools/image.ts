/**
 * Image tool for reading and encoding images
 */

import { defineTool, type ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { readFileSync, existsSync, statSync } from "fs";
import { extname, resolve } from "path";

const SUPPORTED_FORMATS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Read image and return base64 encoded content
 */
function readImageAsBase64(imagePath: string): {
  data: string;
  mimeType: string;
  size: number;
} {
  if (!existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }

  const stats = statSync(imagePath);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(
      `Image too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max: ${
        MAX_FILE_SIZE / 1024 / 1024
      }MB)`
    );
  }

  const ext = extname(imagePath).toLowerCase();
  if (!SUPPORTED_FORMATS.has(ext)) {
    throw new Error(
      `Unsupported image format: ${ext}. Supported: ${Array.from(
        SUPPORTED_FORMATS
      ).join(", ")}`
    );
  }

  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
  };

  const data = readFileSync(imagePath);
  const base64 = data.toString("base64");

  return {
    data: base64,
    mimeType: mimeTypes[ext] || "image/png",
    size: stats.size,
  };
}

export const readImageTool: ToolDefinition = defineTool({
  name: "read_image",
  label: "Read Image",
  description:
    "Read an image file and encode it for vision analysis. Supports PNG, JPG, GIF, WebP, BMP, SVG. Max 20MB.",
  parameters: Type.Object({
    path: Type.String({ description: "Path to image file" }),
    max_size: Type.Optional(
      Type.Number({
        description: "Maximum dimension to resize to (optional, e.g., 1024)",
      })
    ),
  }) as any,
  execute: async (_, params: any) => {
    try {
      const { path: imagePath, max_size } = params;
      const resolvedPath = resolve(process.cwd(), imagePath);

      const image = readImageAsBase64(resolvedPath);

      // Build data URL
      const dataUrl = `data:${image.mimeType};base64,${image.data}`;

      return {
        content: [
          {
            type: "image" as const,
            source: {
              type: "base64",
              media_type: image.mimeType,
              data: image.data,
            },
          } as any,
        ],
        details: {
          path: resolvedPath,
          size: image.size,
          mimeType: image.mimeType,
          dimensions: `${max_size || "original"}`,
        },
      };
    } catch (error: any) {
      return {
        content: [
          { type: "text" as const, text: `❌ Error reading image: ${error.message}` },
        ],
        details: { error: error.message, path: "", size: 0, mimeType: "", dimensions: "" },
        isError: true,
      };
    }
  },
});

export const analyzeImageTool: ToolDefinition = defineTool({
  name: "analyze_image",
  label: "Analyze Image",
  description: "Read and analyze an image using vision models",
  parameters: Type.Object({
    path: Type.String({ description: "Path to image file" }),
    question: Type.Optional(
      Type.String({
        description: "Specific question to ask about the image",
      })
    ),
  }) as any,
  execute: async (ctx: any, params: any) => {
    try {
      const { path: imagePath, question = "Describe this image" } = params;
      const resolvedPath = resolve(process.cwd(), imagePath);

      const image = readImageAsBase64(resolvedPath);
      const dataUrl = `data:${image.mimeType};base64,${image.data}`;

      // Return in format that supports LLM vision
      return {
        content: [
          { type: "text" as const, text: question },
          {
            type: "image" as const,
            source: {
              type: "base64",
              media_type: image.mimeType,
              data: image.data,
            },
          } as any,
        ],
        details: {
          path: resolvedPath,
          size: image.size,
          mimeType: image.mimeType,
          question: question || "",
        },
      };
    } catch (error: any) {
      return {
        content: [
          { type: "text" as const, text: `❌ Error: ${error.message}` },
        ],
        details: { error: error.message, path: "", size: 0, mimeType: "", question: "" },
        isError: true,
      };
    }
  },
});

export function getImageTools(): ToolDefinition[] {
  return [readImageTool, analyzeImageTool];
}
