import { test, describe } from 'node:test';
import assert from 'node:assert';
import { AgentCore } from '../src/agent/core.js';

describe('AgentCore Module', () => {
  test('AgentCore class exists and is a constructor', () => {
    assert.ok(typeof AgentCore === 'function', 'AgentCore should be a constructor');
  });

  test('AgentCore has expected methods', () => {
    const methods = [
      'initialize', 'prompt', 'getStats', 'getSettings', 'updateSetting', 'applySettings', 'getCostHistory'
    ];
    for (const method of methods) {
      assert.ok(typeof AgentCore.prototype[method] === 'function', `AgentCore should have method ${method}`);
    }
  });
});
