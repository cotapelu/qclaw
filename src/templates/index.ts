/**
 * Session Templates - Pre-configured setups for common workflows
 *
 * Templates define:
 * - Model preference
 * - Thinking level
 * - Compaction settings
 * - Initial system prompt additions
 * - Custom tools to enable
 */

export interface SessionTemplate {
  name: string;
  description: string;
  config: {
    model?: string;
    thinkingLevel?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
    compaction?: { enabled: boolean; tokens?: number };
    retry?: { enabled: boolean; maxRetries?: number };
    budget?: { daily?: number; monthly?: number };
    toolPermissions?: {
      allowedTools?: string[];
      deniedTools?: string[];
      confirmDestructive?: boolean;
    };
  };
  initialPrompt?: string;
  tags?: string[];
}

export const DEFAULT_TEMPLATES: Record<string, SessionTemplate> = {
  default: {
    name: 'default',
    description: 'Balanced settings for general coding assistance',
    config: {
      thinkingLevel: 'low',
      compaction: { enabled: true, tokens: 2000 },
      retry: { enabled: true, maxRetries: 2 },
    },
    tags: ['general', 'balanced']
  },
  fast: {
    name: 'fast',
    description: 'Maximum speed, lower quality (good for simple tasks)',
    config: {
      thinkingLevel: 'off',
      compaction: { enabled: false, tokens: 4000 },
      retry: { enabled: true, maxRetries: 1 },
    },
    tags: ['speed', 'simple']
  },
  thorough: {
    name: 'thorough',
    description: 'Deep thinking, extensive analysis (for complex problems)',
    config: {
      thinkingLevel: 'high',
      compaction: { enabled: true, tokens: 4000 },
      retry: { enabled: true, maxRetries: 3 },
    },
    initialPrompt: 'I need thorough analysis. Please think step-by-step and consider edge cases.',
    tags: ['quality', 'analysis']
  },
  reviewer: {
    name: 'reviewer',
    description: 'Configured for code reviews and quality checks',
    config: {
      thinkingLevel: 'medium',
      compaction: { enabled: true, tokens: 3000 },
      retry: { enabled: true, maxRetries: 2 },
      toolPermissions: {
        deniedTools: ['write', 'bash'], // read-only for reviews
      },
    },
    initialPrompt: 'Act as a senior code reviewer. Focus on: security, performance, maintainability, and best practices. Provide constructive feedback.',
    tags: ['review', 'quality']
  },
  debugger: {
    name: 'debugger',
    description: 'Optimized for debugging and troubleshooting',
    config: {
      thinkingLevel: 'low',
      compaction: { enabled: false }, // keep full context
      retry: { enabled: true, maxRetries: 2 },
    },
    initialPrompt: 'Help me debug this issue. Be systematic: gather information, analyze logs, reproduce if possible, identify root cause, suggest fix.',
    tags: ['debug', 'troubleshooting']
  },
  architect: {
    name: 'architect',
    description: 'System design and architecture planning',
    config: {
      thinkingLevel: 'xhigh',
      compaction: { enabled: true, tokens: 4000 },
      retry: { enabled: true, maxRetries: 2 },
    },
    initialPrompt: 'Think like a principal engineer. Consider scalability, reliability, maintainability, and team velocity. Provide diagrams when helpful.',
    tags: ['architecture', 'planning']
  }
};

/**
 * Template Manager
 */
export class TemplateManager {
  private templates: Map<string, SessionTemplate> = new Map();

  constructor(initialTemplates?: Record<string, SessionTemplate>) {
    // Load defaults
    for (const [key, template] of Object.entries(DEFAULT_TEMPLATES)) {
      this.templates.set(key, template);
    }
    // Override with custom templates
    if (initialTemplates) {
      for (const [key, template] of Object.entries(initialTemplates)) {
        this.templates.set(key, template);
      }
    }
  }

  list(): SessionTemplate[] {
    return Array.from(this.templates.values());
  }

  get(name: string): SessionTemplate | undefined {
    return this.templates.get(name);
  }

  register(template: SessionTemplate): void {
    this.templates.set(template.name, template);
  }

  findByTag(tag: string): SessionTemplate[] {
    return this.list().filter(t => t.tags?.includes(tag));
  }
}
