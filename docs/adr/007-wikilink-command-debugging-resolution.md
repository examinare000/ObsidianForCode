# ADR-007: WikiLink コマンド デバッグ解決戦略

## ステータス
採用済み

## 文脈
VS Code 拡張機能において、WikiLink機能の2つの重要なバグが発生していた：

1. **Cmd+Enter キーバインド不動作**: `[[Simple Page]]` 形式のWikiLink内でカーソルがある時に Cmd+Enter を押してもコマンドが実行されない
2. **ファイル作成時のパス解決エラー**: "Create file" アクションで root filesystem への書き込みエラー (`EROFS: read-only file system, open '/Simple Page.md'`)

これらの問題は、ユーザビリティに直接影響する重要な機能障害であり、拡張機能の核心的価値を損なっていた。

## 決定
以下の段階的デバッグアプローチを採用した：

### 1. 包括的ロギング戦略
- 拡張機能の全ての主要コンポーネントに詳細なデバッグログを追加
- 初期化プロセス、コマンド実行、コンテキスト検出の各段階を追跡可能にした
- ログレベルとプレフィックス (`[INIT]`, `[COMMAND]`, `[WikiLinkContext]`) による分類

### 2. 段階的問題分離
- WikiLinkContextProvider のカーソル位置検出ロジックを優先的に修正
- package.json のエントリーポイント設定の検証と修正
- VS Code API の非同期処理における例外処理の改善

### 3. 反復的デバッグビルド作成
- バージョン番号を段階的に上げて（0.1.1-debug → 0.1.4-debug）、VS Code キャッシュの影響を回避
- 各ビルドで特定の問題に焦点を当てた修正を実装

## 根本原因と解決策

### 原因1: package.json エントリーポイント不整合
**問題**: `"main": "./out/extension.js"` が実際のコンパイル後のファイル構造と不一致
**解決**: `"main": "./out/src/extension.js"` に修正

### 原因2: WikiLink位置検出アルゴリムの不正確性
**問題**: 文字列ベースの位置検出が regex パターンマッチングと不整合
**解決**: regex ベースの正確な位置検出アルゴリズムに書き換え

```typescript
private isPositionInWikiLink(document: vscode.TextDocument, position: vscode.Position): boolean {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;

    let match;
    while ((match = wikiLinkRegex.exec(text)) !== null) {
        const linkStart = match.index;
        const linkEnd = match.index + match[0].length;
        // [[ の直後から ]] の直前まで（内側）にある場合のみtrue
        if (offset >= linkStart + 2 && offset <= linkEnd - 3) {
            return true;
        }
    }
    return false;
}
```

### 原因3: 非同期例外処理の不備
**問題**: Promise チェーンでの `.catch()` 使用時の TypeScript エラー
**解決**: `.then()` の第二引数でエラーハンドリング実装

## 結果
- ✅ Cmd+Enter キーバインドが正常動作
- ✅ ファイル作成が適切なワークスペースパスで実行
- ✅ WikiLink コンテキスト検出が正確に動作
- ✅ 全てのコマンドが期待通りに登録・実行

## 学習事項
1. **package.json 検証の重要性**: TypeScript コンパイル後のファイル構造とエントリーポイント設定の整合性確認が必須
2. **段階的デバッグの有効性**: 複雑な問題を小さな単位に分解し、各段階でビルド・テストする手法が有効
3. **VS Code キャッシュ対策**: バージョン番号変更による強制的なキャッシュ無効化が、デバッグ時に重要
4. **ロギング戦略**: 本番環境での問題診断を考慮した、構造化されたログ出力の設計が重要

## トレードオフ
- **デバッグログのオーバーヘッド**: 本番リリース時にはログ削除が必要
- **ビルドサイズ**: 詳細なログによる若干のバンドルサイズ増加
- **開発時間**: 段階的アプローチにより短期的な開発時間は増加したが、根本解決により長期的な安定性を確保

## 今後の考慮事項
- 本番リリース前のデバッグログ削除
- 類似問題に対する予防的ユニットテストの追加
- エラーハンドリングパターンの標準化
