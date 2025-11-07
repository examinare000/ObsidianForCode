# ADR-003: WikiLink Parsing Strategy

## Status
Accepted

## Date
2025-09-09

## Context
ObsidianのWikiLink形式（`[[Page]]`, `[[Page|Display]]`, `[[Page#Heading]]`）を正確に解析し、VS CodeのDocumentLinkProviderで活用する必要がある。パースエラーの処理、エッジケースの対応、拡張性も考慮が必要。

## Decision
段階的解析アプローチを採用し、以下の戦略で実装する：

1. **段階的パターンマッチング**
   ```typescript
   if (this.isAliasLink(trimmedLinkText)) {
       return this.parseAliasLink(trimmedLinkText);
   }
   if (this.isHeadingLink(trimmedLinkText)) {
       return this.parseHeadingLink(trimmedLinkText);
   }
   return this.parseSimpleLink(trimmedLinkText);
   ```

2. **正規表現による厳密な検証**
   - 別名リンク: `/^([^|]+)\|(.+)$/`
   - 見出しリンク: `/^([^#]+)#(.+)$/`
   - 複合パターン: `/^([^#]+)#(.+)$/` 内での `|` チェック

3. **エラーハンドリング戦略**
   - `WikiLinkError` による明示的なエラー型
   - 不正な形式は例外として扱い、呼び出し側でcatchして無視
   - 空文字や不完全なリンクは即座にエラー

4. **ファイル名変換の分離**
   - パースとファイル名変換を独立した責務として分離
   - slug strategy（passthrough, kebab-case, snake_case）を設定可能

## Consequences

### Positive
- **精度向上**: 段階的解析により複雑なパターンも正確に処理
- **保守性**: 各パターンの処理ロジックが独立して読みやすい
- **拡張性**: 新しいWikiLinkパターンの追加が容易
- **エラー処理**: 不正な入力に対する適切なエラーハンドリング
- **テスト容易性**: 各段階を独立してテスト可能

### Negative
- **パフォーマンス**: 複数の正規表現チェックによる若干のオーバーヘッド
- **コード量**: シンプルな一発正規表現に比べコード量増加

### Neutral
- **Obsidian互換性**: Obsidianの実際の動作に近い解析結果を提供
- **VS Code統合**: DocumentLinkProviderとの親和性が高い
