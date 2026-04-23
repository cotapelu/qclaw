/**
 * Type tests for @mariozechner/pi-tui-professional
 * These tests compile only - they don't run at runtime.
 * Run with: npx tsc --noEmit tests/types.test-d.ts
 */

import {
  ThemeManager,
  ChatContainer,
  FooterComponent,
  DynamicBorder,
  ScrollableContainer,
  ProgressBar,
  ModalComponent,
  showModalMessage,
  showModalConfirm,
  createTitledBox,
  formatSize,
  formatDuration,
} from "../src/index.js";
import type { ThemeRole } from "../src/theme/theme-manager.js";
import { TUI, ProcessTerminal, Container } from "@mariozechner/pi-tui";
import { UserMessageComponent, AssistantMessageComponent } from "@mariozechner/pi-coding-agent";

// ============================================================================
// ThemeManager type tests
// ============================================================================

const theme = ThemeManager.getInstance();
theme.initialize("dark");
theme.setTheme("light");
theme.setTheme("auto");
theme.getMode();
theme.fg("accent" as ThemeRole, "text");
theme.getMarkdownTheme();
theme.getEditorTheme();
theme.getSelectListTheme();
theme.getSettingsListTheme();
const unsubscribe = theme.subscribe(() => {});
unsubscribe();

// ============================================================================
// ChatContainer type tests
// ============================================================================

const chat = new ChatContainer({ themeManager: theme });
chat.addMessage(new UserMessageComponent("test", theme));
chat.removeMessage(new UserMessageComponent("test", theme));
const messages = chat.getMessages();
chat.clearMessages();
const chatLines = chat.render(80);

// ============================================================================
// FooterComponent type tests
// ============================================================================

const footer = new FooterComponent(theme, { cwd: "/home" });
footer.updateData({ model: "gpt-4" });
footer.setCwd("/tmp");
footer.setModel("claude-3");
footer.setTokenUsage(50);
footer.setThinkingLevel("high");
footer.setShowImages(true);
footer.addStatus("status");
footer.removeStatus("status");
footer.clearStatus();
const footerData = footer.getData();

// ============================================================================
// DynamicBorder type tests
// ============================================================================

const border = new DynamicBorder(theme, { borderStyle: "double", title: "Test", padding: 1 });
border.setTitle("New Title");
border.setBorderStyle("rounded");
const borderLines = border.render(60);

// ============================================================================
// ScrollableContainer type tests
// ============================================================================

const scrollable = new ScrollableContainer(theme, 20);
const scrollComp = { render: (w: number) => ["test"] };
scrollable.addChild(scrollComp);
scrollable.removeChild(scrollComp);
scrollable.clear();
scrollable.setViewportHeight(30);
scrollable.scrollDown(5);
scrollable.scrollUp(3);
scrollable.scrollToTop();
scrollable.scrollToBottom();
const hasScroll = scrollable.hasScrollbar();
const scrollPercent = scrollable.getScrollPercent();
const offset = scrollable.getScrollOffset();
const scrollLines = scrollable.render(80);

// ============================================================================
// ProgressBar type tests
// ============================================================================

const progress = new ProgressBar(theme, 20, { showPercentage: true });
progress.setProgress(75);
progress.getProgress();
progress.setWidth(30);
const progressLines = progress.render(80);

// ============================================================================
// ModalComponent type tests
// ============================================================================

const modal = new ModalComponent(theme, { title: "Test", width: 50 });
modal.setTitle("New Title");
modal.show(new TUI(new ProcessTerminal()));
modal.hide();
modal.onClose(() => {});
const content = modal.getContent();
const modalLines = modal.render(60);

// ============================================================================
// Utility functions type tests
// ============================================================================

const box = createTitledBox("Title", ["Line1", "Line2"], 40, theme);
const size = formatSize(1024);
const duration = formatDuration(5000);

// ============================================================================
// Re-exports type tests
// ============================================================================

import { CustomEditor as PiCustomEditor, initTheme } from "../src/index.js";
import { getMarkdownTheme as getMdTheme } from "../src/index.js";
import { TUI as ReexportedTUI } from "../src/index.js";
import { Container as ReexportedContainer } from "../src/index.js";

// Call re-exported functions
initTheme("dark");
const mdTheme = getMdTheme();

// Type tests should compile without errors
// This file is not meant to be executed
