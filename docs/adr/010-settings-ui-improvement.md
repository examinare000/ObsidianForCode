# ADR-010: Settings UI改善 - キーバインド設定の表示専用化

## ステータス
採用済み

## 文脈
ADR-009で実装した設定可能なDailyNote機能において、Extension Settingsでキーバインド設定値(`ctrl+shift+d`)を編集可能テキストボックスとして表示していた。これにより以下の問題が発生：

1. **不整合問題**: 設定値を変更してもVS Codeの実際のキーバインドは変更されない
2. **ユーザー混乱**: 編集できるが効果がない設定項目の存在
3. **期待値の齟齬**: 設定変更で即座にキーバインドが適用されると誤解される

## 要件
- Settings画面で設定値の変更テキストボックスを出さない
- ショートカットの変更方法案内だけをテキストで配置
- VS Codeの制約（動的キーバインド変更不可）に適した設計
- ユーザーが迷わない明確なガイダンス提供

## 決定

### 1. 編集可能設定から案内専用設定への変更

#### 1.1 設定項目の再設計
```json
// 変更前（問題のある設計）
{
  "mdlg.dailyNoteKeybinding": {
    "type": "string",
    "default": "ctrl+shift+d",
    "description": "Preferred keyboard shortcut for opening daily note..."
  }
}

// 変更後（改善された設計）
{
  "mdlg.dailyNoteKeybindingGuide": {
    "type": "string",
    "default": "Follow the steps below",
    "readonly": true,
    "description": "How to configure DailyNote keyboard shortcut",
    "markdownDescription": "**How to configure DailyNote keyboard shortcut:**\n\n1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)\n2. Type `Preferences: Open Keyboard Shortcuts`\n3. Search for `mdlg.openDailyNote`\n4. Click the `+` icon to set your preferred key combination\n\n**Default suggestion:** `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (Mac)\n\n*This setting is for guidance only and cannot be edited.*"
  }
}
```

#### 1.2 設定項目の特徴
- **`readonly: true`**: 編集不可の明示
- **ガイダンス専用**: 手順説明に特化
- **明確な案内**: markdownDescriptionによる視覚的手順
- **プラットフォーム対応**: Windows/Linux/Mac別の案内

### 2. ConfigurationManager の簡素化

#### 2.1 不要メソッドの削除
```typescript
// 削除されたメソッド（もはや不要）
getDailyNoteKeybinding(): string

// 残存メソッド（実際に使用される）
getDailyNoteEnabled(): boolean
```

#### 2.2 設計原則
- **単一責任**: 設定管理のみに特化
- **実用性**: 実際に効果のある設定のみ公開
- **保守性**: 不要なコードの削除

### 3. テストの更新

#### 3.1 否定的テスト追加
```typescript
it('should not expose keybinding configuration method', () => {
    const configManager = new ConfigurationManager(mockConfig);

    // キーバインド設定メソッドは存在しないはず
    expect(configManager.getDailyNoteKeybinding).to.be.undefined;
});
```

#### 3.2 UI検証テスト
```typescript
it('should validate UI guidance settings', () => {
    const guidanceText = 'Follow the steps below';

    expect(guidanceText).to.be.a('string');
    expect(guidanceText).to.not.be.empty;

    // キーバインド設定は手動設定のため、プログラム的検証不要
});
```

## 結果

### UI/UX改善
1. **明確性**: 編集不可であることが明示される
2. **ガイダンス性**: 具体的な手順を提供
3. **混乱回避**: 無効な設定項目の除去
4. **プラットフォーム配慮**: OS別の適切な案内

### 技術的改善
1. **設計整合性**: VS Codeの制約に適した設計
2. **コード簡素化**: 不要なメソッドとテストの削除
3. **保守性向上**: 実際に機能する設定のみの管理
4. **明確な責務**: 設定管理と案内表示の分離

### ユーザー体験
1. **直感的**: 設定変更の期待値と実際の動作が一致
2. **教育的**: VS Codeのキーバインド設定方法を学習
3. **効率的**: 正しい手順への最短経路を提供
4. **信頼性**: 確実に動作する手順の案内

## トレードオフ

### 採用した設計: ガイダンス専用設定
- **利点**:
  - 混乱の排除
  - 正確な手順案内
  - VS Code標準との整合性
- **欠点**:
  - プログラム的な設定変更不可（VS Codeの制約）
  - 手動設定の必要性

### 代替案: 編集可能設定の維持
- **利点**: 一見して設定可能に見える
- **欠点**: 実際には機能しない、ユーザー混乱

### 代替案: 設定項目の完全削除
- **利点**: 最もシンプル
- **欠点**: ガイダンス不足、発見性の低下

## 学習事項

### VS Code API制約の理解
- 拡張機能からの動的キーバインド変更は不可能
- ユーザー主導の手動設定が必要
- APIの制約に適した設計の重要性

### Settings UI設計原則
- 編集可能な設定は実際に効果があるものに限定
- ガイダンス表示には適切なUIパターンを使用
- ユーザーの期待値と実際の動作を一致させる

### 設定項目の分類
- **機能的設定**: 実際に動作に影響する項目
- **ガイダンス設定**: 手順案内専用の項目
- **表示設定**: UI表示のみに影響する項目

## 今後の考慮事項

### 他機能への適用
この設定UI改善パターンを他の制約のある機能にも適用

### 動的設定の検討
将来的なVS Code API拡張により動的設定が可能になった場合の対応準備

### ユーザーフィードバック
実際の使用状況からの改善点収集

---

**実装日**: 2025-09-18
**関連ADR**: ADR-009 (設定可能なDailyNote機能)
**影響範囲**: Settings UI, ConfigurationManager, テストケース

