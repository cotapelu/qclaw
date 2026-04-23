import { Container } from "@mariozechner/pi-tui";
import type { Component } from "@mariozechner/pi-tui";
import { ThemeManager } from "../../theme/theme-manager";

/**
 * Border style options
 */
export type BorderStyle = "single" | "double" | "rounded" | "heavy" | "ascii";

/**
 * DynamicBorder - A themed border container
 * Renders border around child components
 */
export class DynamicBorder extends Container implements Component {
  private themeManager: ThemeManager;
  private borderStyle: BorderStyle;
  private title?: string;
  private padding: number;

  // Border character sets
  private static readonly BORDERS: Record<BorderStyle, {
    tl: string; tr: string; bl: string; br: string;
    h: string; v: string;
  }> = {
    single: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" },
    double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
    rounded: { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" },
    heavy: { tl: "┏", tr: "┓", bl: "┗", br: "┛", h: "━", v: "┃" },
    ascii: { tl: "+", tr: "+", bl: "+", br: "+", h: "-", v: "|" },
  };

  constructor(
    themeManager: ThemeManager,
    options?: {
      borderStyle?: BorderStyle;
      title?: string;
      padding?: number;
    }
  ) {
    super();
    this.themeManager = themeManager;
    this.borderStyle = options?.borderStyle || "single";
    this.title = options?.title;
    this.padding = options?.padding ?? 1;
  }

  /**
   * Set border title
   */
  setTitle(title?: string): void {
    this.title = title;
    this.invalidate();
  }

  /**
   * Set border style
   */
  setBorderStyle(style: BorderStyle): void {
    this.borderStyle = style;
    this.invalidate();
  }

  render(width: number): string[] {
    const lines: string[] = [];
    const innerWidth = Math.max(1, width - 2);
    const borders = DynamicBorder.BORDERS[this.borderStyle];

    // Top border
    if (this.title) {
      const titleText = ` ${this.title} `;
      const titleLen = titleText.length;
      const padLeft = Math.floor((innerWidth - titleLen) / 2);
      const padRight = innerWidth - titleLen - padLeft;
      const topLine =
        borders.tl +
        "─".repeat(padLeft) +
        titleText +
        "─".repeat(padRight) +
        borders.tr;
      lines.push(topLine);
    } else {
      lines.push(borders.tl + "─".repeat(innerWidth) + borders.tr);
    }

    // Content
    const contentLines = this.renderChildren(innerWidth);
    for (const contentLine of contentLines) {
      const padded = " ".repeat(this.padding) + contentLine + " ".repeat(this.padding);
      lines.push(borders.v + padded + borders.v);
    }

    // Bottom border
    lines.push(borders.bl + "─".repeat(innerWidth) + borders.br);

    return lines;
  }

  /**
   * Render children
   */
  private renderChildren(width: number): string[] {
    const childLines: string[] = [];
    for (const child of this.children) {
      const childRender = child.render(width);
      childLines.push(...childRender);
    }
    if (childLines.length === 0) {
      return [" ".repeat(width)];
    }
    return childLines;
  }
}

/**
 * Border wrapper for any component
 */
export function createBorder(
  themeManager: ThemeManager,
  component: Component,
  options?: {
    borderStyle?: BorderStyle;
    title?: string;
    padding?: number;
  }
): DynamicBorder {
  const border = new DynamicBorder(themeManager, {
    borderStyle: options?.borderStyle || "single",
    title: options?.title,
    padding: options?.padding,
  });
  border.addChild(component);
  return border;
}
