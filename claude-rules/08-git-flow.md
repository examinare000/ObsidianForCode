# Git-Flow ワークフロー

## 概要

このプロジェクトではGit-Flowブランチモデルを採用しています。

## ブランチ構造

### メインブランチ

- **main/master**: プロダクション環境にデプロイされる安定版
  - 常にリリース可能な状態を維持
  - 直接コミット禁止
  - タグでバージョン管理

- **develop**: 開発の主軸ブランチ
  - 次回リリースの統合ブランチ
  - featureブランチのマージ先
  - 常にテストが通る状態を維持

### サポートブランチ

- **feature/\***: 新機能開発
  - developから分岐
  - developにマージ
  - 命名例: `feature/task-metadata-sync`, `feature/settings-ui`

- **release/\***: リリース準備
  - developから分岐
  - mainとdevelopにマージ
  - バージョンバンプ、ドキュメント更新、軽微なバグ修正のみ
  - 命名例: `release/v0.4.0`

- **hotfix/\***: 緊急バグ修正
  - mainから分岐
  - mainとdevelopにマージ
  - 命名例: `hotfix/critical-sync-bug`

## ワークフロー

### 機能開発フロー

```bash
# 1. developから機能ブランチ作成
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# 2. 開発とコミット（原子的コミット）
git add <files>
git commit -m "機能説明"

# 3. developにマージ
git checkout develop
git merge --no-ff feature/new-feature
git push origin develop
git branch -d feature/new-feature
```

### リリースフロー

```bash
# 1. リリースブランチ作成
git checkout develop
git checkout -b release/v0.5.0

# 2. バージョンバンプとドキュメント更新
npm version minor  # or patch/major
# CHANGELOG.md更新など

# 3. mainにマージ
git checkout main
git merge --no-ff release/v0.5.0
git tag -a v0.5.0 -m "Release version 0.5.0"
git push origin main --tags

# 4. developに反映
git checkout develop
git merge --no-ff release/v0.5.0
git push origin develop
git branch -d release/v0.5.0
```

### ホットフィックスフロー

```bash
# 1. mainから修正ブランチ作成
git checkout main
git checkout -b hotfix/critical-bug

# 2. 修正とバージョンバンプ
# 修正コミット
npm version patch

# 3. mainにマージ
git checkout main
git merge --no-ff hotfix/critical-bug
git tag -a v0.4.6 -m "Hotfix version 0.4.6"
git push origin main --tags

# 4. developに反映
git checkout develop
git merge --no-ff hotfix/critical-bug
git push origin develop
git branch -d hotfix/critical-bug
```

## Git-Flow使用時のルール

### 1. ブランチの保護

- **main/develop**: 直接コミット禁止
- すべての変更はfeature/release/hotfixブランチ経由

### 2. マージ戦略

- **--no-ff**: 常にマージコミットを作成（履歴を明確に保つ）
- **Fast-forward**: featureブランチ内の小さなマージのみ

### 3. コミットルール

- 原子的コミット（1コミット = 1変更）
- 日本語のコミットメッセージ
- テストとコード変更は別コミット

### 4. バージョニング

- **Semantic Versioning**: MAJOR.MINOR.PATCH
- **dev版**: 統合テスト必要時は `-dev.N` サフィックス使用
- **タグ**: mainへのマージ時に必ずタグ作成

### 5. Claude Codeでの使用

Claude Codeでブランチ作成・マージを依頼する際：

```
例: 「developから feature/user-authentication を作成して、認証機能を実装してください」
例: 「release/v0.5.0 ブランチを作成して、バージョンをバンプしてください」
例: 「hotfix/sync-crash をmainから作成して、同期クラッシュを修正してください」
```

## トラブルシューティング

### マージコンフリクトの解決

```bash
# 1. developの最新を取得
git checkout develop
git pull origin develop

# 2. featureブランチで競合解決
git checkout feature/my-feature
git merge develop
# 競合を手動解決
git add <resolved-files>
git commit -m "競合解決: developの変更をマージ"
```

### 誤ったブランチからの分岐

```bash
# 正しいブランチから作り直す
git checkout develop
git checkout -b feature/correct-base
git cherry-pick <commit-hash>  # 必要なコミットのみ移行
```

## 参考資料

- [A successful Git branching model](https://nvie.com/posts/a-successful-git-branching-model/)
- [Semantic Versioning](https://semver.org/)
