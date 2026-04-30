import { Type } from "typebox";
import { Text } from "@mariozechner/pi-tui";
import {
  createBashToolDefinition,
  createLsToolDefinition,
  createFindToolDefinition,
  createGrepToolDefinition,
  createReadToolDefinition,
} from "@mariozechner/pi-coding-agent";

// ============================================================================
// SubTool list & type
// ============================================================================

const subToolNames = [
  "get_schema",
  "bash", "ls", "find", "grep", "read",
  "git", "docker", "k8s", "ssh", "http",
  "aws", "terraform", "db", "kafka", "redis",
  "make", "npm", "systemctl", "journalctl", "ps",
  "kill", "crontab", "apt", "yum", "df",
  "du", "ping", "traceroute", "nslookup", "dig",
  "wget", "tail", "jq", "yq", "xmllint",
  "scp", "rsync", "ffmpeg", "update", "backup",
  "password", "weather", "time", "ufw", "at",
  "quota", "iso", "free", "iostat", "netstat",
  "ss"
] as const;

type SubToolName = typeof subToolNames[number];

// ============================================================================
// Caches
// ============================================================================

const toolCache = new Map<string, Record<string, any>>();
const schemaCache = new Map<string, Record<string, any>>();

// ============================================================================
// Get tool map (cached)
// ============================================================================

function getToolMap(cwd: string): Record<string, any> {
  if (toolCache.has(cwd)) return toolCache.get(cwd)!;

  const tools: Record<string, any> = {
    bash: createBashToolDefinition(cwd),
    ls: createLsToolDefinition(cwd),
    find: createFindToolDefinition(cwd),
    grep: createGrepToolDefinition(cwd),
    read: createReadToolDefinition(cwd),
    // Additional tools can be added here as definitions become available
  };

  toolCache.set(cwd, tools);
  return tools;
}

// ============================================================================
// Get schema map (cached)
// ============================================================================

function getSchemaMap(cwd: string): Record<string, any> {
  if (schemaCache.has(cwd)) return schemaCache.get(cwd)!;

  const tools = getToolMap(cwd);
  const schemas: Record<string, any> = {
    get_schema: Type.Object({
      name: Type.String({ description: "Name of the subtool to get schema for (e.g., 'bash', 'ls', 'git')" }),
    }),
  };

  for (const [name, tool] of Object.entries(tools)) {
    schemas[name] = tool.parameters;
  }

  schemaCache.set(cwd, schemas);
  return schemas;
}

// ============================================================================
// Execute function: get_schema
// ============================================================================

async function executeGetSchema(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { name } = args as { name: string };
  const effectiveCwd = ctx?.cwd || cwd;

  if (!name || !subToolNames.includes(name as any)) {
    return {
      content: [{ type: "text", text: `Unknown subtool: ${name}. Available: ${subToolNames.join(", ")}` }],
      details: undefined,
      isError: true,
    } as const;
  }

  const schema = getSchemaMap(effectiveCwd)[name];
  if (!schema) {
    return {
      content: [{ type: "text", text: `Schema not found for subtool: ${name}` }],
      details: undefined,
      isError: true,
    } as const;
  }

  // Generate human-readable description
  let output = `Schema for subtool "${name}":\n\n`;

  // Extract properties from TypeBox schema
  const schemaAny = schema as any;
  if (schemaAny.properties) {
    output += "Properties:\n";
    for (const [key, propSchema] of Object.entries(schemaAny.properties)) {
      const prop = propSchema as any;
      const isOptional = schemaAny.optionalProperties?.includes(key);
      const type = prop.type || "any";
      output += `- ${key}${isOptional ? "?" : ""}: ${prop.description || type}\n`;
    }
  }

  if (schemaAny.required && Array.isArray(schemaAny.required) && schemaAny.required.length > 0) {
    output += `\nRequired fields: ${schemaAny.required.join(", ")}\n`;
  }

  output += "\nExample invocation (JSON):\n";
  output += `{\n  "subtool": "${name}",\n  "args": {\n    // fill with fields from above\n  }\n}\n`;

  return {
    content: [{ type: "text", text: output }],
    details: undefined,
    isError: false,
  } as const;
}

