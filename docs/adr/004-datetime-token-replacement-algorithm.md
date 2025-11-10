# ADR-004: DateTime Token Replacement Algorithm

## Status
Accepted

## Date
2025-09-09

## Context
DateTimeFormatterにおいて、フォーマット文字列内のトークン（YYYY, MM, DD等）を日付値で置換する際に、トークン間の衝突問題が発生。例えば「DAY_NAME YYYY-MM-DD」において、「A」が「DAY_NAME」内の「A」と衝突し、意図しない置換が発生する。

## Decision
文字配列ベースの逐次解析アルゴリズムを採用し、以下の戦略で実装する：

1. **文字単位の逐次解析**
   ```typescript
   private applyFormatTokens(date: Date, format: string): string {
       const chars = format.split('');
       const result: string[] = [];
       let i = 0;
       
       while (i < chars.length) {
           const matchedToken = this.findMatchingToken(chars, i, tokenMappings);
           if (matchedToken) {
               result.push(matchedToken.value);
               i += matchedToken.token.length;
           } else {
               result.push(chars[i]);
               i++;
           }
       }
   }
   ```

2. **最長マッチ優先**
   - トークンを長さの降順でソート
   - 現在位置から最長マッチするトークンを優先選択
   - 部分マッチによる誤検出を防止

3. **位置ベース検索**
   - プレースホルダー方式を廃止（置換の置換問題を根本回避）
   - 文字列置換ではなく配列操作による安全な処理

## Consequences

### Positive
- **正確性**: トークン間の衝突を完全に回避
- **予測可能性**: 入力に対する出力が一意に決定
- **拡張性**: カスタムトークンの追加が安全
- **デバッグ容易性**: 逐次処理により問題箇所の特定が容易

### Negative
- **パフォーマンス**: 文字単位処理により正規表現より若干低速
- **メモリ使用**: 配列操作による一時的なメモリ増加

### Neutral
- **複雑性**: アルゴリズムの複雑性は中程度
- **保守性**: ロジックが明確で理解しやすい

## Alternatives Considered

1. **プレースホルダー方式**: 一意なプレースホルダーで一時置換後に最終置換
   - 問題: プレースホルダー自体が再置換される可能性
   
2. **複雑な正規表現**: 単一の正規表現で全パターンを処理
   - 問題: 可読性低下、エッジケースの対応困難

3. **位置追跡方式**: 置換済み位置を記録して重複を回避
   - 問題: 実装複雑性とバグ混入リスク
