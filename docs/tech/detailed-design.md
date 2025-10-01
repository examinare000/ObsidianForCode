# ObsidianForCode 詳細設計書

## 1. アーキテクチャ概要

### 1.1 システム全体構成
```
┌─────────────────────────────────────────┐
│            VS Code Host                 │
├─────────────────────────────────────────┤
│  ObsidianForCode Extension              │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │  Extension  │  │   Webview       │  │
│  │   Host      │←→│   Provider      │  │
│  └─────────────┘  └─────────────────┘  │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │  Document   │  │   Command       │  │
│  │Link Provider│  │   Handler       │  │
│  └─────────────┘  └─────────────────┘  │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │ WikiLink    │  │ Configuration   │  │
│  │ Processor   │  │   Manager       │  │
│  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────┤
│         Workspace FileSystem           │
└─────────────────────────────────────────┘
```

### 1.2 主要コンポーネント責務

| コンポーネント | 責務 | 外部依存 |
|----------------|------|----------|
| Extension Host | 拡張機能のライフサイクル管理 | VS Code API |
| DocumentLinkProvider | `[[...]]`パターンの検出・リンク化 | TextDocument |
| WikiLink Processor | リンクの解析・ファイルパス解決 | workspace.fs |
| Command Handler | コマンド実行・キーバインド処理 | VS Code Commands |
| DailyNote Manager | 日次ノート作成・管理 | workspace.fs |
| Context Provider | WikiLinkコンテキスト検出 | TextEditor |
| Webview Provider | Markdownプレビュー表示 | Webview API |
| Configuration Manager | 設定値管理・バリデーション | VS Code Settings |
| DateTime Formatter | 日時フォーマット処理 | なし |

## 2. VS Code拡張機能アーキテクチャ

### 2.1 package.json設計

```json
{
  "name": "obsidianforcode",
  "displayName": "Obsidian for Code",
  "version": "0.1.0",
  "engines": { "vscode": "^1.74.0" },
  "categories": ["Other"],
  "activationEvents": [
    "onLanguage:markdown"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "obsd.openOrCreateWikiLink",
        "title": "Open or Create Wiki Link"
      },
      {
        "command": "obsd.insertDate",
        "title": "Insert Date"
      },
      {
        "command": "obsd.insertTime", 
        "title": "Insert Time"
      },
      {
        "command": "obsd.preview",
        "title": "Preview Markdown"
      }
    ],
    "keybindings": [
      {
        "command": "obsd.openOrCreateWikiLink",
        "key": "ctrl+enter",
        "mac": "cmd+enter",
        "when": "editorTextFocus && obsd.inWikiLink"
      },
      {
        "command": "obsd.insertDate",
        "key": "alt+d",
        "when": "editorTextFocus"
      },
      {
        "command": "obsd.insertTime",
        "key": "alt+t", 
        "when": "editorTextFocus"
      }
    ],
    "configuration": {
      "title": "Obsidian for Code",
      "properties": {
        "obsd.vaultRoot": {
          "type": "string",
          "default": "",
          "description": "Vault root directory path"
        },
        "obsd.noteExtension": {
          "type": "string", 
          "default": ".md",
          "description": "Note file extension"
        },
        "obsd.slugStrategy": {
          "type": "string",
          "enum": ["passthrough", "kebab-case", "snake_case"],
          "default": "passthrough",
          "description": "File name transformation strategy"
        },
        "obsd.dateFormat": {
          "type": "string",
          "default": "YYYY-MM-DD",
          "description": "Date insertion format"
        },
        "obsd.timeFormat": {
          "type": "string", 
          "default": "HH:mm",
          "description": "Time insertion format"
        },
        "obsd.template": {
          "type": "string",
          "default": "",
          "description": "New note template"
        },
        "obsd.dailyNoteEnabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable or disable DailyNote functionality"
        },
        "obsd.dailyNotePath": {
          "type": "string",
          "default": "dailynotes",
          "description": "Daily notes directory path (relative to vault root)"
        },
        "obsd.dailyNoteTemplate": {
          "type": "string",
          "default": "",
          "description": "Daily note template file path (relative to vault root)"
        },
        "obsd.dailyNoteKeybindingGuide": {
          "type": "string",
          "default": "Follow the steps below",
          "readonly": true,
          "description": "How to configure DailyNote keyboard shortcut",
          "markdownDescription": "**How to configure DailyNote keyboard shortcut:**\\n\\n1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)\\n2. Type `Preferences: Open Keyboard Shortcuts`\\n3. Search for `obsd.openDailyNote`\\n4. Click the `+` icon to set your preferred key combination\\n\\n**Default suggestion:** `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (Mac)\\n\\n*This setting is for guidance only and cannot be edited.*"
        }
      }
    }
  }
}
```

### 2.2 拡張機能エントリーポイント

```typescript
// src/extension.ts
import * as vscode from 'vscode';
import { WikiLinkProvider } from './providers/WikiLinkProvider';
import { PreviewProvider } from './providers/PreviewProvider';
import { CommandHandler } from './handlers/CommandHandler';
import { ContextManager } from './managers/ContextManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('ObsidianForCode extension is now active');
    
    // プロバイダー登録
    const wikiLinkProvider = new WikiLinkProvider();
    const previewProvider = new PreviewProvider(context);
    const commandHandler = new CommandHandler();
    const contextManager = new ContextManager();
    
    // DocumentLinkProvider登録
    context.subscriptions.push(
        vscode.languages.registerDocumentLinkProvider(
            { scheme: 'file', language: 'markdown' },
            wikiLinkProvider
        )
    );
    
    // Webviewプロバイダー登録
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'obsd.preview',
            previewProvider
        )
    );
    
    // コマンド登録
    context.subscriptions.push(
        vscode.commands.registerCommand('obsd.openOrCreateWikiLink', 
            () => commandHandler.openOrCreateWikiLink()),
        vscode.commands.registerCommand('obsd.insertDate',
            () => commandHandler.insertDate()),
        vscode.commands.registerCommand('obsd.insertTime',
            () => commandHandler.insertTime()),
        vscode.commands.registerCommand('obsd.preview',
            () => previewProvider.show())
    );
    
    // エディタ変更監視（コンテキスト管理）
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(
            (e) => contextManager.updateWikiLinkContext(e)
        )
    );
}

export function deactivate() {}
```

## 3. WikiLink処理システム設計

### 3.1 WikiLinkProvider実装

```typescript
// src/providers/WikiLinkProvider.ts
import * as vscode from 'vscode';
import { WikiLinkProcessor } from '../processors/WikiLinkProcessor';

export class WikiLinkProvider implements vscode.DocumentLinkProvider {
    private processor = new WikiLinkProcessor();
    
    async provideDocumentLinks(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentLink[]> {
        const links: vscode.DocumentLink[] = [];
        const text = document.getText();
        
        // [[...]]パターンを検出
        const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
        let match;
        
        while ((match = wikiLinkPattern.exec(text)) !== null) {
            const linkText = match[1];
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);
            
            // リンク先ファイルパス解決
            const targetUri = await this.processor.resolveWikiLink(linkText, document.uri);
            
            const documentLink = new vscode.DocumentLink(range, targetUri);
            documentLink.tooltip = `Open: ${linkText}`;
            links.push(documentLink);
        }
        
        return links;
    }
}
```

### 3.2 WikiLink処理ロジック

```typescript
// src/processors/WikiLinkProcessor.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationManager } from '../managers/ConfigurationManager';

export interface ParsedWikiLink {
    pageName: string;
    displayName?: string;
    heading?: string;
    isAlias: boolean;
}

export class WikiLinkProcessor {
    private config = new ConfigurationManager();
    
