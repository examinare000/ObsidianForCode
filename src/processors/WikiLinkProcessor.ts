/**
 * @fileoverview WikiLink processing and transformation functionality.
 * Handles parsing of WikiLink syntax, slug transformations, and file name generation
 * with support for aliases, headings, and various naming strategies.
 *
 * @author MDloggerForCode Team
 * @version 1.0.0
 */

import type { SlugStrategy } from '../managers/ConfigurationManager';

/**
 * Represents a parsed WikiLink with all its components.
 * Contains the page name, optional display name, heading reference, and alias status.
 */
export interface ParsedWikiLink {
    readonly pageName: string;
    readonly displayName?: string;
    readonly heading?: string;
    readonly isAlias: boolean;
}

/**
 * Configuration options for WikiLink processing.
 * Controls how WikiLinks are parsed and transformed into file names.
 */
export interface WikiLinkProcessorOptions {
    readonly slugStrategy?: SlugStrategy;
}

/**
 * Custom error class for WikiLink processing failures.
 * Provides additional context about the failing link text.
 *
 * @class WikiLinkError
 * @extends Error
 */
export class WikiLinkError extends Error {
    /**
     * Creates a new WikiLinkError instance.
     *
     * @param message - Error description
     * @param linkText - Optional WikiLink text that caused the error
     */
    constructor(message: string, public readonly linkText?: string) {
        super(message);
        this.name = 'WikiLinkError';
    }
}

/**
 * Processes WikiLink syntax and transforms page names according to configured strategies.
 * Supports parsing of simple links, alias links, and heading links with various
 * slug transformation strategies for file name generation.
 *
 * @class WikiLinkProcessor
 */
export class WikiLinkProcessor {
    private readonly options: Required<WikiLinkProcessorOptions>;

    /**
     * Creates a new WikiLinkProcessor instance.
     *
     * @param options - Configuration options for processing behavior
     */
    constructor(options: WikiLinkProcessorOptions = {}) {
        this.options = {
            slugStrategy: 'passthrough',
            ...options
        };
    }

    /**
     * Parses WikiLink text into its component parts.
     * Handles simple links [[Page]], alias links [[Page|Display]],
     * and heading links [[Page#Section]] with various combinations.
     *
     * @param linkText - The WikiLink text to parse (without [[ ]] brackets)
     * @returns Parsed WikiLink object with all components
     * @throws {WikiLinkError} When link text is invalid or malformed
     */
    parseWikiLink(linkText: string): ParsedWikiLink {
        this.validateLinkText(linkText);
        
        const trimmedLinkText = linkText.trim();
        
        // 別名付きリンクの処理: [[Target|Display]] または [[Target#Section|Display]]
        if (this.isAliasLink(trimmedLinkText)) {
            return this.parseAliasLink(trimmedLinkText);
        }
        
        // 見出しリンクの処理: [[Page#Heading]]
        if (this.isHeadingLink(trimmedLinkText)) {
            return this.parseHeadingLink(trimmedLinkText);
        }
        
        // シンプルなリンク: [[Page]]
        return this.parseSimpleLink(trimmedLinkText);
    }

    /**
     * Validates WikiLink text for basic requirements.
     *
     * @param linkText - The link text to validate
     * @throws {WikiLinkError} When link text is empty or invalid
     */
    private validateLinkText(linkText: string): void {
        if (!linkText || linkText.trim() === '') {
            throw new WikiLinkError('WikiLink text cannot be empty', linkText);
        }
    }

    /**
     * Checks if the link text contains an alias (pipe character).
     *
     * @param linkText - The link text to check
     * @returns True if link contains alias syntax
     */
    private isAliasLink(linkText: string): boolean {
        return linkText.includes('|');
    }

    /**
     * Checks if the link text contains a heading reference (hash character) without alias.
     *
     * @param linkText - The link text to check
     * @returns True if link contains heading syntax but no alias
     */
    private isHeadingLink(linkText: string): boolean {
        return linkText.includes('#') && !linkText.includes('|');
    }

