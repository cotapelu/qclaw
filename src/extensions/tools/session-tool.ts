#!/usr/bin/env node

/**
 * Session Tool - Multi-Session Management
 *
 * Provides ability to list, switch, create new sessions.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { SessionManager } from "@mariozechner/pi-coding-agent";
import { Type, StringEnum } from "@mariozechner/pi-ai";
import { readdirSync, existsSync, statSync, readFileSync } from "fs";
import { join } from "node:path";

const SessionParams = Type.Object({
  action: StringEnum(["list", "switch", "create", "info", "branch"] as const),
  sessionPath: Type.Optional(Type.String({ description: "Session path to switch to or create from" })),
  sessionName: Type.Optional(Type.String({ description: "Name for new session" })),
});

/**
 * Get list of all sessions in session directories
 */
function getAllSessionsInfo(sessionsRoot: string): Array<{
  path: string;
  id: string;
  name?: string;
  created: Date;
  modified: Date;
  messageCount: number;
}> {
  const sessions: Array<any> = [];

  if (!existsSync(sessionsRoot)) {
    return sessions;
  }

  try {
    const dirs = readdirSync(sessionsRoot);

    for (const dir of dirs) {
      const dirPath = join(sessionsRoot, dir);
      const stat = statSync(dirPath);

      if (!stat.isDirectory()) continue;

      try {
        const files = readdirSync(dirPath);

        for (const file of files) {
          if (!file.endsWith(".json")) continue;

          const filePath = join(dirPath, file);
          try {
            const content = readFileSync(filePath, "utf-8");
            const session = JSON.parse(content);

            if (session.type === "session") {
              sessions.push({
                path: filePath,
                id: session.id,
                name: session.name,
                cwd: session.cwd,
                created: new Date(session.timestamp),
                modified: new Date(statSync(filePath).mtime),
              });
            }
          } catch (e) {
            // Skip invalid files
          }
        }
      } catch (e) {
        // Skip inaccessible directories
      }
    }
  } catch (e) {
    // Root doesn't exist
  }

  // Sort by modified date descending
  sessions.sort((a, b) => b.modified.getTime() - a.modified.getTime());

  return sessions;
}

/**
 * Format session info for display
 */
function formatSessionsList(sessions: Array<any>): string {
  if (sessions.length === 0) {
    return "No sessions found.";
  }

  let output = `${sessions.length} session(s):\n\n`;

  for (let i = 0; i < Math.min(sessions.length, 20); i++) {
    const s = sessions[i];
    const id = s.id.substring(0, 8);
    const date = s.modified.toLocaleDateString();
    const time = s.modified.toLocaleTimeString();
    const name = s.name || s.cwd || "Unnamed";
    output += `${i + 1}. ${id} - ${name}\n`;
    output += `   Modified: ${date} ${time}\n`;
    output += `   Path: ${s.path}\n\n`;
  }

  if (sessions.length > 20) {
    output += `...and ${sessions.length - 20} more.`;
  }

  return output;
}

