# ObsidianForCode

ObsidianForCode は VS Code 上で Obsidian の基本機能を提供する拡張機能です。

詳細な仕様は `docs/prd/prd.md` を参照してください。

## 📋 リリース情報

最新の更新内容やバグ修正については、[リリースノート](./docs/releases/)をご確認ください。

- **最新**: v0.4.8-dev - WikiLink補完ディレクトリパス絞り込み機能

## 🚀 機能

### WikiLinkサポート
- `[[Page]]` - シンプルなWikiLink
- `[[Page|Display Name]]` - 表示名付きWikiLink
- `[[Page#Heading]]` - セクション指定WikiLink
- `[[Page#Heading|Display]]` - 複合WikiLink
- サブディレクトリ内の既存ノートを優先して解決
- Heading / Alias 入力中でも安定したWikiLink補完
- **ディレクトリパス絞り込み補完** (v0.4.8)
  - `[[folder/file]]` - 特定ディレクトリ内のファイルを絞り込み
  - `[[folder/]]` - ディレクトリ内の全ファイルをリスト
  - ネストされたパス対応 (`[[2024/01/meeting]]`)
  - ディレクトリ名マッチング（`[[proj]]` → `projects/` 内のファイルも候補に表示）

### コマンド
- **Open/Create WikiLink** (`Ctrl+Enter` / `Cmd+Enter`) - WikiLink先を開く・作成（`]]` 上のカーソルにも対応）
- **Insert Date** (`Alt+D`) - 現在の日付を挿入
- **Insert Time** (`Alt+T`) - 現在の時刻を挿入
- **Open Daily Note** - 今日の日付のデイリーノートを開く・作成
- **Preview** - Markdownプレビュー（実装予定）

### 設定
- `obsd.vaultRoot` - ノートのルートディレクトリ
- `obsd.noteExtension` - ノートファイルの拡張子 (デフォルト: `.md`)
- `obsd.slugStrategy` - ファイル名変換方法 (`passthrough`, `kebab-case`, `snake_case`)
- `obsd.dateFormat` - 日付フォーマット (デフォルト: `YYYY-MM-DD`)
- `obsd.timeFormat` - 時刻フォーマット (デフォルト: `HH:mm`)
- `obsd.template` - 新規ノートテンプレート

#### DailyNote設定
- `obsd.dailyNoteEnabled` - DailyNote機能の有効/無効 (デフォルト: `true`)
- `obsd.dailyNotePath` - デイリーノートの保存ディレクトリ (デフォルト: `dailynotes`)
- `obsd.dailyNoteTemplate` - デイリーノートテンプレートファイルパス
- `obsd.dailyNoteKeybindingGuide` - キーバインド設定方法のガイダンス (読み取り専用)

#### 拡張機能設定
- `obsd.listContinuationEnabled` - リスト自動継続機能の有効/無効 (デフォルト: `true`)
- `obsd.searchSubdirectories` - WikiLink検索時にサブディレクトリも対象にする (デフォルト: `true`)

## 🛠 開発

### 環境構築
```bash
npm install
npm run compile
```

### テスト実行
```bash
npm run test:unit        # 単体テスト (221/231成功、95.7%)
npm run test:integration # 統合テスト
```

### 拡張機能のテスト
1. F5でデバッグモードを起動
2. 新しいVS Codeインスタンスで`sample/test-document.md`を開く
3. WikiLink機能をテスト

### アーキテクチャ

#### Core Layer (VS Code非依存)
- **WikiLinkProcessor** - WikiLink解析・変換
- **ConfigurationManager** - 設定管理・検証
- **DateTimeFormatter** - 日時フォーマット
- **DailyNoteManager** - デイリーノート作成・管理
- **NoteFinder** - ノート検索・優先順位付け

#### Integration Layer (VS Code統合)
- **WikiLinkDocumentLinkProvider** - リンク検出・ナビゲーション
- **CommandHandler** - コマンド実装
- **WikiLinkContextProvider** - キーバインドコンテキスト
- **WikiLinkCompletionProvider** - WikiLink補完機能
- **ListContinuationProvider** - リスト自動継続

### 品質保証
- **Test-Driven Development** - t-wadaのTDD手法を採用
- **231個の包括的テスト** - Red-Green-Refactorサイクルで開発
- **95.7%テスト成功率** - 221/231テスト成功、10スキップ
- **依存性注入** - テスタブル設計でVS Code API抽象化
- **アイソレートテスト** - vscode依存を排除した独立テスト環境
- **グローバルモック統合** - 一元化されたVS Code APIモック

## 📚 ドキュメント

- [開発状況レポート](./docs/development-status.md) - 現在の開発状況と統計
- [アーキテクチャ決定記録 (ADR)](./docs/adr/) - 技術的意思決定の記録（17件）
- [プロダクト要件定義 (PRD)](./docs/prd/prd.md) - 機能要件と設計方針
- [詳細設計書](./docs/tech/detailed-design.md) - システムアーキテクチャ

## ✨ Quick Capture (クイックキャプチャ)

Quick Capture はサイドバーから素早くメモやタスクを取り込み、
当日のデイリーノートの指定セクションへタイムスタンプ付きで追記します。

主な機能:

- 右サイドバーからショートカットで開ける簡易入力欄
- 入力は現在の日付のデイリーノート指定セクション末尾へ追記（設定でセクション名を変更可）
- ボタン1つでVault全体から未完了チェックリストを収集し、ワンクリックで完了（元ノートに [completion: YYYY-MM-DD] を付記）

設定キー:

- `obsd.notesFolder` - ノートの格納フォルダ（デフォルト: `dailynotes`）
- `obsd.dailyNoteFormat` - デイリーノートのファイル名フォーマット（例: `YYYY-MM-DD.md`）
- `obsd.captureSectionName` - クイックキャプチャを書き込むセクション名（デフォルト: `Quick Notes`）

キーバインド:

- `Ctrl+Alt+M` (Windows) などでサイドバーをすばやく開くことが可能（`package.json`でカスタマイズ可）

簡単な使い方:

1. ショートカットで Quick Capture サイドバーを開く
2. 入力欄にメモを入力して `Add` を押すと、当日のデイリーノートに `- [ ] HH:mm — {あなたのメモ}` の形で追記されます
3. サイドバー下部の未完了タスクリストから「Complete」を押すと元ノートに完了タグが付与され一覧が更新されます

注記: これは MVP 実装です。将来的にはバックグラウンドでのインデックス作成、設定ベースの索引除外、UI改善を行う予定です。

## 🔧 開発環境対応

- **VS Code Desktop** (Windows/Mac/Linux)
- **Remote Development** (WSL/SSH/Container) 
- **workspace.fs API** 使用で環境非依存

## ライセンス

MIT License


#### Quick Capture設定
- `obsd.dailyNoteFormat` - デイリーノートのファイル名日付フォーマット (デフォルト: `yyyy-MM-dd`) - Windowsで安全な形式を使用（パス区切りは不可）
- `obsd.captureSectionName` - クイックキャプチャの追記先セクション見出し (デフォルト: `Quick Capture`)

