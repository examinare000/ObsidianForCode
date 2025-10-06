import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { WikiLinkDocumentLinkProvider } from '../../../src/providers/WikiLinkDocumentLinkProvider';

// VS Code APIのモック
class MockTextDocument {
    public fileName: string;
    public isUntitled: boolean = false;
    public encoding: string = 'utf8';
    public version: number = 1;
    public isDirty: boolean = false;
    public isClosed: boolean = false;
    public eol: number = 1;
    public lineCount: number;
    
    constructor(public uri: any, public languageId: string, public text: string) {
        this.fileName = uri.path;
        this.lineCount = this.text.split('\n').length;
    }
    
    getText(range?: any): string {
        return this.text;
    }
    
    positionAt(offset: number): any {
        const lines = this.text.substring(0, offset).split('\n');
        return {
            line: lines.length - 1,
            character: lines[lines.length - 1].length
        };
    }
    
    offsetAt(position: any): number {
        const lines = this.text.split('\n');
        let offset = 0;
        for (let i = 0; i < position.line; i++) {
            offset += lines[i].length + 1; // +1 for newline
        }
        offset += position.character;
        return offset;
    }
    
    lineAt(line: number): any {
        const lines = this.text.split('\n');
        return {
            text: lines[line] || '',
            range: {
                start: { line, character: 0 },
                end: { line, character: (lines[line] || '').length }
            }
        };
    }
    
    getWordRangeAtPosition(): any { return null; }
    validateRange(range: any): any { return range; }
    validatePosition(position: any): any { return position; }
    save(): Promise<boolean> { return Promise.resolve(true); }
}

class MockUri {
    public fsPath: string;

    constructor(public scheme: string, public path: string) {
        this.fsPath = path;
    }

    static file(path: string): MockUri {
        return new MockUri('file', path);
    }

    toString(): string {
        return `${this.scheme}:${this.path}`;
    }
}

class MockRange {
    constructor(public start: any, public end: any) {}
}

class MockDocumentLink {
    constructor(public range: any, public target?: any) {}
}

