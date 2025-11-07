# ADR 018: Quick Capture Sidebar の追加

日付: 2025-10-30
更新: 2025-11-07

ステータス: Accepted

コンテキスト
--------
開発者は VS Code 上で Obsidian ライクなメモワークフローを強化するため、右サイドバーにクイック入力 UI を追加し、日次ノートへ追記したり、Vault 内の未完了タスクを一覧・操作できるようにしたい。

決定
----
以下を採用する。

- 右サイドバーは VS Code の WebviewView を用いて実装する。
- 設定は既存の `obsd` (または `obsidianForCode`) ネームスペースに鍵を追加して管理する。
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

## 実装状況（2025-11-07）

### ✅ 完了した実装
1. `QuickCaptureSidebarProvider` - Webview ベースのサイドバー UI
2. `TaskService` - タスク収集と完了処理のオーケストレーション
3. `TaskCollector` - タスク抽出と完了マーク付与
4. `DailyNoteManager.appendToSection` - セクションへの追記 API
5. `ConfigurationManager` - Quick Capture 用設定の追加
6. `package.json` - views と commands の登録

### ❌ 不足している項目
1. **テストの完全欠如**
   - `QuickCaptureSidebarProvider` の単体テスト: 0件
   - `DailyNoteManager.appendToSection` の単体テスト: 0件
   - 統合テスト: 0件

2. **設計上の改善点**
   - `QuickCaptureSidebarProvider` が `DailyNoteManager` を optional 依存として受け取っている
   - エラーハンドリング戦略が文書化されていない

## 設計改善（2025-11-07）

### 依存性の明確化
```typescript
// Before (optional - 不適切)
constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly configManager: ConfigurationManager,
    private readonly dailyNoteManager?: DailyNoteManager  // ❌ optional
)

// After (required - 推奨)
constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly configManager: ConfigurationManager,
    private readonly dailyNoteManager: DailyNoteManager  // ✅ required
)
```

**理由**: Quick Capture の主要機能である「DailyNote への追記」は `DailyNoteManager` に完全依存するため、optional にする理由がない。

### エラーハンドリング戦略
1. **Webview メッセージングエラー**: `{ command: 'error', message: string }` で UI にフィードバック
2. **ファイル I/O エラー**: `DailyNoteManager` と `TaskService` で catch し、適切なエラーメッセージを返す
3. **設定エラー**: `ConfigurationManager` のデフォルト値フォールバックに依存

## テスト戦略

### 1. DailyNoteManager.appendToSection の単体テスト
- [ ] 空ファイルへのセクション作成と追記
- [ ] 既存セクションへの追記
- [ ] 複数セクションがある場合の正しい位置への挿入
- [ ] セクションがない場合の新規作成（`## SectionName` として作成）
- [ ] タイムスタンプ付き行の正しいフォーマット（`- [ ] HH:mm — content`）
- [ ] ファイルが存在しない場合の作成
- [ ] 次のセクション見出しの直前に挿入されること
- [ ] 最後のセクションの場合、ファイル末尾に追記されること

### 2. QuickCaptureSidebarProvider の単体テスト
- [ ] Webview HTML の生成（CSP、nonce、基本構造）
- [ ] `capture:add` メッセージ処理
  - [ ] 正常系: テキスト追記と `capture:ok` レスポンス
  - [ ] 異常系: 空テキスト、workspace なし、DailyNoteManager なし
- [ ] `request:tasks` メッセージ処理
  - [ ] 正常系: タスク一覧の取得と `tasks:update` レスポンス
  - [ ] 異常系: workspace なし、ファイル読み取りエラー
- [ ] `task:complete` メッセージ処理
  - [ ] 正常系: タスク完了と再取得
  - [ ] 異常系: 無効な URI/line、ファイル書き込みエラー

### 3. TaskService の追加テスト
- [ ] 空ファイルリストの処理
- [ ] ファイル読み取りエラーのハンドリング
- [ ] タスクが0件の場合の動作

### 4. 統合テスト
- [ ] Quick Capture UI → DailyNote 追記 → ファイル確認
- [ ] タスク一覧表示 → タスク完了 → ファイル更新確認
- [ ] エラー発生時の UI フィードバック

## TDD 実装手順

t-wada の TDD 手法に従い、以下の順序で進める：

1. **Red フェーズ**: 失敗するテストを先に書く
   - `DailyNoteManager.appendToSection` のテスト作成
   - `QuickCaptureSidebarProvider` のテスト作成

2. **Green フェーズ**: テストを通す最小限の実装
   - 既存実装の修正（DailyNoteManager の optional 依存を required に変更）
   - 不足している動作の実装

3. **Refactor フェーズ**: コード品質の向上
   - 重複コードの削除
   - エラーハンドリングの改善
   - コメントとドキュメントの更新

## 残存課題

1. **ファイル競合の検出**: 複数ユーザーが同時に DailyNote を編集する場合の対応
2. **パフォーマンス最適化**: 大規模 Vault（1000+ ファイル）でのタスク収集の効率化
3. **UI 拡張**: フィルタ、検索、並べ替え機能の追加

決定日: 2025-10-30
更新日: 2025-11-07

決定者: 開発チーム
