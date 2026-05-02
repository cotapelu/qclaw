#!/usr/bin/env node

/**
 * Unit tests for system-info-tool.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSystemInfoTool } from '../extensions/tools/system-info-tool.js';

describe('system_info tool', () => {
  let capturedTool: any;
  const mockApi = {
    registerTool: vi.fn((tool: any) => { capturedTool = tool; }),
    on: vi.fn(),
    registerCommand: vi.fn(),
    registerMessageRenderer: vi.fn(),
    registerShortcut: vi.fn(),
    registerFlag: vi.fn(),
    getFlag: vi.fn(),
    sendMessage: vi.fn(),
    requestRender: vi.fn(),
  } as any;

  beforeEach(() => {
    capturedTool = undefined;
    mockApi.registerTool.mockClear();
  });

  it('should register the tool', () => {
    registerSystemInfoTool(mockApi);
    expect(mockApi.registerTool).toHaveBeenCalledTimes(1);
    expect(capturedTool).toBeDefined();
    expect(capturedTool.name).toBe('system_info');
  });

  it('should have proper metadata', () => {
    registerSystemInfoTool(mockApi);
    expect(capturedTool.label).toBe('System Info');
    expect(capturedTool.description).toContain('system information');
    expect(capturedTool.parameters.type).toBe('object');
  });

  it('should execute and return real system info', async () => {
    registerSystemInfoTool(mockApi);

    const result = await capturedTool.execute('test', {}, undefined, undefined, { cwd: process.cwd() });

    // Result should have content and details
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('details');
    expect(result.content[0].type).toBe('text');

    const info = JSON.parse(result.content[0].text);
    expect(info).toHaveProperty('platform');
    expect(info).toHaveProperty('arch');
    expect(info).toHaveProperty('osRelease');
    expect(info).toHaveProperty('nodeVersion');
    expect(info).toHaveProperty('uptime');
    expect(info).toHaveProperty('totalMemoryMB');
    expect(info).toHaveProperty('freeMemoryMB');
    expect(info).toHaveProperty('cpuCores');
    expect(info).toHaveProperty('cpuModel');

    // Type checks
    expect(typeof info.platform).toBe('string');
    expect(typeof info.arch).toBe('string');
    expect(typeof info.nodeVersion).toBe('string');
    expect(typeof info.uptime).toBe('number');
    expect(info.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof info.totalMemoryMB).toBe('number');
    expect(info.totalMemoryMB).toBeGreaterThan(0);
    expect(typeof info.cpuCores).toBe('number');
    expect(info.cpuCores).toBeGreaterThan(0);
  });

  it('should include details in result', async () => {
    registerSystemInfoTool(mockApi);

    const result = await capturedTool.execute('test', {}, undefined, undefined, { cwd: process.cwd() });

    expect(result.details).toBeDefined();
    const info = JSON.parse(result.content[0].text);
    expect(result.details.platform).toBe(info.platform);
    expect(result.details.cpuModel).toBe(info.cpuModel);
  });
});
