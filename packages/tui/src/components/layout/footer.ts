import { Text, Container } from "@mariozechner/pi-tui";
import type { Component } from "@mariozechner/pi-tui";
import { ThemeManager } from "../../theme/theme-manager.js";

/**
 * Footer data structure
 */
export interface FooterData {
  /** Current working directory (will be truncated) */
  cwd: string;
  /** Git branch name if in a repo */
  gitBranch?: string;
  /** Model name being used */
  model?: string;
  /** Token usage percentage (0-100) */
  tokenUsage?: number;
  /** Current thinking level */
  thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  /** Whether images are shown */
  showImages?: boolean;
  /** Session ID */
  sessionId?: string;
  /** Additional status indicators */
  status?: string[];
}

/**
 * FooterComponent - Shows status bar at bottom of screen
 * Displays: cwd, git branch, token usage, model, thinking level, etc.
 */
export class FooterComponent extends Container implements Component {
  private themeManager: ThemeManager;
  private data: FooterData;

  constructor(themeManager: ThemeManager, initialData?: Partial<FooterData>) {
    super();
    this.themeManager = themeManager;
    this.data = {
      cwd: process.env.PWD || "~",
      ...initialData,
    };
  }

  /**
   * Update footer data
   */
  updateData(data: Partial<FooterData>): void {
    this.data = { ...this.data, ...data };
    this.invalidate();
  }

  /**
   * Get current footer data (readonly copy)
   */
  getData(): Readonly<FooterData> {
    return { ...this.data };
  }

  /**
   * Set current working directory
   */
  setCwd(cwd: string): void {
    this.data.cwd = cwd;
    this.invalidate();
  }

  /**
   * Set model
   */
  setModel(model: string): void {
    this.data.model = model;
    this.invalidate();
  }

  /**
   * Set token usage
   */
  setTokenUsage(percentage: number): void {
    this.data.tokenUsage = Math.max(0, Math.min(100, percentage));
    this.invalidate();
  }

  /**
   * Set thinking level
   */
  setThinkingLevel(level: FooterData["thinkingLevel"]): void {
    this.data.thinkingLevel = level;
    this.invalidate();
  }

  /**
   * Toggle images display
   */
  setShowImages(show: boolean): void {
    this.data.showImages = show;
    this.invalidate();
  }

  /**
   * Add status indicator
   */
  addStatus(status: string): void {
    if (!this.data.status) {
      this.data.status = [];
    }
    this.data.status.push(status);
    this.invalidate();
  }

  /**
   * Remove status indicator
   */
  removeStatus(status: string): void {
    if (this.data.status) {
      const index = this.data.status.indexOf(status);
      if (index !== -1) {
        this.data.status.splice(index, 1);
        this.invalidate();
      }
    }
  }

  /**
   * Clear all status indicators
   */
  clearStatus(): void {
    this.data.status = [];
    this.invalidate();
  }

  /**
   * Truncate path for display
   */
  private truncatePath(path: string, maxLength: number): string {
    if (path.length <= maxLength) return path;
    const parts = path.split("/");
    if (parts.length <= 2) return "..." + path.slice(-maxLength + 3);

    // Keep last two parts
    const lastTwo = parts.slice(-2).join("/");
    const prefix = ".../";
    if (prefix.length + lastTwo.length > maxLength) {
      return "..." + lastTwo.slice(-maxLength + 3);
    }
    return prefix + lastTwo;
  }

  render(width: number): string[] {
    const segments: string[] = [];

    // CWD
    const maxCwdLen = Math.floor(width * 0.25);
    const cwdDisplay = this.truncatePath(this.data.cwd, maxCwdLen);
    segments.push(cwdDisplay);

    // Git branch
    if (this.data.gitBranch) {
      const branchDisplay = this.data.gitBranch.length > 15
        ? "..." + this.data.gitBranch.slice(-12)
        : this.data.gitBranch;
      segments.push(` ⎇ ${branchDisplay}`);
    }

    // Separator
    segments.push("│");

    // Token usage
    if (this.data.tokenUsage !== undefined) {
      const usage = this.data.tokenUsage;
      const barWidth = 15;
      const filled = Math.round((usage / 100) * barWidth);
      const empty = barWidth - filled;
      const bar = "█".repeat(filled) + "░".repeat(empty);
      segments.push(`[${bar}] ${usage}%`);
      segments.push("│");
    }

    // Model
    if (this.data.model) {
      const modelDisplay = this.data.model.length > 25
        ? this.data.model.slice(0, 22) + "..."
        : this.data.model;
      segments.push(`⦿ ${modelDisplay}`);
      segments.push("│");
    }

    // Thinking level
    if (this.data.thinkingLevel && this.data.thinkingLevel !== "off") {
      const levelMap: Record<string, string> = {
        minimal: "⋮",
        low: "○",
        medium: "◐",
        high: "◑",
        xhigh: "◒",
      };
      const symbol = levelMap[this.data.thinkingLevel] || "?";
      segments.push(`💭 ${symbol}`);
      segments.push("│");
    }

    // Images
    if (this.data.showImages !== undefined) {
      const icon = this.data.showImages ? "🖼" : "📄";
      segments.push(icon);
      segments.push("│");
    }

    // Session ID (short)
    if (this.data.sessionId) {
      const shortId = this.data.sessionId.slice(-6);
      segments.push(`#${shortId}`);
    }

    // Additional status
    if (this.data.status && this.data.status.length > 0) {
      const statusDisplay = this.data.status.slice(0, 2).join(" ");
      segments.push(statusDisplay);
    }

    const line = segments.join(" ");
    return [line.padEnd(width).slice(0, width)];
  }
}

/**
 * Create a simple footer with just cwd and git branch
 */
export function createSimpleFooter(themeManager: ThemeManager, cwd?: string): FooterComponent {
  return new FooterComponent(themeManager, {
    cwd: cwd || process.env.PWD || "~",
  });
}
