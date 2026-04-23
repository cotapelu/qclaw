import { describe, it, expect } from 'vitest';
import { AgentTUI } from '../src/tui';

describe('AgentTUI Smoke', () => {
  it('should have AgentTUI class defined', () => {
    expect(AgentTUI).toBeDefined();
  });
});
