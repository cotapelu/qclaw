import { Type } from "typebox";
import { Text } from "@mariozechner/pi-tui";
import {
  createBashToolDefinition,
  createLsToolDefinition,
  createFindToolDefinition,
  createGrepToolDefinition,
  createReadToolDefinition,
  createEditToolDefinition,
  createWriteToolDefinition,
} from "@mariozechner/pi-coding-agent";

// Import all custom sub-tools (git, docker, k8s, ssh, http, aws, ...)
import * as subTools from "./sub-tools/index.js";

// ============================================================================
// Build dynamic sub-tool maps from ./sub-tools/index
// ============================================================================

const subToolNames = [
  // Core Computer Use tools (provided by @mariozechner/pi-coding-agent)
  "get_schema",
  "bash", "ls", "find", "grep", "read",
  "edit", "write",

  // Extended sub-tools (custom in src/tools/sub-tools/)
  "git", "docker", "k8s", "ssh", "http", "aws",
  "terraform", "db", "kafka", "redis", "make", "npm",
  "systemctl", "journalctl", "ps", "kill", "crontab",
  "apt", "yum", "df", "du", "ping", "traceroute",
  "nslookup", "dig", "wget", "tail", "jq", "yq",
  "xmllint", "scp", "rsync", "ffmpeg", "update",
  "backup", "password", "weather", "time", "ufw",
  "at", "quota", "iso", "free", "iostat", "netstat", "ss",
] as const;

type SubToolName = typeof subToolNames[number];

// Cached tool definitions
const toolCache = new Map<string, Record<string, any>>();

function getToolMap(cwd: string): Record<string, any> {
  if (toolCache.has(cwd)) return toolCache.get(cwd)!;

  const tools: Record<string, any> = {
    // Core tools from @mariozechner/pi-coding-agent
    bash: createBashToolDefinition(cwd),
    ls: createLsToolDefinition(cwd),
    find: createFindToolDefinition(cwd),
    grep: createGrepToolDefinition(cwd),
    read: createReadToolDefinition(cwd),
    edit: createEditToolDefinition(cwd),
    write: createWriteToolDefinition(cwd),
  };

  // Dynamically add custom sub-tools from ./sub-tools/index
  const coreToolSet = new Set<string>(["bash", "ls", "find", "grep", "read", "edit", "write", "get_schema"]);
  const customToolNames = subToolNames.filter(name => !coreToolSet.has(name));

  for (const name of customToolNames) {
    const schemaKey = `${name  }Schema`;
    const executeKey = `execute${  name.charAt(0).toUpperCase()  }${name.slice(1)}`;
    const schema = (subTools as any)[schemaKey];
    const execute = (subTools as any)[executeKey];
    if (schema && execute) {
      tools[name] = {
        name,
        label: name,
        description: `${name} tool`,
        parameters: schema,
        execute,
        renderCall: (args: any, theme: any, _context: any) => {
          const th = theme;
          const { args: toolArgs } = args as { subtool: string; args: any };
          let text = th.fg("toolTitle", th.bold(`${name} `));
          if (toolArgs && typeof toolArgs === 'object') {
            const keys = Object.keys(toolArgs);
            if (keys.length > 0) {
              const firstKey = keys[0];
              const value = toolArgs[firstKey];
              if (typeof value === 'string') {
                const preview = value.substring(0, 30);
                const ellipsis = value.length > 30 ? "..." : "";
                text += th.fg("dim", `"${preview}${ellipsis}"`);
              }
            }
          }
          return new Text(text, 0, 0);
        },
        renderResult: (result: any, options: { expanded: boolean; isPartial: boolean }, theme: any, _context: any) => {
          const th = theme;
          if (options.isPartial) {
            return new Text(th.fg("warning", "Processing..."), 0, 0);
          }
          const content = result.content?.[0]?.text || "";
          if (result.isError) {
            return new Text(th.fg("error", content), 0, 0);
          }
          return new Text(th.fg("success", content), 0, 0);
        },
        renderShell: "self" as const,
      } as any;
    } else {
      // Silently skip if not found (shouldn't happen if subToolNames is correct)
      console.warn(`[subtool_loader] Missing schema or execute for subtool: ${name}`);
    }
  }

  toolCache.set(cwd, tools);
  return tools;
}

