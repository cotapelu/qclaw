import { FooterComponent } from "@mariozechner/pi-coding-agent";
import { getGlobalEventBus } from "../core/event-bus.js";
import type { FooterData } from "@mariozechner/pi-coding-agent";
import { getGlobalConfig } from "../core/config.js";

/**
 * StatusFooter wraps the pi-coding-agent FooterComponent.
 * It provides data updates and emits events.
 */
export class StatusFooter extends FooterComponent {
  private eventBus = getGlobalEventBus();
  private config = getGlobalConfig();

  constructor(session: any, initialData: FooterData) {
    super(session, initialData);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for config changes that affect footer
    this.config.onChange((key, oldValue, newValue) => {
      if (key === 'theme') {
        this.eventBus.emitSimple('footer.themeChange', { theme: newValue });
      }
    });

    // Listen for stats updates
    this.eventBus.on('stats.update', () => {
      // Parent should call updateData() when stats change
    });
  }

  /**
   * Update footer data (wrapper with event emit)
   */
  updateData(data: FooterData): void {
    super.updateData(data);
    this.eventBus.emitSimple('footer.update', data);
    // Also request render from parent TUI
    this.requestRender();
  }

  /**
   * Update specific field
   */
  private currentData: FooterData | null = null;

  constructor(session: any, initialData: FooterData) {
    super(session, initialData);
    this.currentData = { ...initialData };
    this.setupEventListeners();
  }

  override updateData(data: FooterData): void {
    super.updateData(data);
    this.currentData = { ...data };
    this.eventBus.emitSimple('footer.update', data);
    this.requestRender();
  }

  updateField<K extends keyof FooterData>(field: K, value: FooterData[K]): void {
    const newData = { ...this.currentData, [field]: value };
    this.updateData(newData);
  }

  /**
   * Set model display
   */
  setModel(model: string): void {
    this.updateField('model', model);
  }

  /**
   * Set token count
   */
  setTokens(count: number): void {
    this.updateField('tokens', count);
  }

  /**
   * Set cost
   */
  setCost(cost: number): void {
    this.updateField('cost', cost);
  }

  /**
   * Set thinking level
   */
  setThinkingLevel(level: string): void {
    this.updateField('thinkingLevel', level);
  }

  /**
   * Force re-render
   */
  refresh(): void {
    this.eventBus.emitSimple('footer.refresh');
    this.requestRender();
  }

  private requestRender(): void {
    // The parent TUI should handle rendering
    // We emit an event that parent can listen to
    this.eventBus.emitSimple('tui.requestRender');
  }
}