// ============================================================================
// Tool definition factory
// ============================================================================

/**
 * Creates the subtool_loader tool definition.
 * Add this to AgentSession.customTools to make it available as a built-in tool.
 */
export function createSubLoaderToolDefinition(cwd: string) {
  // Build discriminated union schema using cached schemas
  const schemas = getSchemaMap(cwd);
  const schema = Type.Union(
    subToolNames.map((tool) =>
      Type.Object({
        subtool: Type.Literal(tool),
        args: Type.Union([schemas[tool] || Type.String(), Type.String()]),
      })
    )
  );

  const description = `Unified tool for system operations.

Use the "get_schema" subtool to see argument details for any subtool, then invoke that subtool with proper args.

Currently supported built-in tools: bash, ls, find, grep, read.
More tools will be added as definitions become available.

Example: {"subtool":"bash","args":{"command":"echo hello"}}`;

  // Render functions
  const renderCall = (args: any, theme: any, _context: any) => {
    const th = theme;
    const { subtool, args: toolArgs } = args as { subtool: string; args: any };
    let text = th.fg("toolTitle", th.bold(`subtool_loader `)) + th.fg("muted", subtool);
    // Show first arg value if simple string
    if (toolArgs && typeof toolArgs === 'object') {
      const keys = Object.keys(toolArgs);
      if (keys.length > 0) {
        const firstKey = keys[0];
        const value = toolArgs[firstKey];
        if (typeof value === 'string') {
          text += ` ${th.fg("dim", `"${value.substring(0, 30)}${value.length > 30 ? "..." : ""}"`)}`;
        }
      }
    }
    return new Text(text, 0, 0);
  };

  const renderResult = (result: any, options: { expanded: boolean; isPartial: boolean }, theme: any, _context: any) => {
    const th = theme;
    if (options.isPartial) {
      return new Text(th.fg("warning", "Processing..."), 0, 0);
    }
    const content = result.content?.[0]?.text || "";
    if (result.isError) {
      return new Text(th.fg("error", content), 0, 0);
    }
    return new Text(th.fg("success", content), 0, 0);
  };

  return {
    name: "subtool_loader",
    label: "SubTool Loader",
    description,
    parameters: schema,
    async execute(toolCallId: string, params: any, signal?: AbortSignal, onUpdate?: any, ctx?: any) {
      const { subtool, args } = params as { subtool: SubToolName; args: any };
      // Parse args if it's a JSON string (LLM often sends stringified args)
      let parsedArgs: any = args;
      if (typeof args === 'string') {
        try {
          parsedArgs = JSON.parse(args);
        } catch (e) {
          return {
            content: [{ type: "text", text: `Invalid JSON in args: ${args}` }],
            details: undefined,
            isError: true,
          } as const;
        }
      }
      try {
        if (subtool === "get_schema") {
          return executeGetSchema(parsedArgs, cwd, signal, ctx);
        }
        const effectiveCwd = ctx?.cwd || cwd;
        const toolMap = getToolMap(effectiveCwd);
        const toolDef = toolMap[subtool];
        if (!toolDef) {
          return {
            content: [{ type: "text", text: `Unknown subtool: ${subtool}. Note: Only bash, ls, find, grep, read are currently supported.` }],
            details: undefined,
            isError: true,
          } as const;
        }
        // Delegate to the built-in tool's execute method
        return await toolDef.execute(toolCallId, parsedArgs, signal, onUpdate, ctx);
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          details: undefined,
          isError: true,
        } as const;
      }
    },
    renderCall,
    renderResult,
    renderShell: "self" as const,
  };
}
