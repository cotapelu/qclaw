import { Text, Container } from "@mariozechner/pi-tui";
import type { Component } from "@mariozechner/pi-tui";
import type { ThemeManager } from "../../theme/theme-manager.js";

/**
 * ProgressBar component - displays a progress bar with percentage
 * Customizable width, chars, colors based on theme
 */
export class ProgressBar extends Container implements Component {
  private themeManager: ThemeManager;
  private percentage: number = 0;
  private width: number;
  private filledChar: string;
  private emptyChar: string;
  private showPercentage: boolean;
  private cachedLine: string | null = null;
  private cachedWidth: number = -1;
  private _cacheValid: boolean = false;

  constructor(
    themeManager: ThemeManager,
    width: number = 20,
    options: {
      filledChar?: string;
      emptyChar?: string;
      showPercentage?: boolean;
    } = {}
  ) {
    super();
    this.themeManager = themeManager;
    this.width = width;
    this.filledChar = options.filledChar || "█";
    this.emptyChar = options.emptyChar || "░";
    this.showPercentage = options.showPercentage ?? true;
  }

  /**
   * Set progress percentage (0-100)
   */
  setProgress(percentage: number): void {
    this.percentage = Math.max(0, Math.min(100, percentage));
    this.invalidate();
  }

  /**
   * Get current percentage
   */
  getProgress(): number {
    return this.percentage;
  }

  /**
   * Set bar width
   */
  setWidth(width: number): void {
    this.width = width;
    this.invalidate();
  }

  /**
   * Choose color based on percentage
   */
  private getProgressColor(percent: number): string {
    if (percent >= 100) return "success";
    if (percent >= 70) return "accent";
    if (percent >= 40) return "warning";
    return "error";
  }

  render(_width: number): string[] {
    if (this._cacheValid && this.cachedWidth === this.width && this.cachedLine) {
      return [this.cachedLine];
    }

    const filledCount = Math.round((this.percentage / 100) * this.width);
    const emptyCount = this.width - filledCount;

    const colorRole = this.getProgressColor(this.percentage);
    // Use the theme manager's fg method - it returns string
    const filled = this.themeManager.fg(colorRole as any, this.filledChar.repeat(filledCount));
    const empty = this.themeManager.fg("muted", this.emptyChar.repeat(emptyCount));

    let line = filled + empty;
    if (this.showPercentage) {
      line += ` ${this.percentage}%`;
    }

    this.cachedLine = line;
    this.cachedWidth = this.width;
    this._cacheValid = true;

    return [line];
  }

  invalidate(): void {
    super.invalidate();
    this._cacheValid = false;
  }
}

/**
 * Create a progress bar with default settings
 */
export function createProgressBar(
  themeManager: ThemeManager,
  width: number = 20,
  options: {
    filledChar?: string;
    emptyChar?: string;
    showPercentage?: boolean;
  } = {}
): ProgressBar {
  return new ProgressBar(themeManager, width, options);
}
