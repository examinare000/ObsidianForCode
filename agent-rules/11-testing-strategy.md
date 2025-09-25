# 11. テスト戦略

## Test-Driven Development戦略

### テスト階層構造

```
┌─────────────────┐
│   E2E テスト    │ ← システム全体のユーザーシナリオ
├─────────────────┤
│   統合テスト     │ ← システム全体の動作確認
├─────────────────┤
│  コンポーネント  │ ← モジュール間連携テスト
│     テスト       │
├─────────────────┤
│   ユニット      │ ← 個別メソッド・関数テスト
│    テスト       │
└─────────────────┘
```

### TDD実践原則

#### Red-Green-Refactorサイクル

```python
# 1. Red: 失敗するテストを先に書く
def test_ユーザー作成_正常系():
    """有効なデータでユーザーが作成されること"""
    user_data = {"name": "田中太郎", "email": "tanaka@example.com"}
    user = UserService.create_user(user_data)

    assert user.id is not None
    assert user.name == "田中太郎"
    assert user.email == "tanaka@example.com"
    assert user.created_at is not None

# 2. Green: 最小限の実装でテストを通す
class UserService:
    @staticmethod
    def create_user(user_data):
        return User(
            id=1,
            name=user_data["name"],
            email=user_data["email"],
            created_at=datetime.now()
        )

# 3. Refactor: コードを改善する
class UserService:
    @staticmethod
    def create_user(user_data):
        # バリデーション追加
        if not user_data.get("email"):
            raise ValueError("メールアドレスは必須です")

        # データベース保存
        user = User(
            id=generate_user_id(),
            name=user_data["name"],
            email=user_data["email"],
            created_at=datetime.now()
        )
        user.save()
        return user
```

#### テストファースト原則

```python
# ❌ 実装ファースト
def calculate_tax(amount):
    return amount * 0.1

def test_税金計算():
    assert calculate_tax(1000) == 100

# ✅ テストファースト
def test_税金計算_正常系():
    """金額に10%の税金が計算されること"""
    assert calculate_tax(1000) == 100
    assert calculate_tax(1500) == 150

def test_税金計算_異常系():
    """負の金額では例外が発生すること"""
    with pytest.raises(ValueError, match="金額は正の数である必要があります"):
        calculate_tax(-100)

# テスト後に実装
def calculate_tax(amount):
    if amount < 0:
        raise ValueError("金額は正の数である必要があります")
    return amount * 0.1
```

### 必須テストパターン

#### A. エラーハンドリングテスト
```python
describe('エラーハンドリング', () => {
  it('undefinedメトリクスでも正常動作する', () => {
    const result = evaluator.calculateAssessment({
      codeMetrics: undefined,
      testMetrics: undefined,
      securityMetrics: undefined
    });
    assert(result.overallScore >= 0);
  });

  it('不正なデータ形式でエラーメッセージを返す', () => {
    const result = evaluator.calculateAssessment("invalid_data");
    assert(result.success === false);
    assert(result.error.includes('不正なデータ形式'));
  });
});
```

#### B. 境界値テスト
```python
def test_ユーザー名バリデーション_境界値():
    """ユーザー名の境界値をテスト"""
    # 最小値
    assert UserValidator.validate_name("田") == True

    # 最大値
    long_name = "田" * 50
    assert UserValidator.validate_name(long_name) == True

    # 境界値超過
    too_long_name = "田" * 51
    with pytest.raises(ValidationError, match="ユーザー名は50文字以内である必要があります"):
        UserValidator.validate_name(too_long_name)

    # 空文字
    with pytest.raises(ValidationError, match="ユーザー名は必須です"):
        UserValidator.validate_name("")
```

#### C. 統合ワークフローテスト
```python
def test_ユーザー登録から削除までの完全ワークフロー():
    """システム全体を通したユーザーライフサイクルテスト"""
    # 1. ユーザー作成
    user_data = {"name": "田中太郎", "email": "tanaka@example.com"}
    user = UserService.create_user(user_data)

    # 2. ユーザー取得
    retrieved_user = UserService.get_user(user.id)
    assert retrieved_user.name == user_data["name"]

    # 3. ユーザー更新
    update_data = {"name": "田中次郎"}
    updated_user = UserService.update_user(user.id, update_data)
    assert updated_user.name == "田中次郎"

    # 4. ユーザー削除
    UserService.delete_user(user.id)

    # 5. 削除確認
    with pytest.raises(UserNotFoundError):
        UserService.get_user(user.id)
```

