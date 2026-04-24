import { ThemeManager } from "../theme/theme-manager.js";
import { truncateToWidth, wrapTextWithAnsi, CURSOR_MARKER } from "@mariozechner/pi-tui";

/**
 * Render a unified diff with theme
 * @param diff Diff text
 * @param width Target width
 * @param themeManager Theme manager
 * @param options Rendering options
 * @returns Array of rendered lines
 */
export function renderDiff(
  diff: string,
  width: number,
  themeManager: ThemeManager,
  options?: {
    showLineNumbers?: boolean;
    highlightChanges?: boolean;
  }
): string[] {
  const lines = diff.split("\n");
  const rendered: string[] = [];

  for (const line of lines) {
    let themedLine: string;

    if (line.startsWith("+") && !line.startsWith("+++")) {
      themedLine = themeManager.fg("success", line);
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      themedLine = themeManager.fg("error", line);
    } else if (line.startsWith("@@")) {
      themedLine = themeManager.fg("info", line);
    } else {
      themedLine = themeManager.fg("foreground", line);
    }

    // Truncate if necessary
    if (themedLine.length > width) {
      themedLine = truncateToWidth(themedLine, width, "…");
    }

    rendered.push(themedLine);
  }

  return rendered;
}

/**
 * Truncate text to visual width with ellipsis
 */
export function truncateText(
  text: string,
  maxWidth: number,
  ellipsis: string = "...",
  themeManager?: ThemeManager
): string {
  const truncated = truncateToWidth(text, maxWidth, ellipsis);
  if (themeManager) {
    return themeManager.fg("muted", truncated);
  }
  return truncated;
}

/**
 * Wrap text with ANSI support and theme
 */
export function wrapText(
  text: string,
  width: number,
  themeManager: ThemeManager,
  role?: "foreground" | "muted" | "accent"
): string[] {
  const wrapped = wrapTextWithAnsi(text, width);
  if (role) {
    return wrapped.map(line => themeManager.fg(role as any, line));
  }
  return wrapped;
}

/**
 * Pad text to width with theme
 */
export function padText(
  text: string,
  width: number,
  align: "left" | "center" | "right" = "left",
  themeManager?: ThemeManager,
  role?: string
): string {
  const padded = align === "left"
    ? text.padEnd(width)
    : align === "center"
    ? text.padStart(Math.floor((width - text.length) / 2) + text.length).padEnd(width)
    : text.padStart(width);

  if (themeManager && role) {
    return themeManager.fg(role as any, padded);
  }
  return padded;
}

/**
 * Join parts with separator, applying theme to separator
 */
export function joinThemed(
  parts: string[],
  separator: string,
  themeManager: ThemeManager,
  separatorRole: string = "muted"
): string {
  const themedSeparator = themeManager.fg(separatorRole as any, separator);
  return parts.join(themedSeparator);
}

/**
 * Create a progress bar
 * @param percentage 0-100
 * @param width Bar width in characters
 * @param themeManager Theme manager
 * @param options Bar options
 * @returns Rendered progress bar string
 */
export function createProgressBar(
  percentage: number,
  width: number,
  themeManager: ThemeManager,
  options?: {
    filledChar?: string;
    emptyChar?: string;
    showPercentage?: boolean;
  }
): string {
  const filledChar = options?.filledChar || "█";
  const emptyChar = options?.emptyChar || "░";
  const showPercentage = options?.showPercentage ?? true;

  const clamped = Math.max(0, Math.min(100, percentage));
  const filledCount = Math.round((clamped / 100) * width);
  const emptyCount = width - filledCount;

  let bar = "";
  if (clamped > 80) {
    bar = themeManager.fg("success", filledChar.repeat(filledCount));
  } else if (clamped > 50) {
    bar = themeManager.fg("accent", filledChar.repeat(filledCount));
  } else {
    bar = themeManager.fg("warning", filledChar.repeat(filledCount));
  }
  bar += themeManager.fg("muted", emptyChar.repeat(emptyCount));

  if (showPercentage) {
    return `${bar} ${clamped}%`;
  }
  return bar;
}

/**
 * Create a titled box
 */
export function createTitledBox(
  title: string,
  content: string[],
  width: number,
  themeManager: ThemeManager,
  options?: {
    padding?: number;
    borderStyle?: "single" | "double" | "rounded";
  }
): string[] {
  const padding = options?.padding || 1;
  const borderStyle = options?.borderStyle || "single";

  const borders: Record<string, { tl: string; tr: string; bl: string; br: string; h: string; v: string }> = {
    single: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" },
    double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
    rounded: { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" },
  };

  const b = borders[borderStyle];
  const innerWidth = width - 2 - padding * 2;

  const lines: string[] = [];
  const topBorder = themeManager.fg("border", b.tl + b.h.repeat(width - 2) + b.tr);
  lines.push(topBorder);

  // Title line
  const titleContent = ` ${title} `;
  const titlePad = innerWidth - titleContent.length;
  const leftPad = Math.floor(titlePad / 2);
  const rightPad = titlePad - leftPad;
  const titleLine =
    b.v +
    " ".repeat(padding) +
    themeManager.fg("accent", "─".repeat(leftPad) + titleContent + "─".repeat(rightPad)) +
    " ".repeat(padding) +
    b.v;
  lines.push(themeManager.fg("border", titleLine));

  // Content
  for (const line of content) {
    const wrapped = wrapTextWithAnsi(line, innerWidth);
    for (const wrappedLine of wrapped) {
      const contentLine =
        b.v +
        " ".repeat(padding) +
        themeManager.fg("foreground", wrappedLine) +
        " ".repeat(innerWidth - stripAnsi(wrappedLine).length + padding) +
        b.v;
      lines.push(themeManager.fg("border", contentLine));
    }
  }

  const bottomBorder = themeManager.fg("border", b.bl + b.h.repeat(width - 2) + b.br);
  lines.push(bottomBorder);

  return lines;
}

/**
 * Strip ANSI codes from string for length calculation
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Format file size
 */
export function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Format duration (milliseconds to human readable)
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    if (remainingSeconds === 0) return `${minutes}m`;
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}
