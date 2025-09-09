import * as vscode from 'vscode';

/**
 * WikiLink内にカーソルがあるかどうかを検出し、
 * 'obsd.inWikiLink' コンテキストを管理するプロバイダー
 */
export class WikiLinkContextProvider {
    private disposables: vscode.Disposable[] = [];
    
    constructor(context: vscode.ExtensionContext) {
        // カーソル位置変更時の監視
        const selectionChangeListener = vscode.window.onDidChangeTextEditorSelection(
            this.onSelectionChange, this
        );
        
        // アクティブエディター変更時の監視
        const activeEditorChangeListener = vscode.window.onDidChangeActiveTextEditor(
            this.onActiveEditorChange, this
        );
        
        this.disposables.push(selectionChangeListener, activeEditorChangeListener);
        
        // 初期状態の設定
        this.updateContext();
        
        context.subscriptions.push(...this.disposables);
    }
    
    private onSelectionChange(event: vscode.TextEditorSelectionChangeEvent): void {
        this.updateContext(event.textEditor);
    }
    
    private onActiveEditorChange(editor: vscode.TextEditor | undefined): void {
        this.updateContext(editor);
    }
    
    private updateContext(editor?: vscode.TextEditor): void {
        editor = editor || vscode.window.activeTextEditor;
        
        if (!editor || editor.document.languageId !== 'markdown') {
            vscode.commands.executeCommand('setContext', 'obsd.inWikiLink', false);
            return;
        }
        
        const position = editor.selection.active;
        const inWikiLink = this.isPositionInWikiLink(editor.document, position);
        
        vscode.commands.executeCommand('setContext', 'obsd.inWikiLink', inWikiLink);
    }
    
    private isPositionInWikiLink(document: vscode.TextDocument, position: vscode.Position): boolean {
        const text = document.getText();
        const offset = document.offsetAt(position);
        
        // カーソル位置周辺でWikiLinkを検索
        const beforeText = text.substring(0, offset);
        const afterText = text.substring(offset);
        
        // 最後の[[ を探す
        const lastOpenBracket = beforeText.lastIndexOf('[[');
        if (lastOpenBracket === -1) {
            return false;
        }
        
        // 最後の[[ より後に ]] があるかチェック
        const afterOpen = beforeText.substring(lastOpenBracket + 2);
        if (afterOpen.includes(']]')) {
            return false; // 既に閉じられているWikiLinkの後にいる
        }
        
        // 次の]] を探す
        const nextCloseBracket = afterText.indexOf(']]');
        if (nextCloseBracket === -1) {
            return false; // 閉じられていないWikiLink（不完全）
        }
        
        // WikiLink内にカーソルがある
        return true;
    }
    
    dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }
}