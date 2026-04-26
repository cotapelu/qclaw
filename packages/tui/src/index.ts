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
  ScrollableContainer,
  createScrollableContainer,
  ProgressBar,
  createProgressBarComponent,
} from "./components/layout/index.js";
export type {
  ChatContainerProps,
  FooterData,
} from "./components/layout/index.js";

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
export {
  // Core TUI
  TUI,
  ProcessTerminal,
  Container,
  Text,
  Box,
  Spacer,
  Input,
  Editor,
  // Terminal and capabilities
  type Terminal,
  allocateImageId,
  calculateImageRows,
  deleteAllKittyImages,
  deleteKittyImage,
  detectCapabilities,
  encodeITerm2,
  encodeKitty,
  getCapabilities,
  getCellDimensions,
  getGifDimensions,
  getImageDimensions,
  getJpegDimensions,
  getPngDimensions,
  getWebpDimensions,
  hyperlink,
  imageFallback,
  renderImage,
  resetCapabilitiesCache,
  setCapabilities,
  setCellDimensions,
  // Autocomplete
  type AutocompleteItem,
  type AutocompleteProvider,
  type AutocompleteSuggestions,
  CombinedAutocompleteProvider,
  type SlashCommand,
  // Other components
  Image,
  Markdown,
  CancellableLoader,
  Loader,
  SelectList,
  SettingsList,
  TruncatedText,
  // Editor component interface
  type EditorComponent,
  // Fuzzy matching
  type FuzzyMatch,
  fuzzyFilter,
  fuzzyMatch,
  // Keybindings
  getKeybindings,
  type Keybinding,
  type KeybindingConflict,
  type KeybindingDefinition,
  type KeybindingDefinitions,
  type Keybindings,
  type KeybindingsConfig,
  KeybindingsManager,
  setKeybindings,
  TUI_KEYBINDINGS,
  // Keys
  decodeKittyPrintable,
  isKeyRelease,
  isKeyRepeat,
  isKittyProtocolActive,
  Key,
  type KeyEventType,
  type KeyId,
  matchesKey,
  parseKey,
  setKittyProtocolActive,
  // Stdin buffer
  StdinBuffer,
  type StdinBufferEventMap,
  type StdinBufferOptions,
  // Types
  type OverlayAnchor,
  type OverlayHandle,
  type OverlayMargin,
  type OverlayOptions,
  type SizeValue,
  type TerminalCapabilities,
  type ImageDimensions,
  type ImageProtocol,
  type ImageRenderOptions,
  type CellDimensions,
  type DefaultTextStyle,
  type MarkdownTheme,
  type SelectItem,
  type SelectListLayoutOptions,
  type SelectListTheme,
  type SelectListTruncatePrimaryContext,
  type SettingItem,
  type SettingsListTheme,
  type ImageOptions,
  type LoaderIndicatorOptions,
  // Utils
  truncateToWidth,
  visibleWidth,
  wrapTextWithAnsi,
  // Helpers (selected)
  isFocusable,
  CURSOR_MARKER,
} from "@mariozechner/pi-tui";
export type {
  Component,
  Focusable,
  EditorOptions,
  EditorTheme,
  ImageTheme,
} from "@mariozechner/pi-tui";

// UI components from pi-coding-agent (full set)
export {
  // Messages
  UserMessageComponent,
  AssistantMessageComponent,
  ToolExecutionComponent,
  CustomMessageComponent,
  BashExecutionComponent,
  BranchSummaryMessageComponent,
  CompactionSummaryMessageComponent,
  SkillInvocationMessageComponent,
  // Input
  CustomEditor as PiCustomEditor,
  ExtensionEditorComponent,
  ExtensionInputComponent,
  // Selectors
  ModelSelectorComponent,
  SettingsSelectorComponent,
  ThemeSelectorComponent,
  ThinkingSelectorComponent,
  ExtensionSelectorComponent,
  LoginDialogComponent,
  OAuthSelectorComponent,
  SessionSelectorComponent,
  ShowImagesSelectorComponent,
  TreeSelectorComponent,
  UserMessageSelectorComponent,
  // Footer
  FooterComponent as PiFooterComponent,
  // Loaders
  BorderedLoader,
  // Layout
  DynamicBorder,
  // Utilities
  keyHint,
  keyText,
  rawKeyHint,
  renderDiff as PiRenderDiff,
  truncateToVisualLines,
  // Others
  ArminComponent,
  // Advanced
  CustomEditor,
} from "@mariozechner/pi-coding-agent";

export type {
  VisualTruncateResult,
  // Types from components
  RenderDiffOptions,
  SettingsCallbacks,
  SettingsConfig,
  ToolExecutionOptions,
} from "@mariozechner/pi-coding-agent";

// Theme utilities from pi-coding-agent
export {
  initTheme,
  getMarkdownTheme,
  getSelectListTheme,
  getSettingsListTheme,
  getLanguageFromPath,
  highlightCode,
  Theme,
} from "@mariozechner/pi-coding-agent";
