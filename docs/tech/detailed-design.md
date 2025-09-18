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
| Webview Provider | Markdownプレビュー表示 | Webview API |
| Configuration Manager | 設定値管理・バリデーション | VS Code Settings |

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

---

**文書バージョン**: 1.1
**最終更新**: 2025-09-18
**実装実績更新**: WikiLink機能デバッグ解決記録追加