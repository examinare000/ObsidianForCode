# ADR-011: Windows ファイルパス処理とコマンド登録改善

## ステータス
採用 (Accepted)

## 文脈
Windows環境において、拡張機能のコマンド登録が失敗する問題が報告されている。調査の結果、以下の問題が特定された：

1. **ファイルパス処理の不完全性**
   - Windows絶対パス判定が `C:` 形式のみで、UNCパス（`\\server\share`）未対応
   - パス区切り文字の混在による URI 作成エラー
   - ファイル名サニタイズでWindows予約名が未チェック

2. **エラーハンドリングの問題**
   - 初期化失敗時にextension全体が無効化される
   - コマンド登録失敗の詳細情報が不足

## 決定
Windows環境での信頼性向上のため、以下の改善を実装する：

### 1. ファイルパス処理の改善
- `path.resolve()` を使用したクロスプラットフォーム対応
- UNCパス (`\\server\share`) の適切な処理
- Windows予約ファイル名の検証

### 2. ファイル名サニタイズの強化
- Windows予約名（CON, PRN, AUX, NUL等）のチェック
- 末尾ピリオド・空白の除去
- ファイル名長制限の適切な処理

### 3. エラーハンドリングの改善
- 個別コマンド登録失敗でも他のコマンドは継続
- 詳細なエラーログとユーザー向けメッセージ
- 段階的な初期化とフォールバック機能

## 実装詳細

### PathUtil ユーティリティクラス
```typescript
class PathUtil {
  static isAbsolutePath(path: string): boolean
  static sanitizeFileName(fileName: string): string
  static createSafeUri(vaultRoot: string, fileName: string, extension: string, workspaceFolder: vscode.WorkspaceFolder): vscode.Uri
}
```

### エラーハンドリング戦略
- 各コマンド登録を独立したtry-catchで処理
- 失敗したコマンドの詳細をログに記録
- ユーザーには具体的な対処法を提示

## 根拠
- **信頼性**: Windows環境での安定動作を保証
- **ユーザビリティ**: エラー時の適切なフィードバック
- **保守性**: プラットフォーム固有の処理を分離

## 影響
- **プラス**: Windows環境での動作安定性向上
- **プラス**: エラー診断の容易さ
- **マイナス**: 初期実装の複雑性増加

## 関連項目
- [VS Code API ドキュメント - File System](https://code.visualstudio.com/api/references/vscode-api#FileSystem)
- [Windows ファイル名制限](https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file)