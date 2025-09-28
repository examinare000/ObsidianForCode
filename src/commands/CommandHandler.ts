/**
 * @fileoverview Command handler for Obsidian for Code extension commands.
 * Provides a centralized handler for WikiLink operations, date/time insertion,
 * and preview functionality with testable interfaces.
 *
 * @author ObsidianForCode Team
 * @version 1.0.0
 */

import { WikiLinkProcessor } from '../processors/WikiLinkProcessor';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { DateTimeFormatter } from '../utils/DateTimeFormatter';
import type { Position, Uri, TextDocument, TextEditor } from '../types/vscode-test-types';

/**
 * Handles extension commands with testable interfaces.
 * Provides WikiLink operations, date/time insertion, and preview functionality
 * while maintaining separation between business logic and VS Code API dependencies.
 *
 * @class CommandHandler
 */
export class CommandHandler {
    private wikiLinkProcessor: WikiLinkProcessor;
    private configurationManager?: ConfigurationManager;
    private dateTimeFormatter: DateTimeFormatter;
    
    /** Factory function to get the currently active text editor */
    getActiveEditor?: () => TextEditor | null;
    /** Factory function to check if a file exists at the given URI */
    fileExists?: (uri: Uri) => Promise<boolean>;
    /** Factory function to create a new file with content at the given URI */
    createFile?: (uri: Uri, content: string) => Promise<void>;
    /** Factory function to open a file at the given URI */
    openFile?: (uri: Uri) => Promise<void>;
    /** Factory function to insert text at a specific position in a document */
    insertText?: (uri: Uri, position: Position, text: string) => Promise<boolean>;
    /** Factory function to show a message to the user */
    showMessage?: (message: string) => void;
    
    /**
     * Creates a new CommandHandler instance.
     *
     * @param configurationManager - Optional configuration manager for accessing extension settings
     */
    constructor(configurationManager?: ConfigurationManager) {
        this.configurationManager = configurationManager;
        
        const slugStrategy = this.configurationManager?.getSlugStrategy() || 'passthrough';
        this.wikiLinkProcessor = new WikiLinkProcessor({
            slugStrategy: slugStrategy
        });
        this.dateTimeFormatter = new DateTimeFormatter();
    }
    
    /**
     * Opens an existing WikiLink or creates a new file if it doesn't exist.
     * Extracts WikiLink text at the current cursor position and handles file operations.
     *
     * @returns Promise resolving to true if operation succeeded, false otherwise
     * @throws {Error} When WikiLink processing fails
     */
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

            // vaultRootが空の場合は相対パスとして扱い、先頭のスラッシュを付けない
            const fullPath = vaultRoot
                ? `${vaultRoot}/${fileName}${extension}`
                : `${fileName}${extension}`;
            const filePath: Uri = {
                path: fullPath,
                fsPath: fullPath,
                toString: () => fullPath
            };
            
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
    
    /**
     * Inserts the current date at the cursor position using the configured format.
     *
     * @returns Promise resolving to true if insertion succeeded, false otherwise
     * @throws {Error} When date formatting or text insertion fails
     */
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
    
    /**
     * Inserts the current time at the cursor position using the configured format.
     *
     * @returns Promise resolving to true if insertion succeeded, false otherwise
     * @throws {Error} When time formatting or text insertion fails
     */
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
    
    /**
     * Shows a preview of the current Markdown document.
     * Currently displays a placeholder message for future implementation.
     *
     * @returns Promise resolving to true if preview was shown, false otherwise
     */
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
    
    /**
     * Extracts WikiLink text at the specified position in the document.
     * Searches for [[]] patterns around the cursor position and validates the link.
     *
     * @param document - The text document to search
     * @param position - The cursor position to search around
     * @returns The WikiLink page name, or empty string if none found or invalid
     * @throws {Error} When WikiLink parsing fails
     */
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