    /**
     * WikiLink文字列を解析
     */
    parseWikiLink(linkText: string): ParsedWikiLink {
        // [[Page|Display]] 形式の解析
        const aliasMatch = linkText.match(/^([^|]+)\|(.+)$/);
        if (aliasMatch) {
            return {
                pageName: aliasMatch[1].trim(),
                displayName: aliasMatch[2].trim(),
                isAlias: true
            };
        }
        
        // [[Page#Heading]] 形式の解析
        const headingMatch = linkText.match(/^([^#]+)#(.+)$/);
        if (headingMatch) {
            return {
                pageName: headingMatch[1].trim(),
                heading: headingMatch[2].trim(),
                isAlias: false
            };
        }
        
        // 単純な [[Page]] 形式
        return {
            pageName: linkText.trim(),
            isAlias: false
        };
    }
    
    /**
     * WikiLinkをファイルパスに解決
     */
    async resolveWikiLink(linkText: string, currentDocumentUri: vscode.Uri): Promise<vscode.Uri> {
        const parsed = this.parseWikiLink(linkText);
        const vaultRoot = this.config.getVaultRoot(currentDocumentUri);
        const noteExtension = this.config.getNoteExtension();
        
        // ファイル名変換
        const fileName = this.transformFileName(parsed.pageName) + noteExtension;
        const filePath = path.join(vaultRoot.fsPath, fileName);
        
        return vscode.Uri.file(filePath);
    }
    
    /**
     * ファイル名変換（slug化）
     */
    private transformFileName(pageName: string): string {
        const strategy = this.config.getSlugStrategy();
        
        switch (strategy) {
            case 'kebab-case':
                return pageName.toLowerCase().replace(/\s+/g, '-');
            case 'snake_case':
                return pageName.toLowerCase().replace(/\s+/g, '_');
            case 'passthrough':
            default:
                return pageName;
        }
    }
    
    /**
     * ファイル存在チェック
     */
    async fileExists(uri: vscode.Uri): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * 新規ファイル作成
     */
    async createNewFile(uri: vscode.Uri): Promise<void> {
        const template = this.config.getTemplate();
        const content = new TextEncoder().encode(template);
        
        // ディレクトリ作成
        const dirUri = vscode.Uri.file(path.dirname(uri.fsPath));
        await vscode.workspace.fs.createDirectory(dirUri);
        
        // ファイル作成
        await vscode.workspace.fs.writeFile(uri, content);
    }
}
```

## 4. Markdownプレビューシステム設計

### 4.1 PreviewProvider実装

```typescript
// src/providers/PreviewProvider.ts
import * as vscode from 'vscode';
import { MarkdownRenderer } from '../renderers/MarkdownRenderer';

export class PreviewProvider implements vscode.WebviewViewProvider {
    private webviewView?: vscode.WebviewView;
    private renderer = new MarkdownRenderer();
    
    constructor(private context: vscode.ExtensionContext) {}
    
    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void {
        this.webviewView = webviewView;
        
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };
        
        // エディタ変更監視
        vscode.window.onDidChangeActiveTextEditor(() => {
            this.updatePreview();
        });
        
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document === vscode.window.activeTextEditor?.document) {
                this.updatePreview();
            }
        });
        
        this.updatePreview();
    }
    
    private async updatePreview(): Promise<void> {
        if (!this.webviewView) return;
        
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'markdown') {
            this.webviewView.webview.html = '<p>No markdown file active</p>';
            return;
        }
        
        const markdown = editor.document.getText();
        const html = await this.renderer.renderMarkdown(markdown, editor.document.uri);
        
        this.webviewView.webview.html = this.getWebviewContent(html);
    }
    
    private getWebviewContent(html: string): string {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 20px;
        }
        .wiki-link {
            color: #0366d6;
            text-decoration: none;
            cursor: pointer;
        }
        .wiki-link:hover {
            text-decoration: underline;
        }
        .wiki-link-missing {
            color: #d73a49;
        }
    </style>
</head>
<body>
    ${html}
    <script>
        const vscode = acquireVsCodeApi();
        
        // WikiLinkクリック処理
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('wiki-link')) {
                e.preventDefault();
                const linkText = e.target.dataset.link;
                vscode.postMessage({
                    command: 'openWikiLink',
                    link: linkText
                });
            }
        });
    </script>
</body>
</html>`;
    }
}
```

### 4.2 MarkdownRenderer実装

```typescript
// src/renderers/MarkdownRenderer.ts
import * as vscode from 'vscode';
import MarkdownIt from 'markdown-it';
import wikilinksPlugin from '@ig3/markdown-it-wikilinks';
import { WikiLinkProcessor } from '../processors/WikiLinkProcessor';

export class MarkdownRenderer {
    private md: MarkdownIt;
    private wikiLinkProcessor = new WikiLinkProcessor();
    
    constructor() {
        this.md = new MarkdownIt({
            html: false,
            xhtmlOut: true,
            breaks: true,
            linkify: true
        });
        
        // WikiLinksプラグイン設定
        this.md.use(wikilinksPlugin, {
            baseURL: '',
            uriSuffix: '',
            htmlAttributes: {
                class: 'wiki-link'
            },
            generatePageNameFromLabel: (label: string) => label,
            postProcessPageName: (pageName: string) => pageName
        });
    }
    
    async renderMarkdown(markdown: string, documentUri: vscode.Uri): Promise<string> {
        // WikiLinksの前処理
        const processedMarkdown = await this.preprocessWikiLinks(markdown, documentUri);
        
        // Markdown→HTML変換
        return this.md.render(processedMarkdown);
    }
    
    private async preprocessWikiLinks(markdown: string, documentUri: vscode.Uri): Promise<string> {
        const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
        let processedMarkdown = markdown;
        
        const matches = Array.from(markdown.matchAll(wikiLinkPattern));
        
        for (const match of matches) {
            const linkText = match[1];
            const parsed = this.wikiLinkProcessor.parseWikiLink(linkText);
            const targetUri = await this.wikiLinkProcessor.resolveWikiLink(linkText, documentUri);
            const exists = await this.wikiLinkProcessor.fileExists(targetUri);
            
            const displayText = parsed.displayName || parsed.pageName;
            const className = exists ? 'wiki-link' : 'wiki-link wiki-link-missing';
            
            const replacement = `<a href="#" class="${className}" data-link="${linkText}">${displayText}</a>`;
            processedMarkdown = processedMarkdown.replace(match[0], replacement);
        }
        
        return processedMarkdown;
    }
}
```

## 5. 日時挿入システム設計

### 5.1 CommandHandler実装（日時機能部分）

```typescript
// src/handlers/CommandHandler.ts（日時関連部分）
import * as vscode from 'vscode';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { DateTimeFormatter } from '../utils/DateTimeFormatter';

export class CommandHandler {
    private config = new ConfigurationManager();
    private formatter = new DateTimeFormatter();
    
    async insertDate(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        
        const format = this.config.getDateFormat();
        const dateString = this.formatter.formatDate(new Date(), format);
        
        await editor.edit(editBuilder => {
            const position = editor.selection.active;
            editBuilder.insert(position, dateString);
        });
    }
    
    async insertTime(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        
        const format = this.config.getTimeFormat();
        const timeString = this.formatter.formatTime(new Date(), format);
        
        await editor.edit(editBuilder => {
            const position = editor.selection.active;
            editBuilder.insert(position, timeString);
        });
    }
}
```

### 5.2 DateTimeFormatter実装

```typescript
// src/utils/DateTimeFormatter.ts
export class DateTimeFormatter {
    formatDate(date: Date, format: string): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return format
            .replace('YYYY', String(year))
            .replace('MM', month)
            .replace('DD', day);
    }
    
    formatTime(date: Date, format: string): string {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return format
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }
}
```

## 6. 設定管理システム設計

### 6.1 ConfigurationManager実装

```typescript
// src/managers/ConfigurationManager.ts
import * as vscode from 'vscode';
import * as path from 'path';

export class ConfigurationManager {
    private static readonly CONFIG_SECTION = 'obsd';
    
    getVaultRoot(fallbackUri?: vscode.Uri): vscode.Uri {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        const vaultRootPath = config.get<string>('vaultRoot');
        
        if (vaultRootPath) {
            return vscode.Uri.file(vaultRootPath);
        }
        
        // フォールバック: ワークスペースルートまたは現在のファイルのディレクトリ
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            return workspaceFolder.uri;
        }
        
        if (fallbackUri) {
            return vscode.Uri.file(path.dirname(fallbackUri.fsPath));
        }
        
        throw new Error('No vault root could be determined');
    }
    
    getNoteExtension(): string {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<string>('noteExtension', '.md');
    }
    
    getSlugStrategy(): 'passthrough' | 'kebab-case' | 'snake_case' {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<'passthrough' | 'kebab-case' | 'snake_case'>('slugStrategy', 'passthrough');
    }
    
    getDateFormat(): string {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<string>('dateFormat', 'YYYY-MM-DD');
    }
    
    getTimeFormat(): string {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<string>('timeFormat', 'HH:mm');
    }
    
    getTemplate(): string {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<string>('template', '');
    }
    
    /**
     * 設定変更監視
     */
    onConfigurationChanged(callback: () => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ConfigurationManager.CONFIG_SECTION)) {
                callback();
            }
        });
    }
}
```

