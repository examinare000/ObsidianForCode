# MDloggerForCode

MDloggerForCode は VS Code 上で Obsidian 風の WikiLink 機能や日付/時刻入力、デイリーノート、クイックキャプチャなどを提供する拡張機能です。

詳しい仕様やドキュメントは `docs/` ディレクトリをご覧ください。

## 主な機能
- `[[Page]]`, `[[Page|Display]]`, `[[folder/file]]` 形式の WikiLink
- デイリーノートの作成/オープン（テンプレート対応）
- 日付/時刻の挿入
- リスト/チェックボックスの継続入力（Enter キー）
- クイックキャプチャ サイドバー

## コマンド（カテゴリー: MDloggerForCode）
- Open or Create Wiki Link: `mdlg.openOrCreateWikiLink`
- Insert Date: `mdlg.insertDate`
- Insert Time: `mdlg.insertTime`
- Preview Markdown: `mdlg.preview`
- Open Quick Capture: `mdlg.openQuickCapture`
- Open Daily Note: `mdlg.openDailyNote`
- Handle Enter Key: `mdlg.handleEnterKey`

## 設定（`mdlg.*`）
- `mdlg.vaultRoot`: Vaultのルートディレクトリ
- `mdlg.noteExtension`: ノートの拡張子（初期値: `.md`）
- `mdlg.slugStrategy`: ファイル名変換（`passthrough`/`kebab-case`/`snake_case`）
- `mdlg.dateFormat` / `mdlg.timeFormat`: 日付/時刻の挿入フォーマット
- `mdlg.dailyNote*`: デイリーノート関連設定
- `mdlg.listContinuationEnabled`: リスト継続入力の有効/無効
- `mdlg.searchSubdirectories`: WikiLink検索時にサブディレクトリを探索

## 開発
```bash
npm install
npm run compile
```
