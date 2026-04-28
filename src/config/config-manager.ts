#!/usr/bin/env node

/**
 * Piclaw Configuration Manager
 * Handles persistent user configuration (~/.piclaw/config.json)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface PiclawConfig {
	/** Default model to use (e.g., "anthropic:claude-opus-4-5") */
	model?: string;
	/** Default thinking level */
	thinking?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
	/** Default tool allowlist. If not set, all tools are available. */
	tools?: string[];
	/** Custom session directory */
	sessionDir?: string;
	/** Whether to show verbose logs */
	verbose?: boolean;
}

const CONFIG_DIR = join(homedir(), ".piclaw");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: PiclawConfig = {
	model: undefined,
	thinking: "medium",
	tools: ["read", "bash", "edit", "write"],
	sessionDir: undefined,
	verbose: false,
};

/**
 * Load configuration from disk.
 * Returns merged config: defaults < file < CLI overrides
 */
export function loadConfig(cliOverrides?: Partial<PiclawConfig>): PiclawConfig {
	// Ensure config directory exists
	if (!existsSync(CONFIG_DIR)) {
		mkdirSync(CONFIG_DIR, { recursive: true });
	}

	// Load file config if exists
	let fileConfig: PiclawConfig = { ...DEFAULT_CONFIG };
	if (existsSync(CONFIG_PATH)) {
		try {
			const content = readFileSync(CONFIG_PATH, "utf-8");
			fileConfig = JSON.parse(content);
			// Validate and sanitize
			if (fileConfig.thinking && !["off", "minimal", "low", "medium", "high", "xhigh"].includes(fileConfig.thinking)) {
				console.warn(`Invalid thinking level in config: ${fileConfig.thinking}. Using default.`);
				fileConfig.thinking = DEFAULT_CONFIG.thinking;
			}
		} catch (err) {
			console.warn(`Failed to parse config file: ${err}. Using defaults.`);
			fileConfig = { ...DEFAULT_CONFIG };
		}
	}

	// Merge: fileConfig is base, cliOverrides take precedence
	return { ...fileConfig, ...cliOverrides };
}

/**
 * Save configuration to disk.
 */
export function saveConfig(config: PiclawConfig): void {
	if (!existsSync(CONFIG_DIR)) {
		mkdirSync(CONFIG_DIR, { recursive: true });
	}
	const content = JSON.stringify(config, null, 2);
	writeFileSync(CONFIG_PATH, content, "utf-8");
}

/**
 * Get the config file path (for display/debugging)
 */
export function getConfigPath(): string {
	return CONFIG_PATH;
}
