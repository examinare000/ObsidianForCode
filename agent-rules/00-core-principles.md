# 00. 基盤原則

## 🚨 絶対遵守ルール

このファイルはAgenticコーディングの基盤となる絶対原則を定義します。
すべての他の指示より優先され、例外は一切認められません。

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

```python
# テストファースト
def test_ユーザー認証_正常系():
    """有効な認証情報でログインできること"""
    user = User("test@example.com", "password123")
    result = auth_service.login(user.email, user.password)
    assert result.success == True
    assert result.user_id == user.id

def test_ユーザー認証_異常系():
    """無効な認証情報ではエラーになること"""
    result = auth_service.login("invalid@example.com", "wrong_password")
    assert result.success == False
    assert result.error == "認証に失敗しました"

# テスト後に実装
class AuthService:
    def login(self, email, password):
        # 最小限の実装でテストを通す
        if email == "test@example.com" and password == "password123":
            return LoginResult(success=True, user_id="123")
        return LoginResult(success=False, error="認証に失敗しました")
```

## 適用原則

### 優先順位制御
- **この原則がすべてに優先**: 他のすべての指示より優先される
- **例外なし**: 如何なる状況でもこの原則を破ることは許可されない
- **矛盾解決**: 他の指示と矛盾する場合、この原則を優先する

### 適用範囲
- **全言語対応**: プログラミング言語に関係なく適用
- **全フェーズ対応**: 設計、実装、テスト、デバッグ、リファクタリングすべて
- **全プロジェクト対応**: 規模や性質に関係なくすべてのプロジェクト

---

**適用優先度**: 🔴 絶対最高（すべての指示に優先）
**更新頻度**: 変更禁止（基盤原則のため変更不可）