## 7. コンテキスト管理システム設計

### 7.1 ContextManager実装

```typescript
// src/managers/ContextManager.ts
import * as vscode from 'vscode';

export class ContextManager {
    private static readonly CONTEXT_KEY = 'obsd.inWikiLink';
    
    /**
     * エディタ選択位置変更時にコンテキスト更新
     */
    updateWikiLinkContext(event: vscode.TextEditorSelectionChangeEvent): void {
        const editor = event.textEditor;
        if (!editor || editor.document.languageId !== 'markdown') {
            vscode.commands.executeCommand('setContext', ContextManager.CONTEXT_KEY, false);
            return;
        }
        
        const position = editor.selection.active;
        const inWikiLink = this.isPositionInWikiLink(editor.document, position);
        
        vscode.commands.executeCommand('setContext', ContextManager.CONTEXT_KEY, inWikiLink);
    }
    
    /**
     * 指定位置がWikiLink内かどうか判定
     */
    private isPositionInWikiLink(document: vscode.TextDocument, position: vscode.Position): boolean {
        const line = document.lineAt(position.line);
        const lineText = line.text;
        const charIndex = position.character;
        
        // 現在位置の前後でWikiLinkパターンを検索
        const beforeText = lineText.substring(0, charIndex);
        const afterText = lineText.substring(charIndex);
        
        // [[で始まり]]で終わるパターンを検索
        const openBrackets = beforeText.lastIndexOf('[[');
        const closeBrackets = afterText.indexOf(']]');
        
        // 有効なWikiLink内かどうか判定
        if (openBrackets !== -1 && closeBrackets !== -1) {
            // [[と]]の間に他の[[]]がないかチェック
            const linkContent = beforeText.substring(openBrackets + 2) + afterText.substring(0, closeBrackets);
            return !linkContent.includes('[[') && !linkContent.includes(']]');
        }
        
        return false;
    }
}
```

## 8. エラーハンドリング・ログ設計

### 8.1 ErrorHandler実装

```typescript
// src/utils/ErrorHandler.ts
import * as vscode from 'vscode';

export enum ErrorSeverity {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error'
}

export class ErrorHandler {
    private static readonly OUTPUT_CHANNEL_NAME = 'Obsidian for Code';
    private static outputChannel: vscode.OutputChannel;
    
    static initialize(): void {
        this.outputChannel = vscode.window.createOutputChannel(this.OUTPUT_CHANNEL_NAME);
    }
    
    static log(message: string, severity: ErrorSeverity = ErrorSeverity.INFO): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${severity.toUpperCase()}] ${message}`;
        
        this.outputChannel.appendLine(logMessage);
        
        // エラー/警告の場合はユーザーに通知
        if (severity === ErrorSeverity.ERROR) {
            vscode.window.showErrorMessage(`Obsidian for Code: ${message}`);
        } else if (severity === ErrorSeverity.WARNING) {
            vscode.window.showWarningMessage(`Obsidian for Code: ${message}`);
        }
    }
    
    static handleError(error: Error, context: string): void {
        const message = `${context}: ${error.message}`;
        this.log(message, ErrorSeverity.ERROR);
        console.error(error);
    }
    
    static dispose(): void {
        this.outputChannel?.dispose();
    }
}
```

## 9. テスト設計

### 9.1 テスト戦略
- **Unit Tests**: 各クラス・メソッドの単体テスト
- **Integration Tests**: VS Code API連携テスト
- **E2E Tests**: 実際の操作シナリオテスト

### 9.2 テストファイル構造
```
tests/
├── unit/
│   ├── processors/
│   │   └── WikiLinkProcessor.test.ts
│   ├── renderers/
│   │   └── MarkdownRenderer.test.ts
│   └── utils/
│       └── DateTimeFormatter.test.ts
├── integration/
│   ├── providers/
│   │   ├── WikiLinkProvider.test.ts
│   │   └── PreviewProvider.test.ts
│   └── managers/
│       └── ConfigurationManager.test.ts
└── e2e/
    ├── wikilink-workflow.test.ts
    ├── preview-workflow.test.ts
    └── datetime-insertion.test.ts
```

## 10. パフォーマンス考慮事項

### 10.1 最適化ポイント
1. **WikiLink検索**: 正規表現の効率化、キャッシュ機能
2. **プレビュー更新**: デバウンス処理、差分更新
3. **ファイルシステムアクセス**: バッチ処理、エラーハンドリング
4. **メモリ管理**: 大きなドキュメントでのメモリリーク防止

### 10.2 監視指標
- WikiLink処理時間 < 100ms
- プレビュー更新時間 < 100ms
- 拡張機能起動時間 < 500ms
- メモリ使用量 < 50MB

## 11. 実装実績・デバッグ解決記録

### 11.1 WikiLink機能デバッグ解決 (2025-09-18)

**解決した問題**:
1. **Cmd+Enter キーバインド不動作**: WikiLink内でのコマンド実行が機能しない
2. **ファイル作成パスエラー**: root filesystem への誤った書き込み試行

**根本原因**:
- **package.json エントリーポイント設定ミス**: `"main": "./out/extension.js"` → `"./out/src/extension.js"`
- **WikiLink位置検出ロジックの不正確性**: 文字列ベース検出をregexベース検出に改善

**実装された解決策**:

#### 11.1.1 WikiLinkContextProvider の改善実装
```typescript
// src/providers/WikiLinkContextProvider.ts - 実装済み
private isPositionInWikiLink(document: vscode.TextDocument, position: vscode.Position): boolean {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;

    let match;
    while ((match = wikiLinkRegex.exec(text)) !== null) {
        const linkStart = match.index;
        const linkEnd = match.index + match[0].length;
        // [[ の直後から ]] の直前まで（内側）にある場合のみtrue
        if (offset >= linkStart + 2 && offset <= linkEnd - 3) {
            return true;
        }
    }
    return false;
}
```

#### 11.1.2 拡張機能初期化の詳細ログ実装
```typescript
// src/extension.ts - 実装済み
export function activate(context: vscode.ExtensionContext) {
    console.log('[INIT] ObsidianForCode extension is now active');
    console.log('[INIT] Extension context:', context.extensionPath);
    console.log('[INIT] Workspace folders:', vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath));

    // 各コンポーネントの段階的初期化とエラーハンドリング
    try {
        const configManager = new ConfigurationManager_1.ConfigurationManager();
        console.log('[INIT] ConfigurationManager created successfully');

        const wikiLinkProcessor = new WikiLinkProcessor_1.WikiLinkProcessor({
            slugStrategy: 'passthrough'
        });
        console.log('[INIT] WikiLinkProcessor created successfully');

        // ... 他のコンポーネント初期化
    } catch (error) {
        console.error('[INIT] Error during component initialization:', error);
    }
}
```

**成果**:
- ✅ Cmd+Enter キーバインドが正常動作
- ✅ ファイル作成が適切なワークスペースパスで実行
- ✅ WikiLink コンテキスト検出が正確に動作
- ✅ 全てのコマンドが期待通りに登録・実行

**デバッグ手法**:
- 段階的ビルド作成 (0.1.1-debug → 0.1.4-debug)
- 包括的ログ出力による問題追跡
- VS Code キャッシュ回避のためのバージョン管理

## 12. DailyNote機能設計

### 12.1 機能概要
ユーザーがワンクリックで本日の日付のノートファイルを開設・作成できる機能。Obsidianの代表的機能の一つを VS Code 環境で提供する。

### 12.2 アーキテクチャ設計

#### 12.2.1 DailyNoteManager クラス
```typescript
// src/managers/DailyNoteManager.ts
export class DailyNoteManager {
    constructor(
        private configManager: ConfigurationManager,
        private dateTimeFormatter: DateTimeFormatter
    ) {}

