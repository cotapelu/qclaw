import * as readline from "readline";

export interface RpcServerOptions {
  agent: any; // AgentCore
}

export async function runRpcServer(options: RpcServerOptions): Promise<void> {
  const { agent } = options;
  const session = agent.getSession();
  if (!session) {
    throw new Error("Agent session not initialized");
  }

  // Set up event listener for notifications
  session.subscribe((event: any) => {
    const notification = {
      jsonrpc: "2.0",
      method: "agent_event",
      params: { event },
    };
    console.log(JSON.stringify(notification));
  });

  // Create readline interface for stdin
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const pendingRequests = new Map<any, { resolve: (value: any) => void; reject: (reason: any) => void }>();

  rl.on("line", (line) => {
    if (!line.trim()) return;
    try {
      const req = JSON.parse(line);
      handleRequest(req, session, pendingRequests);
    } catch (error: any) {
      // Parse error - respond if has id
      // Can't get id from malformed JSON, so just log
      console.error(`RPC parse error: ${error.message}`);
    }
  });

  rl.on("close", () => {
    console.log("RPC server stdin closed");
    agent.dispose();
    process.exit(0);
  });

  // Handle SIGINT/SIGTERM
  const shutdown = () => {
    rl.close();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function handleRequest(
  req: any,
  session: any,
  pendingRequests: Map<any, { resolve: (v: any) => void; reject: (e: any) => void }>
) {
  // Validate JSON-RPC 2.0 request
  if (!req.jsonrpc || req.jsonrpc !== "2.0") {
    return sendError(req.id, -32600, "Invalid Request");
  }
  if (!req.method) {
    return sendError(req.id, -32600, "Invalid Request: missing method");
  }

  const { method, params, id } = req;

  // Only request with id get responses
  const isNotification = id === null || id === undefined;

  try {
    switch (method) {
      case "prompt": {
        if (!params?.text) {
          if (!isNotification) sendError(id, -32602, "Invalid params: text required");
          return;
        }
        // Store pending request for cancellation
        if (!isNotification) {
          pendingRequests.set(id, {
            resolve: () => {}, // will be resolved via response
            reject: (err: any) => {},
          });
        }
        await session.prompt(params.text);
        if (!isNotification) {
          sendResult(id, { status: "completed" });
          pendingRequests.delete(id);
        }
        break;
      }

      case "cancel": {
        if (!params?.id) {
          if (!isNotification) sendError(id, -32602, "Invalid params: id required");
          return;
        }
        const pending = pendingRequests.get(params.id);
        if (pending) {
          pending.reject(new Error("Cancelled by client"));
          pendingRequests.delete(params.id);
          if (!isNotification) sendResult(id, { status: "cancelled" });
        } else {
          if (!isNotification) sendError(id, -32602, "Request not found or already completed");
        }
        break;
      }

      case "list_sessions": {
        // Example additional method
        const sessions = await session.sessionManager.list();
        if (!isNotification) sendResult(id, { sessions });
        break;
      }

      default: {
        if (!isNotification) {
          sendError(id, -32601, `Method not found: ${method}`);
        }
      }
    }
  } catch (error: any) {
    if (!isNotification) {
      sendError(id, -32603, `Execution error: ${error.message}`);
    }
  }
}

function sendResult(id: any, result: any) {
  const response = {
    jsonrpc: "2.0",
    result,
    id,
  };
  console.log(JSON.stringify(response));
}

function sendError(id: any, code: number, message: string) {
  const response = {
    jsonrpc: "2.0",
    error: { code, message },
    id,
  };
  console.log(JSON.stringify(response));
}
