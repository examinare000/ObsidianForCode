# ADR-008: DailyNote機能設計

## ステータス
提案中

## 文脈
Obsidianの重要機能の一つである「Daily Note」機能をVS Code拡張機能として実装する必要がある。ユーザーが簡単に日次ノートを作成・開設できる機能を提供し、一貫したドキュメント管理ワークフローを支援する。

## 要件定義

### 機能要件
1. **コマンド実行による開設**
   - ショートカットキー実行でDailyNote開く
   - 本日日付のファイルを自動的に特定・開設

2. **自動ファイル作成**
   - `YYYY-MM-DD.md` 形式のファイル名
   - 指定ディレクトリ内に作成
   - 既存ファイルがある場合はそのまま開く

3. **テンプレート機能**
   - 設定されたテンプレートファイルを読み込み
   - テンプレート未設定時はブランクファイル
   - テンプレート読み込み失敗時のフォールバック

4. **ユーザビリティ**
   - 常に新しいタブで開く
   - エラーメッセージの適切な表示

### 非機能要件
1. **パフォーマンス**: ファイル作成・開設 < 200ms
2. **信頼性**: テンプレート読み込み失敗への適切な対処
3. **拡張性**: 将来的な日付フォーマット拡張対応
4. **保守性**: 既存アーキテクチャとの整合性維持

## 決定

### アーキテクチャ決定

#### 1. DailyNoteManager クラス設計
```typescript
class DailyNoteManager {
    constructor(
        private configManager: ConfigurationManager,
        private dateTimeFormatter: DateTimeFormatter
    )

    // 本日のDailyNoteファイル名生成
    getDailyNoteFileName(date: Date): string

    // DailyNoteファイルパス解決
    getDailyNotePath(workspaceFolder: vscode.WorkspaceFolder, date: Date): vscode.Uri

    // テンプレート内容読み込み
    getTemplateContent(workspaceFolder: vscode.WorkspaceFolder): Promise<string>

    // DailyNote開設・作成メイン処理
    openOrCreateDailyNote(workspaceFolder: vscode.WorkspaceFolder, date?: Date): Promise<void>
}
```

#### 2. ConfigurationManager 拡張
```typescript
interface DailyNoteConfig {
    getDailyNoteTemplate(): string;    // デフォルト: ''
    getDailyNotePath(): string;        // デフォルト: 'dailynotes'
    getDateFormat(): string;           // 既存設定を流用
}
```

#### 3. コマンド統合
- コマンド名: `obsd.openDailyNote`
- キーバインド: `Ctrl+Shift+D` (Mac: `Cmd+Shift+D`)
- 既存extension.tsに統合

### 実装戦略

#### Phase 1: TDD基盤構築
1. **Red**: 失敗テストケース作成
   - ファイル名生成テスト
   - パス解決テスト
   - テンプレート読み込みテスト
   - ファイル作成・開設テスト

2. **Green**: 最小実装
   - DailyNoteManagerクラス骨格
   - 各メソッドの最小実装
   - テスト通過のための最低限コード

3. **Refactor**: 設計改善
   - エラーハンドリング強化
   - パフォーマンス最適化
   - コード品質向上

#### Phase 2: 統合・テスト
1. ConfigurationManagerへの設定追加
2. extension.tsへのコマンド統合
3. package.jsonへの設定・コマンド定義
4. 統合テスト実行

### 設定項目詳細

```json
{
  "obsd.dailyNoteTemplate": {
    "type": "string",
    "default": "",
    "description": "Daily note template file path (relative to vault root)"
  },
  "obsd.dailyNotePath": {
    "type": "string",
    "default": "dailynotes",
    "description": "Daily notes directory path (relative to vault root)"
  }
}
```

## 結果

### 期待される効果
1. **生産性向上**: ワンクリックでの日次ノート開始
2. **一貫性**: 統一されたファイル命名・配置規則
3. **カスタマイズ性**: ユーザー独自のテンプレート活用
4. **Obsidian互換性**: 既存Obsidianユーザーの移行支援

### 実装上の考慮事項
1. **ファイルシステム操作**: VS Code workspace.fs API活用
2. **エラーハンドリング**: ファイル読み書き失敗への対処
3. **パス解決**: 相対パス・絶対パスの適切な処理
4. **タイムゾーン**: 日付計算におけるローカル時間の考慮

### テスト戦略
1. **Unit Tests**: 各メソッドの単体テスト
2. **Integration Tests**: VS Code API連携テスト
3. **Edge Cases**: テンプレート不存在、権限エラー等
4. **Performance Tests**: ファイル作成速度の検証

## トレードオフ

### 採用した設計
- **利点**: 既存アーキテクチャとの整合性、テスト容易性
- **欠点**: クラス数増加、若干の複雑性

### 代替案：extension.ts直接実装
- **利点**: シンプルな実装
- **欠点**: テスト困難、保守性低下、責務混在

### 代替案：プラグインアーキテクチャ
- **利点**: 高い拡張性
- **欠点**: 過度な複雑性、要件に対してオーバーエンジニアリング

## 今後の考慮事項
1. **週次・月次ノート**: 将来的な期間ノート機能拡張
2. **テンプレート変数**: `{{date}}`, `{{title}}` 等の動的置換
3. **ファイル連携**: 既存WikiLink機能との統合強化
4. **UI/UX**: サイドバーパネルでの日付選択機能

---

**承認者**: [TBD]
**レビュー日**: 2025-09-18
**実装予定**: Phase 1 - 2025-09-18