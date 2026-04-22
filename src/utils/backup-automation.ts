/**
 * Automated backup scheduling
 */

import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import { join } from "path";
import { createBackup, listBackups } from "./backup.js";

export type BackupInterval = "daily" | "weekly";

export interface BackupSchedule {
  enabled: boolean;
  interval: BackupInterval;
  maxBackups: number;
  lastBackup?: Date;
}

export class BackupAutomation {
  private timer?: ReturnType<typeof setInterval>;
  private agentDir: string;
  private schedule: BackupSchedule;

  constructor(agentDir: string, schedule: BackupSchedule) {
    this.agentDir = agentDir;
    this.schedule = schedule;

    if (schedule.enabled) {
      this.start();
    }
  }

  /**
   * Start automated backups
   */
  start(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }

    const intervalMs =
      this.schedule.interval === "daily"
        ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;

    this.timer = setInterval(async () => {
      await this.runBackup();
    }, intervalMs);

    // Run immediately if never backed up
    if (!this.schedule.lastBackup) {
      this.runBackup().catch(() => {
        // Ignore initial backup errors
      });
    }
  }

  /**
   * Stop automated backups
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Update schedule configuration
   */
  updateSchedule(schedule: Partial<BackupSchedule>): void {
    this.schedule = { ...this.schedule, ...schedule };

    if (this.schedule.enabled && !this.timer) {
      this.start();
    } else if (!this.schedule.enabled && this.timer) {
      this.stop();
    }
  }

  /**
   * Get current schedule
   */
  getSchedule(): BackupSchedule {
    return { ...this.schedule };
  }

  /**
   * Run a single backup
   */
  private async runBackup(): Promise<void> {
    try {
      const backupDir = join(this.agentDir, ".backups");
      if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().split("T")[0];
      const outputPath = join(
        backupDir,
        `auto-${this.schedule.interval}-${timestamp}.tar.gz`
      );

      await createBackup(this.agentDir, outputPath, {
        includeSessions: true,
        includeLogs: false,
        includeExtensions: true,
      });

      this.schedule.lastBackup = new Date();

      // Cleanup old backups
      await this.cleanupOldBackups();
    } catch {
      // Ignore backup errors in automation
    }
  }

  /**
   * Remove old backups keeping only maxBackups
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backupDir = join(this.agentDir, ".backups");
      const backups = listBackups(backupDir).filter((b) =>
        b.name.startsWith(`auto-${this.schedule.interval}`)
      );

      while (backups.length > this.schedule.maxBackups) {
        const toDelete = backups.pop();
        if (toDelete) {
          try {
            unlinkSync(toDelete.path);
          } catch {
            // Ignore cleanup errors
          }
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Get backup statistics
   */
  getStats(): {
    enabled: boolean;
    interval: BackupInterval;
    maxBackups: number;
    lastBackup?: string;
    autoBackupsCount: number;
  } {
    const backupDir = join(this.agentDir, ".backups");
    let autoCount = 0;

    try {
      autoCount = listBackups(backupDir).filter((b) =>
        b.name.startsWith("auto-")
      ).length;
    } catch {
      // Ignore
    }

    return {
      enabled: this.schedule.enabled,
      interval: this.schedule.interval,
      maxBackups: this.schedule.maxBackups,
      lastBackup: this.schedule.lastBackup?.toISOString(),
      autoBackupsCount: autoCount,
    };
  }
}

export function loadBackupSchedule(agentDir: string): BackupSchedule {
  try {
    const { readFileSync } = require("fs");
    const schedulePath = join(agentDir, "backup-schedule.json");

    if (existsSync(schedulePath)) {
      const data = JSON.parse(readFileSync(schedulePath, "utf-8"));
      return {
        enabled: data.enabled ?? false,
        interval: data.interval ?? "daily",
        maxBackups: data.maxBackups ?? 7,
        lastBackup: data.lastBackup ? new Date(data.lastBackup) : undefined,
      };
    }
  } catch {
    // Return defaults
  }

  return {
    enabled: false,
    interval: "daily",
    maxBackups: 7,
  };
}

export function saveBackupSchedule(
  agentDir: string,
  schedule: BackupSchedule
): void {
  try {
    const { writeFileSync } = require("fs");
    const schedulePath = join(agentDir, "backup-schedule.json");

    writeFileSync(
      schedulePath,
      JSON.stringify(
        {
          enabled: schedule.enabled,
          interval: schedule.interval,
          maxBackups: schedule.maxBackups,
          lastBackup: schedule.lastBackup?.toISOString(),
        },
        null,
        2
      )
    );
  } catch {
    // Ignore save errors
  }
}
