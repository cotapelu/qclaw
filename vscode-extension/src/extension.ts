import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  console.log('qclaw extension is now active!');

  let agentProcess: ChildProcess | null = null;
  let outputChannel: vscode.OutputChannel | null = null;

  const startCommand = vscode.commands.registerCommand('qclaw.start', async () => {
    if (agentProcess) {
      vscode.window.showInformationMessage('Qclaw agent is already running.');
      return;
    }

    const config = vscode.workspace.getConfiguration('qclaw');
    const agentPath = config.get<string>('agentPath', 'qclaw');

    try {
      // Spawn qclaw process
      agentProcess = spawn(agentPath, ['--rpc'], {
        cwd: vscode.workspace.rootPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      outputChannel = vscode.window.createOutputChannel('Qclaw');
      outputChannel.appendLine(`Started qclaw agent (PID: ${agentProcess.pid})`);

      agentProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        outputChannel?.append(text);
        // Parse and display in UI
        handleAgentOutput(text);
      });

      agentProcess.stderr?.on('data', (data) => {
        outputChannel?.append(`[stderr] ${data.toString()}`);
      });

      agentProcess.on('close', (code) => {
        outputChannel?.appendLine(`qclaw agent exited with code ${code}`);
        agentProcess = null;
      });

      // Show webview or panel
      showAgentPanel(context);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to start qclaw: ${error.message}`);
    }
  });

  const stopCommand = vscode.commands.registerCommand('qclaw.stop', () => {
    if (agentProcess) {
      agentProcess.kill();
      agentProcess = null;
      outputChannel?.dispose();
      outputChannel = null;
      vscode.window.showInformationMessage('Qclaw agent stopped.');
    }
  });

  const sendCommand = vscode.commands.registerCommand('qclaw.send', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor.');
      return;
    }

    const selection = editor.selection;
    const text = selection.isEmpty
      ? editor.document.getText()
      : editor.document.getText(selection);

    if (agentProcess) {
      // Send to agent via stdin (RPC)
      agentProcess.stdin?.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'prompt',
        params: { text },
        id: Date.now()
      }) + '\n');
    } else {
      vscode.window.showWarningMessage('Qclaw agent not running. Start it first.');
    }
  });

  context.subscriptions.push(startCommand, stopCommand, sendCommand);
}

function handleAgentOutput(data: string) {
  // Parse RPC notifications and events
  try {
    const lines = data.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        const msg = JSON.parse(line);
        if (msg.method === 'agent_event') {
          // Update UI based on event type
          console.log('Agent event:', msg.params.event);
        }
      }
    }
  } catch {
    // Ignore parse errors (could be partial data)
  }
}

function showAgentPanel(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'qclaw',
    'Qclaw Agent',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = getWebviewContent();
  panel.webview.onDidReceiveMessage(message => {
    if (message.command === 'send') {
      // Forward to agent
    }
  });
}

function getWebviewContent(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        .message { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .user { background: #e1f5fe; }
        .assistant { background: #f1f8e9; }
        #input { width: 100%; box-sizing: border-box; }
      </style>
    </head>
    <body>
      <h2>Qclaw Agent</h2>
      <div id="messages"></div>
      <input type="text" id="input" placeholder="Type your message..." />
      <script>
        const input = document.getElementById('input');
        const messages = document.getElementById('messages');

        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            const text = input.value;
            if (text) {
              addMessage(text, 'user');
              vscode.postMessage({ command: 'send', text });
              input.value = '';
            }
          }
        });

        function addMessage(text, role) {
          const div = document.createElement('div');
          div.className = 'message ' + role;
          div.textContent = (role === 'user' ? 'You: ' : 'Agent: ') + text;
          messages.appendChild(div);
        }

        window.addEventListener('message', event => {
          const message = event.data;
          if (message.command === 'response') {
            addMessage(message.text, 'assistant');
          }
        });
      </script>
    </body>
    </html>
  `;
}

export function deactivate() {
  if (agentProcess) {
    agentProcess.kill();
  }
}
