import { describe, it, beforeEach, afterEach } from 'mocha';
// expect はテストsetup.tsからグローバルにインポート済み
const expect = (global as any).expect;
import { WikiLinkContextProvider } from '../../../src/providers/WikiLinkContextProvider';

interface MockExtensionContext {
    subscriptions: any[];
}

interface Position {
    line: number;
    character: number;
}

// VS Codeモック（setup.tsから継承、テスト固有の変数のみ定義）
let mockActiveEditor: any;
let mockContext: string | undefined;

describe('WikiLink キーバインド統合テスト', () => {
    let contextProvider: WikiLinkContextProvider;
    let mockExtensionContext: MockExtensionContext;

    beforeEach(() => {
        mockExtensionContext = { subscriptions: [] };
        (global as any).mockActiveEditor = undefined;
        // 初期化時のコンテキスト状態を明示的に設定
        (global as any).mockContext = null;
    });

    afterEach(() => {
        if (contextProvider) {
            contextProvider.dispose();
        }
    });

    describe('WikiLinkコンテキスト検出', () => {
        it('Simple Pageリンク内でobsd.inWikiLinkがtrueになる', () => {
            // テストドキュメントの作成
            const testContent = '# Test Document\n\n- [[Simple Page]]\n- [[Another Note]]';

            (global as any).mockActiveEditor = {
                document: {
                    uri: { scheme: 'file', fsPath: '/test/file.md' } as any,
                    languageId: 'markdown',
                    getText: () => testContent,
                    positionAt: (offset: number) => {
                        // 簡単な実装：行と文字位置を計算
                        const lines = testContent.substring(0, offset).split('\n');
                        return {
                            line: lines.length - 1,
                            character: lines[lines.length - 1].length
                        };
                    },
                    offsetAt: (position: Position) => {
                        const lines = testContent.split('\n');
                        let offset = 0;
                        for (let i = 0; i < position.line; i++) {
                            offset += lines[i].length + 1; // +1 for newline
                        }
                        return offset + position.character;
                    }
                },
                selection: {
                    active: { line: 2, character: 8 }, // [[Simple の 'S' の位置
                    start: { line: 2, character: 8 },
                    end: { line: 2, character: 8 }
                }
            };

            contextProvider = new WikiLinkContextProvider(mockExtensionContext as any);

            // コンテキストがtrueに設定されることを確認
            expect((global as any).mockContext).to.be.true;
        });

        it('WikiLink外では obsd.inWikiLink が false になる', () => {
            const testContent = '# Test Document\n\nThis is normal text. [[Simple Page]]';

            (global as any).mockActiveEditor = {
                document: {
                    uri: { scheme: 'file', fsPath: '/test/file.md' } as any,
                    languageId: 'markdown',
                    getText: () => testContent,
                    positionAt: (offset: number) => ({ line: 0, character: offset }),
                    offsetAt: (position: Position) => position.character
                },
                selection: {
                    active: { line: 2, character: 5 }, // 'is no' の位置（WikiLink外）
                    start: { line: 2, character: 5 },
                    end: { line: 2, character: 5 }
                }
            };

            contextProvider = new WikiLinkContextProvider(mockExtensionContext as any);

            expect((global as any).mockContext).to.be.false;
        });

        it('Markdownファイル以外では常に false になる', () => {
            (global as any).mockActiveEditor = {
                document: {
                    uri: { scheme: 'file', fsPath: '/test/file.ts' } as any,
                    languageId: 'typescript',
                    getText: () => '// [[Simple Page]]',
                    positionAt: (offset: number) => ({ line: 0, character: offset }),
                    offsetAt: (position: Position) => position.character
                },
                selection: {
                    active: { line: 0, character: 5 },
                    start: { line: 0, character: 5 },
                    end: { line: 0, character: 5 }
                }
            };

            contextProvider = new WikiLinkContextProvider(mockExtensionContext as any);

            expect((global as any).mockContext).to.be.false;
        });
    });

    describe('実際のサンプルファイルでのテスト', () => {
        it('sample/test-document.mdの[[Simple Page]]でコンテキストが有効になる', () => {
            const sampleContent = `# Test Document for ObsidianForCode

This document contains various WikiLink patterns to test the extension:

## Simple Links
- [[Simple Page]]
- [[Another Note]]
- [[My Important Document]]`;

            (global as any).mockActiveEditor = {
                document: {
                    uri: { scheme: 'file', fsPath: '/sample/test-document.md' } as any,
                    languageId: 'markdown',
                    getText: () => sampleContent,
                    positionAt: (offset: number) => {
                        const lines = sampleContent.substring(0, offset).split('\n');
                        return {
                            line: lines.length - 1,
                            character: lines[lines.length - 1].length
                        };
                    },
                    offsetAt: (position: Position) => {
                        const lines = sampleContent.split('\n');
                        let offset = 0;
                        for (let i = 0; i < position.line; i++) {
                            offset += lines[i].length + 1;
                        }
                        return offset + position.character;
                    }
                },
                selection: {
                    active: { line: 5, character: 8 }, // [[Simple Page]] の 'S' の位置
                    start: { line: 5, character: 8 },
                    end: { line: 5, character: 8 }
                }
            };

            contextProvider = new WikiLinkContextProvider(mockExtensionContext as any);

            expect((global as any).mockContext).to.be.true;
        });
    });
});