import {
  initTheme,
  setTheme,
  getAvailableThemes,
  getMarkdownTheme,
  getEditorTheme,
  getSelectListTheme,
  getSettingsListTheme,
  type Theme,
} from "@mariozechner/pi-coding-agent";
import { getGlobalEventBus } from "../core/event-bus.js";
import { getGlobalConfig } from "../core/config.js";

/**
 * ThemeManager wraps the pi-coding-agent theme system.
 * It provides reactive theme updates and emits events.
 */
export class ThemeManager {
  private eventBus = getGlobalEventBus();
  private config = getGlobalConfig();
  private currentThemeName: string;
  private currentThemeInstance: Theme | null = null;
  private watcherEnabled: boolean = false;

  constructor(initialTheme?: string) {
    this.currentThemeName = initialTheme || this.config.get('theme') || 'dark';
    this.initialize();
  }

  private initialize(): void {
    // Initialize theme system (from pi-coding-agent)
    initTheme(this.currentThemeName);

    // Get the global theme instance via proxy
    // We need to import the theme getter dynamically to avoid circular
    this.currentThemeInstance = this.getThemeInstance();

    // Listen for config theme changes
    this.config.onChange((key, oldValue, newValue) => {
      if (key === 'theme' && newValue !== this.currentThemeName) {
        this.setTheme(newValue);
      }
    });
  }

  private getThemeInstance(): Theme {
    // Import theme lazily to avoid circular deps
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { theme } = require("@mariozechner/pi-coding-agent");
    return theme as Theme;
  }

  /**
   * Get current theme name
   */
  getThemeName(): string {
    return this.currentThemeName;
  }

  /**
   * Set theme by name
   */
  setTheme(name: string, enableWatcher?: boolean): boolean {
    const result = setTheme(name, enableWatcher);
    if (result.success) {
      this.currentThemeName = name;
      this.currentThemeInstance = this.getThemeInstance();
      this.config.set('theme', name);
      this.eventBus.emitSimple('theme.change', { themeName: name });
    } else {
      console.error('Failed to set theme:', result.error);
    }
    return result.success;
  }

  /**
   * Get theme adapter for Markdown components
   */
  getMarkdownTheme() {
    return getMarkdownTheme();
  }

  /**
   * Get theme adapter for Editor components
   */
  getEditorTheme() {
    return getEditorTheme();
  }

  /**
   * Get theme adapter for SelectList components
   */
  getSelectListTheme() {
    return getSelectListTheme();
  }

  /**
   * Get theme adapter for SettingsList components
   */
  getSettingsListTheme() {
    return getSettingsListTheme();
  }

  /**
   * Get the raw Theme instance (advanced use)
   */
  getThemeInstance(): Theme | null {
    return this.currentThemeInstance;
  }

  /**
   * Apply theme color to text (helper)
   */
  fg(colorName: string, text: string): string {
    if (!this.currentThemeInstance) {
      return text;
    }
    // @ts-expect-error - dynamic color name
    return this.currentThemeInstance.fg(colorName, text);
  }

  /**
   * Apply theme background color to text
   */
  bg(colorName: string, text: string): string {
    if (!this.currentThemeInstance) {
      return text;
    }
    // @ts-expect-error - dynamic color name
    return this.currentThemeInstance.bg(colorName, text);
  }

  /**
   * Get available theme names
   */
  getAvailableThemes(): string[] {
    return getAvailableThemes();
  }

  /**
   * Enable/disable file watcher for custom themes
   */
  setWatcherEnabled(enabled: boolean): void {
    // Theming system handles this automatically via setTheme(enableWatcher)
    // This method is mainly informational
    this.watcherEnabled = enabled;
  }

  /**
   * Reset to default theme (based on terminal background)
   */
  resetToDefault(): void {
    // Config manager's default is 'dark', but we could auto-detect
    this.setTheme('dark');
  }

  /**
   * Listen for theme changes
   */
  onChange(handler: (themeName: string) => void): () => {
    return this.eventBus.on('theme.change', (event) => {
      if (event.payload?.themeName) {
        handler(event.payload.themeName);
      }
    });
  }
}
