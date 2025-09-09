# ADR-001: Test-Driven Development Approach

## Status
Accepted

## Date
2025-09-09

## Context
ObsidianForCode VS Code extensionの開発において、高品質で保守性の高いコードベースを構築する必要がある。VS Code extension開発では、API依存により単体テストが困難になりがちで、リファクタリングや機能拡張時の回帰バグのリスクが高い。

## Decision
t-wadaの提唱するTDD（Test-Driven Development）を厳格に適用し、以下の原則に従って開発を進める：

1. **Red-Green-Refactor サイクルの徹底**
   - 必ず失敗するテストを先に書く（RED）
   - テストをパスする最小限のコードを実装（GREEN）
   - テストをパスしたままコードを改善（REFACTOR）

2. **テスタブル設計の採用**
   - VS Code APIに直接依存しない純粋な関数・クラスを作成
   - 依存性注入（DI）によるモック可能な構造
   - インターフェース分離によるテスト容易性の確保

3. **コンポーネント分離**
   - `WikiLinkProcessor`: WikiLink解析ロジック（VS Code非依存）
   - `ConfigurationManager`: 設定管理（VS Code Configuration API対応）
   - `DateTimeFormatter`: 日時フォーマット（純粋関数）
   - VS Code統合レイヤー：`DocumentLinkProvider`, `CommandHandler`

## Consequences

### Positive
- **品質保証**: 76個の包括的なテストによる動作保証
- **リファクタリング安全性**: テストがあることで安心してコード改善可能
- **デバッグ効率**: 問題の局所化が容易
- **ドキュメント効果**: テストが仕様書として機能
- **回帰防止**: 機能追加時の既存機能破壊を防止

### Negative
- **初期開発コスト**: テスト作成により開発時間が増加
- **学習コスト**: TDD手法の習得が必要
- **設計複雑性**: テスタブル設計のため若干の複雑性増加

### Neutral
- **保守性向上**: 長期的な保守コスト削減
- **品質 vs 速度**: 短期的な開発速度を犠牲に長期的な品質を選択