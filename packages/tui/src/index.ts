// Theme manager (our custom wrapper)
export { ThemeManager, themeText, themedBorder } from "./theme/index.js";
export type { ThemeRole, ThemeConfig } from "./theme/theme-manager.js";

// Layout components (our custom)
export {
  ChatContainer,
  createChatBorder,
  createSeparator,
  FooterComponent,
  createSimpleFooter,
  DynamicBorder,
  createBorder,
} from "./components/layout/index.js";
export type {
  ChatContainerProps,
  FooterData,
} from "./components/layout/index.js";
export type { BorderStyle } from "./components/layout/dynamic-border.js";

// Utilities (our custom)
export {
  renderDiff,
  truncateText,
  wrapText,
  padText,
  joinThemed,
  createProgressBar,
  createTitledBox,
  formatSize,
  formatDuration,
} from "./utils/index.js";

// Re-export pi-tui core components for convenience
export { TUI, ProcessTerminal, Container, Text, Box, Spacer, Input } from "@mariozechner/pi-tui";
export type { Component, Focusable } from "@mariozechner/pi-tui";

// Re-export pi-coding-agent UI components (direct usage recommended)
export {
  // Messages
  UserMessageComponent,
  AssistantMessageComponent,
  ToolExecutionComponent,
  CustomMessageComponent,
  BashExecutionComponent,
  // Input
  CustomEditor as PiCustomEditor,
  // Selectors
  ModelSelectorComponent,
  SettingsSelectorComponent,
  ThemeSelectorComponent,
  ThinkingSelectorComponent,
  // Footer
  FooterComponent as PiFooterComponent,
  // Others
  keyHint,
  keyText,
  rawKeyHint,
  renderDiff as PiRenderDiff,
  truncateToVisualLines,
  type VisualTruncateResult,
} from "@mariozechner/pi-coding-agent";

// Re-export selected theme functions from pi-coding-agent
// Note: For full theme control, use ThemeManager from this package
export {
  initTheme,
  getMarkdownTheme,
  getSelectListTheme,
  getSettingsListTheme,
  getLanguageFromPath,
  highlightCode,
} from "@mariozechner/pi-coding-agent";

// pi-coding-agent's theme API (setTheme, onThemeChange, theme) are also available directly
// import { setTheme, onThemeChange, theme } from "@mariozechner/pi-coding-agent";

// Re-export EditorTheme type (useful for custom themes)
export type { EditorTheme, MarkdownTheme, SelectListTheme, SettingsListTheme } from "@mariozechner/pi-tui";
