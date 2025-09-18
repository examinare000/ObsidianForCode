# Claude Rules 07: Git Branch Strategy

## 🚨 必須ルール: ブランチ戦略

### ブランチ使用ルール

**絶対に守ること:**
1. **mainブランチには直接コミットしない**
2. **開発は必ずdevelopブランチで行う**
3. **新機能はfeature/xxxブランチを使用**
4. **リリースのみmainブランチにマージ**

### ブランチ構成

#### メインブランチ
- **`main`**: プロダクション準備完了コードのみ
  - リリースタグのみ
  - 直接コミット禁止
  - 安定バージョンを維持

- **`develop`**: 統合開発ブランチ
  - 全ての開発はここで実施
  - feature ブランチからのマージ先
  - 日常的な開発作業の基点

#### サポートブランチ
- **`feature/xxx`**: 新機能開発
  - developから分岐
  - developにマージ
  - 機能完了後削除

- **`hotfix/xxx`**: 緊急修正
  - mainから分岐
  - mainとdevelopの両方にマージ

- **`release/xxx`**: リリース準備
  - developから分岐
  - mainとdevelopの両方にマージ

### Claude Code実行時のルール

#### 開発開始時
```bash
# 必ず現在のブランチを確認
git branch
# developブランチにいることを確認してから作業開始
git checkout develop
```

#### 新機能開発時
```bash
# developから新機能ブランチを作成
git checkout develop
git checkout -b feature/feature-name
# 開発実施
# 完了後developにマージ
git checkout develop
git merge --ff-only feature/feature-name
git branch -d feature/feature-name
```

#### リリース時
```bash
# developからmainへのマージ（リリース時のみ）
git checkout main
git merge --ff-only develop
npm version patch  # または minor, major
git tag vX.Y.Z
git checkout develop
git merge --ff-only main  # tagの同期
```

### Claude Code動作制約

1. **ブランチチェック**: 作業前に必ず `git branch` で現在ブランチを確認
2. **developブランチ必須**: mainブランチでの開発作業は絶対禁止
3. **Feature branch推奨**: 大きな変更はfeature/xxxブランチを使用
4. **Fast-forward merge**: `--ff-only` でマージの履歴をクリーンに保つ

### 緊急事態対応

#### mainブランチに誤ってコミットした場合
```bash
# 最後のコミットを取り消してdevelopに移動
git reset --soft HEAD~1
git stash
git checkout develop
git stash pop
git add -A
git commit -m "移動: mainから誤ってコミットした変更をdevelopに移動"
```

#### ブランチが不明な場合
```bash
# 現在の状態を確認
git status
git branch -a
# developブランチに移動
git checkout develop
```

### 関連ファイル

- `.gitflow`: 詳細なGit Flow設定
- `CLAUDE.md`: プロジェクト固有の開発ルール

### 例外ケース

以下の場合のみmainブランチでの作業を許可:
1. **緊急hotfix**: プロダクションの重大な問題
2. **ドキュメント修正**: README.mdなどの軽微な修正
3. **設定変更**: CIや.gitignoreなどの環境設定

**ただし、これらの場合でもdevelopブランチへの同期を忘れずに実施**

---

**重要**: このルールはClaude Codeの動作を制御する最重要ルールです。必ず遵守してください。