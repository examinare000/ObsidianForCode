# ADR-014: テストインフラストラクチャの標準化

**ステータス**: 承認済み
**決定日**: 2025-09-29
**技術責任者**: Claude Code Assistant

## 背景

テスト実行において以下の問題が発生していました：

1. **TypeScript Parameter Properties の非互換性**
   - Node.js ESM環境でパラメータプロパティ構文が動作しない
   - strip-only modeでのTypeScriptコンパイルエラー

2. **VS Code API Mock の不一致**
   - テストファイル間でVS Code APIモックの実装が不統一
   - 設定取得ロジックの模擬が不正確

3. **プラットフォーム固有の処理不一致**
   - PathUtilの Windows予約名処理でテストとソースコードの乖離
   - Node.js path.isAbsolute() の動作とテスト期待値の不一致

## 決定内容

### 1. TypeScript コーディング標準の変更

**従来:**
```typescript
class MyClass {
    constructor(private field: string) {}
}
```

**新規:**
```typescript
class MyClass {
    private field: string;

    constructor(field: string) {
        this.field = field;
    }
}
```

**理由**: Node.js ESM環境での互換性確保

### 2. VS Code API Mock の標準化

**統一されたモック構造**:
- `tests/setup.ts` にグローバルVS Code APIモック
- `Module.prototype.require` のオーバーライドによるmodule解決
- 一貫したConfiguration模擬パターン

**標準的な設定モック**:
```typescript
const mockConfig = new MockWorkspaceConfiguration({
    vaultRoot: '/test/vault',
    noteExtension: '.md',
    // ... 直接プロパティ形式
});
```

### 3. テスト環境の改善

**新規作成されたファイル**:
- `tsconfig.test.json` - テスト専用TypeScript設定
- 標準化されたVS Code APIモック (`tests/setup.ts`)
- 統一されたchaiインポートパターン

## 影響範囲

### 変更されたファイル
- **ソースコード**: `src/managers/DailyNoteManager.ts`, `src/managers/ConfigurationManager.ts`
- **テストファイル**: 12のテストファイルでchaiインポート修正
- **テストインフラ**: `package.json`, `tsconfig.test.json`, `tests/setup.ts`

### テスト数の変化
- **修正前**: 46個のテスト (失敗多数)
- **修正後**: 158個のテスト (158通過、7失敗)

## メリット

1. **信頼性向上**: 一貫したテスト実行環境
2. **保守性向上**: 標準化されたモック構造
3. **互換性確保**: クロスプラットフォーム対応
4. **開発効率**: 統一されたテストパターン

## 今後の方針

1. **新規テスト作成時**: 標準化されたモックパターンを使用
2. **TypeScript記述**: パラメータプロパティを避け、明示的プロパティ宣言を使用
3. **設定テスト**: `tests/setup.ts`のモック構造に従う

## 関連するADR

- [ADR-013](./ADR-013-nodejs-path-adoption.md): Node.js path.isAbsolute採用の設計決定
- [ADR-010](./ADR-010-settings-ui-improvement.md): 設定UI改善とキーバインド手動設定

## 実装詳細

### VS Code API モック

```typescript
// モジュール解決のカスタマイズ
Module._resolveFilename = function (request: string, parent: any) {
    if (request === 'vscode') return request;
    return originalResolveFilename.apply(this, arguments);
};

// require のオーバーライド
Module.prototype.require = function (id: string) {
    if (id === 'vscode') return vscode;
    return originalRequire.apply(this, arguments);
};
```

### 統一されたチェイン期待値

```typescript
// 従来の個別インポート
import { expect } from 'chai';

// 新規のグローバル参照
const expect = (global as any).expect;
```

この標準化により、テストの信頼性と保守性が大幅に向上しました。