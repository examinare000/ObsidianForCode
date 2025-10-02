# ADR-017: Markdownリスト継続機能の廃止

## Status
Accepted

## Date
2025-10-02

## Context
ObsidianForCodeには、Enterキー押下時にMarkdownリストを自動継続する機能（`ListContinuationProvider`）が実装されている。この機能は以下のような動作を提供していた：

- 箇条書きリスト（`-`, `*`, `+`）の自動継続
- 番号付きリスト（`1.`, `2.`, ...）の自動継続
- チェックボックス（`- [ ]`, `- [x]`）の自動継続

しかし、以下の理由により本機能の廃止を決定した：

1. **VSCode標準機能との重複**: VSCode 1.103.0以降、Markdown拡張機能が同様の機能を提供している
2. **機能範囲の明確化**: ObsidianForCodeの core valueは「WikiLink機能」と「Obsidian風ノート管理」であり、Markdown編集支援は本質的な価値ではない
3. **保守負担の削減**: リスト継続機能は実装が複雑で、エッジケース対応に多くのテストケースが必要
4. **ユーザー混乱の回避**: VSCode標準機能とObsidianForCodeの機能が競合し、予期しない動作を引き起こす可能性がある

## Decision
`ListContinuationProvider`機能を完全に削除する。

### 削除対象
1. **ソースコード**
   - `src/providers/ListContinuationProvider.ts`
   - 関連するテストファイル

2. **設定**
   - `package.json`から`obsd.handleEnterKey`コマンドを削除
   - `package.json`からEnterキーのキーバインドを削除
   - `obsd.listContinuationEnabled`設定を削除

3. **extension.ts**
   - `ListContinuationProvider`の初期化・登録コードを削除

### 残すもの
- リスト継続機能のテストコード（削除の証跡として、skipマーク付きで保持）
- ADR-017（本ドキュメント）による削除理由の記録

## Implementation Plan
1. `ListContinuationProvider`関連コードの削除
2. `package.json`から関連設定とコマンドを削除
3. `extension.ts`から初期化コードを削除
4. 全テストを実行し、削除による副作用がないことを確認
5. ドキュメント（README.md）からリスト継続機能の説明を削除

## Consequences

### Positive
- **保守負担削減**: 複雑なリスト継続ロジックのメンテナンスが不要に
- **機能衝突の回避**: VSCode標準Markdown拡張との競合を回避
- **コードベース簡素化**: 約500行のコードとテストを削減
- **焦点の明確化**: WikiLink機能に開発リソースを集中できる

### Negative
- **機能削減**: リスト継続を期待していた既存ユーザーへの影響
- **移行期の混乱**: 機能削除の告知とVSCode標準機能への移行案内が必要

### Neutral
- **代替手段**: VSCode標準のMarkdown拡張機能（またはサードパーティMarkdown拡張）で同等機能を提供可能
- **後方互換性**: 設定ファイルに`obsd.listContinuationEnabled`が残っていても無害（単に無視される）

## Migration Guide
ユーザーへの移行案内：

### VSCode標準Markdown拡張の使用
1. VSCodeに標準搭載されているMarkdown拡張を有効化
2. 設定で`markdown.extension.list.indentationSize`を調整可能
3. より高度なリスト編集機能が必要な場合は、"Markdown All in One"拡張の使用を推奨

### 設定ファイルのクリーンアップ（オプション）
`.vscode/settings.json`や`settings.json`から以下を削除可能：
```json
{
  "obsd.listContinuationEnabled": false  // 削除可能
}
```

## Notes
- リスト継続機能は多くのMarkdownエディタで提供される標準機能であり、専用拡張を使用する方が適切
- ObsidianForCodeは「ObsidianスタイルのWikiLink」という unique value proposition に集中すべき
- WikiLink補完機能の強化（ADR-016）と同時に実装し、機能の入れ替えを明確にする
