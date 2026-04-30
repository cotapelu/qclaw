#!/usr/bin/env node

/**
 * Unit tests for subtool_loader tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSubLoaderToolDefinition } from '../tools/subtool-loader.js';

// Mock context with exec function
const createMockContext = (cwd: string = "/tmp") => ({
  cwd,
  exec: vi.fn(),
});

describe('subtool_loader', () => {
  let mockCtx: any;
  const cwd = "/test/cwd";

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = createMockContext(cwd);
  });

  describe('tool definition', () => {
    it('should create a tool with name "subtool_loader"', () => {
      const tool = createSubLoaderToolDefinition(cwd);
      expect(tool.name).toBe('subtool_loader');
      expect(tool.label).toBe('SubTool Loader');
      expect(tool.description).toContain('Unified tool for system operations');
    });

    it('should have valid schema with all subtools', () => {
      const tool = createSubLoaderToolDefinition(cwd);
      const { schema } = tool.parameters as any;

      // The tool.parameters is a Union schema
      const parameters = tool.parameters as any;
      expect(parameters).toBeDefined();

      // TypeBox Union schemas have anyOf property
      const anyOf = parameters.anyOf as any[] | undefined;
      expect(anyOf).not.toBeUndefined();
      expect(Array.isArray(anyOf!)).toBe(true);

      // Check that common subtools are present
      const subtoolNames = anyOf!.map((item: any) => item.properties.subtool.const);
      expect(subtoolNames).toContain('bash');
      expect(subtoolNames).toContain('ls');
      expect(subtoolNames).toContain('read');
      expect(subtoolNames).toContain('grep');
      expect(subtoolNames).toContain('find');
      expect(subtoolNames).toContain('git');
      expect(subtoolNames).toContain('docker');
      expect(subtoolNames).toContain('ssh');
      expect(subtoolNames).toContain('http');
    });

    it('should have renderCall and renderResult defined', () => {
      const tool = createSubLoaderToolDefinition(cwd);
      expect(tool.renderCall).toBeDefined();
      expect(tool.renderResult).toBeDefined();
      expect(tool.renderShell).toBe('self');
    });
  });

  describe('execute routing', () => {
    it('should route bash subtool to executeBash', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: 'output', stderr: '' });

      const result = await tool.execute('test-bash', {
        subtool: 'bash',
        args: { command: 'echo hello' }
      }, undefined, undefined, mockCtx);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('output');
      expect(mockCtx.exec).toHaveBeenCalledWith('bash', ['-c', 'echo hello'], { cwd, signal: undefined, timeout: undefined });
    });

    it('should route ls subtool to executeLs', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: 'file1\nfile2', stderr: '' });

      const result = await tool.execute('test-ls', {
        subtool: 'ls',
        args: { path: '/tmp' }
      }, undefined, undefined, mockCtx);

      expect(result.isError).toBe(false);
      expect(mockCtx.exec).toHaveBeenCalledWith('ls', ['-la', '/tmp'], { signal: undefined });
    });

    it('should route ls without path, using default cwd', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: 'file1\nfile2', stderr: '' });

      const result = await tool.execute('test-ls-default', {
        subtool: 'ls',
        args: {}
      }, undefined, undefined, mockCtx);

      expect(result.isError).toBe(false);
      expect(mockCtx.exec).toHaveBeenCalledWith('ls', ['-la', cwd], { signal: undefined });
    });

    it('should handle ls execution error (non-zero exit code)', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 1, stdout: '', stderr: 'ls: cannot access' });

      const result = await tool.execute('test-ls-error', {
        subtool: 'ls',
        args: { path: '/nonexistent' }
      }, undefined, undefined, mockCtx);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ls: cannot access');
    });

    it('should route find subtool to executeFind', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: './file1.ts\n./file2.ts', stderr: '' });

      const result = await tool.execute('test-find', {
        subtool: 'find',
        args: { pattern: '*.ts', limit: 10 }
      }, undefined, undefined, mockCtx);

      expect(result.isError).toBe(false);
      expect(mockCtx.exec).toHaveBeenCalledWith('find', [cwd, '-name', '*.ts'], { signal: undefined });
    });

    it('should handle find execution error (non-zero exit code)', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 2, stdout: '', stderr: 'find: unknown expression' });

      const result = await tool.execute('test-find-error', {
        subtool: 'find',
        args: { pattern: '*.ts' }
      }, undefined, undefined, mockCtx);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('find: unknown expression');
    });

    it('should route read subtool to executeRead', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('line1\nline2\nline3')
      };
      // We need to mock the dynamic import
      vi.doMock('node:fs/promises', () => mockFs as any);

      const result = await tool.execute('test-read', {
        subtool: 'read',
        args: { path: '/test/file.txt', offset: 1, limit: 2 }
      }, undefined, undefined, mockCtx);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('line1');
    });

    it('should handle error when ctx.exec is not available', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      const result = await tool.execute('test-error', {
        subtool: 'bash',
        args: { command: 'echo test' }
      }, undefined, undefined, { cwd });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ctx.exec not available');
    });

    it('should handle execution errors', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      mockCtx.exec = vi.fn().mockRejectedValue(new Error('Command failed'));

      const result = await tool.execute('test-error-2', {
        subtool: 'bash',
        args: { command: 'invalid' }
      }, undefined, undefined, mockCtx);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Command failed');
    });

    it('should respect signal parameter', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: 'ok', stderr: '' });
      const signal = new AbortController().signal;

      await tool.execute('test-signal', {
        subtool: 'bash',
        args: { command: 'sleep 10' }
      }, signal, undefined, mockCtx);

      expect(mockCtx.exec).toHaveBeenCalledWith('bash', ['-c', 'sleep 10'], {
        cwd,
        signal,
        timeout: undefined
      });
    });

    it('should pass timeout from args', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: 'ok', stderr: '' });

      await tool.execute('test-timeout', {
        subtool: 'bash',
        args: { command: 'echo test', timeout: 30 }
      }, undefined, undefined, mockCtx);

      expect(mockCtx.exec).toHaveBeenCalledWith('bash', ['-c', 'echo test'], {
        cwd,
        signal: undefined,
        timeout: 30
      });
    });

    it('should use default cwd from definition when ctx.cwd not provided', async () => {
      const tool = createSubLoaderToolDefinition('/default/cwd');
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: 'ok', stderr: '' });
      const ctxWithoutCwd = { exec: mockCtx.exec };

      await tool.execute('test-cwd', {
        subtool: 'bash',
        args: { command: 'pwd' }
      }, undefined, undefined, ctxWithoutCwd);

      expect(mockCtx.exec).toHaveBeenCalledWith('bash', ['-c', 'pwd'], {
        cwd: '/default/cwd',
        signal: undefined,
        timeout: undefined
      });
    });

    it('should prefer ctx.cwd over definition cwd', async () => {
      const tool = createSubLoaderToolDefinition('/default/cwd');
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: 'ok', stderr: '' });
      mockCtx.cwd = '/override/cwd';

      await tool.execute('test-cwd-override', {
        subtool: 'bash',
        args: { command: 'pwd' }
      }, undefined, undefined, mockCtx);

      expect(mockCtx.exec).toHaveBeenCalledWith('bash', ['-c', 'pwd'], {
        cwd: '/override/cwd',
        signal: undefined,
        timeout: undefined
      });
    });
  });

  describe('find execution with truncation', () => {
    it('should truncate results when exceeding limit', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      const manyLines = Array.from({ length: 1500 }, (_, i) => `./file${i}.ts`).join('\n');
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: manyLines, stderr: '' });

      const result = await tool.execute('test-find-truncate', {
        subtool: 'find',
        args: { pattern: '*.ts', limit: 100 }
      }, undefined, undefined, mockCtx);

      expect(result.isError).toBe(false);
      const details = result.details as any;
      expect(details.truncated).toBe(true);
      expect(details.returned).toBe(100);
      expect(details.total).toBe(1500);
      expect(result.content[0].text).toContain('[Truncated: 100/1500]');
    });

    it('should not truncate when under limit', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 0, stdout: './a.ts\n./b.ts', stderr: '' });

      const result = await tool.execute('test-find-no-truncate', {
        subtool: 'find',
        args: { pattern: '*.ts' }
      }, undefined, undefined, mockCtx);

      expect(result.isError).toBe(false);
      const details = result.details as any;
      expect(details.truncated).toBe(false);
      expect(details.returned).toBe(2);
      expect(details.total).toBe(2);
    });
  });

  describe('grep execution with truncation', () => {
    it('should truncate when exceeding limit', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      const manyLines = Array.from({ length: 200 }, (_, i) => `match${i}: pattern`).join('\n');
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 1, stdout: manyLines, stderr: '' }); // grep returns 1 for no matches or partial

      const result = await tool.execute('test-grep-truncate', {
        subtool: 'grep',
        args: { pattern: 'pattern', limit: 50 }
      }, undefined, undefined, mockCtx);

      expect(result.isError).toBe(false);
      const details = result.details as any;
      expect(details.truncated).toBe(true);
      expect(details.returned).toBe(50);
    });

    it('should show "(no matches)" when grep finds nothing', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 1, stdout: '', stderr: '' });

      const result = await tool.execute('test-grep-none', {
        subtool: 'grep',
        args: { pattern: 'nonexistent' }
      }, undefined, undefined, mockCtx);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('(no matches)');
    });

    it('should error on non-zero grep exit code (not 1)', async () => {
      const tool = createSubLoaderToolDefinition(cwd);
      mockCtx.exec = vi.fn().mockResolvedValue({ code: 2, stdout: '', stderr: 'grep error' });

      const result = await tool.execute('test-grep-error', {
        subtool: 'grep',
        args: { pattern: 'test' }
      }, undefined, undefined, mockCtx);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('grep error');
    });
  });


  describe('unknown subtool', () => {
    it('should return error for unknown subtool', async () => {
      const tool = createSubLoaderToolDefinition(cwd);

      const result = await tool.execute('test-unknown', {
        subtool: 'unknown_tool' as any,
        args: {}
      }, undefined, undefined, mockCtx);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown subtool: unknown_tool');
    });
  });

  // render tests omitted for brevity - focus on execute logic
});
