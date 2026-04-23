import { test, describe } from 'node:test';
import assert from 'node:assert';
import { commandRegistry } from '../src/agent/commands.js';

// Minimal mocks
const mockAgent = {
  getStats: () => ({
    totalTokens: 100,
    promptTokens: 60,
    completionTokens: 40,
    toolCalls: 0,
    toolExecutionTime: 0,
    errors: 0,
    turns: 1,
    sessionDuration: 1.2,
    estimatedCost: 0.001
  }),
  getSettings: () => ({
    compaction: { enabled: true, tokens: 2000 },
    retry: { enabled: true, maxRetries: 2 },
    model: undefined,
    thinkingLevel: 'off',
    toolPermissions: { allowedTools: [], deniedTools: [], confirmDestructive: true, allowedPaths: [] },
    logging: { dir: '', level: 'info', rotation: 'daily', format: 'text' }
  }),
  getConfig: () => ({ cwd: process.cwd(), agentDir: '/tmp/agent', model: null, interactive: false, verbose: false, persisted: false, stats: mockAgent.getStats() }),
  getModel: () => null,
  getModelRegistry: () => ({ getAvailable: async () => [] }),
  updateSetting: () => {},
  applySettings: () => {},
  getAgentDir: () => '/tmp/agent',
  getCostHistory: () => [],
  getSession: () => null // No active session in tests
};

const mockSessionManager = {
  getEntries: () => [],
  getTree: () => [],
  getLeafEntry: () => null,
  getHeader: () => ({ id: 'test' }),
  getCwd: () => process.cwd(),
  isPersisted: () => false,
  getSessionDir: () => null,
  newSession: () => {},
  branch: (id: string) => {},
  setSessionFile: (path: string) => {}
};

const mockResourceLoader = {
  getSkills: () => ({ skills: [] }),
  getExtensions: () => ({ extensions: [] }),
  getPrompts: () => ({ prompts: [] }),
  reload: async () => {}
};

const handlers = {
  agent: mockAgent,
  sessionManager: mockSessionManager,
  resourceLoader: mockResourceLoader
};

describe('Command Registry', () => {
  test('help command returns help text', async () => {
    const result = await commandRegistry.execute('help', handlers);
    assert.ok(result.includes('Pi SDK Agent'), 'Help should include title');
    assert.ok(result.includes('SESSION MANAGEMENT'), 'Help should include sections');
  });

  test('stats command returns statistics', async () => {
    const result = await commandRegistry.execute('stats', handlers);
    assert.ok(result.includes('Session Statistics'), 'Stats should include header');
    assert.ok(result.includes('Turns:'), 'Stats should show turns');
    assert.ok(result.includes('Tokens:'), 'Stats should show tokens');
  });

  test('settings command returns current settings', async () => {
    const result = await commandRegistry.execute('settings', handlers);
    assert.ok(result.includes('Current Settings'), 'Should include settings header');
    assert.ok(result.includes('Compaction'), 'Should show compaction section');
  });

  test('models command shows current model info', async () => {
    const result = await commandRegistry.execute('models', handlers);
    assert.ok(result.includes('Model Information'), 'Should include model info header');
  });

  test('cost command shows current session cost', async () => {
    const result = await commandRegistry.execute('cost', handlers);
    assert.ok(result.includes('Estimated cost'), 'Should include cost');
  });

  test('perf command shows performance dashboard', async () => {
    const result = await commandRegistry.execute('perf', handlers);
    assert.ok(result.includes('Performance Dashboard'), 'Should include perf header');
  });

  test('export command usage', async () => {
    const result = await commandRegistry.execute('export', handlers);
    assert.ok(result.includes('No entries') || result.includes('Exported'), 'Should handle export');
  });

  test('new command creates session', async () => {
    const result = await commandRegistry.execute('new', handlers);
    assert.ok(result.includes('new session'), 'Should confirm new session');
  });

  test('fork command branches session', async () => {
    // Setup: leaf entry exists
    mockSessionManager.getLeafEntry = () => ({ id: 'leaf123' });
    const result = await commandRegistry.execute('fork', handlers);
    assert.ok(result.includes('Forked'), 'Should confirm fork');
  });

  test('fork without leaf returns error', async () => {
    mockSessionManager.getLeafEntry = () => null;
    const result = await commandRegistry.execute('fork', handlers);
    assert.ok(result.includes('No current leaf') || result.includes('❌'), 'Should error without leaf');
  });

  test('session command shows session info', async () => {
    mockSessionManager.getTree = () => [{ entry: { id: 'test' }, children: [] }];
    mockSessionManager.getHeader = () => ({ id: 'header123' });
    mockSessionManager.isPersisted = () => true;
    mockSessionManager.getEntries = () => [{ type: 'message' }];
    const result = await commandRegistry.execute('session', handlers);
    assert.ok(result.includes('Session Info'), 'Should show session info');
  });

  test('graph command visualizes tree', async () => {
    mockSessionManager.getTree = () => [{
      entry: { id: 'root' },
      children: [{ entry: { id: 'child' }, children: [] }]
    }];
    const result = await commandRegistry.execute('graph', handlers);
    assert.ok(result.includes('Session Graph') || result.includes('└'), 'Should show graph');
  });

  test('search command finds messages', async () => {
    mockSessionManager.getEntries = () => [{
      type: 'message',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'Hello world test query' }]
      }
    }];
    const result = await commandRegistry.execute('search', handlers, 'test query');
    assert.ok(result.includes('Search results') || result.includes('world'), 'Should find matches');
  });

  test('labels and notes commands with missing session dir', async () => {
    // sessionDir is null in mock, so command should return error
    const result = await commandRegistry.execute('labels', handlers);
    assert.ok(result.includes('Session directory not available') || result.includes('Labels'), 'Should handle missing session dir');
  });

  test('profiles command shows profiles', async () => {
    const result = await commandRegistry.execute('profiles', handlers);
    assert.ok(result.includes('Profiles'), 'Should show profiles list');
  });

  test('health command runs diagnostics', async () => {
    const result = await commandRegistry.execute('health', handlers);
    console.log('HEALTH OUTPUT:', result); // Debug
    assert.ok(result.includes('Health Check') || result.includes('🩺'), 'Should show health info');
  });
});
