// @ts-nocheck
import * as vscode from 'vscode';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { DailyNoteManager } from '../managers/DailyNoteManager';

export class QuickCaptureSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewId = 'obsd.quickCapture';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly configManager: ConfigurationManager,
        private readonly dailyNoteManager?: DailyNoteManager
    ) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (msg) => {
            try {
                switch (msg.command) {
                    case 'capture:add': {
                        const text: string = msg.content || '';
                        if (!text || text.trim() === '') {
                            webviewView.webview.postMessage({ command: 'error', message: 'Empty capture' });
                            return;
                        }

                        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                        if (!workspaceFolder) {
                            webviewView.webview.postMessage({ command: 'error', message: 'No workspace open' });
                            return;
                        }

                        if (!this.dailyNoteManager) {
                            webviewView.webview.postMessage({ command: 'error', message: 'DailyNoteManager unavailable' });
                            return;
                        }

                        const result = await this.dailyNoteManager.appendToSection(workspaceFolder, text);
                        webviewView.webview.postMessage({ command: 'capture:ok', timestamp: new Date().toISOString(), uri: result.uri.toString(), line: result.line });
                        return;
                    }

                    case 'request:tasks': {
                        // For MVP return empty list; task extraction implemented later
                        webviewView.webview.postMessage({ command: 'tasks:update', tasks: [] });
                        return;
                    }
                }
            } catch (e) {
                webviewView.webview.postMessage({ command: 'error', message: e instanceof Error ? e.message : String(e) });
            }
        });
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = getNonce();
        return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 8px; }
    .capture { display:flex; gap:8px; }
    input[type="text"] { flex:1; padding:6px 8px; }
    button { padding:6px 8px; }
    .tasks { margin-top:12px; }
    .task { display:flex; align-items:center; gap:8px; padding:4px 0; }
    .task button { margin-left:auto; }
  </style>
</head>
<body>
  <div>
    <div class="capture">
      <input id="captureInput" type="text" placeholder="Quick note..." />
      <button id="captureBtn">Add</button>
    </div>

    <div class="tasks">
      <h4>Open tasks</h4>
      <div id="tasksList">(loading...)</div>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const input = document.getElementById('captureInput');
    const btn = document.getElementById('captureBtn');
    const tasksList = document.getElementById('tasksList');

    btn.addEventListener('click', () => {
      const v = input.value.trim();
      if (!v) return;
      vscode.postMessage({ command: 'capture:add', content: v });
      input.value = '';
    });

    window.addEventListener('message', event => {
      const msg = event.data;
      switch (msg.command) {
        case 'capture:ok':
          // Simple ack
          tasksList.innerText = 'Captured at ' + new Date(msg.timestamp).toLocaleTimeString();
          break;
        case 'tasks:update':
          const tasks = msg.tasks || [];
          if (tasks.length === 0) {
            tasksList.innerText = '(no tasks)';
          } else {
            tasksList.innerHTML = tasks.map(t => `<div class=\"task\">${escapeHtml(t.text)} <button data-uri=\"${t.uri}\">Complete</button></div>`).join('');
          }
          break;
        case 'error':
          tasksList.innerText = 'Error: ' + msg.message;
          break;
      }
    });

    // request initial tasks
    vscode.postMessage({ command: 'request:tasks' });

    function escapeHtml(s) { return s.replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  </script>
</body>
</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