describe('WikiLinkDocumentLinkProvider', () => {
    let provider: WikiLinkDocumentLinkProvider;
    let mockDocument: MockTextDocument;
    
    beforeEach(() => {
        provider = new WikiLinkDocumentLinkProvider();
        
        // ファクトリ関数を設定
        provider.createRange = (start: any, end: any) => new MockRange(start, end);
        provider.createUri = (path: string) => MockUri.file(path);
        provider.createDocumentLink = (range: any, target?: any) => new MockDocumentLink(range, target);
        
        mockDocument = new MockTextDocument(
            MockUri.file('/test/workspace/test.md'),
            'markdown',
            '# Test Document\n\nThis has a [[Simple Link]] and [[Another|Display Name]].\nAlso [[Page#Heading]] links work.'
        );
    });
    
    describe('WikiLinkの検出', () => {
        it('シンプルなWikiLinkを検出できる', async () => {
            const links = await provider.provideDocumentLinks(mockDocument);
            
            expect(links).to.have.length(3);
            expect(links[0].target?.path).to.include('Simple Link');
        });
        
        it('別名付きWikiLinkを検出できる', async () => {
            const links = await provider.provideDocumentLinks(mockDocument);
            
            const aliasLink = links.find((link: any) => 
                mockDocument.getText().substring(
                    mockDocument.offsetAt(link.range.start),
                    mockDocument.offsetAt(link.range.end)
                ).includes('Another|Display Name')
            );
            
            expect(aliasLink).to.exist;
            expect(aliasLink?.target?.path).to.include('Another');
        });
        
        it('見出し付きWikiLinkを検出できる', async () => {
            const links = await provider.provideDocumentLinks(mockDocument);
            
            const headingLink = links.find((link: any) => 
                mockDocument.getText().substring(
                    mockDocument.offsetAt(link.range.start),
                    mockDocument.offsetAt(link.range.end)
                ).includes('Page#Heading')
            );
            
            expect(headingLink).to.exist;
            expect(headingLink?.target?.path).to.include('Page');
        });
    });
    
    describe('リンク範囲の計算', () => {
        it('WikiLinkの正確な位置を特定できる', async () => {
            const simpleDocument = new MockTextDocument(
                MockUri.file('/test/simple.md'),
                'markdown',
                '[[Test Link]]'
            );
            
            const links = await provider.provideDocumentLinks(simpleDocument);
            expect(links).to.have.length(1);
            
            const link = links[0];
            const linkText = simpleDocument.getText().substring(
                simpleDocument.offsetAt(link.range.start),
                simpleDocument.offsetAt(link.range.end)
            );
            
            expect(linkText).to.equal('[[Test Link]]');
        });
        
        it('複数行にわたる文書で正確な位置を計算できる', async () => {
            const multiLineDocument = new MockTextDocument(
                MockUri.file('/test/multiline.md'),
                'markdown',
                'Line 1\nLine 2 with [[Link]] here\nLine 3'
            );
            
            const links = await provider.provideDocumentLinks(multiLineDocument);
            expect(links).to.have.length(1);
            
            const link = links[0];
            expect(link.range.start.line).to.equal(1);
            expect(link.range.start.character).to.equal(12);
        });
    });
    
    describe('設定との統合', () => {
        it('slugStrategyを適用してターゲットURIを生成する', async () => {
            // Kebab-case設定を持つモックConfigurationManager
            const mockConfig = {
                getSlugStrategy: () => 'kebab-case' as const,
                getNoteExtension: () => '.md',
                getVaultRoot: () => '/test/vault'
            };
            
            const kebabProvider = new WikiLinkDocumentLinkProvider(mockConfig as any);
            kebabProvider.createRange = (start: any, end: any) => new MockRange(start, end);
            kebabProvider.createUri = (path: string) => MockUri.file(path);
            kebabProvider.createDocumentLink = (range: any, target?: any) => new MockDocumentLink(range, target);
            
            const kebabDocument = new MockTextDocument(
                MockUri.file('/test/kebab.md'),
                'markdown',
                '[[My Test Page]]'
            );
            
            const links = await kebabProvider.provideDocumentLinks(kebabDocument);
            expect(links).to.have.length(1);
            
            // kebab-case変換が適用されることを確認
            const link = links[0];
            expect(link.target?.path).to.include('my-test-page');
        });
        
        it('カスタム拡張子を使用してファイルパスを生成する', async () => {
            // .txt拡張子設定を持つモックConfigurationManager
            const mockConfig = {
                getSlugStrategy: () => 'passthrough' as const,
                getNoteExtension: () => '.txt',
                getVaultRoot: () => '/test/vault'
            };
            
            const customProvider = new WikiLinkDocumentLinkProvider(mockConfig as any);
            customProvider.createRange = (start: any, end: any) => new MockRange(start, end);
            customProvider.createUri = (path: string) => MockUri.file(path);
            customProvider.createDocumentLink = (range: any, target?: any) => new MockDocumentLink(range, target);
            
            const customExtDocument = new MockTextDocument(
                MockUri.file('/test/custom.md'),
                'markdown',
                '[[Test File]]'
            );
            
            const links = await customProvider.provideDocumentLinks(customExtDocument);
            expect(links).to.have.length(1);
            
            const link = links[0];
            expect(link.target?.path).to.include('.txt');
        });

        it('サブディレクトリ内の既存ノートURIを優先して使用する', async () => {
            const mockConfig = {
                getSlugStrategy: () => 'passthrough' as const,
                getNoteExtension: () => '.md',
                getVaultRoot: () => '/test/vault'
            };

            const resolvingProvider = new WikiLinkDocumentLinkProvider(mockConfig as any);
            resolvingProvider.createRange = (start: any, end: any) => new MockRange(start, end);
            resolvingProvider.createUri = (path: string) => MockUri.file(path);
            resolvingProvider.createDocumentLink = (range: any, target?: any) => new MockDocumentLink(range, target);

            (resolvingProvider as any).resolveLinkTarget = async () => MockUri.file('/test/vault/notes/sub/Child Note.md');

            const doc = new MockTextDocument(
                MockUri.file('/test/source.md'),
                'markdown',
                '[[Child Note]]'
            );

            const links = await resolvingProvider.provideDocumentLinks(doc);

            expect(links).to.have.length(1);
            expect(links[0].target?.path).to.equal('/test/vault/notes/sub/Child Note.md');
        });
    });
    
    describe('エラーハンドリング', () => {
        it('無効なWikiLink形式を無視する', async () => {
            const invalidDocument = new MockTextDocument(
                MockUri.file('/test/invalid.md'),
                'markdown',
                'Not a link: [Regular Link](http://example.com) and [[]]'
            );
            
            const links = await provider.provideDocumentLinks(invalidDocument);
            expect(links).to.have.length(0);
        });
        
        it('空の文書を処理できる', async () => {
            const emptyDocument = new MockTextDocument(
                MockUri.file('/test/empty.md'),
                'markdown',
                ''
            );
            
            const links = await provider.provideDocumentLinks(emptyDocument);
            expect(links).to.have.length(0);
        });
    });
});
