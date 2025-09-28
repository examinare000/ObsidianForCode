import type { SlugStrategy } from '../managers/ConfigurationManager';

export interface ParsedWikiLink {
    readonly pageName: string;
    readonly displayName?: string;
    readonly heading?: string;
    readonly isAlias: boolean;
}

export interface WikiLinkProcessorOptions {
    readonly slugStrategy?: SlugStrategy;
}

export class WikiLinkError extends Error {
    public readonly linkText?: string;

    constructor(message: string, linkText?: string) {
        super(message);
        this.name = 'WikiLinkError';
        this.linkText = linkText;
    }
}

export class WikiLinkProcessor {
    private readonly options: Required<WikiLinkProcessorOptions>;

    constructor(options: WikiLinkProcessorOptions = {}) {
        this.options = {
            slugStrategy: 'passthrough',
            ...options
        };
    }

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

    private validateLinkText(linkText: string): void {
        if (!linkText || linkText.trim() === '') {
            throw new WikiLinkError('WikiLink text cannot be empty', linkText);
        }
    }

    private isAliasLink(linkText: string): boolean {
        return linkText.includes('|');
    }

    private isHeadingLink(linkText: string): boolean {
        return linkText.includes('#') && !linkText.includes('|');
    }

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

    private parseSimpleLink(linkText: string): ParsedWikiLink {
        return {
            pageName: linkText,
            isAlias: false
        };
    }

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

    private transformToKebabCase(pageName: string): string {
        return pageName
            .toLowerCase()
            .replace(/[/:\\?*|"<>]/g, '-') // 特殊文字をハイフンに変換
            .replace(/\s+/g, '-')          // 空白をハイフンに
            .replace(/-+/g, '-')           // 連続ハイフンを1つに
            .replace(/^-|-$/g, '');        // 先頭・末尾のハイフンを除去
    }

    private transformToSnakeCase(pageName: string): string {
        return pageName
            .toLowerCase()
            .replace(/[/:\\?*|"<>]/g, '') // 特殊文字を除去
            .replace(/\s+/g, '_')         // 空白をアンダースコアに
            .replace(/_+/g, '_')          // 連続アンダースコアを1つに
            .replace(/^_|_$/g, '');       // 先頭・末尾のアンダースコアを除去
    }
}