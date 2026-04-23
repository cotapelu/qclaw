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
  ScrollableContainer,
  createScrollableContainer,
  ProgressBar,
  createProgressBarComponent,
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

// Overlay components (our custom)
export { ModalComponent, showModalMessage, showModalConfirm } from "./components/overlays/index.js";

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
export {
  initTheme,
  getMarkdownTheme,
  getSelectListTheme,
  getSettingsListTheme,
  getLanguageFromPath,
  highlightCode,
} from "@mariozechner/pi-coding-agent";
