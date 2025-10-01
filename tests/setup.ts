import { expect } from 'chai';

// Chaiのセットアップ
(global as any).expect = expect;

// VS Code APIのモック
const vscode = {
    workspace: {
        getConfiguration: (section?: string) => {
            const configData: Record<string, any> = {
                obsd: {
                    vaultRoot: '/test/vault',
                    noteExtension: '.md',
                    slugStrategy: 'passthrough',
                    dateFormat: 'YYYY-MM-DD',
                    timeFormat: 'HH:mm',
                    template: '# {{title}}\n\n'
                }
            };
            return {
                get: (key: string, defaultValue?: any) => {
                    const fullKey = section ? `${section}.${key}` : key;
                    const keys = fullKey.split('.');
                    let value = configData;
                    for (const k of keys) {
                        if (value && typeof value === 'object' && k in value) {
                            value = value[k];
                        } else {
                            return defaultValue;
                        }
                    }
                    return value !== undefined ? value : defaultValue;
                },
                has: (key: string) => true,
                update: () => Promise.resolve()
            };
        },
        workspaceFolders: [{
            uri: { fsPath: '/test/workspace' },
            name: 'test-workspace',
            index: 0
        }],
        fs: {
            stat: async () => ({ type: 1 }),
            readFile: async () => new Uint8Array(),
            writeFile: async () => {},
            createDirectory: async () => {},
            delete: async () => {}
        },
        findFiles: async () => [],
        getWorkspaceFolder: () => ({
            uri: { fsPath: '/test/workspace' },
            name: 'test-workspace',
            index: 0
        })
    },
    window: {
        showTextDocument: async () => ({}),
        showErrorMessage: () => {},
        showInformationMessage: () => {},
        onDidChangeTextEditorSelection: () => ({ dispose: () => {} }),
        onDidChangeActiveTextEditor: () => ({ dispose: () => {} })
    },
    commands: {
        executeCommand: () => Promise.resolve(),
        registerCommand: () => ({ dispose: () => {} })
    },
    languages: {
        registerDocumentLinkProvider: () => ({ dispose: () => {} })
    },
    Uri: {
        file: (path: string) => ({
            fsPath: path,
            toString: () => path,
            with: (change: any) => ({
                fsPath: change.path || path,
                toString: () => change.path || path
            })
        }),
        joinPath: (base: any, ...paths: string[]) => ({
            fsPath: `${base.fsPath}/${paths.join('/')}`,
            toString: () => `${base.fsPath}/${paths.join('/')}`,
            with: (change: any) => ({
                fsPath: change.path || `${base.fsPath}/${paths.join('/')}`,
                toString: () => change.path || `${base.fsPath}/${paths.join('/')}`
            })
        })
    },
    RelativePattern: class RelativePattern {
        constructor(public base: any, public pattern: string) {}
    },
    Range: class Range {
        constructor(public start: any, public end: any) {}
    },
    Position: class Position {
        constructor(public line: number, public character: number) {}
    },
    Selection: class Selection {
        constructor(public anchor: any, public active: any) {}
    },
    CancellationTokenSource: class CancellationTokenSource {
        token = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) };
        cancel() {}
        dispose() {}
    },
    FileType: {
        File: 1,
        Directory: 2
    },
    EndOfLine: {
        LF: 1,
        CRLF: 2
    }
};

// グローバルなvscodeモックを設定
(global as any).vscode = vscode;

// requireでvscodeモジュールが要求された場合のモック
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request: string, ...args: any[]) {
    if (request === 'vscode') {
        return 'vscode';
    }
    return originalResolveFilename.apply(this, [request, ...args]);
};

require.cache['vscode'] = {
    id: 'vscode',
    filename: 'vscode',
    loaded: true,
    exports: vscode,
    paths: []
} as any;