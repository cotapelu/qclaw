/**
 * Backup and restore utilities for agent data
 */

import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "fs";
import { join, resolve } from "path";
import { createGzip, createGunzip } from "zlib";
import { pipeline } from "stream/promises";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

export interface BackupResult {
  success: boolean;
  filePath: string;
  size: number;
  duration: number;
  filesIncluded: number;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  extractedTo: string;
  duration: number;
  filesRestored: number;
  error?: string;
}

interface BackupData {
  version: string;
  createdAt: string;
  sourceDir: string;
  files: { [path: string]: string };
}

/**
 * Create a backup of the agent directory
 */
export async function createBackup(
  agentDir: string,
  outputPath?: string,
  options?: {
    includeSessions?: boolean;
    includeLogs?: boolean;
    includeExtensions?: boolean;
  password?: string;
  },
): Promise<BackupResult> {
  const startTime = Date.now();

  try {
    if (!existsSync(agentDir)) {
      throw new Error(`Agent directory does not exist: ${agentDir}`);
    }

    if (!outputPath) {
      const timestamp = new Date().toISOString().split("T")[0];
      outputPath = join(process.cwd(), `backup-${timestamp}.tar.gz`);
    }

    const targetDir = outputPath.substring(
      0,
      outputPath.lastIndexOf("/") || outputPath.lastIndexOf("\\"),
    );
    if (targetDir && !existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    const files = getFilesToBackup(agentDir, options);
    const archive = new TarGzArchiver();
    await archive.create(agentDir, outputPath, files, (options as any)?.password);

    const duration = Date.now() - startTime;
    const size = statSync(outputPath).size;

    return {
      success: true,
      filePath: outputPath,
      size,
      duration,
      filesIncluded: files.length,
    };
  } catch (error: any) {
    return {
      success: false,
      filePath: outputPath || "",
      size: 0,
      duration: Date.now() - startTime,
      filesIncluded: 0,
      error: error.message,
    };
  }
}

/**
 * Restore from backup
 */
export async function restoreBackup(
  backupPath: string,
  targetDir: string,
): Promise<RestoreResult> {
  const startTime = Date.now();

  try {
    if (!existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    const archive = new TarGzArchiver();
    const filesRestored = await archive.extract(backupPath, targetDir);

    return {
      success: true,
      extractedTo: targetDir,
      duration: Date.now() - startTime,
      filesRestored,
    };
  } catch (error: any) {
    return {
      success: false,
      extractedTo: targetDir,
      duration: Date.now() - startTime,
      filesRestored: 0,
      error: error.message,
    };
  }
}

function getFilesToBackup(
  agentDir: string,
  options?: {
    includeSessions?: boolean;
    includeLogs?: boolean;
    includeExtensions?: boolean;
  password?: string;
  },
): string[] {
  const files: string[] = [];

  const walk = (dir: string, prefix: string = "") => {
    try {
      const items = readdirSync(dir);
      for (const item of items) {
        const fullPath = join(dir, item);
        const relativePath = prefix ? join(prefix, item) : item;
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          if (item === ".backups") continue;
          if (item === "logs" && options?.includeLogs === false) continue;
          if (item === "sessions" && options?.includeSessions === false)
            continue;
          walk(fullPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    } catch {
      // Skip inaccessible
    }
  };

  walk(agentDir);
  return files;
}

/**
 * Encrypt data with AES-256-GCM
 */
function encryptData(
  data: string,
  password: string,
): { encrypted: string; iv: string; authTag: string; salt: string } {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 32);
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(data, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    salt: salt.toString("base64"),
  };
}

/**
 * Decrypt data with AES-256-GCM
 */
function decryptData(
  encryptedData: {
    encrypted: string;
    iv: string;
    authTag: string;
    salt: string;
  },
  password: string,
): string {
  const salt = Buffer.from(encryptedData.salt, "base64");
  const key = scryptSync(password, salt, 32);
  const iv = Buffer.from(encryptedData.iv, "base64");
  const authTag = Buffer.from(encryptedData.authTag, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData.encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

class TarGzArchiver {
  async create(
    sourceDir: string,
    outputPath: string,
    files: string[],
    password?: string,
  ): Promise<void> {
    const backup: any = {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      sourceDir,
      files: {},
      encrypted: !!password,
    };

    for (const file of files) {
      try {
        const fullPath = join(sourceDir, file);
        const content = createReadStream(fullPath);
        const chunks: Buffer[] = [];
        content.on("data", (chunk: any) => chunks.push(chunk as Buffer));
        await new Promise<void>((resolve, reject) => {
          content.on("end", resolve);
          content.on("error", reject);
        });
        backup.files[file] = Buffer.concat(chunks).toString("base64");
      } catch {
        // Skip unreadable files
      }
    }

    let dataToCompress = JSON.stringify(backup);

    // Encrypt if password provided
    if (password) {
      const encrypted = encryptData(dataToCompress, password);
      // Store encrypted structure with metadata
      dataToCompress = JSON.stringify({
        version: "1.0.0-encrypted",
        createdAt: new Date().toISOString(),
        encrypted: true,
        files: encrypted.encrypted, // encrypted data
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        salt: encrypted.salt,
      });
    }

    const gzip = createGzip();
    const writeStream = createWriteStream(outputPath);

    await pipeline(
      (async function* () {
        yield Buffer.from(dataToCompress, "utf-8");
      })(),
      gzip,
      writeStream,
    );
  }

  async extract(
    backupPath: string,
    targetDir: string,
    password?: string,
  ): Promise<number> {
    const gunzip = createGunzip();
    const readStream = createReadStream(backupPath);
    const chunks: Buffer[] = [];

    gunzip.on("data", (chunk) => chunks.push(chunk));
    await pipeline(readStream, gunzip);

    let jsonData = Buffer.concat(chunks).toString("utf-8");

    // Try to parse and check if encrypted
    let parsed = JSON.parse(jsonData);

    // Decrypt if encrypted and password provided
    if (parsed.encrypted === true && parsed.version?.includes("encrypted")) {
      if (!password) {
        throw new Error("Backup is encrypted but no password provided");
      }
      // Parse encrypted structure and decrypt
      const encryptedData = {
        encrypted: parsed.files as string,
        iv: parsed.iv as string,
        authTag: parsed.authTag as string,
        salt: parsed.salt as string,
      };
      jsonData = decryptData(encryptedData, password);
      parsed = JSON.parse(jsonData);
    }

    const backup: BackupData = parsed;

    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    let count = 0;
    for (const [filePath, base64Content] of Object.entries(backup.files)) {
      try {
        const fullPath = join(targetDir, filePath);
        const dirIndex = fullPath.lastIndexOf("/");
        const winDirIndex = fullPath.lastIndexOf("\\");
        const dir = fullPath.substring(0, Math.max(dirIndex, winDirIndex));

        if (dir && !existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        const content = Buffer.from(base64Content as string, "base64");
        await pipeline(
          (async function* () {
            yield content;
          })(),
          createWriteStream(fullPath),
        );
        count++;
      } catch {
        // Skip unwritable files
      }
    }

    return count;
  }
}

/**
 * List available backups in a directory
 */
export function listBackups(
  backupDir: string,
): Array<{ name: string; path: string; size: number; date: Date }> {
  if (!existsSync(backupDir)) {
    return [];
  }

  return readdirSync(backupDir)
    .filter((f) => f.endsWith(".tar.gz"))
    .map((f) => {
      const fullPath = join(backupDir, f);
      const stat = statSync(fullPath);
      return {
        name: f,
        path: fullPath,
        size: stat.size,
        date: stat.mtime,
      };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
