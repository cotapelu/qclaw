// Default configuration values
export const DEFAULT_CONFIG = {
  // Agent
  agent: {
    dir: "~/.pi/agent",
    model: undefined as string | undefined,
    thinkingLevel: "medium" as const,
    tools: [] as string[], // empty = all built-in tools
    customTools: [] as any[], // ToolDefinition[]
    sessionManager: "default" as const, // "default" | "memory" | custom
    settingsManager: "default" as const,
    resourceLoader: "default" as const,
  },

  // Session
  session: {
    autoRestore: true,
    compaction: {
      enabled: true,
      tokens: 2000,
      auto: true,
    },
  },

  // Settings
  settings: {
    compaction: { enabled: true, tokens: 2000 },
    retry: { enabled: true, maxRetries: 2 },
    thinkingLevel: "medium",
    toolPermissions: {
      allowedTools: [], // empty = all
      deniedTools: [], // e.g., ["write", "bash"]
      confirmDestructive: true,
      allowedPaths: [], // empty = all
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxTotalOutput: 1024 * 1024, // 1MB
    },
    logging: {
      dir: "~/.pi/agent/logs",
      level: "info" as const,
      rotation: "daily" as const,
      format: "text" as const,
    },
    git: {
      autoCommit: false,
      commitMessage: "Auto-commit by agent",
    },
    budget: {
      daily: 10.0,
      monthly: 100.0,
    },
  },

  // TUI
  tui: {
    theme: "auto" as const, // "auto" | "dark" | "light"
    locale: "en",
    showLineNumbers: false,
    tabSize: 2,
  },

  // Observability
  observability: {
    metrics: false,
    metricsPort: 9090,
    tracing: false,
  },

  // RPC
  rpc: {
    enabled: false,
    port: 8081,
  },

  // Resource loading
  resources: {
    extensionsDirs: [
      "~/.pi/agent/extensions",
      cwd => `${cwd}/.pi/extensions`,
    ],
    skillsDirs: [
      "~/.pi/agent/skills",
      cwd => `${cwd}/.pi/skills`,
    ],
    promptsDirs: [
      "~/.pi/agent/prompts",
      cwd => `${cwd}/.pi/prompts`,
    ],
    contextDirs: [
      "~/.pi/agent/context",
      cwd => `${cwd}/.pi/context",
    ],
    hotReload: true,
  },
} as const;

export type ConfigPath = string;
export type ConfigFunction<T> = (cwd: string) => T;
