#!/usr/bin/env node

/**
 * Unit tests for piclaw-extension.ts
 */

import { describe, it, expect, vi } from 'vitest';
import piclawExtension from '../extensions/piclaw-extension.js';

describe('piclaw-extension', () => {
  it('should be a function that accepts api', () => {
    expect(typeof piclawExtension).toBe('function');
  });

  it('should not throw when called with mock api', () => {
    const mockApi = {
      registerTool: vi.fn(),
      registerCommand: vi.fn(),
      on: vi.fn(),
      registerMessageRenderer: vi.fn(),
      registerProvider: vi.fn(),
      registerShortcut: vi.fn(),
      registerFlag: vi.fn(),
      getFlag: vi.fn(),
      sendMessage: vi.fn(),
      requestRender: vi.fn(),
      // add more stubs if needed
    } as any;
    expect(() => piclawExtension(mockApi)).not.toThrow();
  });

  it('should not register anything by default (empty extension)', () => {
    const mockApi = {
      registerTool: vi.fn(),
      registerCommand: vi.fn(),
      on: vi.fn(),
      registerMessageRenderer: vi.fn(),
      registerProvider: vi.fn(),
      registerShortcut: vi.fn(),
      registerFlag: vi.fn(),
      getFlag: vi.fn(),
      sendMessage: vi.fn(),
    } as any;
    piclawExtension(mockApi);
    expect(mockApi.registerTool).not.toHaveBeenCalled();
    expect(mockApi.registerCommand).not.toHaveBeenCalled();
    expect(mockApi.registerProvider).not.toHaveBeenCalled();
  });
});