    /**
     * 指定日付のDailyNoteファイル名を生成
     */
    getDailyNoteFileName(date: Date): string {
        const dateFormat = this.configManager.getDateFormat();
        const formattedDate = this.dateTimeFormatter.formatDate(date, dateFormat);
        const extension = this.configManager.getNoteExtension();
        return `${formattedDate}${extension}`;
    }

    /**
     * DailyNoteファイルの完全パスを解決
     */
    getDailyNotePath(workspaceFolder: vscode.WorkspaceFolder, date: Date): vscode.Uri {
        const fileName = this.getDailyNoteFileName(date);
        const dailyNotePath = this.configManager.getDailyNotePath();
        const vaultRoot = this.configManager.getVaultRoot();

        if (vaultRoot && vaultRoot.trim() !== '') {
            if (vaultRoot.startsWith('/') || vaultRoot.match(/^[A-Za-z]:/)) {
                return vscode.Uri.file(`${vaultRoot}/${dailyNotePath}/${fileName}`);
            } else {
                return vscode.Uri.joinPath(workspaceFolder.uri, vaultRoot, dailyNotePath, fileName);
            }
        } else {
            return vscode.Uri.joinPath(workspaceFolder.uri, dailyNotePath, fileName);
        }
    }

    /**
     * テンプレートファイルの内容を読み込み
     */
    async getTemplateContent(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
        const templatePath = this.configManager.getDailyNoteTemplate();

        if (!templatePath || templatePath.trim() === '') {
            return '';
        }

        try {
            const vaultRoot = this.configManager.getVaultRoot();
            let templateUri: vscode.Uri;

            if (vaultRoot && vaultRoot.trim() !== '') {
                if (vaultRoot.startsWith('/') || vaultRoot.match(/^[A-Za-z]:/)) {
                    templateUri = vscode.Uri.file(`${vaultRoot}/${templatePath}`);
                } else {
                    templateUri = vscode.Uri.joinPath(workspaceFolder.uri, vaultRoot, templatePath);
                }
            } else {
                templateUri = vscode.Uri.joinPath(workspaceFolder.uri, templatePath);
            }

            const data = await vscode.workspace.fs.readFile(templateUri);
            return new TextDecoder().decode(data);
        } catch (error) {
            // テンプレートファイルが見つからない場合は空文字列を返す
            return '';
        }
    }

    /**
     * DailyNoteを開設または作成するメイン処理
     */
    async openOrCreateDailyNote(workspaceFolder: vscode.WorkspaceFolder, date: Date = new Date()): Promise<void> {
        const dailyNoteUri = this.getDailyNotePath(workspaceFolder, date);

        try {
            // ファイルが既に存在するかチェック
            await vscode.workspace.fs.stat(dailyNoteUri);
            // 存在する場合はそのまま開く
            await vscode.window.showTextDocument(dailyNoteUri);
        } catch {
            // ファイルが存在しない場合は新規作成
            const templateContent = await this.getTemplateContent(workspaceFolder);
            const data = new TextEncoder().encode(templateContent);

            // ディレクトリが存在しない場合は作成
            const dirUri = vscode.Uri.file(path.dirname(dailyNoteUri.fsPath));
            await vscode.workspace.fs.createDirectory(dirUri);

            // ファイル作成
            await vscode.workspace.fs.writeFile(dailyNoteUri, data);

            // 新しいタブで開く
            await vscode.window.showTextDocument(dailyNoteUri);
        }
    }
}
```

#### 12.2.2 ConfigurationManager 拡張
```typescript
// src/managers/ConfigurationManager.ts に追加
export class ConfigurationManager {
    // 既存メソッド...

    getDailyNoteTemplate(): string {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<string>('dailyNoteTemplate', '');
    }

    getDailyNotePath(): string {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<string>('dailyNotePath', 'dailynotes');
    }
}
```

### 12.3 コマンド統合

#### 12.3.1 extension.ts への統合
```typescript
// src/extension.ts
export function activate(context: vscode.ExtensionContext) {
    // 既存初期化処理...

    const dailyNoteManager = new DailyNoteManager(configManager, dateTimeFormatter);

    // コマンド登録
    const dailyNoteCommand = vscode.commands.registerCommand('obsd.openDailyNote', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
            return;
        }

        try {
            await dailyNoteManager.openOrCreateDailyNote(workspaceFolder);
        } catch (error) {
            vscode.window.showErrorMessage('Failed to open daily note');
        }
    });

    context.subscriptions.push(dailyNoteCommand);
}
```

### 12.4 設定項目

#### 12.4.1 package.json 設定定義
```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "obsd.dailyNoteTemplate": {
          "type": "string",
          "default": "",
          "description": "Daily note template file path (relative to vault root)"
        },
        "obsd.dailyNotePath": {
          "type": "string",
          "default": "dailynotes",
          "description": "Daily notes directory path (relative to vault root)"
        }
      }
    },
    "commands": [
      {
        "command": "obsd.openDailyNote",
        "title": "Obsidian for Code: Open Daily Note",
        "category": "Obsidian for Code"
      }
    ],
    "keybindings": [
      {
        "command": "obsd.openDailyNote",
        "key": "ctrl+shift+d",
        "mac": "cmd+shift+d",
        "when": "editorTextFocus"
      }
    ]
  }
}
```

### 12.5 テスト戦略

#### 12.5.1 単体テスト
- `getDailyNoteFileName()`: 日付フォーマット処理テスト
- `getDailyNotePath()`: パス解決ロジックテスト
- `getTemplateContent()`: テンプレート読み込みテスト
- `openOrCreateDailyNote()`: ファイル作成・開設テスト

#### 12.5.2 統合テスト
- VS Code コマンド実行テスト
- ワークスペース連携テスト
- エラーハンドリングテスト

### 12.6 エラーハンドリング

#### 12.6.1 想定エラーシナリオ
1. **ワークスペースフォルダなし**: 適切なエラーメッセージ表示
2. **テンプレートファイル不存在**: 空のファイル作成
3. **ディレクトリ作成権限なし**: エラーメッセージ表示
4. **ファイル書き込み権限なし**: エラーメッセージ表示

#### 12.6.2 フォールバック戦略
- テンプレート読み込み失敗 → 空ファイル作成
- ディレクトリ作成失敗 → ワークスペースルートに作成
- 設定値不正 → デフォルト値使用

## 13. 設定可能なDailyNote機能設計 (v0.4.0-v0.4.1)

### 13.1 機能拡張概要
基本的なDailyNote機能を拡張し、ユーザーが機能の有効/無効を設定可能とし、キーバインドをカスタマイズできるようにする。

### 13.2 条件付き機能登録アーキテクチャ

#### 13.2.1 設定ベース機能登録
```typescript
// src/extension.ts - 実装済み
export function activate(context: vscode.ExtensionContext) {
    const configManager = new ConfigurationManager();

    // DailyNote Manager初期化（設定により条件付き）
    let dailyNoteManager: DailyNoteManager | undefined;
    if (configManager.getDailyNoteEnabled()) {
        try {
            dailyNoteManager = new DailyNoteManager(configManager, dateTimeFormatter);

            // コマンド登録（有効時のみ）
            const dailyNoteCommand = vscode.commands.registerCommand('obsd.openDailyNote', async () => {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
                    return;
                }
                try {
                    await dailyNoteManager!.openOrCreateDailyNote(workspaceFolder);
                } catch (error: any) {
                    vscode.window.showErrorMessage('Failed to open daily note');
                }
            });

            context.subscriptions.push(dailyNoteCommand);
        } catch (error) {
            vscode.window.showErrorMessage('Failed to initialize DailyNoteManager');
            return;
        }
    }
}
```

#### 13.2.2 ConfigurationManager 設定拡張
```typescript
// src/managers/ConfigurationManager.ts - 実装済み
export class ConfigurationManager {
    getDailyNoteEnabled(): boolean {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<boolean>('dailyNoteEnabled', true);
    }