#### D. インターフェース契約テスト
```python
def test_API契約_ユーザー情報取得():
    """APIが期待される構造でデータを返すこと"""
    response = api.get_user(user_id=1)

    # レスポンス構造の検証
    assert "user" in response
    assert "meta" in response

    # ユーザーデータの検証
    user_data = response["user"]
    required_fields = ["id", "name", "email", "created_at", "updated_at"]
    for field in required_fields:
        assert field in user_data, f"必須フィールド '{field}' が存在しません"

    # データ型の検証
    assert isinstance(user_data["id"], int)
    assert isinstance(user_data["name"], str)
    assert isinstance(user_data["email"], str)
```

### テスト実行戦略

#### テスト実行順序
1. **ユニットテスト実行** → 基本機能の確認
2. **統合テスト実行** → モジュール間連携確認
3. **システムテスト実行** → 実際の起動・動作確認
4. **E2Eテスト実行** → ユーザーシナリオ確認

#### テストコマンド例
```bash
# Python
pytest tests/unit/           # ユニットテスト
pytest tests/integration/    # 統合テスト
pytest tests/system/         # システムテスト
pytest tests/e2e/           # E2Eテスト

# JavaScript/Node.js
npm test:unit
npm test:integration
npm test:system
npm test:e2e

# Go
go test ./... -short        # ユニットテスト
go test ./... -integration  # 統合テスト
go test ./... -system       # システムテスト
```

### テスト品質指標

#### カバレッジ目標
- **ユニットテスト**: 80%以上
- **統合テスト**: 主要フロー100%
- **E2Eテスト**: 主要ユーザーシナリオ100%

#### 品質メトリクス
- **テスト成功率**: 95%以上を維持
- **テスト実行時間**: ユニットテスト10秒以内
- **統合テスト時間**: 5分以内
- **E2Eテスト時間**: 30分以内

### モックとスタブの戦略

#### 外部依存のモック化
```python
# データベースアクセスのモック
@pytest.fixture
def mock_database():
    with patch('app.database.connection') as mock_db:
        mock_db.execute.return_value = [{"id": 1, "name": "テストユーザー"}]
        yield mock_db

def test_ユーザー取得_データベースアクセス(mock_database):
    """データベース操作をモックしてビジネスロジックをテスト"""
    user = UserService.get_user(1)

    assert user.name == "テストユーザー"
    mock_database.execute.assert_called_once_with(
        "SELECT * FROM users WHERE id = ?", [1]
    )
```

#### API呼び出しのモック化
```python
@responses.activate
def test_外部API呼び出し():
    """外部APIをモックしてテスト"""
    responses.add(
        responses.GET,
        "https://api.example.com/users/1",
        json={"id": 1, "name": "外部ユーザー"},
        status=200
    )

    result = ExternalService.fetch_user_data(1)
    assert result["name"] == "外部ユーザー"
```

### テストデータ管理

#### フィクスチャの使用
```python
@pytest.fixture
def sample_user_data():
    """テスト用のユーザーデータ"""
    return {
        "name": "テスト太郎",
        "email": "test@example.com",
        "age": 30,
        "department": "開発部"
    }

@pytest.fixture
def created_user(sample_user_data):
    """作成済みユーザーのフィクスチャ"""
    user = UserService.create_user(sample_user_data)
    yield user
    # テスト後のクリーンアップ
    UserService.delete_user(user.id)
```

#### テストデータベース
```python
@pytest.fixture(scope="session")
def test_database():
    """テスト用データベースのセットアップ"""
    # テストDB作成
    db = create_test_database()

    yield db

    # テスト後にクリーンアップ
    drop_test_database(db)
```

### パフォーマンステスト

#### 基本的なパフォーマンステスト
```python
import time

def test_ユーザー作成_パフォーマンス():
    """ユーザー作成が1秒以内に完了すること"""
    start_time = time.time()

    user_data = {"name": "パフォーマンステスト", "email": "perf@example.com"}
    UserService.create_user(user_data)

    execution_time = time.time() - start_time
    assert execution_time < 1.0, f"実行時間が長すぎます: {execution_time}秒"

def test_大量データ処理_パフォーマンス():
    """1000件のデータ処理が10秒以内に完了すること"""
    test_data = [{"name": f"ユーザー{i}", "email": f"user{i}@example.com"}
                 for i in range(1000)]

    start_time = time.time()
    results = UserService.bulk_create_users(test_data)
    execution_time = time.time() - start_time

    assert len(results) == 1000
    assert execution_time < 10.0, f"実行時間が長すぎます: {execution_time}秒"
```

---

**適用優先度**: 🔴 最高（すべてのコードに適用必須）
**更新頻度**: プロジェクト経験とツール進化に合わせて定期的に更新