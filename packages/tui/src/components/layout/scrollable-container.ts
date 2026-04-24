import { Container } from "@mariozechner/pi-tui";
import type { Component } from "@mariozechner/pi-tui";
import type { ThemeManager } from "../../theme/theme-manager.js";

/**
 * ScrollableContainer - A container that can scroll its children vertically
 * Maintains a viewport into a larger content area.
 */
export class ScrollableContainer extends Container implements Component {
  private themeManager: ThemeManager;
  private viewportHeight: number;
  private scrollOffset: number = 0;
  private cachedLines: string[] | null = null;
  private cachedWidth: number = -1;
  private totalHeight: number = 0;
  private _cacheValid: boolean = false;

  constructor(themeManager: ThemeManager, viewportHeight: number = 20) {
    super();
    this.themeManager = themeManager;
    this.viewportHeight = viewportHeight;
  }

  /**
   * Add a child component (overridden to recalc total height)
   */
  addChild(child: Component): this {
    super.addChild(child);
    this.recalculateHeight();
    return this;
  }

  /**
   * Remove a child component (overridden to recalc total height)
   */
  removeChild(child: Component): this {
    super.removeChild(child);
    this.recalculateHeight();
    return this;
  }

  /**
   * Clear all children
   */
  clear(): void {
    super.clear();
    this.scrollOffset = 0;
    this.recalculateHeight();
  }

  /**
   * Recalculate total content height
   */
  private recalculateHeight(): void {
    // Estimate height assuming default width (will be updated on render)
    this.totalHeight = 0;
    for (const child of this.children) {
      const lines = child.render(80);
      this.totalHeight += lines.length;
    }
    // Ensure scroll offset is within bounds
    const maxOffset = Math.max(0, this.totalHeight - this.viewportHeight);
    if (this.scrollOffset > maxOffset) {
      this.scrollOffset = maxOffset;
    }
    this._cacheValid = false;
  }

  /**
   * Set viewport height (number of visible lines)
   */
  setViewportHeight(height: number): void {
    this.viewportHeight = height;
    this.invalidate();
  }

  /**
   * Get current scroll offset
   */
  getScrollOffset(): number {
    return this.scrollOffset;
  }

  /**
   * Scroll down (towards bottom)
   */
  scrollDown(lines: number = 1): void {
    const maxOffset = Math.max(0, this.totalHeight - this.viewportHeight);
    this.scrollOffset = Math.min(this.scrollOffset + lines, maxOffset);
    this.invalidate();
  }

  /**
   * Scroll up (towares top)
   */
  scrollUp(lines: number = 1): void {
    this.scrollOffset = Math.max(0, this.scrollOffset - lines);
    this.invalidate();
  }

  /**
   * Scroll to top
   */
  scrollToTop(): void {
    this.scrollOffset = 0;
    this.invalidate();
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom(): void {
    this.scrollOffset = Math.max(0, this.totalHeight - this.viewportHeight);
    this.invalidate();
  }

  /**
   * Check if content exceeds viewport
   */
  hasScrollbar(): boolean {
    return this.totalHeight > this.viewportHeight;
  }

  /**
   * Get scroll percentage (0-100)
   */
  getScrollPercent(): number {
    if (!this.hasScrollbar()) return 0;
    const maxOffset = this.totalHeight - this.viewportHeight;
    return Math.round((this.scrollOffset / maxOffset) * 100);
  }

  render(width: number): string[] {
    if (this._cacheValid && this.cachedWidth === width && this.cachedLines) {
      return this.cachedLines;
    }

    const lines: string[] = [];
    let currentLine = 0;
    let startRendering = this.scrollOffset <= 0;
    let linesRendered = 0;

    for (const child of this.children) {
      const childLines = child.render(width);
      for (const line of childLines) {
        // Skip lines before scroll offset
        if (!startRendering) {
          currentLine++;
          continue;
        }

        // Stop at viewport height
        if (linesRendered >= this.viewportHeight) {
          break;
        }

        lines.push(line);
        linesRendered++;
        currentLine++;
      }
      if (startRendering && linesRendered >= this.viewportHeight) break;
      // Mark that we've started rendering after skipping offset lines
      if (currentLine >= this.scrollOffset) {
        startRendering = true;
      }
    }

    // Pad to fill viewport if content shorter
    while (linesRendered < this.viewportHeight) {
      lines.push(" ".repeat(width));
      linesRendered++;
    }

    // Optionally add scrollbar on the right (simple vertical bar)
    if (this.hasScrollbar()) {
      const scrollbarWidth = 1;
      const trackHeight = this.viewportHeight;
      const thumbHeight = Math.max(1, Math.round((this.viewportHeight / this.totalHeight) * trackHeight));
      const thumbPos = Math.round((this.scrollOffset / this.totalHeight) * trackHeight);

      // Insert scrollbar at the end of each line
      for (let i = 0; i < lines.length; i++) {
        let ch = " ";
        if (i >= thumbPos && i < thumbPos + thumbHeight) {
          ch = "█";
        } else if (i < trackHeight) {
          ch = "░";
        }
        lines[i] = lines[i].slice(0, width - scrollbarWidth) + ch;
      }
    }

    this.cachedLines = lines;
    this.cachedWidth = width;
    this._cacheValid = true;

    return lines;
  }

  invalidate(): void {
    super.invalidate();
    this._cacheValid = false;
  }
}

/**
 * Create a scrollable container with theme support
 */
export function createScrollableContainer(
  themeManager: ThemeManager,
  viewportHeight: number = 20
): ScrollableContainer {
  return new ScrollableContainer(themeManager, viewportHeight);
}