    // v0.4.1で削除: getDailyNoteKeybinding()
    // Settings UI改善により削除されたメソッド
}
```

### 13.3 Settings UI改善設計 (v0.4.1)

#### 13.3.1 問題の特定
**課題**: キーバインド設定が編集可能テキストボックスとして表示され、ユーザーが設定を変更しても実際のVS Codeキーバインドには反映されない混乱を引き起こしていた。

#### 13.3.2 解決アプローチ
**設計方針**: VS Codeの制約（動的キーバインド変更不可）に適した設計に変更

```json
// package.json - 改善後設定
{
  "obsd.dailyNoteKeybindingGuide": {
    "type": "string",
    "default": "Follow the steps below",
    "readonly": true,
    "description": "How to configure DailyNote keyboard shortcut",
    "markdownDescription": "**How to configure DailyNote keyboard shortcut:**\\n\\n1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)\\n2. Type `Preferences: Open Keyboard Shortcuts`\\n3. Search for `obsd.openDailyNote`\\n4. Click the `+` icon to set your preferred key combination\\n\\n**Default suggestion:** `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (Mac)\\n\\n*This setting is for guidance only and cannot be edited.*"
  }
}
```

#### 13.3.3 設計決定の影響
- **UI明確性**: 編集可能であるかのような誤解を排除
- **ユーザーガイダンス**: 正確な設定手順を提供
- **保守性**: 実際に機能する設定のみ管理
- **信頼性**: ユーザー期待値と実際の動作の一致

## 14. テストアイソレーション設計

### 14.1 vscode依存問題の解決
**課題**: VS Code extension開発におけるテスト実行時の`vscode module not found`エラー

**解決策**: 独立したテスト環境の構築
```typescript
// tests/unit/managers/ConfigurableDailyNote.isolated.test.ts - 実装済み
describe('Configurable DailyNote Features (Isolated)', () => {
    // VS Code依存を排除したテストクラス実装
    class TestConfigurationManager {
        constructor(private config: any) {}

        getDailyNoteEnabled(): boolean {
            return this.config.get('dailyNoteEnabled', true);
        }
    }

    class TestDailyNoteManager {
        constructor(
            private configManager: any,
            private dateTimeFormatter: any
        ) {}

        getDailyNoteFileName(date: Date): string {
            // 実装ロジックのテスト（VS Code API非依存）
        }
    }
});
```

### 14.2 テスト構造最適化
```
Current Test Suite (46 tests passing):
├── DateTimeFormatter: 24 tests
├── WikiLinkProcessor: 10 tests
└── ConfigurableDailyNote (isolated): 12 tests
    ├── Configuration Logic Tests
    ├── DailyNote Manager Tests
    ├── Integration Scenario Tests
    └── Settings UI Validation Tests
```

### 14.3 品質保証指標

#### 14.3.1 テスト品質
- **テスト成功率**: 46/46 tests (100%)
- **テスト構造**: VS Code API非依存による安定性
- **カバレッジ**: Core機能の完全テスト

#### 14.3.2 コード品質
- **コンパイル**: TypeScript strict mode成功
- **Lint**: ESLint clean
- **アーキテクチャ**: レイヤード設計による保守性

## 15. Windows ファイルパス処理とコマンド登録改善 (v0.4.4)

### 15.1 問題の特定
Windows環境において、拡張機能のコマンド登録が失敗する問題が発生。調査により以下の問題を特定：

#### 15.1.1 ファイルパス処理の不完全性
- Windows絶対パス判定が `C:` 形式のみで、UNCパス（`\\server\share`）未対応
- パス区切り文字の混在による URI 作成エラー
- ファイル名サニタイズでWindows予約名が未チェック

#### 15.1.2 エラーハンドリングの問題
- 初期化失敗時にextension全体が無効化される
- コマンド登録失敗の詳細情報が不足

### 15.2 設計改善策

#### 15.2.1 PathUtil ユーティリティクラス設計
```typescript
// src/utils/PathUtil.ts
export class PathUtil {
    /**
     * プラットフォーム対応の絶対パス判定
     */
    static isAbsolutePath(path: string): boolean {
        // Unix/Linux/macOS
        if (path.startsWith('/')) return true;
        // Windows ドライブレター
        if (path.match(/^[A-Za-z]:[/\\]/)) return true;
        // Windows UNC パス
        if (path.match(/^\\\\[^\\]+\\/)) return true;
        return false;
    }

