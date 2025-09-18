import { expect } from 'chai';

// Chaiのセットアップ
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
            createDirectory: async () => {}
        }
    },
    window: {
        showTextDocument: async () => ({}),
        showErrorMessage: () => {},
        showInformationMessage: () => {}
    },
    commands: {
        executeCommand: () => Promise.resolve(),
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
        constructor(public start: any, public end: any) {}
    },
    Position: class Position {
        constructor(public line: number, public character: number) {}
    },
    FileType: {
        File: 1,
        Directory: 2
    }
};

// グローバルなvscodeモックを設定
(global as any).vscode = vscode;

// requireでvscodeモジュールが要求された場合のモック
require.cache['vscode'] = {
    exports: vscode
} as any;