# DailyNote機能テスト

このファイルでDailyNote機能をテストします。

## テスト手順
1. `Ctrl+Shift+D` (Mac: `Cmd+Shift+D`) を押す
2. 本日の日付のファイルが `dailynotes/` ディレクトリに作成されるかを確認
3. 既存ファイルがある場合はそのファイルが開かれるかを確認

## 期待される動作
- ファイル名: `YYYY-MM-DD.md` 形式
- パス: `workspace_root/dailynotes/YYYY-MM-DD.md`
- 新しいタブで開く

## テスト日: 2025-09-18