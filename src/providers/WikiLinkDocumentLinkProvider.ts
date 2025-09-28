import { WikiLinkProcessor } from '../processors/WikiLinkProcessor';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import type { Position, Range, Uri, DocumentLink, TextDocument, DocumentLinkProvider } from '../types/vscode-test-types';

export class WikiLinkDocumentLinkProvider implements DocumentLinkProvider {
    private wikiLinkProcessor: WikiLinkProcessor;
    private configurationManager?: ConfigurationManager;
    
    constructor(configurationManager?: ConfigurationManager) {
        this.configurationManager = configurationManager;
        
        // デフォルト設定でWikiLinkProcessorを初期化
        const slugStrategy = this.configurationManager?.getSlugStrategy() || 'passthrough';
        this.wikiLinkProcessor = new WikiLinkProcessor({
            slugStrategy: slugStrategy
        });
    }
    
    provideDocumentLinks(document: TextDocument): DocumentLink[] {
        if (document.languageId !== 'markdown') {
            return [];
        }
        
        const links: DocumentLink[] = [];
        const text = document.getText();
        const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
        
        let match;
        while ((match = wikiLinkRegex.exec(text)) !== null) {
            try {
                const linkText = match[1];
                const parsedLink = this.wikiLinkProcessor.parseWikiLink(linkText);
                
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                
                // VS Code のRangeとUriをモック可能にする
                const range = this.createRange ? this.createRange(startPos, endPos) : { start: startPos, end: endPos };
                
                const fileName = this.wikiLinkProcessor.transformFileName(parsedLink.pageName);
                const extension = this.configurationManager?.getNoteExtension() || '.md';
                const vaultRoot = this.configurationManager?.getVaultRoot() || '';
                
                // URIをモック可能にする
                const fullPath = `${vaultRoot}/${fileName}${extension}`;
                const filePath: Uri = this.createUri ? this.createUri(fullPath) : {
                    path: fullPath,
                    fsPath: fullPath,
                    toString: () => fullPath
                };
                
                const documentLink = this.createDocumentLink ? 
                    this.createDocumentLink(range, filePath) : 
                    { range, target: filePath };
                
                links.push(documentLink);
            } catch (error) {
                // 無効なWikiLinkは無視
                continue;
            }
        }
        
        return links;
    }
    
    // テスト用のファクトリ関数（VS Code実装で上書きされる）
    createRange?: (start: Position, end: Position) => Range;
    createUri?: (path: string) => Uri;
    createDocumentLink?: (range: Range, target?: Uri) => DocumentLink;
}