    /**
     * Windows予約名対応のファイル名サニタイズ
     */
    static sanitizeFileName(fileName: string): string {
        // Windows予約名チェック
        const reservedNames = ['CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];

        let sanitized = fileName
            .replace(/[/\\:*?"<>|]/g, '-')  // 特殊文字をハイフンに変換
            .replace(/\s+/g, ' ')          // 複数の空白を単一の空白に
            .trim()                        // 前後の空白を削除
            .replace(/\.+$/, '')           // 末尾のピリオドを削除
            .substring(0, 255);            // ファイル名長制限

        // 予約名チェック
        if (reservedNames.includes(sanitized.toUpperCase())) {
            sanitized = `_${sanitized}`;
        }

        return sanitized || 'untitled'; // 空文字列の場合のフォールバック
    }

    /**
     * 安全なURI作成
     */
    static createSafeUri(
        vaultRoot: string,
        fileName: string,
        extension: string,
        workspaceFolder: vscode.WorkspaceFolder
    ): vscode.Uri {
        const sanitizedFileName = this.sanitizeFileName(fileName) + extension;

        if (vaultRoot && vaultRoot.trim() !== '') {
            if (this.isAbsolutePath(vaultRoot)) {
                // 絶対パス: path.resolve()でクロスプラットフォーム対応
                const absolutePath = path.resolve(vaultRoot, sanitizedFileName);
                return vscode.Uri.file(absolutePath);
            } else {
                // 相対パス: joinPathでワークスペースからの相対パス
                return vscode.Uri.joinPath(workspaceFolder.uri, vaultRoot, sanitizedFileName);
            }
        } else {
            // vaultRootが空の場合、ワークスペースルートに作成
            return vscode.Uri.joinPath(workspaceFolder.uri, sanitizedFileName);
        }
    }
}
```

#### 15.2.2 改善されたエラーハンドリング戦略
```typescript
// src/extension.ts - 改善後のactivate関数
export function activate(context: vscode.ExtensionContext) {
    const errors: string[] = [];

    // 段階的初期化とフォールバック
    try {
        const configManager = new ConfigurationManager();

        // 個別コマンド登録（失敗しても他は継続）
        const commands: vscode.Disposable[] = [];

        // openOrCreateWikiLink コマンド
        try {
            const openCommand = vscode.commands.registerCommand('obsd.openOrCreateWikiLink', () => {
                return openOrCreateWikiLink(configManager);
            });
            commands.push(openCommand);
        } catch (error) {
            errors.push(`Failed to register openOrCreateWikiLink: ${error}`);
        }

        // insertDate コマンド
        try {
            const dateCommand = vscode.commands.registerCommand('obsd.insertDate', () => {
                return insertDate(configManager, dateTimeFormatter);
            });
            commands.push(dateCommand);
        } catch (error) {
            errors.push(`Failed to register insertDate: ${error}`);
        }

        // エラー報告（但し拡張機能は継続）
        if (errors.length > 0) {
            console.warn('[ObsidianForCode] Some commands failed to register:', errors);
            vscode.window.showWarningMessage(
                `ObsidianForCode: ${errors.length} command(s) failed to register. Check output panel for details.`
            );
        }

        context.subscriptions.push(...commands);
    } catch (error) {
        vscode.window.showErrorMessage('ObsidianForCode: Critical initialization failure');
        console.error('[ObsidianForCode] Critical error:', error);
    }
}
```

### 15.3 実装詳細

#### 15.3.1 ファイル作成処理の改善
```typescript
// 改善されたopenOrCreateWikiLink関数
async function openOrCreateWikiLink(configManager: ConfigurationManager): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
        return;
    }

    try {
        const position = editor.selection.active;
        const linkText = getWikiLinkAtPosition(editor.document, position);

        if (!linkText) {
            vscode.window.showInformationMessage('No WikiLink found at cursor position');
            return;
        }

        const wikiLinkProcessor = new WikiLinkProcessor({
            slugStrategy: configManager.getSlugStrategy()
        });
        const parsedLink = wikiLinkProcessor.parseWikiLink(linkText);

        // PathUtilを使用した安全なURI作成
        const uri = PathUtil.createSafeUri(
            configManager.getVaultRoot(),
            wikiLinkProcessor.transformFileName(parsedLink.pageName),
            configManager.getNoteExtension(),
            workspaceFolder
        );

        // ファイル存在チェックと作成処理
        try {
            await vscode.workspace.fs.stat(uri);
            await vscode.window.showTextDocument(uri);
        } catch {
            // ディレクトリ作成の改善
            try {
                const dirUri = vscode.Uri.file(path.dirname(uri.fsPath));
                await vscode.workspace.fs.createDirectory(dirUri);

                const template = configManager.getTemplate();
                const data = new TextEncoder().encode(template);
                await vscode.workspace.fs.writeFile(uri, data);
                await vscode.window.showTextDocument(uri);
            } catch (createError) {
                vscode.window.showErrorMessage(
                    `Failed to create file: ${createError instanceof Error ? createError.message : String(createError)}`
                );
            }
        }
    } catch (error) {
        vscode.window.showErrorMessage(
            `WikiLink operation failed: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}
```

### 15.4 テスト戦略

#### 15.4.1 PathUtil単体テスト
```typescript
// tests/unit/utils/PathUtil.test.ts
describe('PathUtil', () => {
    describe('isAbsolutePath', () => {
        it('should detect Unix absolute paths', () => {
            expect(PathUtil.isAbsolutePath('/usr/local/bin')).toBe(true);
        });

        it('should detect Windows drive letter paths', () => {
            expect(PathUtil.isAbsolutePath('C:\\Users\\test')).toBe(true);
            expect(PathUtil.isAbsolutePath('D:/data')).toBe(true);
        });

        it('should detect Windows UNC paths', () => {
            expect(PathUtil.isAbsolutePath('\\\\server\\share')).toBe(true);
        });

        it('should reject relative paths', () => {
            expect(PathUtil.isAbsolutePath('relative/path')).toBe(false);
            expect(PathUtil.isAbsolutePath('./current')).toBe(false);
        });
    });

    describe('sanitizeFileName', () => {
        it('should replace special characters', () => {
            expect(PathUtil.sanitizeFileName('file:name*')).toBe('file-name-');
        });

        it('should handle Windows reserved names', () => {
            expect(PathUtil.sanitizeFileName('CON')).toBe('_CON');
            expect(PathUtil.sanitizeFileName('PRN')).toBe('_PRN');
        });

        it('should remove trailing periods', () => {
            expect(PathUtil.sanitizeFileName('file...')).toBe('file');
        });
    });
});
```

#### 15.4.2 統合テスト
- Windows環境での実際のファイル作成テスト
- UNCパスでのアクセステスト
- エラー時のフォールバック動作テスト

### 15.5 パフォーマンス考慮

#### 15.5.1 最適化ポイント
- ファイル存在チェックのキャッシュ化
- バッチファイル操作でのI/O最適化
- エラーハンドリングでの詳細ログとユーザーフィードバックの分離

#### 15.5.2 監視指標
- ファイル作成処理時間 < 200ms (Windows)
- エラー率 < 1% (通常操作)
- メモリ使用量増加 < 5MB

### 15.6 後方互換性

#### 15.6.1 既存設定の維持
- 既存のvaultRoot設定は引き続き動作
- ファイル名変換戦略の互換性維持
- エラーメッセージの改善（但し機能は維持）

#### 15.6.2 移行戦略
- 段階的デプロイメント
- ユーザー設定の自動移行（必要に応じて）
- デバッグ版での事前検証

## 16. Extension Activation Fix (v0.4.4 hotfix)

### 16.1 問題の特定
VS Code拡張機能の起動時に以下のエラーが発生：

```
Error: Cannot find module 'c:\Users\RYOIKEDA\Documents\training\obsidianForCode\out\src\extension.js'
Activating extension obsidianforcode.obsidianforcode failed due to an error
```

エラーログの詳細分析により、VS Codeが`obsd.openDailyNote`コマンドで拡張機能を起動しようとしているが、package.jsonの`activationEvents`にこのコマンドが含まれていないことが判明。

### 16.2 根本原因分析

#### 16.2.1 activationEvents設定の不整合
```json
// 問題のあった設定
"activationEvents": [
  "onLanguage:markdown",
  "onCommand:obsd.openOrCreateWikiLink",
  "onCommand:obsd.insertDate",
  "onCommand:obsd.insertTime",
  "onCommand:obsd.preview"
  // ❌ "onCommand:obsd.openDailyNote" が欠落
]

// commands定義には存在
"commands": [
  {
    "command": "obsd.openDailyNote",  // ✅ コマンドは定義済み
    "title": "Obsidian for Code: Open Daily Note"
  }
]
```

#### 16.2.2 影響範囲
- DailyNote機能の完全な動作不能
- VS Code起動時のエラーメッセージ
- ユーザー体験の重大な悪化

### 16.3 解決策の実装

#### 16.3.1 修正内容
package.jsonの`activationEvents`配列に欠落していたイベントを追加：

```json
"activationEvents": [
  "onLanguage:markdown",
  "onCommand:obsd.openOrCreateWikiLink",
  "onCommand:obsd.insertDate",
  "onCommand:obsd.insertTime",
  "onCommand:obsd.preview",
  "onCommand:obsd.openDailyNote"  // ✅ 追加
]
```

#### 16.3.2 検証手順
1. **コンパイル成功確認**: `npm run compile`
2. **Lint チェック**: `npm run lint`
3. **起動イベント整合性**: activationEventsとcommands定義の一致確認

### 16.4 予防策の設計

#### 16.4.1 チェックリスト制定
新しいコマンドを追加する際の必須確認項目：
1. `package.json` の `contributes.commands` への追加
2. `package.json` の `activationEvents` への対応イベント追加
3. `src/extension.ts` でのコマンド登録実装
4. テストケースの追加

#### 16.4.2 自動化検討
将来の改善として、以下の自動チェック機能を検討：
```typescript
// 例: package.json整合性チェック関数
function validatePackageJsonConsistency() {
  const commands = packageJson.contributes.commands.map(cmd => cmd.command);
  const activationEvents = packageJson.activationEvents
    .filter(event => event.startsWith('onCommand:'))
    .map(event => event.replace('onCommand:', ''));

  const missingActivations = commands.filter(cmd =>
    !activationEvents.includes(cmd)
  );

  if (missingActivations.length > 0) {
    throw new Error(`Missing activation events: ${missingActivations.join(', ')}`);
  }
}
```

### 16.5 アーキテクチャ上の学習

#### 16.5.1 VS Code Extension Activation設計原則
- **完全性**: すべてのコマンドに対応するactivationEventが必要
- **一貫性**: package.json設定とコード実装の整合性
- **信頼性**: 起動失敗がユーザー体験に与える重大な影響

#### 16.5.2 設定管理ベストプラクティス
- 設定ファイル間の依存関係の明示的管理
- 変更時の整合性チェック工程の組み込み
- エラーメッセージの明確化（デバッグ情報の充実）

### 16.6 影響と効果

#### 16.6.1 修正前後の比較
| 項目 | 修正前 | 修正後 |
|------|--------|--------|
| DailyNote機能 | 完全に動作不能 | 正常動作 |
| 拡張機能起動 | エラーで失敗 | 正常起動 |
| ユーザー体験 | 重大な問題 | 期待通りの動作 |

#### 16.6.2 品質向上
- 拡張機能の信頼性向上
- 設定管理プロセスの改善
- ドキュメント化による再発防止

## 17. Enhanced Note Features設計 (v0.4.5)

### 17.1 機能概要
サブディレクトリからのノート検索、WikiLink自動補完、リスト自動継続機能を提供し、Obsidianライクなノート作成体験をVS Codeで実現する。

### 17.2 NoteFinder ユーティリティ設計

#### 17.2.1 統一されたAPI設計
全ての検索メソッドが一貫した戻り値型を返すよう設計：

```typescript
// src/utils/NoteFinder.ts
export interface NoteInfo {
    title: string;
    uri: vscode.Uri;
    relativePath: string;
}

export class NoteFinder {
    /**
     * タイトルによる完全一致検索（サブディレクトリ対応）
     */
    static async findNoteByTitle(
        title: string,
        workspaceFolder: vscode.WorkspaceFolder,
        vaultRoot?: string,
        extension: string = '.md'
    ): Promise<NoteInfo | null> {
        const searchBase = vaultRoot && vaultRoot.trim() !== ''
            ? path.join(workspaceFolder.uri.fsPath, vaultRoot)
            : workspaceFolder.uri.fsPath;

        const pattern = new vscode.RelativePattern(
            searchBase,
            `**/${title}${extension}`
        );

        try {
            const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');

            if (files.length > 0) {
                // ルートレベル優先でソート
                const sortedFiles = files.sort((a, b) => {
                    const aDepth = a.fsPath.split(path.sep).length;
                    const bDepth = b.fsPath.split(path.sep).length;
                    return aDepth - bDepth;
                });

                const file = sortedFiles[0];
                const relativePath = path.relative(searchBase, file.fsPath);
                return {
                    title: path.basename(file.fsPath, extension),
                    uri: file,
                    relativePath: relativePath
                };
            }
        } catch (error) {
            console.error('Error finding note:', error);
        }

        return null;
    }

    /**
     * プレフィックスによる前方一致検索
     * 完全一致を優先し、パス深度でソート
     */
    static async findNotesByPrefix(
        prefix: string,
        workspaceFolder: vscode.WorkspaceFolder,
        vaultRoot?: string,
        extension: string = '.md',
        maxResults: number = 50
    ): Promise<NoteInfo[]> {
        const searchBase = vaultRoot && vaultRoot.trim() !== ''
            ? path.join(workspaceFolder.uri.fsPath, vaultRoot)
            : workspaceFolder.uri.fsPath;

        const pattern = new vscode.RelativePattern(
            searchBase,
            `**/*${extension}`
        );

        try {
            const files = await vscode.workspace.findFiles(
                pattern,
                '**/node_modules/**',
                maxResults * 2
            );

            const results: NoteInfo[] = [];

            for (const file of files) {
                const fileName = path.basename(file.fsPath, extension);

                if (fileName.toLowerCase().startsWith(prefix.toLowerCase())) {
                    const relativePath = path.relative(searchBase, file.fsPath);
                    results.push({
                        title: fileName,
                        uri: file,
                        relativePath: relativePath
                    });
                }
            }

            // ソート戦略: 完全一致 > パス深度 > アルファベット順
            results.sort((a, b) => {
                const aExact = a.title.toLowerCase() === prefix.toLowerCase();
                const bExact = b.title.toLowerCase() === prefix.toLowerCase();

                if (aExact && !bExact) {
                    return -1;
                }
                if (!aExact && bExact) {
                    return 1;
                }

                const aDepth = a.relativePath.split(path.sep).length;
                const bDepth = b.relativePath.split(path.sep).length;

                if (aDepth !== bDepth) {
                    return aDepth - bDepth;
                }

                return a.title.localeCompare(b.title);
            });

            return results.slice(0, maxResults);
        } catch (error) {
            console.error('Error finding notes by prefix:', error);
            return [];
        }
    }

    /**
     * 全ノート取得（インデックス用）
     */
    static async getAllNotes(
        workspaceFolder: vscode.WorkspaceFolder,
        vaultRoot?: string,
        extension: string = '.md'
    ): Promise<NoteInfo[]> {
        const searchBase = vaultRoot && vaultRoot.trim() !== ''
            ? path.join(workspaceFolder.uri.fsPath, vaultRoot)
            : workspaceFolder.uri.fsPath;

        const pattern = new vscode.RelativePattern(
            searchBase,
            `**/*${extension}`
        );

        try {
            const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
            return files.map(file => {
                const fileName = path.basename(file.fsPath, extension);
                const relativePath = path.relative(searchBase, file.fsPath);
                return {
                    title: fileName,
                    uri: file,
                    relativePath: relativePath
                };
            });
        } catch (error) {
            console.error('Error getting all notes:', error);
            return [];
        }
    }
}
```

### 17.3 WikiLinkCompletionProvider設計

#### 17.3.1 自動補完プロバイダー実装
```typescript
// src/providers/WikiLinkCompletionProvider.ts
export class WikiLinkCompletionProvider implements vscode.CompletionItemProvider {
    constructor(private configManager: ConfigurationManager) {}

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | null> {
        const line = document.lineAt(position.line);
        const textBeforeCursor = line.text.substring(0, position.character);

        // WikiLink内部検出
        const lastOpenBrackets = textBeforeCursor.lastIndexOf('[[');
        const lastCloseBrackets = textBeforeCursor.lastIndexOf(']]');

        if (lastOpenBrackets === -1 || lastCloseBrackets > lastOpenBrackets) {
            return null;
        }

        // プレフィックス抽出
        const prefix = textBeforeCursor.substring(lastOpenBrackets + 2);

        // マルチルートワークスペース対応
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            return null;
        }

        // ノート候補取得
        const vaultRoot = this.configManager.getVaultRoot();
        const extension = this.configManager.getNoteExtension();

        const notes = await NoteFinder.findNotesByPrefix(
            prefix,
            workspaceFolder,
            vaultRoot,
            extension,
            50
        );

        // CompletionItem変換
        return notes.map((note, index) => {
            const item = new vscode.CompletionItem(
                note.title,
                vscode.CompletionItemKind.File
            );

            item.insertText = note.title;
            item.detail = note.relativePath;
            item.sortText = String(index).padStart(3, '0');
            item.documentation = new vscode.MarkdownString(
                `**${note.title}**\n\n📁 ${note.relativePath}`
            );

            // 閉じ括弧の自動調整
            const afterCursor = line.text.substring(position.character);
            if (afterCursor.startsWith(']]')) {
                item.range = new vscode.Range(
                    position.line,
                    lastOpenBrackets + 2,
                    position.line,
                    position.character
                );
            }

            return item;
        });
    }

    resolveCompletionItem(
        item: vscode.CompletionItem,
        token: vscode.CancellationToken
    ): vscode.CompletionItem {
        return item;
    }
}
```

### 17.4 ListContinuationProvider設計

#### 17.4.1 リスト自動継続プロバイダー
```typescript
// src/providers/ListContinuationProvider.ts
export class ListContinuationProvider {
    private listPatterns = {
        unordered: /^(\s*)([-*+])\s+(.*)$/,
        ordered: /^(\s*)(\d+)\.\s+(.*)$/,
        checkbox: /^(\s*)([-*+])\s+\[([ x])\]\s+(.*)$/
    };

    constructor(private configManager: ConfigurationManager) {}

    async handleEnterKey(editor: vscode.TextEditor): Promise<boolean> {
        if (!this.configManager.getListContinuationEnabled()) {
            return false;
        }

        const position = editor.selection.active;
        const line = editor.document.lineAt(position.line);

        // リストパターン検出
        const { patternType, matchedPattern } = this.detectListPattern(line.text);
        if (!patternType || !matchedPattern) {
            return false;
        }

        const indent = matchedPattern[1];
        const contentAfterMarker = this.getContentAfterMarker(patternType, matchedPattern);

        // 空リストアイテムの削除
        if (!contentAfterMarker || contentAfterMarker.trim() === '') {
            const edit = new vscode.WorkspaceEdit();
            const lineRange = new vscode.Range(
                position.line,
                0,
                position.line,
                line.text.length
            );
            edit.replace(editor.document.uri, lineRange, '');

            await vscode.workspace.applyEdit(edit);

            const newPosition = new vscode.Position(position.line, 0);
            editor.selection = new vscode.Selection(newPosition, newPosition);

            return false; // VS Codeの通常動作に任せる
        }

        // 新しいリストアイテムの生成
        let newLineContent = '';

        switch (patternType) {
            case 'checkbox': {
                const marker = matchedPattern[2];
                newLineContent = `${indent}${marker} [ ] `;
                break;
            }

            case 'unordered': {
                const listMarker = matchedPattern[2];
                newLineContent = `${indent}${listMarker} `;
                break;
            }

            case 'ordered': {
                const number = parseInt(matchedPattern[2], 10);
                newLineContent = `${indent}${number + 1}. `;
                break;
            }
        }

        // 新しい行を挿入
        await editor.edit(editBuilder => {
            editBuilder.insert(
                new vscode.Position(position.line + 1, 0),
                '\n' + newLineContent
            );
        });

        // カーソルを新しい行に移動
        const newPosition = new vscode.Position(
            position.line + 1,
            newLineContent.length
        );
        editor.selection = new vscode.Selection(newPosition, newPosition);

        return true;
    }

    private detectListPattern(text: string): {
        patternType: 'checkbox' | 'unordered' | 'ordered' | null;
        matchedPattern: RegExpMatchArray | null;
    } {
        let match = text.match(this.listPatterns.checkbox);
        if (match) {
            return { patternType: 'checkbox', matchedPattern: match };
        }

        match = text.match(this.listPatterns.unordered);
        if (match) {
            return { patternType: 'unordered', matchedPattern: match };
        }

        match = text.match(this.listPatterns.ordered);
        if (match) {
            return { patternType: 'ordered', matchedPattern: match };
        }

        return { patternType: null, matchedPattern: null };
    }

    private getContentAfterMarker(
        patternType: 'checkbox' | 'unordered' | 'ordered',
        match: RegExpMatchArray
    ): string {
        switch (patternType) {
            case 'checkbox':
                return match[4];
            case 'unordered':
                return match[3];
            case 'ordered':
                return match[3];
        }
    }
}
```

### 17.5 設定項目の追加

#### 17.5.1 新規設定
```json
{
  "obsd.listContinuationEnabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable automatic continuation of lists and checkboxes when pressing Enter"
  },
  "obsd.searchSubdirectories": {
    "type": "boolean",
    "default": true,
    "description": "Search subdirectories when opening WikiLinks. If disabled, only creates new files at the root level even when same-named files exist in subdirectories"
  }
}
```

#### 17.5.2 ConfigurationManager拡張
```typescript
// src/managers/ConfigurationManager.ts に追加
export interface ObsdConfiguration {
    // 既存フィールド...
    readonly listContinuationEnabled: boolean;
    readonly searchSubdirectories: boolean;
}

export class ConfigurationManager {
    getListContinuationEnabled(): boolean {
        return this.config.get<boolean>('listContinuationEnabled', true);
    }

