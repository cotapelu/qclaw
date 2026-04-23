// Default configuration values (no strict typing to allow merging)

export const DEFAULT_CONFIG = {
  agent: {
    dir: "~/.pi/agent",
    model: undefined,
    thinkingLevel: "medium",
    tools: [],
    customTools: [],
    sessionManager: "default",
    settingsManager: "default",
    resourceLoader: "default",
  },
  session: {
    autoRestore: true,
    compaction: { enabled: true, tokens: 2000, auto: true },
  },
  settings: {
    compaction: { enabled: true, tokens: 2000 },
    retry: { enabled: true, maxRetries: 2 },
    thinkingLevel: "medium",
    toolPermissions: {
      allowedTools: [],
      deniedTools: [],
      confirmDestructive: true,
      allowedPaths: [],
      maxFileSize: 10 * 1024 * 1024,
      maxTotalOutput: 1024 * 1024,
    },
    logging: {
      dir: "~/.pi/agent/logs",
      level: "info",
      rotation: "daily",
      format: "text",
    },
    git: { autoCommit: false, commitMessage: "Auto-commit by agent" },
    budget: { daily: 10.0, monthly: 100.0 },
  },
  tui: { theme: "auto", locale: "en", showLineNumbers: false, tabSize: 2 },
  observability: { metrics: false, metricsPort: 9090, tracing: false },
  rpc: { enabled: false, port: 8081 },
  resources: {
    extensionsDirs: ["~/.pi/agent/extensions", (cwd: any) => `${cwd}/.pi/extensions`],
    skillsDirs: ["~/.pi/agent/skills", (cwd: any) => `${cwd}/.pi/skills`],
    promptsDirs: ["~/.pi/agent/prompts", (cwd: any) => `${cwd}/.pi/prompts`],
    contextDirs: ["~/.pi/agent/context", (cwd: any) => `${cwd}/.pi/context`],
    hotReload: true,
  },
};

export type ConfigPath = string;
export type ConfigFunction<T> = (cwd: string) => T;
