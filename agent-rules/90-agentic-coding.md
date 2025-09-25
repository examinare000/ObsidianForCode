# 90. Agentic Coding役割分担戦略

## 🚨 必須ルール: Agentic Codingにおける役割分担

### 概要

このプロジェクトテンプレートでは、Claude、Gemini-cli、Codex MCPが協調してAgentic codingを実現します。各エージェントは明確な役割分担のもと、効率的かつ品質の高い開発を行います。

### エージェント役割分担

#### Claude（メインコーディネーター）
- **役割**: タスクマネジメント、コミュニケーション、統合判断
- **責務**:
  - ユーザー要求の分析と細分化
  - 開発タスクの優先度付けと割り当て
  - Codex MCPおよびGemini MCPへの指示作成
  - 開発結果のレビューと統合可否判断
  - ユーザーとの日本語コミュニケーション
  - developmentブランチへの統合判断

#### Codex MCP（コーディング専門）
- **役割**: 具体的なコーディング作業の実行
- **責務**:
  - Claudeから渡された開発指示の実装
  - `development/feature/xxx` ブランチでの開発
  - アトミックコミットによる変更管理
  - テスト作成と実行
  - コード品質の維持

#### Gemini-cli（調査・分析専門）
- **役割**: 情報収集、分析、技術調査
- **責務**:
  - 既存コードベースの分析
  - 技術仕様の調査
  - ベストプラクティスの検索
  - `development/research/xxx` ブランチでの調査
  - 調査結果のドキュメント化

### ワークフロー

#### 1. タスク受領・分解フェーズ
```
ユーザー要求 → Claude → タスク分解・優先度付け
```

**Claudeの責務**:
- ユーザー要求を技術的なタスクに分解
- 依存関係の整理
- 各タスクに適切なエージェントを割り当て
- TodoWriteツールでタスク管理

#### 2. 開発・調査フェーズ
```
Claude → Codex/Gemini → 個別タスク実行 → 結果報告 → Claude
```

**ブランチ戦略（既存Git戦略の拡張）**:
```bash
# 開発タスク（Codex）
git checkout develop
git checkout -b development/feature/task-name

# 調査タスク（Gemini）
git checkout develop
git checkout -b development/research/investigation-name
```

**エージェント間連携**:
- 各エージェントは独立したブランチで作業
- Claudeは進捗をモニタリング
- 必要に応じてタスクの再調整

#### 3. 統合・品質管理フェーズ
```
個別ブランチ → Claudeレビュー → developmentブランチ統合 → 最終検証
```

**Claudeの統合判断基準**:
- コード品質の確認
- テストの通過確認
- 既存機能への影響評価
- セキュリティチェック

### コミュニケーション規約

#### Claude ↔ ユーザー
- **言語**: 日本語必須
- **頻度**: 重要な判断時は必ず確認
- **内容**:
  - タスク分解結果の確認
  - 技術的選択肢の相談
  - 統合可否の報告

#### Claude ↔ Codex/Gemini
- **言語**: 英語可（技術的な指示）
- **形式**: 構造化された指示書
- **内容**:
  - 明確なタスク定義
  - 期待される成果物
  - 品質基準
  - ブランチ戦略

### ブランチ戦略の拡張

#### 既存戦略との統合
```
main (プロダクション)
├── develop (統合開発)
└── development/ (Agentic coding専用)
    ├── feature/ (Codex開発ブランチ)
    │   ├── user-auth
    │   └── payment-system
    └── research/ (Gemini調査ブランチ)
        ├── api-security-analysis
        └── performance-optimization
```

#### ブランチ命名規則
```bash
# Codex開発ブランチ
development/feature/[task-name]

# Gemini調査ブランチ
development/research/[investigation-name]

# Claude統合ブランチ（必要時）
development/integration/[integration-name]
```

### 品質保証プロセス

#### Codex開発時
```bash
# 開発完了後の必須チェック
npm test              # テスト実行
npm run lint          # 静的解析
npm run typecheck     # 型チェック

# Claudeへの報告
git push origin development/feature/task-name
# + 実装内容レポート
```

#### Gemini調査時
```bash
# 調査完了後のドキュメント化
# 調査結果をmarkdownで文書化
git add research-report.md
git commit -m "調査: [調査テーマ]の技術調査完了"

git push origin development/research/investigation-name
```

### エスカレーション規約

#### 技術的判断が必要な場合
1. Codex/GeminiからClaudeに相談
2. ClaudeがユーザーとDiscussion
3. 決定事項を全エージェントに共有

#### デッドロック発生時
1. 現状の詳細報告
2. 選択肢と影響の整理
3. ユーザーの最終判断を仰ぐ

#### 品質基準未達時
1. 自動的にタスクを差し戻し
2. 修正指示の明確化
3. 再実装・再調査の実施

### 開発効率向上施策

#### 並行作業の最大化
- 独立タスクは同時並行で実行
- ブランチ分離により競合回避
- 定期的な進捗同期

#### 知識共有の促進
- 調査結果の構造化ドキュメント化
- 開発パターンのテンプレート化
- 失敗事例のナレッジベース構築

### 緊急事態対応

#### エージェント応答不能時
1. 他のエージェントによる代替実施
2. タスク分割による負荷軽減
3. ユーザーへの状況報告

#### 統合時のコンフリクト
1. 自動マージ失敗時はClaudeが手動解決
2. 重要な変更は必ずユーザーに確認
3. 最悪時はロールバック実施

---

**適用優先度**: 🔴 最高（Agentic coding実施時は必須遵守）
**更新頻度**: エージェント性能向上に応じて適時見直し
**前提条件**: 10-git-strategy.mdの完全理解と遵守