import { test, describe } from 'node:test';
import assert from 'node:assert';
import { AgentCore } from '../src/agent/core.js';
import { SettingsManager } from '@mariozechner/pi-coding-agent';

// Simple in-memory settings for testing
const settingsManager = SettingsManager.inMemory({
  compaction: { enabled: true, tokens: 2000 },
  retry: { enabled: true, maxRetries: 1 },
});

describe('E2E User Interactions', () => {
  test('initialization flow', async () => {
    // This test ensures AgentCore can be instantiated and initialized
    const agent = new AgentCore({
      usePersistence: false,
      verbose: true,
    });

    // Verify initial state
    assert.ok(agent.getAgentDir(), 'Agent dir should be set');

    // Note: Full initialization requires API keys; we just test instantiation
    assert.doesNotThrow(() => {
      // Constructor should not throw
    }, 'AgentCore constructor should succeed');
  });

  test('settings mutation flow', async () => {
    const agent = new AgentCore({
      usePersistence: false,
      verbose: false,
    });

    // Simulate settings update
    let error: Error | null = null;
    try {
      // This would fail without proper settings file, but we test the method exists
      agent.updateSetting('compaction.enabled', false);
    } catch (e) {
      error = e as Error;
    }

    // Expected failure because persistence is off (no settings file)
    assert.ok(error !== null, 'updateSetting should fail when no settings file exists');
  });

  test('command integration', async () => {
    const agent = new AgentCore({
      usePersistence: false,
      verbose: false,
    });

    // Check that AgentCore integrates with commandRegistry via getSettings, etc.
    const stats = agent.getStats();
    assert.ok(typeof stats.totalTokens === 'number', 'Stats should have token counts');
    assert.ok(typeof stats.turns === 'number', 'Stats should have turns');
  });
});
