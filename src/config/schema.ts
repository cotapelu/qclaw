import { Type, type Static } from "@sinclair/typebox";

// Agent config
const AgentConfigSchema = Type.Object({
  dir: Type.Optional(Type.String()),
  model: Type.Optional(Type.String()),
  thinkingLevel: Type.Optional(Type.Union([
    Type.Literal("off"),
    Type.Literal("minimal"),
    Type.Literal("low"),
    Type.Literal("medium"),
    Type.Literal("high"),
    Type.Literal("xhigh"),
  ])),
  tools: Type.Optional(Type.Array(Type.String())),
  customTools: Type.Optional(Type.Array(Type.Any())), // ToolDefinition[]
  sessionManager: Type.Optional(Type.String()),
  settingsManager: Type.Optional(Type.String()),
  resourceLoader: Type.Optional(Type.String()),
});

// Session config
const SessionConfigSchema = Type.Object({
  autoRestore: Type.Optional(Type.Boolean()),
  compaction: Type.Object({
    enabled: Type.Optional(Type.Boolean()),
    tokens: Type.Optional(Type.Number()),
    auto: Type.Optional(Type.Boolean()),
  }),
});

// Settings - we'll just validate top-level, detailed validation in pi-coding-agent
const SettingsSchema = Type.Any(); // Defer to pi-coding-agent's SettingsManager

// TUI config
const TuiConfigSchema = Type.Object({
  theme: Type.Optional(Type.Union([
    Type.Literal("auto"),
    Type.Literal("dark"),
    Type.Literal("light"),
  ])),
  locale: Type.Optional(Type.String()),
  showLineNumbers: Type.Optional(Type.Boolean()),
  tabSize: Type.Optional(Type.Number()),
});

// Observability config
const ObservabilityConfigSchema = Type.Object({
  metrics: Type.Optional(Type.Boolean()),
  metricsPort: Type.Optional(Type.Number()),
  tracing: Type.Optional(Type.Boolean()),
});

// RPC config
const RpcConfigSchema = Type.Object({
  enabled: Type.Optional(Type.Boolean()),
  port: Type.Optional(Type.Number()),
});

// Resources config
const ResourcesConfigSchema = Type.Object({
  extensionsDirs: Type.Optional(Type.Array(Type.Union([
    Type.String(),
    Type.Function([Type.String()], Type.String()),
  ]))),
  skillsDirs: Type.Optional(Type.Array(Type.Union([
    Type.String(),
    Type.Function([Type.String()], Type.String()),
  ]))),
  promptsDirs: Type.Optional(Type.Array(Type.Union([
    Type.String(),
    Type.Function([Type.String()], Type.String()),
  ]))),
  contextDirs: Type.Optional(Type.Array(Type.Union([
    Type.String(),
    Type.Function([Type.String()], Type.String()),
  ]))),
  hotReload: Type.Optional(Type.Boolean()),
});

// Root config
export const ConfigSchema = Type.Object({
  agent: Type.Optional(AgentConfigSchema),
  session: Type.Optional(SessionConfigSchema),
  settings: Type.Optional(SettingsSchema),
  tui: Type.Optional(TuiConfigSchema),
  observability: Type.Optional(ObservabilityConfigSchema),
  rpc: Type.Optional(RpcConfigSchema),
  resources: Type.Optional(ResourcesConfigSchema),
});

export type Config = Static<typeof ConfigSchema>;