export function registerSessionsTool(api: ExtensionAPI): void {
  const tool: any = {
    name: "session",
    label: "Session",
    description: "Manage sessions: list, switch, create new, branch, or get info",
    promptSnippet: "Manage sessions: list, switch, create",
    promptGuidelines: [
      "Use session({ action: 'list' }) to list all available sessions",
      "Use session({ action: 'switch', sessionPath: '/path/to/session.json' }) to switch to a different session",
      "Use session({ action: 'create', sessionName: 'my-session' }) to create a new session",
      "Use session({ action: 'branch', sessionPath: '/path/to/session.json' }) to branch from existing session",
      "Sessions are stored in ~/.pi/agent/sessions/",
    ],
    parameters: SessionParams,

    async execute(_toolCallId, params: any, _signal, _onUpdate, ctx: ExtensionContext) {
      const action = params.action as "list" | "switch" | "create" | "info" | "branch";
      const sessionPath = params.sessionPath as string | undefined;
      const sessionName = params.sessionName as string | undefined;

      // Get session directory from context
      const sessionManager = (ctx as any).sessionManager as SessionManager | undefined;

      if (!sessionManager) {
        return {
          content: [{ type: "text", text: "Error: Session manager not available" }],
          details: { error: "no_session_manager" },
          isError: true,
        };
      }

      const sessionsRoot = sessionManager.getSessionDir();

      switch (action) {
        case "list": {
          const sessions = getAllSessionsInfo(sessionsRoot);
          const output = formatSessionsList(sessions);
          return {
            content: [{ type: "text", text: output }],
            details: { sessions, count: sessions.length },
            isError: false,
          };
        }

        case "info": {
          const currentSessionId = sessionManager.getSessionId();
          const currentSessionFile = sessionManager.getSessionFile();
          const header = sessionManager.getHeader();

          return {
            content: [{
              type: "text",
              text: `Current Session:\n\nID: ${currentSessionId}\nFile: ${currentSessionFile}\nCWD: ${header?.cwd || 'N/A'}\nParent: ${header?.parentSession || 'None'}`
            }],
            details: { sessionId: currentSessionId, sessionFile: currentSessionFile, header },
            isError: false,
          };
        }

        case "create": {
          try {
            const newSessionManager = SessionManager.create(
              sessionManager.getCwd(),
              sessionsRoot
            );

            // Note: Session names are set via session_info entries which require
            // separate runtime handling. For now, just create the session.

            return {
              content: [{
                type: "text",
                text: `Created new session: ${newSessionManager.getSessionId().substring(0, 8)}`
              }],
              details: {
                sessionId: newSessionManager.getSessionId(),
                sessionFile: newSessionManager.getSessionFile()
              },
              isError: false,
            };
          } catch (error: any) {
            return {
              content: [{ type: "text", text: `Error creating session: ${error.message}` }],
              details: { error: error.message },
              isError: true,
            };
          }
        }

        case "branch": {
          if (!sessionPath) {
            return {
              content: [{ type: "text", text: "Error: sessionPath required for branch action" }],
              details: { error: "sessionPath_required" },
              isError: true,
            };
          }

          try {
            // Open existing session to branch from
            const sourceManager = SessionManager.open(sessionPath);
            const leafId = sourceManager.getLeafId();

            // Create branched session from that leaf
            const newSessionFile = sourceManager.createBranchedSession(leafId);

            if (!newSessionFile) {
              return {
                content: [{ type: "text", text: "Error: Could not create branch" }],
                details: { error: "branch_failed" },
                isError: true,
              };
            }

            // Re-open the new session manager
            const newManager = SessionManager.open(newSessionFile);

            return {
              content: [{
                type: "text",
                text: `Branched from session: ${sourceManager.getSessionId().substring(0, 8)} → New: ${newManager.getSessionId().substring(0, 8)}`
              }],
              details: {
                sourceSessionId: sourceManager.getSessionId(),
                newSessionId: newManager.getSessionId(),
                sessionFile: newManager.getSessionFile(),
              },
              isError: false,
            };
          } catch (error: any) {
            return {
              content: [{ type: "text", text: `Error branching session: ${error.message}` }],
              details: { error: error.message },
              isError: true,
            };
          }
        }

        case "switch": {
          return {
            content: [{
              type: "text",
              text: "Session switching is handled by the runtime. Use the /session command or restart with --sessionDir option."
            }],
            details: { note: "runtime_handled" },
            isError: false,
          };
        }

        default: {
          return {
            content: [{ type: "text", text: `Unknown action: ${action}` }],
            details: { error: "unknown_action" },
            isError: true,
          };
        }
      }
    },

    renderCall(args: any, theme: any, _context: any) {
      const th = theme;
      let text = th.fg("toolTitle", th.bold("session ")) + th.fg("muted", args.action);
      if (args.sessionPath) text += ` ${th.fg("dim", args.sessionPath)}`;
      if (args.sessionName) text += ` ${th.fg("accent", args.sessionName)}`;
      return text;
    },

    renderResult(result: any, _options: any, theme: any, _context: any) {
      const th = theme;
      const details = result.details as any;

      if (result.isError) {
        return th.fg("error", result.content?.[0]?.text || "Error");
      }

      if (details?.error) {
        return th.fg("error", `Error: ${details.error}`);
      }

      if (details?.note) {
        return th.fg("muted", result.content?.[0]?.text || "");
      }

      return th.fg("success", "✓ ") + th.fg("muted", result.content?.[0]?.text || "");
    },
  };

  api.registerTool(tool);
}