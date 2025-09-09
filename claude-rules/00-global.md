# Claude Code グローバルルール

このファイルは全プロジェクト共通のルールです。
`~/.claude/claude-rules.md` として保存し、各プロジェクトでは `claude-rules/00-global.md` にコピーされます。

## 🚨 最重要ルール（絶対遵守）

### 1. デグレッション防止の最優先原則

- **既存の動作している機能を絶対に壊さないこと**
- **新機能追加時は、既存のテストがすべて通ることを確認**
- **コード変更時は、影響範囲を慎重に検討**
- **動作確認済みの設定や実装は不用意に変更しない**
- **問題があった場合は、動作していた状態に速やかに戻す**

```python
# ❌ 悪い例：動作している既存の関数を不要に変更
def upload_image(image_path):
    # 既存の動作していたコードを削除...
    # 新しい実装に置き換え...
    pass

# ✅ 良い例：既存機能は残して新機能を追加
def upload_image(image_path):
    # 既存の動作コードは維持
    return existing_working_method(image_path)

def upload_image_with_new_feature(image_path, options):
    # 新機能は別関数として追加
    return new_enhanced_method(image_path, options)
```

### 2. 日本語使用の徹底

- **思考や検索を行う際には英語を使用可能**
- **ユーザーに対するすべての返答は日本語で行うこと**
- **コード内のコメントも日本語で記述**
- **エラーメッセージは日本語で表示**
- **テストの説明も日本語で記述**
- **コミットメッセージも日本語で記述**
- **ドキュメントも日本語で記述**
- ただし、変数名・関数名・クラス名は英語（一般的な慣習に従う）

```go
// ユーザーIDからユーザー情報を取得する
func GetUser(id string) (*User, error) {
    if id == "" {
        return nil, errors.New("ユーザーIDが必要です")
    }
    // 実装...
}

// テストも日本語で
func TestGetUser(t *testing.T) {
    t.Run("IDが指定されていない場合はエラーを投げる", func(t *testing.T) {
        _, err := GetUser("")
        assert.Error(t, err, "ユーザーIDが必要です")
    })
}
```

### 3. Test-Driven Development (TDD) の強制

- **t-wada推奨手法の遵守**: 常にt-wadaのガイドラインに従ったTDDを実践
- **テストを仕様書として**: テストスイートは生きたドキュメントとして機能させる
- **Red-Green-Refactorサイクル**: 失敗するテストを先に書き、最小限のコードで通す
- **カバレッジは副産物**: 振る舞いに集中し、カバレッジ指標に囚われない
- **言語に関係なく適用**: Python、Go、Rust等、すべての言語でTDDを実践

## 🐳 Docker設定

### Docker Compose規約

- **ファイル名**: `compose.yml`を使用（`docker-compose.yml`ではない）
- **形式**: V2形式で記述（`version:`フィールドは記載しない）
- **コマンド**: `docker compose`を使用（`docker-compose`ではない）

```yaml
# compose.yml (V2形式)
services:
  app:
    image: python:3.11-alpine  # 言語に応じて変更
    ports:
      - "8000:8000"
    environment:
      ENV: development
    volumes:
      - .:/app
      - app_cache:/app/.cache
    working_dir: /app
    command: python manage.py runserver

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
  app_cache:
```

### ツール作成原則

ツールを作成する際は、必ずDockerコンテナ上で実行できるようにします。

```bash
# 実行例
docker compose run --rm app ツールコマンド
```

## 📝 基本的なコーディング規約

### フォーマット（言語共通）

- **インデント**: 言語の慣習に従う（Python: 4スペース、Go: タブ、JS/TS: 2スペース）
- **文字コード**: UTF-8（BOMなし）
- **改行コード**: LF（Unix形式）
- **末尾スペース**: 削除する
- **ファイル末尾**: 改行を入れる

### コードの質を保つ原則（言語非依存）

