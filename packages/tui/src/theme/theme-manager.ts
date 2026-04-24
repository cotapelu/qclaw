import { initTheme, getMarkdownTheme, getSelectListTheme, getSettingsListTheme, Theme } from "@mariozechner/pi-coding-agent";
import type { MarkdownTheme, SelectListTheme, SettingsListTheme } from "@mariozechner/pi-tui";

/**
 * Theme color roles supported by the system.
 * These correspond to semantic color tokens in pi-coding-agent's theme system.
 *
 * @see {@link https://github.com/mariozechner/pi-coding-agent/blob/main/docs/themes.md|Theme Documentation}
 */
export type ThemeRole =
  | "accent"           // Primary accent color for highlights
  | "border"           // Border and separator lines
  | "muted"            // Dimmed/secondary text
  | "success"          // Success messages and indicators
  | "warning"          // Warning messages
  | "error"            // Error messages
  | "info"             // Info/diagnostic messages
  | "userMessage"      // User message background
  | "assistantMessage" // Assistant message background
  | "toolTitle"        // Tool execution title
  | "toolOutput"       // Tool output text
  | "thinkingText"     // Thinking/processing indicator
  | "dim"              // Very dim text (hints, metadata)
  | "text"             // Primary text color
  | "foreground";      // Default foreground

/**
 * Theme configuration options
 */
export interface ThemeConfig {
  /**
   * Theme mode: "dark", "light", or "auto" (detect from terminal)
   */
  mode: "dark" | "light" | "auto";
}

/**
 * Theme manager singleton.
 *
 * Provides centralized theme control for the application. Integrates with
 * pi-coding-agent's theme system to provide consistent coloring across all
 * components. Supports dark/light modes with automatic terminal detection.
 *
 * @example
 * ```typescript
 * const theme = ThemeManager.getInstance();
 * theme.initialize("dark");
 * const colored = theme.fg("accent", "Hello");
 * ```
 */
export class ThemeManager {
  private static instance: ThemeManager | null = null;
  private currentMode: "dark" | "light";
  private listeners: Set<() => void> = new Set();
  private initialized: boolean = false;

  /**
   * Create ThemeManager instance (private, use getInstance())
   */
  private constructor() {
    this.currentMode = "dark";
  }

  /**
   * Get the singleton ThemeManager instance.
   *
   * @returns The global ThemeManager instance
   */
  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * Initialize the theme system.
   *
   * This must be called before using any theme methods. It initializes
   * pi-coding-agent's theme system and sets the initial mode.
   *
   * @param themeName - Theme name: "dark", "light", or "auto" (detect from terminal)
   * @returns The initialized theme mode ("dark" or "light")
   *
   * @throws {Error} If theme initialization fails (falls back to dark)
   *
   * @example
   * ```typescript
   * const theme = ThemeManager.getInstance();
   * theme.initialize("auto"); // Auto-detect from $COLORFGBG
   * ```
   */
  initialize(themeName?: "dark" | "light" | "auto"): "dark" | "light" {
    if (this.initialized) return this.currentMode;
    initTheme(themeName);
    this.currentMode = this.detectMode(themeName);
    this.initialized = true;
    return this.currentMode;
  }

