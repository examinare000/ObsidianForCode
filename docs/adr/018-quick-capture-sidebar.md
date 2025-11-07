# ADR 018: Quick Capture Sidebar の追加

日付: 2025-10-30

ステータス: 提案 / 設計完了

コンテキスト
--------
開発者は VS Code 上で Obsidian ライクなメモワークフローを強化するため、右サイドバーにクイック入力 UI を追加し、日次ノートへ追記したり、Vault 内の未完了タスクを一覧・操作できるようにしたい。

決定
----
以下を採用する。

- 右サイドバーは VS Code の WebviewView を用いて実装する。
- 設定は既存の `obsd` (または `MDloggerForCode`) ネームスペースに鍵を追加して管理する。
  - `vaultPath` (string) — Vault のルートパス (空の場合は workspaceFolder)
  - `notesFolder` (string) — Vault 配下のノートディレクトリ（例: `dailynotes`）
  - `dailyNoteFormat` (string) — 日次ノートのファイル名フォーマット（例: `YYYY-MM-DD.md`）
  - `captureSectionName` (string) — 当日の DailyNote 内で追記対象となる見出し名（例: `Quick Notes`）

- サイドバー UI から入力したテキストは当日の DailyNote の指定セクション末尾にタイムスタンプ付きで追記する。
- サイドバーには Vault 配下から収集した「未完了タスクリスト」を表示し、ワンクリックで完了マーク（元ノート行に `[completion: YYYY-mm-dd]` を付記しチェックを入れる）や編集ができる。

理由
----
Webview を使うことでリッチな UI（入力フォーム、タスク一覧、ボタン）を柔軟に実装でき、将来の拡張（フィルタ、検索、並べ替え）にも対応しやすいため。

影響
----
- 既存の DailyNote 関連処理（`DailyNoteManager`）と設定管理（`ConfigurationManager`）を拡張する。既存の補完/リンク機能はそのまま利用する。
- Vault 内のファイル読み書きを `workspace.fs` を通じて行うため、ファイル競合時は VS Code 側の競合解決に委ねる。簡易な衝突検出は今後の改善項目とする。

代替案
----
- サイドバーを Webview ではなく TreeView/QuickPick で実装する案はあったが、豊富な操作性と将来の UI 拡張を考慮して Webview を選定した。

後続作業
----
1. `package.json` に設定スキーマと `webview` の contribution を追加する。
2. `ConfigurationManager` に新設定の読み取りメソッドを追加する。
3. `DailyNoteManager` に「指定セクションの末尾へ追記」APIを追加する。
4. `src/providers/QuickCaptureSidebarProvider.ts` を新規作成し Webview を実装する。
5. Vault 内チェックリストの抽出と編集ロジックを `NoteParser` 等のユーティリティとして実装する。

決定日: 2025-10-30

決定者: 開発チーム