```python
# ❌ ネストが深い
def process_user(user):
    if user:
        if user.active:
            # 処理
            pass

# ✅ 早期リターン
def process_user(user):
    if not user:
        return
    if not user.active:
        return
    
    # 処理
    pass

# ❌ マジックナンバー
if retry_count > 3:
    raise Exception('リトライ回数を超えました')

# ✅ 定数化
MAX_RETRY_COUNT = 3
if retry_count > MAX_RETRY_COUNT:
    raise Exception(f'リトライ回数（{MAX_RETRY_COUNT}回）を超えました')
```

## 🌿 Git戦略とワークフロー

### ブランチ戦略の原則

- **1ブランチ = 1目的**: 各ブランチは単一明確な目的を持つ
- **目的の混在禁止**: 異なる目的は別ブランチで実装
- **保護ブランチ**: master、main、developブランチへの直接コミット禁止
- **フィーチャーブランチワークフロー**: すべての開発はフィーチャーブランチで

### アトミックコミットの強制

すべてのコミットは以下の原則に従うこと：
1. **1コミット = 1変更**: 各コミットは論理的に1つの変更のみを含む
2. **変更の混在禁止**: コミットメッセージで複数の変更を説明する場合は分割
3. **依存関係例外**: 直接依存がある場合のみ複数ファイルが許可される
4. **独立した取り消し可能性**: 各コミットは他の機能を壊すことなく取り消し可能

### コミットメッセージ規約

```bash
# 形式: <type>: <説明>

# type の種類（言語共通）
feat: 新機能
fix: バグ修正
docs: ドキュメントのみの変更
style: コードの動作に影響しない変更（スペース、フォーマット等）
refactor: バグ修正や機能追加ではないコードの変更
test: テストの追加・修正
chore: ビルドプロセスやツールの変更

# 例
feat: ユーザー認証機能を実装
fix: データベース接続エラーを修正
docs: READMEにセットアップ手順を追加
test: ユーザーサービスのテストを追加
```

### 開発ワークフロー

#### 標準開発（単体テストのみ）
1. 特定目的のフィーチャーブランチを作成
2. アトミックコミット原則に従って変更を実装
3. 実装、テスト、設定、ドキュメントを個別コミット
4. テストを実行してすべて通ることを確認
5. mainブランチにfast-forwardマージ
6. マージ後にバージョンアップ（通常はpatch）

#### 統合テスト必須開発
実際のアプリケーションでのテストが必要な場合：

1. 特定目的のフィーチャーブランチを作成
2. アトミックコミット原則に従って変更を実装
3. 単体テストを実行
4. **マージ前に開発版作成**:
   - 開発版作成（言語固有のバージョン管理ツール使用）
   - ビルド・パッケージ化
   - 実際のアプリケーションでテスト
   - テスト失敗時は修正して新しい開発版
5. **統合テスト通過後のみ**:
   - mainブランチにfast-forwardマージ
   - リリース版にバージョンアップ

### コミット分割例

```bash
# 大きな機能（認証システム）の分割例:

# 1. テスト先行
git add tests/test_auth_service.py tests/test_user_repository.py
git commit -m "ユーザー認証機能のテストケースを先行作成"

# 2. 機能別の実装（モジュール別）
git add src/auth/user_repository.py
git commit -m "ユーザー情報の永続化機能を追加"

git add src/auth/auth_service.py
git commit -m "認証ロジックの中核機能を実装"

git add src/auth/password_hasher.py
git commit -m "パスワードハッシュ化機能を実装"

# 3. 統合と設定
git add src/main.py config/auth_config.yaml
git commit -m "認証サービスをメインアプリケーションに統合"
```

## 🔒 セキュリティベストプラクティス

### 認証とシークレット

- **認証情報のログ出力禁止**: 認証トークン、パスワード、APIキーはログに出力禁止
- **機密データのマスク**: エラーハンドラで機密情報をサニタイズ
- **ハードコーディング禁止**: すべての認証情報は環境変数または安全なストレージ経由

