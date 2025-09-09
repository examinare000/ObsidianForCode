import * as vscode from 'vscode';
import { WikiLinkDocumentLinkProvider } from './providers/WikiLinkDocumentLinkProvider';
import { WikiLinkContextProvider } from './providers/WikiLinkContextProvider';
import { CommandHandler } from './commands/CommandHandler';
import { ConfigurationManager } from './managers/ConfigurationManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('ObsidianForCode extension is now active');
    
    // Configuration Manager初期化
    const configManager = new ConfigurationManager(vscode.workspace.getConfiguration());
    
    // WikiLink Context Provider初期化
    const contextProvider = new WikiLinkContextProvider(context);
    
    // WikiLink DocumentLinkProvider登録
    const wikiLinkProvider = createWikiLinkDocumentLinkProvider(configManager);
    const linkProviderDisposable = vscode.languages.registerDocumentLinkProvider(
        { scheme: 'file', language: 'markdown' }, 
        wikiLinkProvider
    );
    
    // Command Handler初期化
    const commandHandler = createCommandHandler(configManager);
    
    // Commands登録
    const commands = [
        vscode.commands.registerCommand('obsd.openOrCreateWikiLink', () => 
            commandHandler.openOrCreateWikiLink()
        ),
        vscode.commands.registerCommand('obsd.insertDate', () => 
            commandHandler.insertDate()
        ),
        vscode.commands.registerCommand('obsd.insertTime', () => 
            commandHandler.insertTime()
        ),
        vscode.commands.registerCommand('obsd.preview', () => 
            commandHandler.showPreview()
        )
    ];
    
    // Context subscriptions
    context.subscriptions.push(
        linkProviderDisposable,
        ...commands
    );
    
    // 設定変更の監視
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('obsd')) {
            // 設定が変更された場合の処理
            configManager.triggerConfigurationChanged();
        }
    });
    
    context.subscriptions.push(configChangeListener);
}

function createWikiLinkDocumentLinkProvider(configManager: ConfigurationManager): vscode.DocumentLinkProvider {
    const provider = new WikiLinkDocumentLinkProvider(configManager) as any;
    
    // VS Code API実装を注入
    provider.createRange = (start: vscode.Position, end: vscode.Position) => 
        new vscode.Range(start, end);
    
    provider.createUri = (path: string) => 
        vscode.Uri.file(path);
    
    provider.createDocumentLink = (range: vscode.Range, target?: vscode.Uri) => 
        new vscode.DocumentLink(range, target);
    
    return provider;
}

function createCommandHandler(configManager: ConfigurationManager): CommandHandler {
    const handler = new CommandHandler(configManager);
    
    // VS Code API実装を注入
    handler.getActiveEditor = () => vscode.window.activeTextEditor || null;
    
    handler.fileExists = async (uri: any) => {
        try {
            const vsUri = typeof uri === 'string' ? vscode.Uri.file(uri) : 
                         uri.path ? vscode.Uri.file(uri.path) : uri;
            await vscode.workspace.fs.stat(vsUri);
            return true;
        } catch {
            return false;
        }
    };
    
    handler.createFile = async (uri: any, content: string) => {
        const vsUri = typeof uri === 'string' ? vscode.Uri.file(uri) : 
                     uri.path ? vscode.Uri.file(uri.path) : uri;
        const data = new TextEncoder().encode(content);
        await vscode.workspace.fs.writeFile(vsUri, data);
    };
    
    handler.openFile = async (uri: any) => {
        const vsUri = typeof uri === 'string' ? vscode.Uri.file(uri) : 
                     uri.path ? vscode.Uri.file(uri.path) : uri;
        await vscode.window.showTextDocument(vsUri);
    };
    
    handler.insertText = async (uri: any, position: any, text: string) => {
        const editor = vscode.window.activeTextEditor;
        const vsUri = typeof uri === 'string' ? vscode.Uri.file(uri) : 
                     uri.path ? vscode.Uri.file(uri.path) : uri;
        
        if (editor && editor.document.uri.toString() === vsUri.toString()) {
            const vsPosition = new vscode.Position(position.line, position.character);
            const edit = new vscode.WorkspaceEdit();
            edit.insert(vsUri, vsPosition, text);
            return await vscode.workspace.applyEdit(edit);
        }
        return false;
    };
    
    handler.showMessage = (message: string) => {
        vscode.window.showInformationMessage(message);
    };
    
    return handler;
}

export function deactivate() {
    console.log('ObsidianForCode extension is now deactivated');
}