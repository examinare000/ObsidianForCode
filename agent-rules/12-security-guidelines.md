# 12. セキュリティガイドライン

## セキュリティベストプラクティス

### 認証とシークレット管理

#### シークレット情報の取り扱い
- **認証情報のログ出力禁止**: 認証トークン、パスワード、APIキーはログに出力禁止
- **機密データのマスク**: エラーハンドラで機密情報をサニタイズ
- **ハードコーディング禁止**: すべての認証情報は環境変数または安全なストレージ経由

```python
# ❌ 悪い例
API_KEY = 'abc123secret'  # ハードコーディング禁止
password = "user_password"
logger.info(f"ユーザーログイン: {email}, パスワード: {password}")  # パスワードログ出力禁止

# ✅ 良い例
import os
API_KEY = os.getenv('API_KEY')
if not API_KEY:
    raise ValueError('API_KEYが設定されていません')

# 安全なログ出力
logger.info(f"ユーザーログイン: {email}")  # パスワードは出力しない
```

#### 環境変数管理
```bash
# .env.example
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key-here
API_KEY=your-api-key-here
ENCRYPTION_KEY=your-encryption-key

# セキュリティ要件
# - .env は必ず .gitignore に追加
# - 本番環境では環境変数で設定
# - 開発環境では .env.example をコピーして使用
```

### 入力値検証とサニタイゼーション

#### 基本的な入力検証
```python
import re
from typing import Optional

class InputValidator:
    @staticmethod
    def validate_email(email: str) -> bool:
        """メールアドレスの形式を検証"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    @staticmethod
    def sanitize_user_input(input_str: str) -> str:
        """ユーザー入力をサニタイズ"""
        if not isinstance(input_str, str):
            raise ValueError("文字列である必要があります")

        # HTMLタグ除去
        import html
        sanitized = html.escape(input_str)

        # 長さ制限
        if len(sanitized) > 1000:
            raise ValueError("入力値が長すぎます（1000文字以内）")

        return sanitized

    @staticmethod
    def validate_file_path(file_path: str) -> str:
        """ファイルパスのディレクトリトラバーサルをチェック"""
        import os.path

        # 相対パスの正規化
        normalized_path = os.path.normpath(file_path)

        # ディレクトリトラバーサル攻撃をチェック
        if '..' in normalized_path or normalized_path.startswith('/'):
            raise ValueError("不正なファイルパスです")

        return normalized_path
```

#### SQLインジェクション防止
```python
# ❌ 危険: SQLインジェクション脆弱性
def get_user_by_email(email):
    query = f"SELECT * FROM users WHERE email = '{email}'"
    cursor.execute(query)  # 危険

# ✅ 安全: パラメータ化クエリ
def get_user_by_email(email):
    query = "SELECT * FROM users WHERE email = ?"
    cursor.execute(query, (email,))  # 安全

# ✅ ORMの使用（推奨）
def get_user_by_email(email):
    return User.objects.filter(email=email).first()
```

### 認証・認可

#### JWT実装例
```python
import jwt
import datetime
from functools import wraps

class AuthService:
    SECRET_KEY = os.getenv('JWT_SECRET')

    @classmethod
    def generate_token(cls, user_id: int, expires_in_hours: int = 24) -> str:
        """JWTトークンを生成"""
        payload = {
            'user_id': user_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=expires_in_hours),
            'iat': datetime.datetime.utcnow()
        }
        return jwt.encode(payload, cls.SECRET_KEY, algorithm='HS256')

    @classmethod
    def validate_token(cls, token: str) -> Optional[dict]:
        """JWTトークンを検証"""
        try:
            payload = jwt.decode(token, cls.SECRET_KEY, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("有効期限切れのトークンでアクセス試行")
            return None
        except jwt.InvalidTokenError:
            logger.warning("不正なトークンでアクセス試行")
            return None

def require_auth(f):
    """認証を要求するデコレータ"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return {'error': '認証トークンが必要です'}, 401

        # "Bearer " プレフィックスを除去
        if token.startswith('Bearer '):
            token = token[7:]

        payload = AuthService.validate_token(token)
        if not payload:
            return {'error': '無効なトークンです'}, 401

        # リクエストにユーザー情報を追加
        request.current_user_id = payload['user_id']
        return f(*args, **kwargs)

    return decorated_function
```

#### パスワードハッシュ化
```python
import bcrypt

class PasswordManager:
    @staticmethod
    def hash_password(password: str) -> str:
        """パスワードをハッシュ化"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """パスワードを検証"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# 使用例
def register_user(email: str, password: str):
    # パスワードの複雑さをチェック
    if len(password) < 8:
        raise ValueError("パスワードは8文字以上である必要があります")

    hashed_password = PasswordManager.hash_password(password)

    user = User(email=email, password_hash=hashed_password)
    user.save()

def authenticate_user(email: str, password: str) -> Optional[User]:
    user = User.objects.filter(email=email).first()
    if not user:
        return None

    if PasswordManager.verify_password(password, user.password_hash):
        return user

    return None
```

### エラーハンドリングとログ