    getSearchSubdirectories(): boolean {
        return this.config.get<boolean>('searchSubdirectories', true);
    }

    getConfiguration(): ObsdConfiguration {
        return {
            // 既存フィールド...
            listContinuationEnabled: this.getListContinuationEnabled(),
            searchSubdirectories: this.getSearchSubdirectories()
        };
    }
}
```

### 17.6 テスト設計の改善

#### 17.6.1 モックドキュメントヘルパー
```typescript
// tests/helpers/mockDocument.ts
export function createMockDocument(lines: string[]): vscode.TextDocument {
    const offsetAt = (position: vscode.Position): number => {
        let offset = 0;
        for (let i = 0; i < position.line && i < lines.length; i++) {
            offset += lines[i].length + 1;
        }
        offset += Math.min(position.character, lines[position.line]?.length || 0);
        return offset;
    };

    const positionAt = (offset: number): vscode.Position => {
        let currentOffset = 0;
        for (let line = 0; line < lines.length; line++) {
            const lineLength = lines[line].length;
            if (currentOffset + lineLength >= offset) {
                return new vscode.Position(line, offset - currentOffset);
            }
            currentOffset += lineLength + 1;
        }
        const lastLine = lines.length - 1;
        return new vscode.Position(lastLine, lines[lastLine]?.length || 0);
    };

    return {
        uri: vscode.Uri.file('/test/document.md'),
        fileName: '/test/document.md',
        languageId: 'markdown',
        version: 1,
        lineCount: lines.length,
        lineAt: (lineOrPosition) => {
            const lineNum = typeof lineOrPosition === 'number'
                ? lineOrPosition
                : lineOrPosition.line;
            const text = lines[lineNum] || '';
            return {
                lineNumber: lineNum,
                text: text,
                range: new vscode.Range(lineNum, 0, lineNum, text.length),
                rangeIncludingLineBreak: new vscode.Range(lineNum, 0, lineNum + 1, 0),
                firstNonWhitespaceCharacterIndex: text.search(/\S/),
                isEmptyOrWhitespace: text.trim().length === 0
            } as vscode.TextLine;
        },
        getText: () => lines.join('\n'),
        offsetAt: offsetAt,
        positionAt: positionAt,
        // その他のメソッド...
    } as unknown as vscode.TextDocument;
}
```

#### 17.6.2 エラーハンドリングテスト
```typescript
// tests/unit/NoteFinder.test.ts
describe('NoteFinder Error Handling', () => {
    it('should handle findFiles errors gracefully', async () => {
        sinon.stub(vscode.workspace, 'findFiles').rejects(new Error('File system error'));

        const result = await NoteFinder.findNoteByTitle('Test', workspace, 'notes', '.md');

        expect(result).to.be.null;
    });

    it('should handle special characters in filenames', async () => {
        const mockFiles = [
            vscode.Uri.file('/test/Note (with) [brackets].md'),
            vscode.Uri.file('/test/日本語ノート.md')
        ];

        sinon.stub(vscode.workspace, 'findFiles').resolves(mockFiles);

        const result = await NoteFinder.getAllNotes(workspace, 'notes', '.md');

        expect(result).to.have.lengthOf(2);
        expect(result[0].title).to.include('Note');
        expect(result[1].title).to.equal('日本語ノート');
    });
});
```

### 17.7 パフォーマンス最適化

#### 17.7.1 最適化戦略
- **早期終了の削除**: 全候補を収集後にソート、上位結果のみ返却
- **キャッシング**: 将来的な実装検討（LRUキャッシュ）
- **バッチ処理**: `findFiles` のmaxResults活用

#### 17.7.2 監視指標
- ノート検索時間 < 200ms (1000ファイル環境)
- 補完候補表示 < 100ms
- メモリ使用量 < 10MB増加

### 17.8 統合とactivation

#### 17.8.1 extension.tsでの統合
```typescript
// src/extension.ts
export function activate(context: vscode.ExtensionContext) {
    const configManager = new ConfigurationManager();

    // WikiLink自動補完
    const completionProvider = new WikiLinkCompletionProvider(configManager);
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'markdown' },
            completionProvider,
            '[', '['
        )
    );

    // リスト自動継続
    const listProvider = new ListContinuationProvider(configManager);
    context.subscriptions.push(
        vscode.commands.registerCommand('obsd.handleEnterKey', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const handled = await listProvider.handleEnterKey(editor);
                if (!handled) {
                    vscode.commands.executeCommand('default:type', { text: '\n' });
                }
            }
        })
    );

    // 条件付きサブディレクトリ検索
    const openOrCreateCommand = vscode.commands.registerCommand(
        'obsd.openOrCreateWikiLink',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;

            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found.');
                return;
            }

            const linkText = getWikiLinkAtPosition(editor.document, editor.selection.active);
            if (!linkText) {
                vscode.window.showInformationMessage('No WikiLink found at cursor.');
                return;
            }

            const searchSubdirectories = configManager.getSearchSubdirectories();

            if (searchSubdirectories) {
                const foundFile = await NoteFinder.findNoteByTitle(
                    linkText,
                    workspaceFolder,
                    configManager.getVaultRoot(),
                    configManager.getNoteExtension()
                );

                if (foundFile) {
                    await vscode.window.showTextDocument(foundFile.uri);
                    return;
                }
            }

            // 新規ファイル作成処理...
        }
    );

    context.subscriptions.push(openOrCreateCommand);
}
```

#### 17.8.2 activationEvents更新
```json
{
  "activationEvents": [
    "onLanguage:markdown",
    "onCommand:obsd.handleEnterKey"
  ]
}
```

### 17.9 影響と効果

#### 17.9.1 機能向上
- **検索精度**: 完全一致優先により期待通りの結果
- **ユーザビリティ**: 自動補完とリスト継続でノート作成が効率化
- **柔軟性**: サブディレクトリ検索の有効/無効を選択可能

#### 17.9.2 品質向上
- **テストカバレッジ**: 46テストケース（エラーハンドリング、エッジケース含む）
- **API一貫性**: 全検索メソッドが同じ型を返却
- **保守性**: 統一されたモックヘルパーで将来的なテスト追加が容易

---

**文書バージョン**: 1.6
**最終更新**: 2025-10-01
**更新内容**: Enhanced Note Features設計を追加