import { Type } from "typebox";
import { Text } from "@mariozechner/pi-tui";
import * as subTools from "./sub-tools/index.js";

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
// Schema map
// ============================================================================

const schemaMap: Record<string, any> = {
  get_schema: Type.Object({
    name: Type.String({ description: "Name of the subtool to get schema for (e.g., 'bash', 'ls', 'git')" }),
  }),
  bash: subTools.bashSchema,
  ls: subTools.lsSchema,
  find: subTools.findSchema,
  grep: subTools.grepSchema,
  read: subTools.readSchema,
  git: subTools.gitSchema,
  docker: subTools.dockerSchema,
  k8s: subTools.k8sSchema,
  ssh: subTools.sshSchema,
  http: subTools.httpSchema,
  aws: subTools.awsSchema,
  terraform: subTools.terraformSchema,
  db: subTools.dbSchema,
  kafka: subTools.kafkaSchema,
  redis: subTools.redisSchema,
  make: subTools.makeSchema,
  npm: subTools.npmSchema,
  systemctl: subTools.systemctlSchema,
  journalctl: subTools.journalctlSchema,
  ps: subTools.psSchema,
  kill: subTools.killSchema,
  crontab: subTools.crontabSchema,
  apt: subTools.aptSchema,
  yum: subTools.yumSchema,
  df: subTools.dfSchema,
  du: subTools.duSchema,
  ping: subTools.pingSchema,
  traceroute: subTools.tracerouteSchema,
  nslookup: subTools.nslookupSchema,
  dig: subTools.digSchema,
  wget: subTools.wgetSchema,
  tail: subTools.tailSchema,
  jq: subTools.jqSchema,
  yq: subTools.yqSchema,
  xmllint: subTools.xmllintSchema,
  scp: subTools.scpSchema,
  rsync: subTools.rsyncSchema,
  ffmpeg: subTools.ffmpegSchema,
  update: subTools.updateSchema,
  backup: subTools.backupSchema,
  password: subTools.passwordSchema,
  weather: subTools.weatherSchema,
  time: subTools.timeSchema,
  ufw: subTools.ufwSchema,
  at: subTools.atSchema,
  quota: subTools.quotaSchema,
  iso: subTools.isoSchema,
  free: subTools.freeSchema,
  iostat: subTools.iostatSchema,
  netstat: subTools.netstatSchema,
  ss: subTools.ssSchema,
};

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
  if (!name || !subToolNames.includes(name as any)) {
    return {
      content: [{ type: "text", text: `Unknown subtool: ${name}. Available: ${subToolNames.join(", ")}` }],
      details: undefined,
      isError: true,
    } as const;
  }
  const schema = schemaMap[name];
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
// Execute function map
// ============================================================================

const execMap: Record<string, (...args: any[]) => any> = {
  get_schema: executeGetSchema,
  bash: subTools.executeBash,
  ls: subTools.executeLs,
  find: subTools.executeFind,
  grep: subTools.executeGrep,
  read: subTools.executeRead,
  git: subTools.executeGit,
  docker: subTools.executeDocker,
  k8s: subTools.executeK8s,
  ssh: subTools.executeSsh,
  http: subTools.executeHttp,
  aws: subTools.executeAws,
  terraform: subTools.executeTerraform,
  db: subTools.executeDb,
  kafka: subTools.executeKafka,
  redis: subTools.executeRedis,
  make: subTools.executeMake,
  npm: subTools.executeNpm,
  systemctl: subTools.executeSystemctl,
  journalctl: subTools.executeJournalctl,
  ps: subTools.executePs,
  kill: subTools.executeKill,
  crontab: subTools.executeCrontab,
  apt: subTools.executeApt,
  yum: subTools.executeYum,
  df: subTools.executeDf,
  du: subTools.executeDu,
  ping: subTools.executePing,
  traceroute: subTools.executeTraceroute,
  nslookup: subTools.executeNslookup,
  dig: subTools.executeDig,
  wget: subTools.executeWget,
  tail: subTools.executeTail,
  jq: subTools.executeJq,
  yq: subTools.executeYq,
  xmllint: subTools.executeXmllint,
  scp: subTools.executeScp,
  rsync: subTools.executeRsync,
  ffmpeg: subTools.executeFfmpeg,
  update: subTools.executeUpdate,
  backup: subTools.executeBackup,
  password: subTools.executePassword,
  weather: subTools.executeWeather,
  time: subTools.executeTime,
  ufw: subTools.executeUfw,
  at: subTools.executeAt,
  quota: subTools.executeQuota,
  iso: subTools.executeIso,
  free: subTools.executeFree,
  iostat: subTools.executeIostat,
  netstat: subTools.executeNetstat,
  ss: subTools.executeSs,
};

// ============================================================================
// Tool definition factory
// ============================================================================

/**
 * Creates the subtool_loader tool definition.
 * Add this to AgentSession.customTools to make it available as a built-in tool.
 */
export function createSubLoaderToolDefinition(cwd: string) {
  // Build discriminated union schema
  const schema = Type.Union(
    subToolNames.map((tool) =>
      Type.Object({
        subtool: Type.Literal(tool),
        args: Type.Union([schemaMap[tool], Type.String()]),
      })
    )
  );

  const description = `Unified tool for system operations.

Use the "get_schema" subtool to see argument details for any subtool, then invoke that subtool with proper args.

Available subtools: bash, ls, find, grep, read, git, docker, k8s, ssh, http, aws, terraform, db, kafka, redis, make, npm, systemctl, journalctl, ps, kill, crontab, apt, yum, df, du, ping, traceroute, nslookup, dig, wget, tail, jq, yq, xmllint, scp, rsync, ffmpeg, update, backup, password, weather, time, ufw, at, quota, iso, free, iostat, netstat, ss.

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
        const execFn = execMap[subtool];
        if (!execFn) {
          return {
            content: [{ type: "text", text: `Unknown subtool: ${subtool}` }],
            details: undefined,
            isError: true,
          } as const;
        }
        const effectiveCwd = ctx?.cwd || cwd;
        return await execFn(parsedArgs, effectiveCwd, signal, ctx);
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
