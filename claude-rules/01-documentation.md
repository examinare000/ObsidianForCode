# 01. ドキュメント管理ルール

## ドキュメント構造

### 基本構造
- **PRD (Product Requirements Document)**: `docs/prd/` 配下に作成
- **ADR (Architecture Decision Records)**: `docs/adr/` 配下に作成
- **技術文書**: `docs/tech/` 配下に作成
- **運用文書**: `docs/operations/` 配下に作成

### ドキュメント作成ルール

#### PRD (Product Requirements Document)
- `docs/prd/` ディレクトリに配置
- ファイル名: 内容がわかりやすい命名（例：`main-features.md`, `mvp-requirements.md`）
- 日本語で記述
- 機能要件、非機能要件、受け入れ基準を含む

#### ADR (Architecture Decision Records)
- `docs/adr/` ディレクトリに配置
- ファイル名: 連番 + 内容（例：`001-initial-architecture.md`, `002-testing-strategy.md`）
- 決定の背景、検討した選択肢、決定理由、結果を含む
- 日本語で記述

#### その他のドキュメント
- 技術仕様書: `docs/tech/`
- API仕様書: `docs/api/`
- 運用手順書: `docs/operations/`
- ユーザーガイド: `docs/user/`

## ファイル命名規則

### ADR
```
001-initial-architecture.md
002-testing-framework-selection.md  
003-deployment-strategy.md
```

### PRD
```
main-requirements.md
mvp-features.md
performance-requirements.md
```

### 技術文書
```
api-specification.md
database-schema.md
deployment-guide.md
```

## ドキュメントのメンテナンス

### 更新頻度
- PRD: 要件変更時に即座に更新
- ADR: アーキテクチャ決定時に作成、変更時は新しいADRで対応
- 技術文書: 実装変更時に同期して更新

### 品質基準
- 目的が明確であること
- 読み手のレベルに適した内容であること
- 実際の実装と乖離していないこと
- 日本語で記述されていること

## Claude Code での扱い

- ドキュメント作成要求時は必ず適切な `docs/` 配下に配置
- 既存ドキュメントの参照時は正しいパスを使用
- ドキュメント更新時は関連ファイルとの整合性を確認

---

**適用優先度**: 🟡 高（ドキュメント作成・更新時に適用必須）
**更新頻度**: プロジェクト進行に応じて随時見直し