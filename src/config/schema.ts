// Config validation schema (simplified - using any for now)
// In production, use detailed TypeBox schema

import { Type } from "@sinclair/typebox";

// Keep minimal schema to avoid complex type issues
export const ConfigSchema = Type.Object({
  agent: Type.Optional(Type.Object({
    dir: Type.Optional(Type.String()),
    model: Type.Optional(Type.String()),
    thinkingLevel: Type.Optional(Type.String()),
    tools: Type.Optional(Type.Array(Type.String())),
    customTools: Type.Optional(Type.Array(Type.Any())),
  })),
  tui: Type.Optional(Type.Object({
    theme: Type.Optional(Type.String()),
    locale: Type.Optional(Type.String()),
  })),
});

export type Config = any; // Relaxed for now
