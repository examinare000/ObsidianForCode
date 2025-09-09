# ADR-002: VS Code API Abstraction Layer

## Status
Accepted

## Date
2025-09-09

## Context
VS Code extension開発において、直接VS Code APIに依存すると単体テストが困難になる。`vscode`モジュールはNode.js環境での実行時にインポートエラーが発生し、モック作成も複雑化する。また、VS Code APIの変更に対する柔軟性も必要。

## Decision
VS Code APIの抽象化レイヤーを導入し、以下の設計パターンを採用する：

1. **ファクトリ関数による依存性注入**
   ```typescript
   export class WikiLinkDocumentLinkProvider {
     createRange?: (start: any, end: any) => any;
     createUri?: (path: string) => any;
     createDocumentLink?: (range: any, target?: any) => DocumentLink;
   }
   ```

2. **インターフェース定義によるAPI抽象化**
   ```typescript
   interface TextDocument {
     uri: any;
     languageId: string;
     getText(): string;
     positionAt(offset: number): Position;
   }
   ```

3. **テスト用とプロダクション用の実装分離**
   - テスト環境：モッククラスによる実装
   - 本番環境：VS Code APIによる実装（別途作成予定）

## Consequences

### Positive
- **テスト可能性**: 完全にNode.js環境でテスト実行可能
- **API独立性**: VS Code APIの変更影響を局所化
- **開発効率**: VS Code拡張機能の起動なしでテスト実行
- **CI/CD適合**: 自動化パイプラインでの実行が容易

### Negative
- **設計複雑性**: 抽象化レイヤーによる若干の複雑性増加
- **実装二重化**: テスト用とプロダクション用の実装が必要
- **型安全性**: `any`型の使用による一部型安全性の妥協

### Neutral
- **学習コスト**: 依存性注入パターンの理解が必要
- **メンテナンス**: 抽象化レイヤーの保守が必要