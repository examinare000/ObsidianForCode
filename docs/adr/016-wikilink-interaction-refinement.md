# ADR-016: WikiLink Interaction Refinement

## ステータス
採用 (Accepted)

## 文脈

v0.4 系で導入した WikiLink 機能は実用段階にあるが、以下のような操作性の問題が残っていた。

1. **Ctrl/Cmd+Enter キーが動作しないケース**  
   WikiLink の末尾 `]]` にカーソルを置いた状態では `obsd.inWikiLink` コンテキストが false になり、キーバインドが発火しなかった。
2. **サブディレクトリの既存ノートにジャンプできない**  
   DocumentLinkProvider が常に `vaultRoot` 配下の直下 URI を組み立てており、`obsd.searchSubdirectories` が有効でも既存ノートを優先しなかった。
3. **WikiLink 補完が停止する/不正確になる**  
   `[[Page#Heading]]` や `[[Page|Alias]]` の入力中にプレフィックス抽出が正しく行われず、候補ゼロやエラーが発生した。

## 決定

1. **WikiLink 範囲判定の拡張**  
   `CommandHandler#getWikiLinkAtPosition` と `WikiLinkContextProvider` のオフセット判定を、終端の `]]` 一文字目まで含むよう修正した。これにより `Ctrl/Cmd+Enter` を WikiLink 境界で押してもコンテキストが維持される。
2. **DocumentLinkResolver の導入**  
   `WikiLinkDocumentLinkProvider` を非同期化し、既存ノート解決用の `resolveLinkTarget` フックを追加。VS Code 実装では `NoteFinder.findNoteByTitle` を呼び、ヒットした場合はその URI を優先使用する。
3. **補完前処理の再設計**  
   `WikiLinkCompletionProvider` で `#` や `|` 以降を検索プレフィックスから除外し、別名セクションにカーソルがある場合は補完を停止。差し替え範囲も `#`/`|` 直前までに限定した。
4. **テスト強化**  
   上記仕様を保証する単体テストを追加し、境界ケースの回帰を防ぐ。

## 根拠

- ユーザー操作の直感性を維持しつつ、Obsidian の動作を忠実に再現する必要がある。
- 既存ノートがサブディレクトリにある場合でも正確にジャンプできることは、Vault 構成の自由度を高める上で必須。
- エイリアスやセクション付きリンクは Obsidian で頻出するため、補完停止や誤置換は UX を著しく損ねる。

## 影響

### プラス
- `Ctrl/Cmd+Enter` が WikiLink 境界で確実に動作。
- サブディレクトリ配置ノートへのジャンプ精度が向上。
- Heading/Alias を含む WikiLink 補完が安定し、候補が適切に提示される。
- 追加テストにより境界条件の回帰リスクが低減。

### マイナス
- DocumentLinkProvider が非同期となり、VS Code API 呼び出しが増える。ただし効果は限定的。

### フォローアップ
- マルチルートワークスペースでの `resolveLinkTarget` 戦略検証。
- Heading/Alias を含む候補の挿入 UX（例えば候補側で `[[Page#Heading]]` を組み立てるか）の検討。
