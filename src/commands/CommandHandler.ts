import { WikiLinkProcessor } from '../processors/WikiLinkProcessor';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { DateTimeFormatter } from '../utils/DateTimeFormatter';

// テスト用のインターフェース
interface Position {
    line: number;
    character: number;
}

interface TextDocument {
    uri: any;
    languageId: string;
    getText(): string;
    positionAt(offset: number): Position;
    offsetAt(position: Position): number;
}

interface TextEditor {
    document: TextDocument;
    selection: { active: Position; start: Position; end: Position };
}

export class CommandHandler {
    private wikiLinkProcessor: WikiLinkProcessor;
    private configurationManager?: ConfigurationManager;
    private dateTimeFormatter: DateTimeFormatter;
    
    // テスト用のファクトリ関数
    getActiveEditor?: () => TextEditor | null;
    fileExists?: (uri: any) => Promise<boolean>;
    createFile?: (uri: any, content: string) => Promise<void>;
    openFile?: (uri: any) => Promise<void>;
    insertText?: (uri: any, position: Position, text: string) => Promise<boolean>;
    showMessage?: (message: string) => void;
    
    constructor(configurationManager?: ConfigurationManager) {
        this.configurationManager = configurationManager;
        
        const slugStrategy = this.configurationManager?.getSlugStrategy() || 'passthrough';
        this.wikiLinkProcessor = new WikiLinkProcessor({
            slugStrategy: slugStrategy
        });
        this.dateTimeFormatter = new DateTimeFormatter();
    }
    
    async openOrCreateWikiLink(): Promise<boolean> {
        const editor = this.getActiveEditor ? this.getActiveEditor() : null;
        if (!editor) {
            return false;
        }
        
        const position = editor.selection.active;
        const linkText = this.getWikiLinkAtPosition(editor.document, position);
        
        if (!linkText) {
            return false;
        }
        
        try {
            const parsedLink = this.wikiLinkProcessor.parseWikiLink(linkText);
            const fileName = this.wikiLinkProcessor.transformFileName(parsedLink.pageName);
            const extension = this.configurationManager?.getNoteExtension() || '.md';
            const vaultRoot = this.configurationManager?.getVaultRoot() || '';
            
            const filePath = { path: `${vaultRoot}/${fileName}${extension}` };
            
            const exists = this.fileExists ? await this.fileExists(filePath) : false;
            
            if (exists) {
                // 存在する場合は開く
                if (this.openFile) {
                    await this.openFile(filePath);
                }
            } else {
                // 存在しない場合は作成して開く
                const template = this.configurationManager?.getTemplate() || '';
                if (this.createFile) {
                    await this.createFile(filePath, template);
                }
                if (this.openFile) {
                    await this.openFile(filePath);
                }
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }
    
    async insertDate(): Promise<boolean> {
        const editor = this.getActiveEditor ? this.getActiveEditor() : null;
        if (!editor) {
            return false;
        }
        
        const dateFormat = this.configurationManager?.getDateFormat() || 'YYYY-MM-DD';
        const formattedDate = this.dateTimeFormatter.formatDate(new Date(), dateFormat);
        
        if (this.insertText) {
            return await this.insertText(editor.document.uri, editor.selection.active, formattedDate);
        }
        
        return true;
    }
    
    async insertTime(): Promise<boolean> {
        const editor = this.getActiveEditor ? this.getActiveEditor() : null;
        if (!editor) {
            return false;
        }
        
        const timeFormat = this.configurationManager?.getTimeFormat() || 'HH:mm';
        const formattedTime = this.dateTimeFormatter.formatTime(new Date(), timeFormat);
        
        if (this.insertText) {
            return await this.insertText(editor.document.uri, editor.selection.active, formattedTime);
        }
        
        return true;
    }
    
    async showPreview(): Promise<boolean> {
        const editor = this.getActiveEditor ? this.getActiveEditor() : null;
        if (!editor || editor.document.languageId !== 'markdown') {
            return false;
        }
        
        // 簡単なプレビュー実装 - 後で拡張予定
        if (this.showMessage) {
            this.showMessage('Preview feature coming soon!');
        }
        return true;
    }
    
    getWikiLinkAtPosition(document: TextDocument, position: Position): string {
        const text = document.getText();
        const offset = document.offsetAt(position);
        
        // カーソル位置周辺でWikiLinkを検索
        const beforeText = text.substring(0, offset);
        const afterText = text.substring(offset);
        
        // 最後の[[ を探す
        const lastOpenBracket = beforeText.lastIndexOf('[[');
        if (lastOpenBracket === -1) {
            return '';
        }
        
        // 次の]] を探す
        const nextCloseBracket = afterText.indexOf(']]');
        if (nextCloseBracket === -1) {
            return '';
        }
        
        // WikiLink全体を取得
        const wikiLinkStart = lastOpenBracket;
        const wikiLinkEnd = offset + nextCloseBracket + 2;
        const wikiLinkFull = text.substring(wikiLinkStart, wikiLinkEnd);
        
        // [[]] を除去してリンクテキストを抽出
        const match = wikiLinkFull.match(/^\[\[([^\]]+)\]\]$/);
        if (!match) {
            return '';
        }
        
        try {
            const parsedLink = this.wikiLinkProcessor.parseWikiLink(match[1]);
            return parsedLink.pageName;
        } catch {
            return '';
        }
    }
}