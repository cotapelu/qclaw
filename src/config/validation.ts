import { AgentCoreOptions } from '../agent/core.js';

/**
 * Validates AgentCore options and settings
 */

export interface ValidationError {
  path: string;
  message: string;
}

export function validateAgentCoreOptions(options: Partial<AgentCoreOptions>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (options.cwd && typeof options.cwd !== 'string') {
    errors.push({ path: 'cwd', message: 'must be a string' });
  }

  if (options.agentDir && typeof options.agentDir !== 'string') {
    errors.push({ path: 'agentDir', message: 'must be a string' });
  }

  if (options.model !== undefined && typeof options.model !== 'object') {
    errors.push({ path: 'model', message: 'must be a Model object' });
  }

  if (options.thinkingLevel !== undefined) {
    const validLevels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
    if (!validLevels.includes(options.thinkingLevel as string)) {
      errors.push({ path: 'thinkingLevel', message: `must be one of: ${validLevels.join(', ')}` });
    }
  }

  if (options.usePersistence !== undefined && typeof options.usePersistence !== 'boolean') {
    errors.push({ path: 'usePersistence', message: 'must be boolean' });
  }

  if (options.interactive !== undefined && typeof options.interactive !== 'boolean') {
    errors.push({ path: 'interactive', message: 'must be boolean' });
  }

  if (options.verbose !== undefined && typeof options.verbose !== 'boolean') {
    errors.push({ path: 'verbose', message: 'must be boolean' });
  }

  if (options.quiet !== undefined && typeof options.quiet !== 'boolean') {
    errors.push({ path: 'quiet', message: 'must be boolean' });
  }

  return errors;
}

export function validateSettings(settings: any): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // Compaction settings
  if (settings.compaction) {
    if (typeof settings.compaction.enabled !== 'boolean') {
      errors.push({ path: 'compaction.enabled', message: 'must be boolean' });
    }
    if (settings.compaction.tokens !== undefined && typeof settings.compaction.tokens !== 'number') {
      errors.push({ path: 'compaction.tokens', message: 'must be number' });
    }
    if (settings.compaction.tokens !== undefined && settings.compaction.tokens < 100) {
      errors.push({ path: 'compaction.tokens', message: 'must be at least 100' });
    }
  }

  // Retry settings
  if (settings.retry) {
    if (typeof settings.retry.enabled !== 'boolean') {
      errors.push({ path: 'retry.enabled', message: 'must be boolean' });
    }
    if (settings.retry.maxRetries !== undefined) {
      if (typeof settings.retry.maxRetries !== 'number') {
        errors.push({ path: 'retry.maxRetries', message: 'must be number' });
      } else if (settings.retry.maxRetries < 0) {
        errors.push({ path: 'retry.maxRetries', message: 'must be non-negative' });
      } else if (settings.retry.maxRetries > 10) {
        errors.push({ path: 'retry.maxRetries', message: 'must be at most 10' });
      }
    }
  }

  // Model
  if (settings.model !== undefined && typeof settings.model !== 'string') {
    errors.push({ path: 'model', message: 'must be a string (provider/model)' });
  }

  // Thinking level
  if (settings.thinkingLevel) {
    const validLevels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
    if (!validLevels.includes(settings.thinkingLevel)) {
      errors.push({ path: 'thinkingLevel', message: `must be one of: ${validLevels.join(', ')}` });
    }
  }

  // Tool permissions
  if (settings.toolPermissions) {
    if (settings.toolPermissions.allowedTools && !Array.isArray(settings.toolPermissions.allowedTools)) {
      errors.push({ path: 'toolPermissions.allowedTools', message: 'must be an array of strings' });
    }
    if (settings.toolPermissions.deniedTools && !Array.isArray(settings.toolPermissions.deniedTools)) {
      errors.push({ path: 'toolPermissions.deniedTools', message: 'must be an array of strings' });
    }
    if (typeof settings.toolPermissions.confirmDestructive !== 'boolean') {
      errors.push({ path: 'toolPermissions.confirmDestructive', message: 'must be boolean' });
    }
    if (settings.toolPermissions.allowedPaths && !Array.isArray(settings.toolPermissions.allowedPaths)) {
      errors.push({ path: 'toolPermissions.allowedPaths', message: 'must be an array of strings' });
    }
  }

  // Git settings
  if (settings.git) {
    if (typeof settings.git.autoCommit !== 'boolean') {
      errors.push({ path: 'git.autoCommit', message: 'must be boolean' });
    }
    if (typeof settings.git.commitMessage !== 'string') {
      errors.push({ path: 'git.commitMessage', message: 'must be a string' });
    }
  }

  // Logging settings
  if (settings.logging) {
    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (settings.logging.level && !validLogLevels.includes(settings.logging.level)) {
      errors.push({ path: 'logging.level', message: `must be one of: ${validLogLevels.join(', ')}` });
    }
    const validRotations = ['daily', 'hourly', 'none'];
    if (settings.logging.rotation && !validRotations.includes(settings.logging.rotation)) {
      errors.push({ path: 'logging.rotation', message: `must be one of: ${validRotations.join(', ')}` });
    }
    if (typeof settings.logging.dir !== 'string') {
      errors.push({ path: 'logging.dir', message: 'must be a string' });
    }
    const validFormats = ['text', 'json'];
    if (settings.logging.format && !validFormats.includes(settings.logging.format)) {
      errors.push({ path: 'logging.format', message: `must be one of: ${validFormats.join(', ')}` });
    }
  }

  // Budget settings
  if (settings.budget) {
    if (settings.budget.daily !== undefined && typeof settings.budget.daily !== 'number') {
      errors.push({ path: 'budget.daily', message: 'must be a number' });
    }
    if (settings.budget.monthly !== undefined && typeof settings.budget.monthly !== 'number') {
      errors.push({ path: 'budget.monthly', message: 'must be a number' });
    }
  }

  return { valid: errors.length === 0, errors };
}

export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(e => `  ${e.path}: ${e.message}`).join('\n');
}
