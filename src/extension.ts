import * as vscode from 'vscode';
import * as path from 'path';
import { WikiLinkProcessor } from './processors/WikiLinkProcessor';
import { DateTimeFormatter } from './utils/DateTimeFormatter';
import { ConfigurationManager } from './managers/ConfigurationManager';
import { WikiLinkContextProvider } from './providers/WikiLinkContextProvider';
import { DailyNoteManager } from './managers/DailyNoteManager';
import { PathUtil } from './utils/PathUtil';

export function activate(context: vscode.ExtensionContext) {
    const errors: string[] = [];

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

    // DailyNote Manager初期化（設定により条件付き）
    let dailyNoteManager: DailyNoteManager | undefined;
    if (configManager.getDailyNoteEnabled()) {
        try {
            dailyNoteManager = new DailyNoteManager(configManager, dateTimeFormatter);
        } catch (error) {
            vscode.window.showErrorMessage('Failed to initialize DailyNoteManager');
            return;
        }
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

    // Commands登録（個別エラーハンドリング）
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

    // insertTime コマンド
    try {
        const timeCommand = vscode.commands.registerCommand('obsd.insertTime', () => {
            return insertTime(configManager, dateTimeFormatter);
        });
        commands.push(timeCommand);
    } catch (error) {
        errors.push(`Failed to register insertTime: ${error}`);
    }

    // preview コマンド
    try {
        const previewCommand = vscode.commands.registerCommand('obsd.preview', () => {
            return showPreview();
        });
        commands.push(previewCommand);
    } catch (error) {
        errors.push(`Failed to register preview: ${error}`);
    }

    // DailyNoteコマンドは設定により条件付きで登録
    if (dailyNoteManager) {
        try {
            const dailyNoteCommand = vscode.commands.registerCommand('obsd.openDailyNote', async () => {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
                    return;
                }

                try {
                    await dailyNoteManager!.openOrCreateDailyNote(workspaceFolder);
                } catch (error) {
                    vscode.window.showErrorMessage('Failed to open daily note');
                }
            });
            commands.push(dailyNoteCommand);
        } catch (error) {
            errors.push(`Failed to register openDailyNote: ${error}`);
        }
    }

    // エラー報告（但し拡張機能は継続）
    if (errors.length > 0) {
        console.warn('[ObsidianForCode] Some commands failed to register:', errors);
        vscode.window.showWarningMessage(
            `ObsidianForCode: ${errors.length} command(s) failed to register. Check output panel for details.`
        );
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
                fileName = PathUtil.sanitizeFileName(fileName);
                
                const extension = this.configManager.getNoteExtension();
                const vaultRoot = this.configManager.getVaultRoot();

                let uri: vscode.Uri;

                // PathUtilを使用した安全なURI作成
                uri = PathUtil.createSafeUri(
                    vaultRoot,
                    fileName,
                    extension,
                    workspaceFolder
                );
                
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
        fileName = PathUtil.sanitizeFileName(fileName);
        
        const extension = configManager.getNoteExtension();
        const vaultRoot = configManager.getVaultRoot();
        
        // ワークスペースフォルダーの確認
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
            return;
        }

        // PathUtilを使用した安全なURI作成
        const uri = PathUtil.createSafeUri(
            vaultRoot,
            fileName,
            extension,
            workspaceFolder
        );

        
        // ファイル存在チェックと作成処理
        try {
            await vscode.workspace.fs.stat(uri);
            await vscode.window.showTextDocument(uri);
        } catch {
            // ファイルが存在しない場合は新規作成
            try {
                // ディレクトリ作成の改善
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