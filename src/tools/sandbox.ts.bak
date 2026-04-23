import { resolve, join, normalize, relative, isAbsolute } from 'path';

export interface SandboxConfig {
  allowedPaths?: string[];
  deniedPaths?: string[];
  maxFileSize?: number;
  maxTotalOutput?: number;
  allowedCommands?: string[];
  deniedCommands?: string[];
  timeoutMs?: number;
  allowNetwork?: boolean;
}

const DEFAULT_CONFIG: SandboxConfig = {
  allowedPaths: [],
  deniedPaths: [
    '/etc/passwd',
    '/etc/shadow',
    '/etc/hosts',
    '/proc',
    '/sys',
    '/dev',
    process.env.HOME ? join(process.env.HOME, '.ssh') : '/.ssh',
    process.env.HOME ? join(process.env.HOME, '.gnupg') : '/.gnupg',
  ],
  maxFileSize: 10 * 1024 * 1024,
  maxTotalOutput: 100 * 1024,
  allowedCommands: ['cat', 'ls', 'pwd', 'echo', 'grep', 'find', 'head', 'tail', 'wc', 'sort', 'uniq'],
  deniedCommands: ['rm', 'mv', 'cp', 'dd', 'mkfs', 'shred', 'chmod', 'chown'],
  timeoutMs: 30000,
  allowNetwork: false,
};

export class SecurityError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export function validatePath(
  inputPath: string,
  workingDir: string = process.cwd(),
  config: SandboxConfig = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  let resolvedPath: string;
  if (isAbsolute(inputPath)) {
    resolvedPath = normalize(inputPath);
  } else {
    resolvedPath = resolve(workingDir, inputPath);
  }
  
  const relativeToCwd = relative(workingDir, resolvedPath);
  if (relativeToCwd.startsWith('..') || relativeToCwd.includes('../')) {
    throw new SecurityError(
      `Path traversal detected: ${inputPath}`,
      'PATH_TRAVERSAL'
    );
  }
  
  if (cfg.deniedPaths) {
    for (const denied of cfg.deniedPaths) {
      const normalizedDenied = normalize(denied);
      if (resolvedPath === normalizedDenied || 
          resolvedPath.startsWith(normalizedDenied + '/')) {
        throw new SecurityError(
          `Access denied. Resolution: ${inputPath} in protected area`,
          'ACCESS_DENIED'
        );
      }
    }
  }
  
  if (cfg.allowedPaths && cfg.allowedPaths.length > 0) {
    const allowed = cfg.allowedPaths.some(allowedPath => {
      const normalizedAllowed = normalize(allowedPath);
      return resolvedPath === normalizedAllowed ||
             resolvedPath.startsWith(normalizedAllowed + '/') ||
             resolvedPath.startsWith(normalizedAllowed + '\\');
    });
    if (!allowed) {
      throw new SecurityError(
        `Path not in whitelist: ${inputPath}`,
        'NOT_IN_WHITELIST'
      );
    }
  }
  
  return resolvedPath;
}

export function validateFileSize(size: number, maxSize?: number): void {
  const limit = maxSize ?? DEFAULT_CONFIG.maxFileSize ?? 10 * 1024 * 1024;
  if (size > limit) {
    throw new SecurityError(
      `File too large: ${size} bytes (max: ${limit} bytes)`,
      'FILE_TOO_LARGE'
    );
  }
}

export function validateCommand(
  command: string,
  config: SandboxConfig = {}
): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const baseCmd = command.trim().split(/\s+/)[0].toLowerCase();
  
  if (cfg.deniedCommands) {
    for (const denied of cfg.deniedCommands) {
      if (baseCmd === denied.toLowerCase()) {
        throw new SecurityError(
          `Command denied: ${baseCmd}`,
          'COMMAND_DENIED'
        );
      }
    }
  }
  
  if (cfg.allowedCommands && cfg.allowedCommands.length > 0) {
    const allowed = cfg.allowedCommands.some(cmd => baseCmd === cmd.toLowerCase());
    if (!allowed) {
      throw new SecurityError(
        `Command not in whitelist: ${baseCmd}`,
        'COMMAND_NOT_ALLOWED'
      );
    }
  }
  
  if (cfg.allowNetwork === false) {
    const networkCmds = ['curl', 'wget', 'nc', 'netcat', 'telnet', 'ssh', 'scp', 'rsync'];
    if (networkCmds.includes(baseCmd)) {
      throw new SecurityError(
        `Network commands disabled: ${baseCmd}`,
        'NETWORK_DISABLED'
      );
    }
  }
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\0/g, '')
    .replace(/\/+/g, '_')
    .replace(/\\+/g, '_')
    .replace(/^\.+/, '_')
    .replace(/\.+$/, '_')
    .replace(/[<>:"|?*]/g, '_');
}

export function checkOutputSize(content: string, maxSize?: number): string {
  const limit = maxSize ?? DEFAULT_CONFIG.maxTotalOutput ?? 100 * 1024;
  const bytes = Buffer.byteLength(content, 'utf8');
  
  if (bytes > limit) {
    const truncated = content.substring(0, Math.floor(limit * 0.9));
    return truncated + `\n\n[... Output truncated: ${bytes - limit} bytes over limit]`;
  }
  
  return content;
}

export async function sandboxedReadFile(
  filepath: string,
  workingDir: string = process.cwd(),
  config: SandboxConfig = {}
): Promise<string> {
  const fs = await import('fs');
  const validatedPath = validatePath(filepath, workingDir, config);
  
  const stats = fs.statSync(validatedPath);
  if (!stats.isFile()) {
    throw new SecurityError(`Not a file: ${filepath}`, 'NOT_A_FILE');
  }
  
  validateFileSize(stats.size, config.maxFileSize);
  
  const content = fs.readFileSync(validatedPath, 'utf8');
  return checkOutputSize(content, config.maxTotalOutput);
}

export async function sandboxedWriteFile(
  filepath: string,
  content: string,
  workingDir: string = process.cwd(),
  config: SandboxConfig = {}
): Promise<void> {
  const fs = await import('fs');
  const validatedPath = validatePath(filepath, workingDir, config);
  
  const bytes = Buffer.byteLength(content, 'utf8');
  validateFileSize(bytes, config.maxFileSize);
  
  const dir = require('path').dirname(validatedPath);
  const base = require('path').basename(validatedPath);
  const sanitized = sanitizeFilename(base);
  const safePath = join(dir, sanitized);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(safePath, content, 'utf8');
}

export function createSandboxFromSettings(settings: any): SandboxConfig {
  const perms = settings?.toolPermissions || {};
  return {
    allowedPaths: perms.allowedPaths,
    deniedPaths: perms.deniedPaths,
    maxFileSize: perms.maxFileSize,
    maxTotalOutput: perms.maxTotalOutput,
    allowedCommands: perms.allowedCommands,
    deniedCommands: perms.deniedCommands,
    timeoutMs: perms.timeoutMs,
    allowNetwork: perms.allowNetwork,
  };
}
