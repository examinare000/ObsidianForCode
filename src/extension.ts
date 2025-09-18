import * as vscode from 'vscode';
import { WikiLinkProcessor } from './processors/WikiLinkProcessor';
import { DateTimeFormatter } from './utils/DateTimeFormatter';
import { ConfigurationManager } from './managers/ConfigurationManager';
import { WikiLinkContextProvider } from './providers/WikiLinkContextProvider';
import { DailyNoteManager } from './managers/DailyNoteManager';

// ファイルシステム安全なファイル名に正規化
function sanitizeFileName(fileName: string): string {
    return fileName
        .replace(/[/\\:*?"<>|]/g, '-')  // 特殊文字をハイフンに変換
        .replace(/\s+/g, ' ')          // 複数の空白を単一の空白に
        .trim()                        // 前後の空白を削除
        .substring(0, 255);            // ファイル名長制限
}

export function activate(context: vscode.ExtensionContext) {
    // Configuration Manager初期化
    let configManager: ConfigurationManager;
    try {
        configManager = new ConfigurationManager(vscode.workspace.getConfiguration('obsd'));
    } catch (error) {
        vscode.window.showErrorMessage('Failed to initialize ConfigurationManager');
        return;
    }

    // DateTimeFormatter初期化
    let dateTimeFormatter: DateTimeFormatter;
    try {
        dateTimeFormatter = new DateTimeFormatter();
    } catch (error) {
        vscode.window.showErrorMessage('Failed to initialize DateTimeFormatter');
        return;
    }

    // WikiLink Context Provider初期化
    let contextProvider: WikiLinkContextProvider;
    try {
        contextProvider = new WikiLinkContextProvider(context);
    } catch (error) {
        vscode.window.showErrorMessage('Failed to initialize WikiLinkContextProvider');
        return;
    }

    // DailyNote Manager初期化
    let dailyNoteManager: DailyNoteManager;
    try {
        dailyNoteManager = new DailyNoteManager(configManager, dateTimeFormatter);
    } catch (error) {
        vscode.window.showErrorMessage('Failed to initialize DailyNoteManager');
        return;
    }

    // WikiLink DocumentLinkProvider登録
    let linkProviderDisposable: vscode.Disposable;
    try {
        const wikiLinkProvider = new WikiLinkDocumentLinkProvider(configManager);
        linkProviderDisposable = vscode.languages.registerDocumentLinkProvider(
            { scheme: 'file', language: 'markdown' },
            wikiLinkProvider
        );
    } catch (error) {
        vscode.window.showErrorMessage('Failed to register WikiLinkDocumentLinkProvider');
        return;
    }

    // Commands登録
    let commands: vscode.Disposable[];
    try {
        const openCommand = vscode.commands.registerCommand('obsd.openOrCreateWikiLink', () => {
            return openOrCreateWikiLink(configManager);
        });

        const dateCommand = vscode.commands.registerCommand('obsd.insertDate', () => {
            return insertDate(configManager, dateTimeFormatter);
        });

        const timeCommand = vscode.commands.registerCommand('obsd.insertTime', () => {
            return insertTime(configManager, dateTimeFormatter);
        });

        const previewCommand = vscode.commands.registerCommand('obsd.preview', () => {
            return showPreview();
        });

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

        commands = [openCommand, dateCommand, timeCommand, previewCommand, dailyNoteCommand];
    } catch (error) {
        vscode.window.showErrorMessage('Failed to register commands');
        return;
    }

    // Context subscriptions
    try {
        context.subscriptions.push(
            linkProviderDisposable,
            ...commands
        );
    } catch (error) {
        vscode.window.showErrorMessage('Failed to add subscriptions');
        return;
    }

    // 設定変更の監視
    try {
        const configChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('obsd')) {
                configManager.triggerConfigurationChanged();
            }
        });

        context.subscriptions.push(configChangeListener);
    } catch (error) {
        vscode.window.showErrorMessage('Failed to set up configuration change listener');
        return;
    }
}

// VS Code統合WikiLinkDocumentLinkProvider
class WikiLinkDocumentLinkProvider implements vscode.DocumentLinkProvider {
    private wikiLinkProcessor: WikiLinkProcessor;
    private configManager: ConfigurationManager;
    
    constructor(configManager: ConfigurationManager) {
        this.configManager = configManager;
        const slugStrategy = this.configManager.getSlugStrategy();
        this.wikiLinkProcessor = new WikiLinkProcessor({ slugStrategy });
    }
    
    provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
        if (document.languageId !== 'markdown') {
            return [];
        }

