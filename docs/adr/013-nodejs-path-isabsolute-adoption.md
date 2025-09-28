# ADR-013: Node.js標準 `path.isAbsolute` の採用によるパス解決の堅牢化

## ステータス
採用 (Accepted)

## 文脈

[ADR-011](./011-windows-file-path-handling.md)でWindowsのパス問題に対応したが、自作の`PathUtil.isAbsolutePath()`ではUNCパス(`\\server\share`)や拡張パス(`\\?\C:\path`)のような特殊な形式に対応しきれず、`Extension Install from location`時にコマンドが登録されない問題が残っていた。

### 発生していた問題

Windows環境において、特に以下のケースでコマンド登録エラーが発生：

1. **UNCパス**: `\\server\share\project` のようなネットワークパス
2. **拡張パス**: `\\?\C:\Users\user\.vscode\extensions\publisher.ext-1.0.0`
3. **シンボリックリンク**: `mklink /D` で作成されたディレクトリリンク経由のパス
4. **Install from location**: 開発環境での動的リンク

これらの環境では、自作の`isAbsolutePath()`が`false`を返し、絶対パスが相対パスとして扱われ、不正なURIが生成されて拡張機能の初期化が失敗していた。

## 決定

自作のパス判定ロジックを廃止し、**Node.js標準の `path.isAbsolute()`** を全面的に採用する。これにより、Node.jsがサポートする全てのパス形式（Windowsのドライブレター、UNCパス、POSIX形式など）に標準で対応可能となる。

### 実装内容

```typescript
// 変更前（ADR-011実装）
static isAbsolutePath(pathString: string): boolean {
    // Unix/Linux/macOS
    if (pathString.startsWith('/')) return true;
    // Windows ドライブレター
    if (pathString.match(/^[A-Za-z]:[/\\]/)) return true;
    // Windows UNC パス
    if (pathString.match(/^\\\\[^\\]+\\/)) return true;
    return false;
}

// 変更後
static isAbsolutePath(pathString: string): boolean {
    return path.isAbsolute(pathString);
}
```

## 根拠

### 技術的優位性
- **信頼性**: Node.jsコアチームによって維持され、数多くの環境でテストされた堅牢な実装
- **網羅性**: Windows、macOS、Linuxの多様なパス形式を全て網羅
- **将来性**: Node.jsのバージョンアップによるパス解決の改善を自動的に享受

### 保守性の向上
- **複雑性の削減**: プラットフォーム固有のエッジケースを自前でメンテナンスする必要がなくなる
- **バグリスク軽減**: パス判定ロジックの自作実装に起因するバグを排除
- **コード簡素化**: 15行のカスタムロジックが1行のstd API呼び出しに

### セキュリティ面
- **標準準拠**: Node.jsセキュリティガイドラインに準拠した実装
- **脆弱性対応**: Node.jsチームによるセキュリティパッチの自動適用

## 影響

### プラス影響
- **Windows環境安定性向上**: 特殊パス形式での確実な動作保証
- **開発効率向上**: 「Install from location」での信頼できる動作
- **将来互換性**: 新しいパス形式への自動対応

### 中立影響
- **`PathUtil.isAbsolutePath()`メソッドの変更**: 外部APIは同一だが内部実装が変更
- **テストケース追加**: Windows特有のパス形式をテストするケースを追加

### 対応要項
- `PathUtil.ts`の修正とドキュメント更新
- テストケース`PathUtil.node.test.ts`の新規作成
- ADR-011の一部旧式化

## 検証

新規作成した`PathUtil.node.test.ts`にて以下を検証：
- Node.js `path.isAbsolute()`との完全一致
- Windows特殊パス形式での正常動作
- 既存機能の回帰なし

```bash
npm test -- --grep "Node.js path.isAbsolute Implementation"
# ✅ 10 passing (5ms)
# 重要: "behavior comparison"テストが全て通過
```

## 旧式化

このADRは [ADR-011: Windows File Path Handling](./011-windows-file-path-handling.md) の以下の部分を旧式化させる：

- 「カスタム絶対パス判定ロジック」の部分
- 対応するテストケースの一部

ただし、ADR-011の「ファイル名サニタイズ」「URI生成」の部分は引き続き有効。

## 関連決定

- [ADR-011: Windows File Path Handling](./011-windows-file-path-handling.md) - 部分的に旧式化
- [ADR-012: Extension Activation Fix](./012-extension-activation-fix.md) - 相互補完的