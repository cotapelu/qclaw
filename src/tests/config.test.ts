#!/usr/bin/env node

/**
 * Unit tests for config.ts (path helpers and constants)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as config from '../config/config.js';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

describe('config paths', () => {
  let originalHome: string;
  let tempHome: string;

  beforeEach(() => {
    originalHome = homedir();
    tempHome = join(originalHome, '.piclaw-test-config');
    if (existsSync(tempHome)) {
      rmSync(tempHome, { recursive: true, force: true });
    }
    mkdirSync(tempHome, { recursive: true });
    vi.stubEnv('HOME', tempHome);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (existsSync(tempHome)) {
      rmSync(tempHome, { recursive: true, force: true });
    }
  });

  describe('getAgentDir', () => {
    it('should return ~/.piclaw/agent by default', () => {
      const dir = config.getAgentDir();
      expect(dir).toBe(join(tempHome, '.piclaw', 'agent'));
    });

    it('should respect PICLAW_AGENT_DIR env var', () => {
      vi.stubEnv('PICLAW_AGENT_DIR', '/custom/agent');
      const dir = config.getAgentDir();
      expect(dir).toBe('/custom/agent');
    });

    it('should expand ~ in PICLAW_AGENT_DIR', () => {
      vi.stubEnv('PICLAW_AGENT_DIR', '~/custom/agent');
      const dir = config.getAgentDir();
      expect(dir).toBe(join(tempHome, 'custom/agent'));
    });
  });

  describe('derived paths', () => {
    it('getCustomThemesDir should be inside agentDir', () => {
      const agentDir = config.getAgentDir();
      const themesDir = config.getCustomThemesDir();
      expect(themesDir).toBe(join(agentDir, 'themes'));
    });

    it('getModelsPath should point to models.json', () => {
      expect(config.getModelsPath()).toContain('models.json');
    });

    it('getAuthPath should point to auth.json', () => {
      expect(config.getAuthPath()).toContain('auth.json');
    });

    it('getSettingsPath should point to settings.json', () => {
      expect(config.getSettingsPath()).toContain('settings.json');
    });

    it('getToolsDir should point to tools directory', () => {
      expect(config.getToolsDir()).toContain('tools');
    });

    it('getBinDir should point to bin directory', () => {
      expect(config.getBinDir()).toContain('bin');
    });

    it('getPromptsDir should point to prompts directory', () => {
      expect(config.getPromptsDir()).toContain('prompts');
    });

    it('getSessionsDir should point to sessions directory', () => {
      expect(config.getSessionsDir()).toContain('sessions');
    });

    it('getDebugLogPath should include app name and .log', () => {
      const path = config.getDebugLogPath();
      expect(path).toContain('.piclaw');
      expect(path).toContain('-debug.log');
    });
  });

  describe('detectInstallMethod', () => {
    it('isBunBinary should be false in Node.js', () => {
      expect(config.isBunBinary).toBe(false);
    });

    it('isBunRuntime should be false in Node.js', () => {
      expect(config.isBunRuntime).toBe(false);
    });

    it('should return a valid method or unknown', () => {
      const method = config.detectInstallMethod();
      expect(['unknown', 'npm', 'pnpm', 'yarn', 'bun', 'bun-binary']).toContain(method);
    });
  });

  describe('getSelfUpdateCommand', () => {
    it('should return undefined for local installs', () => {
      const cmd = config.getSelfUpdateCommand('piclaw');
      // In a local install, it's not globally managed, so undefined
      expect(cmd).toBeUndefined();
    });
  });

  describe('getUpdateInstruction', () => {
    it('should return instruction string (fallback)', () => {
      const instruction = config.getUpdateInstruction('piclaw');
      expect(instruction).toBeDefined();
      expect(typeof instruction).toBe('string');
      expect(instruction.length).toBeGreaterThan(0);
    });
  });

  describe('getSelfUpdateUnavailableInstruction', () => {
    it('should return fallback message', () => {
      const msg = config.getSelfUpdateUnavailableInstruction('piclaw');
      expect(msg).toContain('Update piclaw');
    });
  });

  describe('getPackageDir and derived paths', () => {
    it('getPackageJsonPath should point to package.json', () => {
      const path = config.getPackageJsonPath();
      expect(path).toContain('package.json');
    });

    it('getReadmePath should point to README.md', () => {
      const path = config.getReadmePath();
      expect(path).toContain('README.md');
    });

    it('getDocsPath should point to docs directory', () => {
      const path = config.getDocsPath();
      expect(path).toContain('docs');
    });

    it('getExamplesPath should point to examples directory', () => {
      const path = config.getExamplesPath();
      expect(path).toContain('examples');
    });

    it('getChangelogPath should point to CHANGELOG.md', () => {
      const path = config.getChangelogPath();
      expect(path).toContain('CHANGELOG.md');
    });

    it('getInteractiveAssetsDir should return proper path', () => {
      const path = config.getInteractiveAssetsDir();
      expect(path).toContain('modes');
      expect(path).toContain('interactive');
      expect(path).toContain('assets');
    });

    it('getBundledInteractiveAssetPath should join correctly', () => {
      const path = config.getBundledInteractiveAssetPath('theme.json');
      expect(path).toContain('theme.json');
    });
  });

  describe('getPackageDir', () => {
    it('should respect PICLAW_PACKAGE_DIR env var', () => {
      vi.stubEnv('PICLAW_PACKAGE_DIR', '/custom/package');
      const dir = config.getPackageDir();
      expect(dir).toBe('/custom/package');
    });

    it('should expand ~ in PICLAW_PACKAGE_DIR', () => {
      vi.stubEnv('PICLAW_PACKAGE_DIR', '~/custompkg');
      const dir = config.getPackageDir();
      expect(dir).toBe(join(tempHome, 'custompkg'));
    });

    it('should handle PICLAW_PACKAGE_DIR as "~"', () => {
      vi.stubEnv('PICLAW_PACKAGE_DIR', '~');
      const dir = config.getPackageDir();
      expect(dir).toBe(homedir());
    });

    it('should find package.json by walking up from __dirname when no env', () => {
      // Reset env
      vi.unstubAllEnvs();
      const dir = config.getPackageDir();
      expect(existsSync(join(dir, 'package.json'))).toBe(true);
    });
  });

  describe('getThemesDir and related', () => {
    it('getCustomThemesDir should return proper path', () => {
      const dir = config.getCustomThemesDir();
      expect(dir).toContain('themes');
    });

    it('getExportTemplateDir should return proper path', () => {
      const dir = config.getExportTemplateDir();
      expect(dir).toContain('export-html');
    });
  });

  describe('package constants', () => {
    it('PACKAGE_NAME should be piclaw', () => {
      expect(config.PACKAGE_NAME).toBe('piclaw');
    });

    it('APP_NAME should be piclaw', () => {
      expect(config.APP_NAME).toBe('piclaw');
    });

    it('CONFIG_DIR_NAME should be .piclaw', () => {
      expect(config.CONFIG_DIR_NAME).toBe('.piclaw');
    });

    it('VERSION should be defined', () => {
      expect(config.VERSION).toBeDefined();
      expect(config.VERSION.length).toBeGreaterThan(0);
    });
  });

  describe('getShareViewerUrl', () => {
    it('should use default base URL', () => {
      const url = config.getShareViewerUrl('abc123');
      expect(url).toBe('https://pi.dev/session/#abc123');
    });

    it('should use PICLAW_SHARE_VIEWER_URL if set', () => {
      vi.stubEnv('PICLAW_SHARE_VIEWER_URL', 'https://custom.example.com/');
      const url = config.getShareViewerUrl('xyz789');
      expect(url).toBe('https://custom.example.com/#xyz789');
    });
  });
});
