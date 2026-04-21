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
  getCostHistory: () => []
};

const mockSessionManager = {
  getEntries: () => [],
  getTree: () => [],
  getLeafEntry: () => null,
  getHeader: () => ({ id: 'test' }),
  getCwd: () => process.cwd(),
  isPersisted: () => false,
  getSessionDir: () => null
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
});
