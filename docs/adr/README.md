# Architecture Decision Records (ADR)

このディレクトリには、ObsidianForCode VS Code extensionの開発において下された重要な技術的決定を記録したADR（Architecture Decision Record）が含まれています。

## ADR一覧

| ID | タイトル | ステータス | 日付 | 概要 |
|----|----------|------------|------|------|
| [001](./001-test-driven-development-approach.md) | Test-Driven Development Approach | Accepted | 2025-09-09 | t-wadaのTDD手法の採用とRed-Green-Refactorサイクルの実践 |
| [002](./002-vs-code-api-abstraction-layer.md) | VS Code API Abstraction Layer | Accepted | 2025-09-09 | VS Code APIの抽象化による単体テスト可能性の確保 |
| [003](./003-wikilink-parsing-strategy.md) | WikiLink Parsing Strategy | Accepted | 2025-09-09 | ObsidianのWikiLink形式の段階的解析アプローチ |
| [004](./004-datetime-token-replacement-algorithm.md) | DateTime Token Replacement Algorithm | Accepted | 2025-09-09 | トークン衝突を回避する文字配列ベース置換アルゴリズム |
| [005](./005-component-architecture-design.md) | Component Architecture Design | Accepted | 2025-09-09 | レイヤードアーキテクチャによる責務分離設計 |
| [006](./006-configuration-management-strategy.md) | Configuration Management Strategy | Accepted | 2025-09-09 | 型安全な設定管理とValidation Layerの実装 |

## ADR作成ガイドライン

新しいADRを作成する際は、以下のテンプレートを使用してください：

```markdown
# ADR-XXX: [Decision Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Date
YYYY-MM-DD

## Context
[決定が必要になった背景と問題]

## Decision
[採用した解決策]

## Consequences
### Positive
- [正の影響]

### Negative
- [負の影響]

### Neutral
- [中立的な影響]
```

## 参考リンク
- [Architecture Decision Records の書き方](https://github.com/joelparkerhenderson/architecture-decision-record)
- [TDD については t-wada のガイドライン](https://github.com/testdouble/contributing-tests/wiki/Test-Driven-Development)