#### 安全なエラー処理
```python
import logging
from typing import Dict, Any

class SecurityLogger:
    def __init__(self):
        self.logger = logging.getLogger('security')

    def log_authentication_attempt(self, email: str, success: bool, ip_address: str):
        """認証試行をログに記録"""
        if success:
            self.logger.info(f"認証成功: {email} from {ip_address}")
        else:
            self.logger.warning(f"認証失敗: {email} from {ip_address}")

    def log_suspicious_activity(self, activity: str, details: Dict[str, Any]):
        """疑わしい活動をログに記録"""
        sanitized_details = self._sanitize_log_data(details)
        self.logger.error(f"疑わしい活動: {activity}, 詳細: {sanitized_details}")

    def _sanitize_log_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """ログデータから機密情報を除去"""
        sensitive_keys = ['password', 'token', 'secret', 'key', 'authorization']
        sanitized = {}

        for key, value in data.items():
            if any(sensitive in key.lower() for sensitive in sensitive_keys):
                sanitized[key] = '[REDACTED]'
            else:
                sanitized[key] = value

        return sanitized

# 使用例
def login_endpoint(email: str, password: str, request_ip: str):
    security_logger = SecurityLogger()

    try:
        user = authenticate_user(email, password)
        if user:
            security_logger.log_authentication_attempt(email, True, request_ip)
            return {'success': True, 'token': generate_token(user.id)}
        else:
            security_logger.log_authentication_attempt(email, False, request_ip)
            return {'success': False, 'error': '認証に失敗しました'}, 401

    except Exception as e:
        # エラーの詳細は内部ログのみに記録
        security_logger.logger.error(f"認証エラー: {str(e)}")
        # ユーザーには一般的なエラーメッセージのみ返す
        return {'success': False, 'error': '認証処理でエラーが発生しました'}, 500
```

### リソース保護

#### レート制限
```python
from datetime import datetime, timedelta
from collections import defaultdict

class RateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)

    def is_allowed(self, identifier: str, limit: int, window_seconds: int) -> bool:
        """レート制限チェック"""
        now = datetime.now()
        window_start = now - timedelta(seconds=window_seconds)

        # 古いリクエスト履歴を削除
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if req_time > window_start
        ]

        # 制限内かチェック
        if len(self.requests[identifier]) < limit:
            self.requests[identifier].append(now)
            return True

        return False

# 使用例
rate_limiter = RateLimiter()

def api_endpoint(request):
    client_ip = request.remote_addr

    # 1分間に10回まで
    if not rate_limiter.is_allowed(client_ip, limit=10, window_seconds=60):
        return {'error': 'レート制限に達しました。しばらくお待ちください。'}, 429

    # 通常の処理
    return process_request(request)
```

#### ファイルアップロードセキュリティ
```python
import os
import mimetypes
from pathlib import Path

class SecureFileUpload:
    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt'}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    @staticmethod
    def validate_file(file_data: bytes, filename: str) -> bool:
        """アップロードファイルを検証"""
        # ファイルサイズチェック
        if len(file_data) > SecureFileUpload.MAX_FILE_SIZE:
            raise ValueError("ファイルサイズが大きすぎます（10MB以内）")

        # 拡張子チェック
        file_ext = Path(filename).suffix.lower()
        if file_ext not in SecureFileUpload.ALLOWED_EXTENSIONS:
            raise ValueError(f"許可されていないファイル形式です: {file_ext}")

        # MIMEタイプチェック
        expected_mime = mimetypes.guess_type(filename)[0]
        if not expected_mime:
            raise ValueError("ファイル形式を特定できません")

        return True

    @staticmethod
    def save_file(file_data: bytes, filename: str, upload_dir: str) -> str:
        """安全なファイル保存"""
        # ファイル名をサニタイズ
        safe_filename = SecureFileUpload._sanitize_filename(filename)

        # 保存先ディレクトリの検証
        upload_path = Path(upload_dir).resolve()
        if not upload_path.exists():
            upload_path.mkdir(parents=True, exist_ok=True)

        # ファイル保存
        file_path = upload_path / safe_filename
        with open(file_path, 'wb') as f:
            f.write(file_data)

        return str(file_path)

    @staticmethod
    def _sanitize_filename(filename: str) -> str:
        """ファイル名をサニタイズ"""
        # 危険な文字を除去
        import re
        safe_name = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)

        # 拡張子を保持
        file_ext = Path(filename).suffix
        name_without_ext = Path(safe_name).stem

        # 長さ制限
        if len(name_without_ext) > 50:
            name_without_ext = name_without_ext[:50]

        return f"{name_without_ext}{file_ext}"
```

### セキュリティチェックリスト

#### 開発時チェック
- [ ] 全ての外部入力を検証・サニタイズしているか
- [ ] 認証情報がハードコーディングされていないか
- [ ] パスワードが適切にハッシュ化されているか
- [ ] SQLインジェクション対策が実装されているか
- [ ] XSS対策が実装されているか
- [ ] ファイルアップロード時のセキュリティ検証があるか

#### デプロイ前チェック
- [ ] 環境変数が適切に設定されているか
- [ ] HTTPSが有効になっているか
- [ ] セキュリティヘッダーが設定されているか
- [ ] レート制限が実装されているか
- [ ] ログにシークレット情報が含まれていないか
- [ ] 依存関係の脆弱性チェックが完了しているか

#### 監視とアラート
- [ ] 認証失敗の監視が設定されているか
- [ ] 異常なアクセスパターンのアラートがあるか
- [ ] セキュリティログの保存・分析体制があるか
- [ ] インシデント対応手順が整備されているか

---

**適用優先度**: 🔴 最高（すべてのプロダクションコードに適用必須）
**更新頻度**: セキュリティ脅威の変化に合わせて定期的に更新