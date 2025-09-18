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

        if (!editor) {
            console.log('[WikiLinkContext] No active editor, setting context to false');
            vscode.commands.executeCommand('setContext', 'obsd.inWikiLink', false);
            return;
        }

        if (editor.document.languageId !== 'markdown') {
            console.log(`[WikiLinkContext] Not in markdown file (${editor.document.languageId}), setting context to false`);
            vscode.commands.executeCommand('setContext', 'obsd.inWikiLink', false);
            return;
        }

        const position = editor.selection.active;
        const inWikiLink = this.isPositionInWikiLink(editor.document, position);

        console.log(`[WikiLinkContext] File: ${editor.document.fileName}`);
        console.log(`[WikiLinkContext] Position: ${position.line}:${position.character}, inWikiLink: ${inWikiLink}`);
        console.log(`[WikiLinkContext] Setting context 'obsd.inWikiLink' to: ${inWikiLink}`);

        void vscode.commands.executeCommand('setContext', 'obsd.inWikiLink', inWikiLink)
            .then(() => {
                console.log(`[WikiLinkContext] Successfully set context to: ${inWikiLink}`);
            }, (error: any) => {
                console.error(`[WikiLinkContext] Failed to set context:`, error);
            });
    }
    
    private isPositionInWikiLink(document: vscode.TextDocument, position: vscode.Position): boolean {
        const text = document.getText();
        const offset = document.offsetAt(position);

        console.log(`[WikiLinkContext] Checking position at offset ${offset} in text length ${text.length}`);

        // 全体のテキストでWikiLinkパターンを検索
        const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
        let match;

        while ((match = wikiLinkRegex.exec(text)) !== null) {
            const linkStart = match.index;
            const linkEnd = match.index + match[0].length;

            console.log(`[WikiLinkContext] Found WikiLink at ${linkStart}-${linkEnd}: "${match[0]}"`);

            // カーソルがこのWikiLink内にあるかチェック
            // [[ の直後から ]] の直前まで（内側）にある場合のみtrue
            if (offset >= linkStart + 2 && offset <= linkEnd - 3) {
                console.log(`[WikiLinkContext] Position ${offset} IS inside WikiLink`);
                return true;
            }
        }

        console.log(`[WikiLinkContext] Position ${offset} is NOT inside any WikiLink`);
        return false;
    }
    
    dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }
}