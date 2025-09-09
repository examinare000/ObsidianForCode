import { WikiLinkProcessor } from '../processors/WikiLinkProcessor';
import { ConfigurationManager } from '../managers/ConfigurationManager';

// VS Code APIの型定義（テスト用）
interface DocumentLink {
    range: any;
    target?: any;
}

interface TextDocument {
    uri: any;
    languageId: string;
    getText(): string;
    positionAt(offset: number): any;
    offsetAt(position: any): number;
}

interface DocumentLinkProvider {
    provideDocumentLinks(document: TextDocument): DocumentLink[];
}

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
                const filePath = this.createUri ? this.createUri(`${vaultRoot}/${fileName}${extension}`) : 
                    { path: `${vaultRoot}/${fileName}${extension}` };
                
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
    createRange?: (start: any, end: any) => any;
    createUri?: (path: string) => any;
    createDocumentLink?: (range: any, target?: any) => DocumentLink;
}