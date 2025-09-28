# テストガイド

## 概要

ObsidianForCodeは158個の包括的なテストを持つTest-Driven Development (TDD) プロジェクトです。

## テスト実行

### 単体テスト

```bash
npm run test:unit
```

**実行内容:**
- 158個のテスト (通過: 151個、失敗: 7個)
- VS Code API非依存のCore Layerテスト
- VS Code APIモックを使用したIntegration Layerテスト

### 個別テストファイルの実行

```bash
# ConfigurationManagerのテストのみ
npx mocha --require ts-node/register --require tests/setup.ts tests/unit/managers/ConfigurationManager.test.ts

# PathUtilのテストのみ
npx mocha --require ts-node/register --require tests/setup.ts tests/unit/utils/PathUtil.test.ts
```

## テスト構造

### ディレクトリ構成

```
tests/
├── setup.ts                    # グローバルテスト設定・VS Code APIモック
├── unit/
│   ├── commands/               # CommandHandler テスト
│   ├── config/                 # 設定関連テスト
│   ├── integration/            # 統合テスト
│   ├── managers/               # ConfigurationManager, DailyNoteManager テスト
│   ├── processors/             # WikiLinkProcessor テスト
│   ├── providers/              # Provider クラステスト
│   └── utils/                  # ユーティリティクラステスト
└── integration/                # E2Eテスト (実装予定)
```

### テストカテゴリ

#### 1. Core Layer テスト (VS Code非依存)
- **WikiLinkProcessor**: WikiLink解析・変換ロジック
- **DateTimeFormatter**: 日時フォーマット処理
- **PathUtil**: パス処理・ファイル名サニタイズ
- **ConfigurationManager**: 設定管理・検証 (モック使用)

#### 2. Integration Layer テスト (VS Code統合)
- **CommandHandler**: VS Codeコマンド実装
- **WikiLinkDocumentLinkProvider**: リンク検出・ナビゲーション
- **WikiLinkContextProvider**: キーバインドコンテキスト

#### 3. TDD Red Phase テスト
- **DailyNoteManager**: TDD手法による段階的実装検証

## テスト設計パターン

### VS Code APIモック

全テストは統一されたVS Code APIモックを使用します：

```typescript
// tests/setup.ts
const vscode = {
    workspace: {
        getConfiguration: () => ({ /* mock implementation */ }),
        workspaceFolders: [{ /* mock workspace */ }],
        fs: { /* file system mock */ }
    },
    window: {
        showTextDocument: async () => ({}),
        activeTextEditor: undefined
    },
    commands: {
        executeCommand: () => Promise.resolve(),
        registerCommand: () => ({ dispose: () => {} })
    }
    // ...
};
```

### 設定テストパターン

ConfigurationManagerのテストでは統一されたパターンを使用：

```typescript
const mockConfig = new MockWorkspaceConfiguration({
    vaultRoot: '/test/vault',
    noteExtension: '.md',
    slugStrategy: 'kebab-case',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm',
    template: '# {{title}}\\n\\n'
});
```

### チェインアサーション

Chaiライブラリはグローバル設定で統一：

```typescript
// 各テストファイル
const expect = (global as any).expect;

// テスト例
expect(result).to.equal('expected');
expect(config).to.deep.include({ vaultRoot: '/test' });
```

## TypeScript設定

### テスト専用設定

`tsconfig.test.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "types": ["mocha", "chai", "node"],
    "skipLibCheck": true,
    "strict": false
  },
  "ts-node": {
    "transpileOnly": false,
    "compilerOptions": {
      "module": "commonjs"
    }
  }
}
```

### 実行環境

- **Node.js**: ESM/CommonJS互換
- **TypeScript**: ts-node with register
- **テストフレームワーク**: Mocha + Chai
- **プリプロセッサ**: カスタムsetup.ts

## 新規テスト作成ガイド

### 1. ファイル作成

```typescript
import { describe, it, beforeEach } from 'mocha';
// expect はテストsetup.tsからグローバルにインポート済み
const expect = (global as any).expect;
import { YourClass } from '../../../src/path/to/YourClass';

describe('YourClass', () => {
    let instance: YourClass;

    beforeEach(() => {
        // セットアップ
    });

    it('should do something', () => {
        // テスト実装
    });
});
```

### 2. VS Code API使用クラスのテスト

VS Code APIを使用するクラスは、グローバルモックが自動的に適用されます：

```typescript
// VS Code API依存クラスのテスト
describe('ClassWithVSCodeAPI', () => {
    it('should work with mocked VS Code API', () => {
        const instance = new ClassWithVSCodeAPI();
        // VS Code APIが自動的にモックされる
        expect(instance.someMethod()).to.be.true;
    });
});
```

### 3. パラメータプロパティ回避

TypeScript パラメータプロパティは使用禁止：

```typescript
// ❌ 使用禁止
class MyClass {
    constructor(private field: string) {}
}

// ✅ 推奨
class MyClass {
    private field: string;

    constructor(field: string) {
        this.field = field;
    }
}
```

## トラブルシューティング

### よくある問題

1. **"Cannot find module 'vscode'"**
   - setup.tsのモック設定を確認
   - --require tests/setup.ts オプションが含まれているか確認

2. **"Parameter property is not supported"**
   - TypeScriptパラメータプロパティを通常のプロパティ宣言に変更

3. **"expect is not defined"**
   - グローバルexpectパターンを使用: `const expect = (global as any).expect;`

### デバッグ実行

個別テストのデバッグ：

```bash
# 詳細出力でテスト実行
npx mocha --require ts-node/register --require tests/setup.ts --reporter spec tests/unit/specific/test.ts

# 特定のテストケースのみ実行
npx mocha --require ts-node/register --require tests/setup.ts --grep "specific test name" tests/unit/**/*.test.ts
```

## 継続的改善

### 目標

- [ ] 158個全テストのパス (現在: 151/158)
- [ ] 統合テストの充実
- [ ] E2Eテストの実装
- [ ] カバレッジ90%以上維持

### 品質指標

- **テスト数**: 158個
- **成功率**: 95.6% (151/158)
- **TDD準拠**: Red-Green-Refactorサイクル
- **モック標準化**: 100%達成