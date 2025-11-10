# 08. Git戦略

この文書は当リポジトリの「正本（Single Source of Truth）」としての Git 運用ルールです。従来の Git-Flow を参考にしつつ、当プロジェクトでは Fast-Forward Only を前提とした直線的な履歴運用を採用します。

要点:
- 既定のマージは Fast-Forward Only（`--ff-only`）。不要なマージコミットは作らない。
- 作業ブランチは小さく短命に保ち、1ブランチ=1イニシアチブ。
- `main` はタグ付きリリースのみ。直接コミットは禁止。
- `develop` は統合ブランチ。日々の開発はここに集約。
- `feature/`・`hotfix/` を用途別に使い分ける。

## ブランチ方針

- `main`: 本番用の安定ブランチ。タグ付きリリースのみを持つ。直接コミット禁止。
- `develop`: 統合ブランチ。機能や修正は一度ここに集約して検証する。`feature`や`hotfix`での開発・修正が完了時にこのブランチでテストを実行し、all-greenを担保して`main`にマージする。
- `feature/<task-name>`: 機能追加や小規模改修用。`develop` から分岐し、`develop` に戻す。
- `hotfix/<name>`: 緊急修正用。`main` から分岐し、`develop` へ反映してクローズ。

命名例:
- `feature/user-auth-session-timeout`
- `release/v0.5.0`
- `hotfix/critical-sync-bug`

## マージ戦略（FF-only）

原則としてすべて Fast-Forward Only でマージします。
- FF 不可な場合は、対象ブランチに対して rebase して直線化してからマージします。
- 意図的なマージコミットは作成しません（履歴の見通しを優先）。
- 共有ブランチ（`main`/`develop`/`release/*`）への force-push は禁止。

例:
```bash
# feature を最新 develop に合わせて直線化
git checkout feature/my-feature
git fetch origin
git rebase origin/develop

# その後、FF-only で統合
git checkout develop
git merge --ff-only feature/my-feature
```

## 典型フロー

### 機能開発（feature）
```bash
git checkout develop
git pull origin develop
git checkout -b feature/<task-name>

# 作業 ...

git checkout develop
git pull origin develop
git merge --ff-only feature/<task-name>
git push origin develop
git branch -d feature/<task-name>
```

### リリース準備（release）
```bash
git checkout develop
git pull origin develop
git checkout -b release/vX.Y.Z

# バージョン/CHANGELOG 更新・最終テスト ...

git checkout main
git pull origin main
git merge --ff-only release/vX.Y.Z
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main --tags

git checkout develop
git pull origin develop
git merge --ff-only release/vX.Y.Z
git push origin develop
git branch -d release/vX.Y.Z
```

### 緊急修正（hotfix）
```bash
git checkout main
git pull origin main
git checkout -b hotfix/<name>

# 修正 ...

git checkout main
git pull origin main
git merge --ff-only hotfix/<name>
git tag -a vX.Y.Z -m "Hotfix vX.Y.Z"
git push origin main --tags

git checkout develop
git pull origin develop
git merge --ff-only hotfix/<name>
git push origin develop
git branch -d hotfix/<name>
```

## リベース運用

- 個人作業中のローカルブランチに限り、履歴整形のための rebase を許可。
- 共有後（押下後）のブランチでは歴史改変（rebase/force-push）を避ける。
- コンフリクト時は小さい単位で解消し、テストを都度実行。

## コミット規約

- 1コミット=1変更（意味のある最小単位）。WIP 連投は避ける。
- コミットメッセージは「種別: 要約」。英語 or 日本語いずれも可。
- 推奨種別: feat, fix, refactor, perf, docs, test, chore, ci, build, style, revert, remove, config, move, rename

例（良い）:
```
feat: add session timeout to auth middleware
fix: handle race condition in file watcher
docs: update README with setup steps
```

例（避ける）:
```
update
fix bug
WIP
```

## 作業中の基本Git操作

- コミット前に `git status` と `git diff` を確認して意図通りかをチェック。
- 1コミット=1変更（原則）。関係のない変更を混ぜない。
- 共有ブランチ（`main`/`develop`/`release/*`）へは直接コミットしない。
- ブランチは短命に保ち、完了後は削除してクリーンに保つ。

## 事前チェック（push/PR 前）

- テスト実行: `npm test`（またはプロジェクトの標準テスト）
- Lint: `npm run lint`
- 型チェック: `npm run typecheck`（該当プロジェクトのみ）
- ブランチを push し、レビュー（PR）を作成

## 誤操作時のリカバリー

誤って `main` に直接コミットした場合:
```bash
git checkout main
git reset --soft HEAD~1
git stash

git checkout develop
git stash pop
git add -A
git commit -m "chore: move stray commit from main to develop"
```

誤ったブランチで作業した場合:
```bash
git stash
git checkout <correct-branch>
git stash pop
git add -A
git commit -m "feat: implement <thing> on correct branch"
```

## バージョニング

- Semantic Versioning（MAJOR.MINOR.PATCH）を採用。
- `main` に取り込むリリース/ホットフィックスではタグを付与（annotated tag）。

## 補足

- 旧ドキュメント `08-git-flow.md` と `10-git-strategy.md` の内容は本書に統合しました。
- `.gitflow` の記述は概要であり、本書の内容を優先します。