    /**
     * Parses alias links in format [[Target|Display]] or [[Target#Section|Display]].
     *
     * @param linkText - The alias link text to parse
     * @returns Parsed WikiLink with alias information
     * @throws {WikiLinkError} When alias format is invalid
     */
    private parseAliasLink(linkText: string): ParsedWikiLink {
        const aliasMatch = linkText.match(/^([^|]+)\|(.+)$/);
        if (!aliasMatch) {
            throw new WikiLinkError('Invalid alias link format', linkText);
        }

        const targetPart = aliasMatch[1].trim();
        const displayName = aliasMatch[2].trim();
        
        // ターゲット部分に見出しが含まれているかチェック
        const headingMatch = targetPart.match(/^([^#]+)#(.+)$/);
        if (headingMatch) {
            return {
                pageName: headingMatch[1].trim(),
                heading: headingMatch[2].trim(),
                displayName: displayName,
                isAlias: true
            };
        }
        
        return {
            pageName: targetPart,
            displayName: displayName,
            isAlias: true
        };
    }

    /**
     * Parses heading links in format [[Page#Section]].
     *
     * @param linkText - The heading link text to parse
     * @returns Parsed WikiLink with heading information
     * @throws {WikiLinkError} When heading format is invalid
     */
    private parseHeadingLink(linkText: string): ParsedWikiLink {
        const headingMatch = linkText.match(/^([^#]+)#(.+)$/);
        if (!headingMatch) {
            throw new WikiLinkError('Invalid heading link format', linkText);
        }

        return {
            pageName: headingMatch[1].trim(),
            heading: headingMatch[2].trim(),
            isAlias: false
        };
    }

    /**
     * Parses simple links in format [[Page]].
     *
     * @param linkText - The simple link text to parse
     * @returns Parsed WikiLink with page name only
     */
    private parseSimpleLink(linkText: string): ParsedWikiLink {
        return {
            pageName: linkText,
            isAlias: false
        };
    }

    /**
     * Transforms a page name into a file name using the configured slug strategy.
     *
     * @param pageName - The page name to transform
     * @returns Transformed file name according to slug strategy
     */
    transformFileName(pageName: string): string {
        const strategy = this.options.slugStrategy;
        
        switch (strategy) {
            case 'kebab-case':
                return this.transformToKebabCase(pageName);
            case 'snake_case':
                return this.transformToSnakeCase(pageName);
            case 'passthrough':
            default:
                return pageName;
        }
    }

    /**
     * Transforms page name to kebab-case format.
     * Converts to lowercase, replaces special characters and spaces with hyphens.
     *
     * @param pageName - The page name to transform
     * @returns Kebab-case formatted name
     */
    private transformToKebabCase(pageName: string): string {
        return pageName
            .toLowerCase()
            .replace(/[/:\\?*|"<>]/g, '-') // 特殊文字をハイフンに変換
            .replace(/\s+/g, '-')          // 空白をハイフンに
            .replace(/-+/g, '-')           // 連続ハイフンを1つに
            .replace(/^-|-$/g, '');        // 先頭・末尾のハイフンを除去
    }

    /**
     * Transforms page name to snake_case format.
     * Converts to lowercase, removes special characters, replaces spaces with underscores.
     *
     * @param pageName - The page name to transform
     * @returns Snake_case formatted name
     */
    private transformToSnakeCase(pageName: string): string {
        return pageName
            .toLowerCase()
            .replace(/[/:\\?*|"<>]/g, '') // 特殊文字を除去
            .replace(/\s+/g, '_')         // 空白をアンダースコアに
            .replace(/_+/g, '_')          // 連続アンダースコアを1つに
            .replace(/^_|_$/g, '');       // 先頭・末尾のアンダースコアを除去
    }
}