// ============================================================================
// Execute: get_schema
// ============================================================================

async function executeGetSchema(
  args: any,
  cwd: string,
  signal?: AbortSignal,
  ctx?: any,
) {
  const { name } = args as { name: string };
  const effectiveCwd = ctx?.cwd || cwd;

  if (!name) {
    return {
      content: [{ type: "text", text: `Missing 'name' parameter. Specify a sub-tool name.` }],
      details: undefined,
      isError: true,
    } as const;
  }

  const toolMap = getToolMap(effectiveCwd);
  const toolDef = toolMap[name];
  if (!toolDef) {
    return {
      content: [{ type: "text", text: `Unknown sub-tool: ${name}. Available: ${subToolNames.join(", ")}` }],
      details: undefined,
      isError: true,
    } as const;
  }

  // The schema is in toolDef.parameters
  const schema = toolDef.parameters as any;

  // Generate human-readable schema description
  let output = `Schema for sub-tool "${name}":\n\n`;
  if (schema?.properties) {
    output += "Properties:\n";
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const prop = propSchema as any;
      const isOptional = schema.optionalProperties?.includes(key);
      const type = prop.type || "any";
      output += `- ${key}${isOptional ? "?" : ""}: ${prop.description || type}\n`;
    }
  }
  if (schema?.required && Array.isArray(schema.required) && schema.required.length > 0) {
    output += `\nRequired fields: ${schema.required.join(", ")}\n`;
  }
  output += "\nExample invocation:\n";
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
 */
export function createSubLoaderToolDefinition(cwd: string) {
  const schema = Type.Union(
    subToolNames.map((name) =>
      Type.Object({
        subtool: Type.Literal(name),
        args: Type.Any(),
      })
    )
  );

  const description = `Unified tool for system operations.\n\n` +
    `Core Computer Use tools (from @mariozechner/pi-coding-agent):\n` +
    `- get_schema, bash, ls, find, grep, read, edit, write\n\n` +
    `Extended sub-tools (custom in src/tools/sub-tools/):\n` +
    `- git, docker, k8s, ssh, http, aws, terraform, db, kafka, redis\n` +
    `- make, npm, systemctl, journalctl, ps, kill, crontab\n` +
    `- apt, yum, df, du, ping, traceroute, nslookup, dig\n` +
    `- wget, tail, jq, yq, xmllint, scp, rsync, ffmpeg\n` +
    `- update, backup, password, weather, time, ufw, at, quota\n` +
    `- iso, free, iostat, netstat, ss\n\n` +
    `Use "get_schema" to see argument details for any sub-tool.\n\n` +
    `Example: {"subtool":"bash","args":{"command":"echo hello"}}`;

  const renderCall = (args: any, theme: any, _context: any) => {
    const th = theme;
    const { subtool, args: toolArgs } = args as { subtool: string; args: any };
    let text = th.fg("toolTitle", th.bold(`subtool_loader `)) + th.fg("muted", subtool);
    if (toolArgs && typeof toolArgs === 'object') {
      const keys = Object.keys(toolArgs);
      if (keys.length > 0) {
        const firstKey = keys[0];
        const value = toolArgs[firstKey];
        if (typeof value === 'string') {
          const preview = value.substring(0, 30);
          const ellipsis = value.length > 30 ? "..." : "";
          const argPreview = `"${preview}${ellipsis}"`;
          text += ` ${th.fg("dim", argPreview)}`;
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
      const { subtool, args } = params as { subtool: string; args: any };
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
          return await executeGetSchema(parsedArgs, cwd, signal, ctx);
        }

        const toolMap = getToolMap(ctx?.cwd || cwd);
        const toolDef = toolMap[subtool];
        if (!toolDef) {
          return {
            content: [{ type: "text", text: `Unknown subtool: ${subtool}. Available: ${subToolNames.join(", ")}` }],
            details: undefined,
            isError: true,
          } as const;
        }

        // Tool definitions expect: execute(toolCallId, params, signal?, onUpdate?, ctx?)
        // Generate a fake toolCallId since we're delegating
        const toolCallId = `subtool-${subtool}-${Date.now()}`;
        return await toolDef.execute(toolCallId, parsedArgs, signal, undefined, ctx);
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
