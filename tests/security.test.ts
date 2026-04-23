import { test, describe } from 'node:test';
import assert from 'node:assert';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from 'fs';

// Import sandbox functions
import { validatePath, validateFileSize, checkOutputSize, SecurityError, createSandboxFromSettings } from '../src/tools/sandbox.js';

describe('Sandbox Security', () => {
  const cwd = '/home/user/project';

  test('validatePath blocks path traversal with ../', () => {
    assert.throws(() => {
      validatePath('../../../etc/passwd', cwd, {});
    }, (err: Error) => err instanceof SecurityError);
  });

  test('validatePath blocks absolute paths outside cwd', () => {
    assert.throws(() => {
      validatePath('/etc/shadow', cwd, {});
    }, (err: Error) => /Path traversal detected|Access denied/i.test(err.message));
  });

  test('validatePath allows paths within cwd', () => {
    const result = validatePath('./src/index.ts', cwd, {});
    assert.ok(result.includes('project/src/index.ts'));
  });

  test('validatePath respects allowedPaths whitelist', () => {
    const config = { allowedPaths: ['/home/user/allowed'] };
    // Path inside whitelist should pass
    const result = validatePath('/home/user/allowed/file.txt', cwd, config);
    assert.ok(result.includes('allowed/file.txt'));
    
    // Path outside whitelist should fail
    assert.throws(() => {
      validatePath('/home/user/other/file.txt', cwd, config);
    }, (err: Error) => /not in whitelist/i.test(err.message));
  });

  test('validatePath blocks deniedPaths', () => {
    const config = { deniedPaths: ['/home/user/secret'] };
    assert.throws(() => {
      validatePath('/home/user/secret/data.txt', cwd, config);
    }, (err: Error) => /Access denied/i.test(err.message));
  });

  test('validateFileSize throws on oversized files', () => {
    const maxSize = 1024 * 1024; // 1MB
    assert.throws(() => {
      validateFileSize(2 * 1024 * 1024, maxSize);
    }, (err: Error) => /File too large/i.test(err.message));
  });

  test('validateFileSize accepts files within limit', () => {
    // Should not throw
    validateFileSize(512 * 1024, 1024 * 1024);
  });

  test('checkOutputSize truncates oversized output', () => {
    const hugeOutput = 'a'.repeat(200 * 1024); // 200KB
    const maxSize = 100 * 1024; // 100KB
    const result = checkOutputSize(hugeOutput, maxSize);
    assert.ok(result.length < 200 * 1024, 'Output should be truncated');
    assert.ok(result.includes('truncated'), 'Should mention truncation');
  });

  test('createSandboxFromSettings extracts settings correctly', () => {
    const settings = {
      toolPermissions: {
        allowedPaths: ['/allowed'],
        deniedPaths: ['/denied'],
        maxFileSize: 5000000,
        maxTotalOutput: 50000,
        allowedCommands: ['cat', 'ls'],
        deniedCommands: ['rm', 'del'],
        timeoutMs: 15000,
        allowNetwork: true,
      }
    };
    const config = createSandboxFromSettings(settings);
    assert.deepStrictEqual(config.allowedPaths, ['/allowed']);
    assert.strictEqual(config.maxFileSize, 5000000);
    assert.strictEqual(config.allowNetwork, true);
  });
});

describe('Integration: Path Traversal Prevention', () => {
  test('validatePath blocks common traversal patterns', () => {
    const cwd = '/opt/app/data';
    const attacks = [
      '../../../etc/passwd',
      '....//....//....//etc/passwd',
      // Note: URL-encoded patterns (%2e) not decoded by path module, so not effective in CLI context
      // Windows backslash paths not applicable on Unix; skip
    ];
    
    for (const attack of attacks) {
      assert.throws(() => {
        validatePath(attack, cwd, {});
      }, (err: Error) => err instanceof SecurityError,
      `Should block: ${attack}`);
    }
  });
});
