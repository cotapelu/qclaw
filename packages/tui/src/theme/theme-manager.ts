import { initTheme, getMarkdownTheme, getEditorTheme, getSelectListTheme, getSettingsListTheme, theme as piTheme } from "@mariozechner/pi-coding-agent";
import type { MarkdownTheme, EditorTheme, SelectListTheme, SettingsListTheme } from "@mariozechner/pi-tui";

/**
 * Theme color roles supported by the system
 */
export type ThemeRole =
  | "primary"
  | "secondary"
  | "accent"
  | "muted"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "userMessage"
  | "assistantMessage"
  | "toolExecution"
  | "toolSuccess"
  | "toolError"
  | "toolWarn"
  | "border"
  | "background"
  | "foreground"
  | "selection"
  | "cursor"
  | "scrollbar"
  | "code"
  | "codeBackground"
  | "quote"
  | "link"
  | "heading";

/**
 * Theme configuration interface
 */
export interface ThemeConfig {
  /** Theme name: "dark", "light", or "auto" */
  mode: "dark" | "light" | "auto";
}

/**
 * Theme manager singleton
 * Provides centralized theme access and switching
 */
export class ThemeManager {
  private static instance: ThemeManager;
  private currentMode: "dark" | "light";
  private listeners: Set<() => void> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.currentMode = "dark"; // default
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * Initialize theme system
   * @param themeName Theme name ("dark", "light", or "auto" for detection)
   */
  initialize(themeName?: "dark" | "light" | "auto"): void {
    if (this.initialized) return;

    initTheme(themeName);
    // After initTheme, the global theme is set internally
    this.currentMode = themeName === "auto" ? this.detectMode() : (themeName as "dark" | "light");
    this.initialized = true;
  }

  /**
   * Switch theme (re-initializes)
   * @param themeName New theme name
   * @returns true if successful
   */
  setTheme(themeName: "dark" | "light" | "auto"): boolean {
    if (!this.initialized) {
      this.initialize(themeName);
      return true;
    }
    try {
      initTheme(themeName);
      this.currentMode = themeName === "auto" ? this.detectMode() : (themeName as "dark" | "light");
      this.notifyListeners();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detect terminal background (simple heuristic)
   */
  private detectMode(): "dark" | "light" {
    const colorfgbg = process.env.COLORFGBG;
    if (colorfgbg) {
      const parts = colorfgbg.split(";");
      if (parts.length >= 2) {
        const bg = parseInt(parts[1], 10);
        if (!Number.isNaN(bg)) {
          return bg < 8 ? "dark" : "light";
        }
      }
    }
    return "dark";
  }

  /**
   * Get current theme mode
   */
  getMode(): "dark" | "light" {
    return this.currentMode;
  }

  /**
   * Apply foreground color using pi-coding-agent's theme
   */
  fg(role: ThemeRole, text: string): string {
    if (piTheme && typeof piTheme.fg === "function") {
      return piTheme.fg(role, text);
    }
    return text;
  }

  /**
   * Get markdown theme
   */
  getMarkdownTheme(): MarkdownTheme {
    return getMarkdownTheme();
  }

  /**
   * Get editor theme
   */
  getEditorTheme(): EditorTheme {
    return getEditorTheme();
  }

  /**
   * Get select list theme
   */
  getSelectListTheme(): SelectListTheme {
    return getSelectListTheme();
  }

  /**
   * Get settings list theme
   */
  getSettingsListTheme(): SettingsListTheme {
    return getSettingsListTheme();
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(cb => cb());
  }
}

// Simple helper
export function themeText(role: ThemeRole, text: string): string {
  return ThemeManager.getInstance().fg(role, text);
}
