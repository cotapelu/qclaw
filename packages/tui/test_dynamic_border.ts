import { ThemeManager } from "./src/theme/index.js";
import { ProgressBar } from "./src/index.js";
import { DynamicBorder } from "./src/components/layout/dynamic-border.js";
import { Container as PiContainer } from "@mariozechner/pi-tui";

const theme = ThemeManager.getInstance();
theme.initialize("dark");

console.log("PiContainer:", PiContainer);
console.log("DynamicBorder.prototype before:", DynamicBorder.prototype);
console.log("DynamicBorder.prototype.__proto__:", Object.getPrototypeOf(DynamicBorder.prototype));
console.log("'addChild' on DynamicBorder.prototype?", "addChild" in DynamicBorder.prototype);

const border = new DynamicBorder(theme, { title: "Test", borderStyle: "rounded" });
console.log("border prototype", Object.getPrototypeOf(border));
console.log("'addChild' in border prototype?", "addChild" in Object.getPrototypeOf(border));
const progress = new ProgressBar(theme, 20, { showPercentage: true });
progress.setProgress(50);
border.addChild(progress);
console.log("Success");
