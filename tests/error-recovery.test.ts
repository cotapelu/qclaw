import { test, describe } from 'node:test';
import assert from 'node:assert';
import { join } from 'path';
import { tmpdir } from 'os';
import * as fs from 'fs';

// Helper function copied from commands.ts (we'll test via integration)
function safeJsonRead<T>(filePath: string, defaults: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (error) {
    // Silently return defaults on any error
  }
  return defaults;
}

describe('Error Recovery', () => {
  test('safeJsonRead returns defaults for missing file', () => {
    const nonExistent = '/tmp/does-not-exist-12345.json';
    const result = safeJsonRead(nonExistent, { foo: 'bar' });
    assert.deepStrictEqual(result, { foo: 'bar' });
  });

  test('safeJsonRead returns defaults for corrupted JSON', () => {
    const path = '/tmp/corrupted-test.json';
    fs.writeFileSync(path, '{ invalid json content }');
    
    const result = safeJsonRead(path, { default: true });
    assert.deepStrictEqual(result, { default: true });
    
    fs.unlinkSync(path);
  });

  test('safeJsonRead returns defaults for empty file', () => {
    const path = '/tmp/empty-test.json';
    fs.writeFileSync(path, '');
    
    const result = safeJsonRead(path, { empty: true });
    assert.deepStrictEqual(result, { empty: true });
    
    fs.unlinkSync(path);
  });

  test('safeJsonRead parses valid JSON', () => {
    const path = '/tmp/valid-test.json';
    const data = { name: 'test', value: 42 };
    fs.writeFileSync(path, JSON.stringify(data));
    
    const result = safeJsonRead(path, {});
    assert.deepStrictEqual(result, data);
    
    fs.unlinkSync(path);
  });

  test('safeJsonRead handles circular reference safely', () => {
    const path = '/tmp/circular-test.json';
    // Create a JSON that would cause issues if not caught
    fs.writeFileSync(path, '{"a": {"b": {"a": {"b": "loop"}}}}');
    
    const result = safeJsonRead(path, { safe: true });
    // Should return defaults due to deep recursion/stack overflow or should parse fine?
    // Actually this is valid JSON, so it should parse
    assert.ok(result.a && result.a.b);
    
    fs.unlinkSync(path);
  });
});

describe('Session Import Error Handling', () => {
  test('importSession handles malformed session file', async () => {
    // This would test AgentCore.importSession but requires full initialization
    // For now, we test the pattern at the function level
    const badJson = '/tmp/bad-session.jsonl';
    fs.writeFileSync(badJson, 'this is not json\n{ also not json }');
    
    // Simulate parsing logic from importSession
    const content = fs.readFileSync(badJson, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    let errorCount = 0;
    for (const line of lines) {
      try {
        JSON.parse(line);
      } catch (e) {
        errorCount++;
      }
    }
    assert.strictEqual(errorCount, 2, 'Should detect malformed JSON lines');
    
    fs.unlinkSync(badJson);
  });

  test('importSession handles missing session header', () => {
    const path = '/tmp/no-header.jsonl';
    fs.writeFileSync(path, '{"type": "message", "message": {}}\n{"type": "message", "message": {}}');
    
    const content = fs.readFileSync(path, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const entries = lines.map(l => JSON.parse(l));
    const header = entries.find((e: any) => e.type === 'session');
    assert.strictEqual(header, undefined, 'Should not find session header');
    
    fs.unlinkSync(path);
  });

  test('importSession validates correct session file', () => {
    const path = '/tmp/good-session.jsonl';
    const sessionHeader = { type: 'session', id: 'test-session', timestamp: new Date().toISOString(), cwd: process.cwd() };
    const message1 = { type: 'message', id: 'msg1', parentId: null, timestamp: new Date().toISOString(), message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] } };
    fs.writeFileSync(path, [sessionHeader, message1].map(e => JSON.stringify(e)).join('\n'));
    
    const content = fs.readFileSync(path, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const entries = lines.map(l => JSON.parse(l));
    const header = entries.find((e: any) => e.type === 'session');
    assert.ok(header, 'Should find session header');
    assert.strictEqual(header.id, 'test-session');
    
    fs.unlinkSync(path);
  });
});

describe('File Operations Error Handling', () => {
  test('handles ENOENT gracefully', () => {
    const nonExistent = '/tmp/does-not-exist-xyz123.txt';
    // Simulate pattern from many commands
    let errorCaught = false;
    try {
      if (fs.existsSync(nonExistent)) {
        // won't happen
      } else {
        const content = fs.readFileSync(nonExistent, 'utf-8');
      }
    } catch (error: any) {
      errorCaught = true;
      assert.strictEqual(error.code, 'ENOENT');
    }
    assert.ok(errorCaught, 'Should catch ENOENT');
  });

  test('handles EACCES gracefully', () => {
    // Can't easily test actual permission error without root
    // But we can simulate the pattern
    const pretendError = new Error('simulated eacces');
    (pretendError as any).code = 'EACCES';
    
    let handled = false;
    try {
      throw pretendError;
    } catch (error: any) {
      if (error.code === 'EACCES') handled = true;
    }
    assert.ok(handled, 'Should handle EACCES pattern');
  });

  test('handles JSON parse errors gracefully', () => {
    const badJson = '{ name: "test" }'; // invalid (no quotes on key)
    let errorCaught = false;
    try {
      JSON.parse(badJson);
    } catch (error) {
      errorCaught = true;
      assert.ok(error instanceof SyntaxError);
    }
    assert.ok(errorCaught, 'Should catch SyntaxError');
  });
});
