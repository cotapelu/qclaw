import { describe, it, expect } from 'vitest';
import { t, translations } from '../src/agent/i18n';

describe('i18n System', () => {
  it('should return English translation for status.model', () => {
    expect(t('en', 'model', 'status')).toBe('Model');
  });

  it('should return Vietnamese translation for status.model', () => {
    expect(t('vi', 'model', 'status')).toBe('Mô hình');
  });

  it('should fallback to key if translation missing', () => {
    expect(t('en', 'unknown_key', 'section')).toBe('unknown_key');
  });

  it('should have all required locales', () => {
    expect(Object.keys(translations)).toContain('en');
    expect(Object.keys(translations)).toContain('vi');
  });
});
