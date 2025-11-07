# ADR-012: Extension Activation Fix

## ステータス
採用済み

## 日付
2025-09-22

## 背景

VS Code拡張機能の起動時に以下のエラーが発生していた：

```
Error: Cannot find module 'c:\Users\RYOIKEDA\Documents\training\MDloggerForCode\out\src\extension.js'
```

エラーログから、VS Codeが`mdlg.openDailyNote`コマンドの実行時に拡張機能を起動しようとしているが、package.jsonの`activationEvents`にこのコマンドが含まれていないことが判明した。

## 問題分析

1. **症状**: 特定のコマンド実行時に拡張機能の起動が失敗
2. **原因**: package.jsonの`activationEvents`に`onCommand:mdlg.openDailyNote`が欠落
3. **影響範囲**: DailyNote機能の完全な動作不能

## 解決策

package.jsonの`activationEvents`配列に`"onCommand:mdlg.openDailyNote"`を追加：

```json
"activationEvents": [
  "onLanguage:markdown",
  "onCommand:mdlg.openOrCreateWikiLink",
  "onCommand:mdlg.insertDate",
  "onCommand:mdlg.insertTime",
  "onCommand:mdlg.preview",
  "onCommand:mdlg.openDailyNote"  // 追加
]
```

## 考慮した代替案

1. **コマンド削除**: DailyNote機能自体を削除する案
   - 却下理由: 機能として必要性があり、既存ユーザーの期待機能

2. **遅延起動**: 他のイベントで起動後にコマンドを有効化する案
   - 却下理由: UXが悪化し、設定による条件付き機能との整合性が悪い

## 結果

- 拡張機能が全てのコマンドで正常に起動するようになった
- DailyNote機能が期待通りに動作するようになった
- 追加のオーバーヘッドなし（既存の起動メカニズムの完成）

## 実装詳細

### 変更ファイル
- `package.json`: activationEvents配列への要素追加

### テスト戦略
- コンパイル成功の確認
- 各コマンドでの起動テスト
- 既存機能への回帰影響なし

## 今後の考慮事項

1. **新コマンド追加時の確認**: 今後新しいコマンドを追加する際は、activationEventsの更新を必須とする
2. **起動イベント監査**: 定期的にactivationEventsとcontributes.commandsの整合性をチェックする
3. **自動テスト**: CI/CDで起動イベントと実装の整合性をチェックするテストの追加検討

## 関連ドキュメント

- [VS Code Extension Activation Events](https://code.visualstudio.com/api/references/activation-events)
- ADR-008: DailyNote機能設計
- ADR-009: 設定可能なDailyNote機能
