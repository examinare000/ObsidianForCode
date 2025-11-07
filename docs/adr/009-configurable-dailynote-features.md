# ADR-009: 設定可能なDailyNote機能

## ステータス
採用済み

## 文脈
DailyNote機能の初期実装（ADR-008）では、機能が常に有効でキーバインドが固定されていた。ユーザーからの要望により、以下の設定可能性を追加する必要がある：

1. **機能の有効/無効切り替え**: DailyNote機能全体をオン/オフできる
2. **キーバインドの設定可能性**: ユーザーが好みのキーバインドを設定できる

## 要件
- DailyNote機能を任意機能（Setting のトグルで on/off 切り替え可能）にする
- DailyNote のショートカットを Setting で変更可能にする
- 既存機能への影響を最小限に抑える
- 設定変更時の動的な動作変更への配慮

## 決定

### 1. 設定項目の追加

#### 1.1 機能有効/無効トグル
```json
{
  "mdlg.dailyNoteEnabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable or disable DailyNote functionality"
  }
}
```

#### 1.2 キーバインド案内設定
```json
{
  "mdlg.dailyNoteKeybinding": {
    "type": "string",
    "default": "ctrl+shift+d",
    "description": "Preferred keyboard shortcut for opening daily note...",
    "markdownDescription": "Preferred keyboard shortcut for opening daily note.\n\n**To set this:**\n1. Open Command Palette (`Ctrl+Shift+P`)\n2. Type `Preferences: Open Keyboard Shortcuts`\n3. Search `mdlg.openDailyNote`\n4. Set your preferred key combination"
  }
}
```

### 2. ConfigurationManager の拡張

```typescript
export class ConfigurationManager {
    // 既存メソッド...

    getDailyNoteEnabled(): boolean {
        return this.config.get<boolean>('dailyNoteEnabled', true);
    }

    getDailyNoteKeybinding(): string {
        return this.config.get<string>('dailyNoteKeybinding', 'ctrl+shift+d');
    }
}
```

### 3. 条件付き機能登録

#### 3.1 DailyNoteManager の条件付き初期化
```typescript
// DailyNote Manager初期化（設定により条件付き）
let dailyNoteManager: DailyNoteManager | undefined;
if (configManager.getDailyNoteEnabled()) {
    try {
        dailyNoteManager = new DailyNoteManager(configManager, dateTimeFormatter);
    } catch (error) {
        vscode.window.showErrorMessage('Failed to initialize DailyNoteManager');
        return;
    }
}
```

#### 3.2 コマンドの条件付き登録
```typescript
// DailyNoteコマンドは設定により条件付きで登録
let dailyNoteCommand: vscode.Disposable | undefined;
if (dailyNoteManager) {
    dailyNoteCommand = vscode.commands.registerCommand('mdlg.openDailyNote', async () => {
        // コマンド実装
    });
}

commands = dailyNoteCommand
    ? [openCommand, dateCommand, timeCommand, previewCommand, dailyNoteCommand]
    : [openCommand, dateCommand, timeCommand, previewCommand];
```

### 4. キーバインド管理戦略

VS Code の制約により、拡張機能から動的にキーバインドを変更することはできない。そのため、以下のアプローチを採用：

#### 4.1 ユーザガイド方式
- 設定項目に詳細な手順を記載
- MarkdownDescription を活用した視覚的な案内
- コマンドID (`mdlg.openDailyNote`) を明記して手動設定を支援

#### 4.2 package.json からの固定キーバインド削除
- 固定キーバインドを削除してユーザの自由度を向上
- デフォルト値は設定項目で案内

## 結果

### 機能の利点
1. **ユーザビリティ向上**: 不要な機能を無効化可能
2. **カスタマイズ性**: キーバインドの自由設定
3. **パフォーマンス**: 無効時はリソース消費なし
4. **競合回避**: 他拡張機能とのキーバインド競合を回避

### 実装の特徴
1. **後方互換性**: デフォルトで機能有効（既存ユーザへの影響なし）
2. **軽量**: 設定による条件分岐で不要な処理を回避
3. **明確性**: 設定項目の説明が充実

### 制約事項
1. **動的キーバインド**: VS Code の制約により手動設定が必要
2. **設定変更時**: 拡張機能の再読み込みが必要（VS Code の標準動作）

## トレードオフ

### 採用した設計: 条件付き登録
- **利点**:
  - 無効時は完全にリソース消費なし
  - シンプルな実装
  - 明確な動作
- **欠点**:
  - 設定変更時の再読み込み必要
  - コード分岐の若干の複雑化

### 代替案: 常時登録・実行時判定
- **利点**: 設定変更の即座反映
- **欠点**: 無効時もリソース消費、複雑なエラーハンドリング

### 代替案: プラグインアーキテクチャ
- **利点**: 高度な動的制御
- **欠点**: 過度な複雑性、保守コスト増

## 今後の考慮事項

### 設定変更の即座反映
将来的に VS Code API が拡張される場合、設定変更時の動的再登録を検討

### 高度なキーバインド管理
VS Code の Contribution Points 拡張により、より柔軟なキーバインド管理が可能になる場合の対応

### 他機能への適用
この設定可能性パターンを WikiLink 機能や他の機能にも適用する可能性

---

**承認者**: [TBD]
**実装日**: 2025-09-18
**関連ADR**: ADR-008 (DailyNote機能設計)

