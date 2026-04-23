import { TUI, ProcessTerminal, Container, Text, Input, Box } from "@mariozechner/pi-tui";
import {
  ThemeManager,
  DynamicBorder,
  showModalConfirm,
  SettingsSelectorComponent,
  initTheme,
} from "@mariozechner/pi-tui-professional";

async function main() {
  const terminal = new ProcessTerminal();
  const tui = new TUI(terminal);

  const theme = ThemeManager.getInstance();
  theme.initialize("dark");

  // Main container
  const layout = new Container();
  tui.addChild(layout);

  // Settings panel with border
  const settingsBorder = new DynamicBorder(theme, {
    title: " Settings (Press 'q' to quit) ",
    borderStyle: "double",
  });
  const settingsContainer = new Container();
  settingsBorder.addChild(settingsContainer);
  layout.addChild(settingsBorder);

  // Show current settings
  const settingsInfo = new Text("Use arrow keys to navigate settings\n", 1, 0);
  settingsContainer.addChild(settingsInfo);

  // Create SettingsSelector
  // Note: In real usage you'd integrate with actual settings manager.
  // Here we show a simplified version.

  const helpText = new Text(
    "\nControls:\n" +
      "  ↑/↓ - Navigate\n" +
      "  Enter - Modify value\n" +
      "  Esc - Close/Quit\n" +
      "\nPress any key to open settings modal...",
    1,
    0
  );
  settingsContainer.addChild(helpText);

  // On any key, show settings modal (demo)
  let settingsOpened = false;
  tui.onInput = async (data) => {
    if (!settingsOpened && data !== "\x1b") {
      settingsOpened = true;
      await showSettingsModal(tui, theme);
      settingsOpened = false;

      // Show quit confirmation after closing settings
      const quit = await showModalConfirm(tui, theme, "Quit settings demo?");
      if (quit) {
        tui.stop();
      }
    } else if (data === "q" || data === "Q") {
      tui.stop();
    }
  };

  tui.start();
}

async function showSettingsModal(tui: any, theme: ThemeManager) {
  // For demo purposes, we'll create a simple modal with a few options
  const { ModalComponent, SettingsSelectorComponent } = await import("@mariozechner/pi-tui-professional");

  const modal = new ModalComponent(theme, {
    title: "Settings",
    width: 60,
    borderStyle: "double",
  });

  const content = modal.getContent();

  // Create a simple settings list (mocked)
  // In a real app you'd pass actual SettingsConfig and callbacks
  const info = new Text("Settings modal would appear here.\n", 1, 0);
  content.addChild(info);

  const optionText = new Text("Press Enter to toggle options (demo)", 1, 0);
  content.addChild(optionText);

  modal.show(tui);

  // Close on any key for demo
  // In real app, modal handles its own input
}

main().catch(console.error);
