#!/usr/bin/env node

/**
 * Unit tests for apt.ts sub-tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeApt, aptSchema } from '../tools/sub-tools/apt.js';

describe('apt tool', () => {
  let mockCtx: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = {
      cwd: '/tmp',
      exec: vi.fn(),
    };
  });

  describe('schema', () => {
    it('aptSchema should be defined', () => {
      expect(aptSchema).toBeDefined();
      expect(aptSchema.type).toBe('object');
    });
  });

  describe('executeApt', () => {
    it('should execute apt-get install with packages', async () => {
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: 'installed', stderr: '' });

      const result = await executeApt({ command: 'install', packages: ['nginx'] }, '/tmp', undefined, mockCtx);

      expect(mockCtx.exec).toHaveBeenCalledWith('bash', ['-c', 'apt-get -y install nginx'], { cwd: '/tmp', signal: undefined, timeout: undefined });
      expect(result.isError).toBe(false);
      expect(result.details?.command).toBe('install');
    });

    it('should execute apt-get remove', async () => {
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: 'removed', stderr: '' });

      const result = await executeApt({ command: 'remove', packages: ['vim'] }, '/tmp', undefined, mockCtx);

      expect(mockCtx.exec).toHaveBeenCalledWith('bash', ['-c', 'apt-get -y remove vim'], { cwd: '/tmp', signal: undefined, timeout: undefined });
      expect(result.isError).toBe(false);
    });

    it('should execute apt list when command is list', async () => {
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: 'Listing...', stderr: '' });

      const result = await executeApt({ command: 'list', packages: ['nginx'] }, '/tmp', undefined, mockCtx);

      // args: ["-c", "apt list nginx --installed ..."]
      const cmd = mockCtx.exec.mock.calls[0][1][1];
      expect(cmd).toContain('apt list nginx --installed');
      expect(result.isError).toBe(false);
    });

    it('should execute apt-cache search', async () => {
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: 'results', stderr: '' });

      await executeApt({ command: 'search', packages: ['apache'] }, '/tmp', undefined, mockCtx);

      const cmd = mockCtx.exec.mock.calls[0][1][1];
      expect(cmd).toBe('apt-cache search apache');
    });

    it('should handle update flag', async () => {
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: 'ok', stderr: '' });

      await executeApt({ command: 'install', packages: ['nginx'], update: true }, '/tmp', undefined, mockCtx);

      // Should call apt-get update first, then apt-get -y install nginx
      expect(mockCtx.exec).toHaveBeenCalledTimes(2);
      // Each call: ctx.exec('bash', ['-c', cmd], options)
      expect(mockCtx.exec.mock.calls[0][1][1]).toBe('apt-get update');
      expect(mockCtx.exec.mock.calls[1][1][1]).toBe('apt-get -y install nginx');
    });

    it('should handle error exit code', async () => {
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 1, stdout: '', stderr: 'error' });

      const result = await executeApt({ command: 'install', packages: ['foo'] }, '/tmp', undefined, mockCtx);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('error');
    });

    it('should handle exceptions', async () => {
      mockCtx.exec = vi.fn().mockRejectedValue(new Error('exec failed'));

      const result = await executeApt({ command: 'install', packages: ['foo'] }, '/tmp', undefined, mockCtx);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('apt error');
    });

    it('should pass timeout from args', async () => {
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: '', stderr: '' });

      await executeApt({ command: 'install', packages: ['nginx'], timeout: 60 }, '/tmp', undefined, mockCtx);

      // Last call options
      const lastCallOpts = mockCtx.exec.mock.calls[mockCtx.exec.mock.calls.length - 1][2];
      expect(lastCallOpts.timeout).toBe(60);
    });
  });
});
