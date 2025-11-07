# ADR-005: Component Architecture Design

## Status
Accepted

## Date
2025-09-09

## Context
MDloggerForCode Extensionの機能は多岐にわたり（WikiLink処理、設定管理、日時フォーマット、VS Code統合）、適切な責務分離とモジュール設計が品質と保守性に直結する。また、TDDアプローチを効果的に適用するため、テスタブルな設計が必須。

## Decision
レイヤード・アーキテクチャを採用し、以下のコンポーネント構成で実装する：

## アーキテクチャ概要
```
┌─────────────────────────────────────────┐
│           VS Code Integration Layer      │
├─────────────────────────────────────────┤
│  DocumentLinkProvider │  CommandHandler │
├─────────────────────────────────────────┤
│              Core Business Logic         │  
├─────────────────────────────────────────┤
│ WikiLinkProcessor │ ConfigManager │ DTF │
├─────────────────────────────────────────┤
│              Utility Layer               │
├─────────────────────────────────────────┤
│        Pure Functions & Interfaces      │
└─────────────────────────────────────────┘
```

## コンポーネント定義

### 1. Core Layer（VS Code非依存）
- **WikiLinkProcessor**: WikiLink解析・変換ロジック
- **ConfigurationManager**: 設定値管理・検証
- **DateTimeFormatter**: 日時フォーマット処理

### 2. Integration Layer（VS Code依存）
- **WikiLinkDocumentLinkProvider**: VS Code DocumentLinkProvider実装
- **CommandHandler**: VS Code Command実装

### 3. Design Principles
1. **Dependency Inversion**: 上位レイヤーは下位レイヤーの抽象に依存
2. **Single Responsibility**: 各コンポーネントは単一の責務を持つ
3. **Interface Segregation**: 必要最小限のインターフェースで結合
4. **Testability**: DIによるモック注入でテスト容易性を確保

## Consequences

### Positive
- **責務明確化**: 各コンポーネントの役割が明確
- **テスト容易性**: レイヤー別の独立テストが可能
- **再利用性**: Core Layerは他のエディタでも利用可能
- **保守性**: 機能追加・修正の影響範囲が限定的
- **並行開発**: コンポーネント間の独立性により並行開発可能

### Negative
- **複雑性**: 設計上のオーバーヘッドが発生
- **学習コスト**: アーキテクチャの理解が必要
- **初期コスト**: インターフェース設計に時間が必要

### Neutral
- **拡張性**: 新機能追加時の設計パターンが確立
- **品質保証**: アーキテクチャレベルでの品質担保

## Implementation Guidelines
1. Core Layerは`vscode`モジュールをimportしない
2. Integration LayerでDependency Injectionを使用
3. 各レイヤーで包括的なユニットテストを作成
4. インターフェースファーストで設計を進める
