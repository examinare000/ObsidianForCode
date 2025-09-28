// Chaiのセットアップ - CommonJS形式でインポート
const { expect } = require('chai');
(global as any).expect = expect;

// VS Code APIのモック
const vscode = {
    workspace: {
        getConfiguration: () => ({
            get: (key: string, defaultValue?: any) => defaultValue,
            has: () => true,
            update: () => Promise.resolve()
        }),
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
        }
    },
    window: {
        showTextDocument: async () => ({}),
        showErrorMessage: () => {},
        showInformationMessage: () => {},
        onDidChangeTextEditorSelection: () => ({ dispose: () => {} }),
        onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
        get activeTextEditor() {
            return (global as any).mockActiveEditor;
        }
    },
    commands: {
        executeCommand: (command: string, ...args: any[]) => {
            if (command === 'setContext') {
                (global as any).mockContext = args[1];
            }
            return Promise.resolve();
        },
        registerCommand: () => ({ dispose: () => {} })
    },
    languages: {
        registerDocumentLinkProvider: () => ({ dispose: () => {} })
    },
    Uri: {
        file: (path: string) => ({ fsPath: path, toString: () => path }),
        joinPath: (base: any, ...paths: string[]) => ({
            fsPath: `${base.fsPath}/${paths.join('/')}`,
            toString: () => `${base.fsPath}/${paths.join('/')}`
        })
    },
    Range: class Range {
        public start: any;
        public end: any;
        constructor(start: any, end: any) {
            this.start = start;
            this.end = end;
        }
    },
    Position: class Position {
        public line: number;
        public character: number;
        constructor(line: number, character: number) {
            this.line = line;
            this.character = character;
        }
    },
    FileType: {
        File: 1,
        Directory: 2
    }
};

// グローバルなvscodeモックを設定
(global as any).vscode = vscode;

// Node.jsモジュール解決のカスタマイズ
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request: string, parent: any) {
    if (request === 'vscode') {
        // 偽のパスを返して、requireで探せるようにする
        return request;
    }
    return originalResolveFilename.apply(this, arguments);
};

// requireで vscode が要求された場合のモック
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
    if (id === 'vscode') {
        return vscode;
    }
    return originalRequire.apply(this, arguments);
};