# ObsidianForCode

ObsidianForCode は VS Code 上で Obsidian の基本機能を提供する拡張機能です。

詳細な仕様は `docs/prd/prd.md` を参照してください。

## 📋 リリース情報

最新の更新内容やバグ修正については、[リリースノート](./docs/releases/)をご確認ください。

- **最新**: v0.4.5-dev - テスト品質向上 (95.6%成功率達成)

## 🚀 機能

### WikiLinkサポート
- `[[Page]]` - シンプルなWikiLink
- `[[Page|Display Name]]` - 表示名付きWikiLink  
- `[[Page#Heading]]` - セクション指定WikiLink
- `[[Page#Heading|Display]]` - 複合WikiLink

### コマンド
- **Open/Create WikiLink** (`Ctrl+Enter` / `Cmd+Enter`) - WikiLink先を開く・作成
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
npm run test:unit        # 単体テスト (215/225成功、95.6%)
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
- **225個の包括的テスト** - Red-Green-Refactorサイクルで開発
- **95.6%テスト成功率** - 215/225テスト成功、10スキップ
- **依存性注入** - テスタブル設計でVS Code API抽象化
- **アイソレートテスト** - vscode依存を排除した独立テスト環境
- **グローバルモック統合** - 一元化されたVS Code APIモック

## 📚 ドキュメント

- [開発状況レポート](./docs/development-status.md) - 現在の開発状況と統計
- [アーキテクチャ決定記録 (ADR)](./docs/adr/) - 技術的意思決定の記録（15件）
- [プロダクト要件定義 (PRD)](./docs/prd/prd.md) - 機能要件と設計方針
- [詳細設計書](./docs/tech/detailed-design.md) - システムアーキテクチャ

## 🔧 開発環境対応

- **VS Code Desktop** (Windows/Mac/Linux)
- **Remote Development** (WSL/SSH/Container) 
- **workspace.fs API** 使用で環境非依存

## ライセンス

MIT License