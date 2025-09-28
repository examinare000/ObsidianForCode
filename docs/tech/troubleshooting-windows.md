# Windows環境開発者向けトラブルシューティング

このドキュメントは、Windows環境でObsidianForCodeの開発を行う際に発生しうる特有の問題と、その解決策をまとめたものです。

## 🔧 問題: 拡張機能は動作するが、コマンドが登録されない

### 症状

- F5キーでデバッグ実行すると拡張機能は起動する
- コマンドパレット（`Ctrl+Shift+P`）に "ObsidianForCode" 関連のコマンドが表示されない
- `Ctrl+Enter` などのキーボードショートカットが反応しない
- 拡張機能の設定は表示されるが、実際の機能が使用できない

### 原因

この問題の多くは、**ワークスペースのパス解決の失敗**が原因です。特に、以下のようなケースで発生する可能性があります：

- **UNCパス**: `\\server\share\project` のようなネットワーク上のパス
- **シンボリックリンク**: `mklink /D link target` で作成されたディレクトリリンク
- **拡張パス**: `\\?\C:\very\long\path` のような拡張形式パス
- **非標準的なドライブパス**: ドライブレターを持たないボリュームなど

拡張機能の初期化時に、アクティブなファイルのパスが絶対パスかどうかを判定する処理があり、この判定が不正確だとコマンド登録処理がスキップされていました。

### 解決策

#### v0.4.5以降での修正

- **`path.isAbsolute()` の利用**: 修正により、Node.js標準の `path.isAbsolute()` を使うよう変更されました。これにより、ほとんどのケースで問題は解決されています。

#### 問題が再発した場合の確認事項

1. **VS Codeバージョン確認**
   ```bash
   code --version
   ```
   拡張機能要件: VS Code 1.103.0 以降

2. **デバッガでのパス確認**
   - `extension.ts` の `activate` 関数にブレークポイントを設定
   - `vscode.workspace.workspaceFolders?.[0]?.uri.fsPath` の値を確認
   - パスが期待される形式で解釈されているかを検証

3. **拡張機能出力確認**
   ```
   VS Code > 出力 > ObsidianForCode
   ```
   エラーメッセージやパス関連の警告を確認

## 🔧 問題: 「Install from location」でインストールできない

### 症状

- VS Code Extensions → "Install from VSIX..." でインストールできない
- "Extension Install from location" が機能しない
- 開発中の拡張機能が正しく読み込まれない

### 解決策

#### 1. 開発者モードの有効化（推奨）

Windows 10/11で開発者モードを有効にすることで、管理者権限なしでシンボリックリンクを作成できます：

1. `設定` → `更新とセキュリティ` → `開発者向け`（Windows 10）
2. `設定` → `プライバシーとセキュリティ` → `開発者向け`（Windows 11）
3. 「開発者モード」をオンにする

#### 2. 管理者権限でのVS Code実行

一時的な対処として：
```bash
# コマンドプロンプトを管理者として実行
code .
```

#### 3. ジャンクションの使用

シンボリックリンクの代わりにジャンクションを試す：
```cmd
# mklink /D の代わり
mklink /J "C:\Users\[user]\.vscode\extensions\obsidianforcode" "C:\dev\ObsidianForCode"
```

#### 4. ファイルコピーによる開発フロー

シンボリックリンクを使わない方法：
```bash
# package.jsonに追加
"scripts": {
  "install-dev": "xcopy /E /I /Y . \"%USERPROFILE%\\.vscode\\extensions\\obsidianforcode\""
}

npm run install-dev
```

## 🔧 問題: パス区切り文字の混在

### 症状

- ファイル作成時にパスが `C:\Users\name/document.md` のような形式になる
- ファイルが期待されない場所に作成される

### 解決策

v0.4.5以降では `path.resolve()` と `path.join()` を適切に使用するよう修正されています。問題が続く場合：

1. **設定確認**
   ```json
   {
     "obsidianForCode.vaultRoot": "notes"  // 相対パス推奨
   }
   ```

2. **絶対パスでの設定**
   ```json
   {
     "obsidianForCode.vaultRoot": "C:\\Users\\username\\Documents\\vault"
   }
   ```

## 🔧 問題: デイリーノート作成時の日付フォーマットエラー

### 症状

- デイリーノートファイル名に不正な文字が含まれる
- ファイル作成時に "Invalid filename" エラーが表示される

### 解決策

Windows予約名とファイル名制限に配慮した設定：

```json
{
  "obsidianForCode.dailyNoteFormat": "yyyy-MM-dd",  // ✅ Windows安全
  "obsidianForCode.dailyNoteFormat": "yyyy/MM/dd"   // ❌ パス区切り文字のため不適切
}
```

## 📋 デバッグ情報収集

問題が解決しない場合、以下の情報を収集してIssueを報告してください：

### システム情報

```bash
# VS Codeバージョン
code --version

# Node.jsバージョン
node --version

# 拡張機能バージョン
# VS Code > 拡張機能 > ObsidianForCode で確認
```

### パス情報

```javascript
// デバッガコンソールで実行
console.log('Platform:', process.platform);
console.log('CWD:', process.cwd());
console.log('Workspace folders:', vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath));
```

### 拡張機能出力

```
VS Code > 表示 > 出力 > ObsidianForCode
```

---

## 🔗 関連リソース

- [ADR-013: Node.js標準 path.isAbsolute の採用](../adr/013-nodejs-path-isabsolute-adoption.md)
- [v0.4.5リリースノート](../releases/v0.4.5.md)
- [Issue報告](https://github.com/obsidianforcode/obsidianforcode/issues)