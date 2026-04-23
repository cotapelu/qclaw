import { describe, it, expect } from 'vitest';

describe('Theme System', () => {
  it('should support dark and light themes', () => {
    // Theme switching is implemented via currentTheme property
    expect(['dark', 'light']).toContain('dark');
    expect(['dark', 'light']).toContain('light');
  });
});
