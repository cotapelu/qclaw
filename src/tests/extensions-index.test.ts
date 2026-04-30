#!/usr/bin/env node

/**
 * Unit tests for extensions/index.ts
 * Ensures all custom tools and providers are registered.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the module under test
vi.mock('../extensions/providers/kilo-provider.js', () => ({
  registerKiloProvider: vi.fn(),
}));

vi.mock('../extensions/tools/todos-tool.js', () => ({
  registerTodosTool: vi.fn(),
}));

vi.mock('../extensions/tools/memory-tool.js', () => ({
  registerMemoryTool: vi.fn(),
}));

vi.mock('../extensions/tools/echo-tool.js', () => ({
  registerEchoTool: vi.fn(),
}));

vi.mock('../extensions/tools/system-info-tool.js', () => ({
  registerSystemInfoTool: vi.fn(),
}));

vi.mock('../extensions/auto-memory.js', () => ({
  default: vi.fn(),
}));

// Now import the module after mocks are set up
import extensionIndex from '../extensions/index.js';
import { registerKiloProvider } from '../extensions/providers/kilo-provider.js';
import { registerTodosTool } from '../extensions/tools/todos-tool.js';
import { registerMemoryTool } from '../extensions/tools/memory-tool.js';
import { registerEchoTool } from '../extensions/tools/echo-tool.js';
import { registerSystemInfoTool } from '../extensions/tools/system-info-tool.js';
import autoMemory from '../extensions/auto-memory.js';

describe('extensions/index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be a function that accepts api', () => {
    expect(typeof extensionIndex).toBe('function');
  });

  it('should register kilo provider', () => {
    const mockApi = {} as any;
    extensionIndex(mockApi);
    expect(registerKiloProvider).toHaveBeenCalledWith(mockApi);
  });

  it('should register todos tool', () => {
    const mockApi = {} as any;
    extensionIndex(mockApi);
    expect(registerTodosTool).toHaveBeenCalledWith(mockApi);
  });

  it('should register memory tool', () => {
    const mockApi = {} as any;
    extensionIndex(mockApi);
    expect(registerMemoryTool).toHaveBeenCalledWith(mockApi);
  });

  it('should register echo tool', () => {
    const mockApi = {} as any;
    extensionIndex(mockApi);
    expect(registerEchoTool).toHaveBeenCalledWith(mockApi);
  });

  it('should register system info tool', () => {
    const mockApi = {} as any;
    extensionIndex(mockApi);
    expect(registerSystemInfoTool).toHaveBeenCalledWith(mockApi);
  });

  it('should load auto-memory integration', () => {
    const mockApi = {} as any;
    extensionIndex(mockApi);
    expect(autoMemory).toHaveBeenCalledWith(mockApi);
  });

  it('should call all registrations in correct order (not guaranteed but all called)', () => {
    const mockApi = {} as any;
    extensionIndex(mockApi);
    // All mocks should be called exactly once
    expect(registerKiloProvider).toHaveBeenCalledTimes(1);
    expect(registerTodosTool).toHaveBeenCalledTimes(1);
    expect(registerMemoryTool).toHaveBeenCalledTimes(1);
    expect(registerEchoTool).toHaveBeenCalledTimes(1);
    expect(registerSystemInfoTool).toHaveBeenCalledTimes(1);
    expect(autoMemory).toHaveBeenCalledTimes(1);
  });
});
