/**
 * Tool result streaming utilities for handling large outputs
 */

export interface StreamChunk {
  type: 'chunk' | 'complete' | 'error';
  data: string;
  index: number;
  total?: number;
}

export interface StreamingOptions {
  maxChunkSize?: number;      // Max characters per chunk (default: 4000)
  maxTotalSize?: number;       // Max total output before truncation (default: 100KB)
  emitProgress?: boolean;      // Emit progress events (default: true)
  progressInterval?: number;     // Emit progress every N items (default: 100)
}

/**
 * Stream large text content in chunks
 */
export function* streamText(
  text: string,
  options: StreamingOptions = {}
): Generator<StreamChunk, void, unknown> {
  const {
    maxChunkSize = 4000,
    maxTotalSize = 100 * 1024, // 100KB
  } = options;

  // Truncate if too large
  let content = text;
  let wasTruncated = false;
  if (content.length > maxTotalSize) {
    content = content.substring(0, maxTotalSize);
    wasTruncated = true;
  }

  const totalChunks = Math.ceil(content.length / maxChunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * maxChunkSize;
    const end = Math.min(start + maxChunkSize, content.length);
    const chunk = content.substring(start, end);

    yield {
      type: 'chunk',
      data: chunk,
      index: i,
      total: totalChunks,
    };
  }

  if (wasTruncated) {
    yield {
      type: 'chunk',
      data: `\n\n[... Output truncated: ${text.length - maxTotalSize} characters omitted]`,
      index: totalChunks,
      total: totalChunks + 1,
    };
  }

  yield {
    type: 'complete',
    data: '',
    index: -1,
    total: totalChunks,
  };
}

/**
 * Stream file list results with progress tracking
 */
export async function* streamFileList<T>(
  items: T[],
  formatFn: (item: T) => string,
  options: StreamingOptions = {}
): AsyncGenerator<StreamChunk, { count: number; truncated: boolean }, unknown> {
  const {
    maxChunkSize = 4000,
    maxTotalSize = 100 * 1024,
    emitProgress = true,
    progressInterval = 100,
  } = options;

  let output = '';
  let chunkIndex = 0;
  const totalItems = items.length;
  let truncated = false;

  for (let i = 0; i < totalItems; i++) {
    const item = items[i];
    const formatted = formatFn(item);

    // Check if adding this would exceed max total size
    if (output.length + formatted.length > maxTotalSize) {
      truncated = true;
      break;
    }

    output += formatted + '\n';

    // Emit chunk when size threshold reached
    if (output.length >= maxChunkSize) {
      yield {
        type: 'chunk',
        data: output,
        index: chunkIndex++,
      };
      output = '';
    }

    // Emit progress event
    if (emitProgress && i > 0 && i % progressInterval === 0) {
      yield {
        type: 'chunk',
        data: '', // Progress events don't add to output
        index: -1, // Special marker for progress
        total: totalItems,
      };
    }
  }

  // Emit final chunk if any remaining
  if (output.length > 0) {
    yield {
      type: 'chunk',
      data: output,
      index: chunkIndex,
    };
  }

  // Add truncation notice
  if (truncated) {
    const remaining = totalItems - items.findIndex((_, i) => {
      const prefix = items.slice(0, i).map(formatFn).join('\n') + '\n';
      return prefix.length > maxTotalSize;
    });
    yield {
      type: 'chunk',
      data: `\n[... ${remaining} items omitted - output too large]`,
      index: chunkIndex + 1,
    };
  }

  yield {
    type: 'complete',
    data: '',
    index: -1,
    total: totalItems,
  };

  return { count: totalItems, truncated };
}

/**
 * Create a progress tracking callback for long-running operations
 */
export function createProgressTracker(
  onProgress: (current: number, total: number) => void,
  total: number,
  interval: number = 100
): (current: number) => void {
  let lastReported = 0;
  return (current: number) => {
    if (current === total || current - lastReported >= interval) {
      onProgress(current, total);
      lastReported = current;
    }
  };
}

/**
 * Limit and format tool output for display
 */
export function truncateOutput(
  text: string,
  maxLines: number = 100,
  maxLineLength: number = 500
): string {
  const lines = text.split('\n');

  // Truncate long lines
  const truncatedLines = lines.map(line => {
    if (line.length > maxLineLength) {
      return line.substring(0, maxLineLength) + '...';
    }
    return line;
  });

  // Limit total lines
  if (truncatedLines.length > maxLines) {
    const kept = truncatedLines.slice(0, maxLines);
    const omitted = truncatedLines.length - maxLines;
    return kept.join('\n') + `\n[... ${omitted} lines omitted]`;
  }

  return truncatedLines.join('\n');
}

/**
 * Calculate estimated size of tool result
 */
export function estimateResultSize(result: any): number {
  try {
    const json = JSON.stringify(result);
    return json.length;
  } catch {
    return 0;
  }
}

/**
 * Determine if a result needs streaming based on size
 */
export function shouldStreamResult(result: any, threshold: number = 10000): boolean {
  return estimateResultSize(result) > threshold;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Async generator helper - collect all chunks
 */
export async function collectStream<T>(
  generator: AsyncGenerator<StreamChunk, T, unknown>
): Promise<{ chunks: string[]; result: T }> {
  const chunks: string[] = [];
  let result: T | undefined;

  for await (const chunk of generator) {
    if (chunk.type === 'chunk' && chunk.index >= 0) {
      chunks.push(chunk.data);
    }
  }

  // Get return value from generator
  const final = await generator.next();
  if (final.done && final.value) {
    result = final.value;
  }

  return { chunks, result: result! };
}