        // ワークスペースフォルダーの事前チェック
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [];
        }

        const links: vscode.DocumentLink[] = [];
        const text = document.getText();
        const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
        
        let match;
        while ((match = wikiLinkRegex.exec(text)) !== null) {
            try {
                const linkText = match[1];
                const parsedLink = this.wikiLinkProcessor.parseWikiLink(linkText);
                
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);
                
                let fileName = this.wikiLinkProcessor.transformFileName(parsedLink.pageName);
                fileName = sanitizeFileName(fileName);
                
                const extension = this.configManager.getNoteExtension();
                const vaultRoot = this.configManager.getVaultRoot();

                let uri: vscode.Uri;

                if (vaultRoot && vaultRoot.trim() !== '') {
                    if (vaultRoot.startsWith('/') || vaultRoot.match(/^[A-Za-z]:/)) {
                        const filePath = `${vaultRoot}/${fileName}${extension}`;
                        uri = vscode.Uri.file(filePath);
                    } else {
                        if (workspaceFolder) {
                            uri = vscode.Uri.joinPath(workspaceFolder.uri, vaultRoot, `${fileName}${extension}`);
                        } else {
                            continue;
                        }
                    }
                } else {
                    if (workspaceFolder) {
                        uri = vscode.Uri.joinPath(workspaceFolder.uri, `${fileName}${extension}`);
                    } else {
                        continue;
                    }
                }
                
                const documentLink = new vscode.DocumentLink(range, uri);
                links.push(documentLink);
            } catch (error) {
                continue;
            }
        }
        
        return links;
    }
}

// Command implementations
async function openOrCreateWikiLink(configManager: ConfigurationManager): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const position = editor.selection.active;
    const linkText = getWikiLinkAtPosition(editor.document, position);
    
    if (!linkText) {
        vscode.window.showInformationMessage('No WikiLink found at cursor position');
        return;
    }
    
    try {
        const wikiLinkProcessor = new WikiLinkProcessor({ 
            slugStrategy: configManager.getSlugStrategy() 
        });
        const parsedLink = wikiLinkProcessor.parseWikiLink(linkText);
        let fileName = wikiLinkProcessor.transformFileName(parsedLink.pageName);
        
        // ファイルシステム安全な名前に正規化
        fileName = sanitizeFileName(fileName);
        
        const extension = configManager.getNoteExtension();
        const vaultRoot = configManager.getVaultRoot();
        
        // ワークスペースフォルダーの確認
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
            return;
        }

        // ファイルURI作成
        let uri: vscode.Uri;
        if (vaultRoot && vaultRoot.trim() !== '') {
            // vaultRoot設定あり
            if (vaultRoot.startsWith('/') || vaultRoot.match(/^[A-Za-z]:/)) {
                // 絶対パス
                uri = vscode.Uri.file(`${vaultRoot}/${fileName}${extension}`);
            } else {
                // 相対パス (ワークスペースからの相対)
                uri = vscode.Uri.joinPath(workspaceFolder.uri, vaultRoot, `${fileName}${extension}`);
            }
        } else {
            // vaultRootが空の場合、ワークスペースルートに作成
            uri = vscode.Uri.joinPath(workspaceFolder.uri, `${fileName}${extension}`);
        }

        
        try {
            await vscode.workspace.fs.stat(uri);
            await vscode.window.showTextDocument(uri);
        } catch {
            const template = configManager.getTemplate();
            const data = new TextEncoder().encode(template);
            await vscode.workspace.fs.writeFile(uri, data);
            await vscode.window.showTextDocument(uri);
        }
    } catch (error) {
        vscode.window.showErrorMessage('Failed to open or create WikiLink');
    }
}

async function insertDate(configManager: ConfigurationManager, dateTimeFormatter: DateTimeFormatter): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    
    const dateFormat = configManager.getDateFormat();
    const formattedDate = dateTimeFormatter.formatDate(new Date(), dateFormat);
    
    const position = editor.selection.active;
    const edit = new vscode.WorkspaceEdit();
    edit.insert(editor.document.uri, position, formattedDate);
    await vscode.workspace.applyEdit(edit);
}

async function insertTime(configManager: ConfigurationManager, dateTimeFormatter: DateTimeFormatter): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    
    const timeFormat = configManager.getTimeFormat();
    const formattedTime = dateTimeFormatter.formatTime(new Date(), timeFormat);
    
    const position = editor.selection.active;
    const edit = new vscode.WorkspaceEdit();
    edit.insert(editor.document.uri, position, formattedTime);
    await vscode.workspace.applyEdit(edit);
}

async function showPreview(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
        vscode.window.showInformationMessage('Open a Markdown file to use preview');
        return;
    }
    
    vscode.window.showInformationMessage('Preview feature coming soon!');
}

function getWikiLinkAtPosition(document: vscode.TextDocument, position: vscode.Position): string {
    const text = document.getText();
    const offset = document.offsetAt(position);
    
    const beforeText = text.substring(0, offset);
    const afterText = text.substring(offset);
    
    const lastOpenBracket = beforeText.lastIndexOf('[[');
    if (lastOpenBracket === -1) {
        return '';
    }
    
    const nextCloseBracket = afterText.indexOf(']]');
    if (nextCloseBracket === -1) {
        return '';
    }
    
    const wikiLinkStart = lastOpenBracket;
    const wikiLinkEnd = offset + nextCloseBracket + 2;
    const wikiLinkFull = text.substring(wikiLinkStart, wikiLinkEnd);
    
    const match = wikiLinkFull.match(/^\[\[([^\]]+)\]\]$/);
    if (!match) {
        return '';
    }
    
    return match[1];
}

export function deactivate() {}