  /**
   * Switch to a different theme.
   *
   * Re-initializes pi-coding-agent's theme system and notifies all subscribers.
   *
   * @param themeName - New theme name ("dark", "light", or "auto")
   * @returns Object with `success` boolean and optional `error` message
   *
   * @example
   * ```typescript
   * const result = theme.setTheme("light");
   * if (result.success) {
   *   console.log("Theme switched to light mode");
   * } else {
   *   console.error("Failed:", result.error);
   * }
   * ```
   */
  setTheme(themeName: "dark" | "light" | "auto"): { success: boolean; error?: string } {
    if (!this.initialized) {
      this.initialize(themeName);
      return { success: true };
    }
    try {
      initTheme(themeName);
      this.currentMode = this.detectMode(themeName);
      this.notifyListeners();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Detect theme mode from terminal environment variable.
   *
   * @private
   */
  private detectMode(themeName?: string): "dark" | "light" {
    if (themeName === "light") return "light";
    if (themeName === "dark") return "dark";
    // auto-detect from COLORFGBG (bash/shell variable)
    const colorfgbg = process.env.COLORFGBG;
    if (colorfgbg) {
      const parts = colorfgbg.split(";");
      if (parts.length >= 2) {
        const bg = parseInt(parts[1], 10);
        if (!Number.isNaN(bg)) return bg < 8 ? "dark" : "light";
      }
    }
    return "dark";
  }

  /**
   * Get the current theme mode.
   *
   * @returns "dark" or "light"
   */
  getMode(): "dark" | "light" {
    return this.currentMode;
  }

  /**
   * Apply foreground color to text using the current theme.
   * Uses pi-coding-agent's Theme singleton.
   */
  fg(role: ThemeRole, text: string): string {
    try {
      const theme = Theme.getInstance();
      return theme?.fg(role, text) ?? text;
    } catch (e) {
      return text;
    }
  }

  /**
   * Get the markdown theme object for rendering markdown content.
   *
   * This returns an object with functions for styling markdown elements
   * (headings, links, code, etc.) using the current theme colors.
   *
   * @returns MarkdownTheme from pi-coding-agent
   *
   * @example
   * ```typescript
   * const mdTheme = theme.getMarkdownTheme();
   * const heading = mdTheme.heading("## Title");
   * ```
   */
  getMarkdownTheme(): MarkdownTheme {
    return getMarkdownTheme();
  }

  /**
   * Get the select list theme for styling SelectList components.
   *
   * @returns SelectListTheme from pi-tui
   */
  getSelectListTheme(): SelectListTheme {
    return getSelectListTheme();
  }

  /**
   * Get the settings list theme for styling SettingsList components.
   *
   * @returns SettingsListTheme from pi-tui
   */
  getSettingsListTheme(): SettingsListTheme {
    return getSettingsListTheme();
  }

  /**
   * Subscribe to theme change notifications.
   *
   * The callback will be invoked whenever the theme is switched via `setTheme()`.
   * Useful for re-rendering UI components when theme changes.
   *
   * @param callback - Function to call on theme change
   * @returns Unsubscribe function that removes the callback
   *
   * @example
   * ```typescript
   * const unsubscribe = theme.subscribe(() => {
   *   tui.requestRender();
   * });
   * // Later: unsubscribe();
   * ```
   */
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all subscribers of a theme change.
   *
   * @private
   */
  private notifyListeners(): void {
    for (const cb of this.listeners) {
      try {
        cb();
      } catch (err) {
        // Log but don't throw - one faulty subscriber shouldn't break others
        console.error("Theme subscriber error:", err);
      }
    }
  }
}

/**
 * Helper function to apply a themed foreground color.
 *
 * Equivalent to: `ThemeManager.getInstance().fg(role, text)`
 *
 * @param role - Color role from ThemeRole
 * @param text - Text to color
 * @returns Themed text string
 *
 * @example
 * ```typescript
 * import { themeText } from "@mariozechner/pi-tui-professional";
 * console.log(themeText("error", "Something went wrong"));
 * ```
 */
export function themeText(role: ThemeRole, text: string): string {
  return ThemeManager.getInstance().fg(role, text);
}

/**
 * Get a themed border character.
 *
 * Convenience shortcut for `theme.fg("border", char)`.
 *
 * @param char - Border character (e.g., "─", "│", "┌")
 * @returns Themed border character
 *
 * @example
 * ```typescript
 * const border = themedBorder("─");
 * ```
 */
export function themedBorder(char: string): string {
  const theme = ThemeManager.getInstance();
  return theme.fg("border", char);
}
