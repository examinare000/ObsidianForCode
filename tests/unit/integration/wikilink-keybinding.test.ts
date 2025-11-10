import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as vscode from 'vscode';
import { Position } from 'vscode';
import { WikiLinkContextProvider } from '../../../src/providers/WikiLinkContextProvider';

interface MockExtensionContext {
    subscriptions: any[];
}

// Track mock state
let mockActiveEditor: any | undefined;
let mockContext: string | undefined;

// Override commands.executeCommand to track setContext calls
const originalExecuteCommand = vscode.commands.executeCommand;
(vscode.commands as any).executeCommand = (command: string, ...args: any[]) => {
    if (command === 'setContext') {
        mockContext = args[1];
    }
    return originalExecuteCommand(command, ...args);
};

// Override window.activeTextEditor getter
Object.defineProperty(vscode.window, 'activeTextEditor', {
    get: () => mockActiveEditor,
    configurable: true
});

describe('WikiLink キーバインド統合テスト', () => {
    let contextProvider: WikiLinkContextProvider;
    let mockExtensionContext: MockExtensionContext;

    beforeEach(() => {
        mockExtensionContext = { subscriptions: [] };
        mockActiveEditor = undefined;
        mockContext = undefined;
    });

    afterEach(() => {
        if (contextProvider) {
            contextProvider.dispose();
        }
    });

    describe('WikiLinkコンテキスト検出', () => {
        it('Simple Pageリンク内でmdlg.inWikiLinkがtrueになる', () => {
            // テストドキュメントの作成
            const testContent = '# Test Document\n\n- [[Simple Page]]\n- [[Another Note]]';

            mockActiveEditor = {
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
            expect(mockContext).to.be.true;
        });

        it('WikiLink外では mdlg.inWikiLink が false になる', () => {
            const testContent = '# Test Document\n\nThis is normal text. [[Simple Page]]';

            mockActiveEditor = {
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

            expect(mockContext).to.be.false;
        });

        it('Markdownファイル以外では常に false になる', () => {
            mockActiveEditor = {
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

            expect(mockContext).to.be.false;
        });
    });

    describe('実際のサンプルファイルでのテスト', () => {
        it('sample/test-document.mdの[[Simple Page]]でコンテキストが有効になる', () => {
            const sampleContent = `# Test Document for MDloggerForCode

This document contains various WikiLink patterns to test the extension:

## Simple Links
- [[Simple Page]]
- [[Another Note]]
- [[My Important Document]]`;

            mockActiveEditor = {
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

            expect(mockContext).to.be.true;
        });
    });
});
