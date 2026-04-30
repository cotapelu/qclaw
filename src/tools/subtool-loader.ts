import { Type } from "typebox";
import * as subTools from "./sub-tools/index.js";

// ============================================================================
// SubTool list & type
// ============================================================================

const subToolNames = [
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
// Execute function map
// ============================================================================

const execMap: Record<string, (...args: any[]) => any> = {
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
        args: schemaMap[tool],
      })
    )
  );

  const description = `Unified tool for system operations. Select subtool and provide corresponding args.
- bash: execute shell command
- ls: list directory
- find: find files by glob
- grep: search file contents
- read: read file
- git: git commands
- docker: docker CLI
- k8s: kubectl
- ssh: remote SSH execution
- http: HTTP request (uses curl)
- aws: AWS CLI
- terraform: Terraform commands
- db: SQL query (mysql, postgres, sqlite)
- kafka: Kafka CLI
- redis: redis-cli
- make: make
- npm: npm/yarn/pnpm
- systemctl: systemd service control
- journalctl: view system logs
- ps: list processes
- kill: terminate process
- crontab: manage cron jobs
- apt: Debian/Ubuntu package manager
- yum: RHEL/CentOS package manager
- df: disk space usage
- du: directory sizes
- ping: test connectivity
- traceroute: trace network path
- nslookup: DNS lookup
- dig: advanced DNS query
- wget: download files
- tail: monitor log files
- jq: JSON processor
- yq: YAML processor
- xmllint: XML validate/format
- scp: secure copy
- rsync: file synchronization
- ffmpeg: multimedia conversion
- update: system/package updates
- backup: create compressed backups
- password: generate secure passwords
- weather: get weather info
- time: date/time operations
- ufw: firewall management
- at: one-time scheduled tasks
- quota: disk quota
- iso: ISO image operations
- free: memory usage
- iostat: I/O statistics
- netstat: network connections
- ss: socket statistics`;

  return {
    name: "subtool_loader",
    label: "SubTool Loader",
    description,
    parameters: schema,
    async execute(toolCallId: string, params: any, signal?: AbortSignal, onUpdate?: any, ctx?: any) {
      const { subtool, args } = params as { subtool: SubToolName; args: any };
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
        return await execFn(args, effectiveCwd, signal, ctx);
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          details: undefined,
          isError: true,
        } as const;
      }
    },
  };
}