```python
# ❌ 悪い例
API_KEY = 'abc123secret'  # ハードコーディング禁止

# ✅ 良い例
import os
API_KEY = os.getenv('API_KEY')
if not API_KEY:
    raise ValueError('API_KEYが設定されていません')
```

### 入力値検証

- **すべての入力をサニタイズ**: XSS、SQLインジェクション、パストラバーサル防止
- **ファイルパス検証**: ディレクトリトラバーサル試行をチェック
- **リソース使用制限**: タイムアウトとサイズ制限を実装

### エラーハンドリング原則

- **安全なエラーメッセージ**: 内部システム詳細を露出しない
- **構造化ログ**: 一貫したエラー形式を使用
- **優雅な劣化**: 失敗時もクラッシュさせない

## 🛠️ Claude Code固有指示

### タスク管理ルール

- **TodoWriteの使用**: 複雑なタスクは開始前に分解
- **ステータス更新**: 開始時にin_progress、完了時にcompletedにマーク
- **一度に一つのタスク**: in_progressのtodoは1つのみ
- **プロアクティブな計画**: 実装中に発見したサブタスクはtodoとして作成

### 言語非依存原則

以下の原則はすべての開発環境（NodeJS、Python、Go等）に適用：
- **TDDの必須化**: t-wadaのTDD手法を言語に関係なく遵守
- **アトミックコミット**: 1-2文で説明できる程度の小さなコミット
- **ブランチ保護**: mainブランチへの直接コミット禁止
- **テストスイートは文書**: テストは実行可能な仕様書として機能
- **理由のコメント**: 何をしたかではなく、なぜその決定をしたかを文書化

## 🐛 デバッグ管理戦略

### デバッグログの追加

- **一時的使用のみ**: デバッグログは能動的なトラブルシューティング用
- **明確なプレフィックス**: `[DEBUG]`、`[TRACE]`等を使用
- **文脈情報**: 関連する状態とパラメータを含める

### デバッグログの削除

- **個別コミット**: デバッグログ削除は専用コミットで
- **コミットメッセージ**: `削除: 不要なデバッグログ`等
- **完全削除**: コメントアウトではなく完全削除

```python
# 開発時のみ
print(f'デバッグ: {data}')

# 本番対応
import logging
logger = logging.getLogger('app.user_service')
logger.debug('ユーザー情報を取得: %s', user_id)
```

## 📁 推奨ディレクトリ構造

```text
project/
├── src/              # ソースコード
├── tests/            # テストコード
├── docs/             # ドキュメント
├── scripts/          # ユーティリティスクリプト
├── compose.yml       # Docker Compose設定
├── .env.example      # 環境変数サンプル
├── .gitignore
├── README.md         # 日本語のREADME
├── CLAUDE.md         # Claude用設定
└── .claude-rules/    # Claudeルール
    ├── 00-global.md      # このファイル
    └── 10-javascript.md  # 言語固有ルール
```

## ✅ コミット前チェックリスト

1. **テスト**: すべてのテストが通っているか？
2. **型チェック**: 型チェックがクリーンか？（言語の静的解析ツール）
3. **リント**: コードスタイル違反が修正されているか？
4. **セキュリティ**: シークレットや機密データが含まれていないか？
5. **コミット**: 各コミットがアトミックで適切に説明されているか？
6. **デバッグ**: 一時的なデバッグコードが削除されているか？

## 🔗 環境変数管理

### 基本原則（言語共通）

```bash
# .env.example
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key-here
API_KEY=your-api-key-here
```

- `.env`ファイルで管理
- `.env`は必ず`.gitignore`に追加
- `.env.example`を用意する

---

これらのルールは全プロジェクト・全言語で適用されます。
言語固有のルールは、別ファイル（例：`10-javascript.md`）で定義します。