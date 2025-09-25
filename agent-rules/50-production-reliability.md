# 50. プロダクション信頼性

## プロダクション信頼性原則

プロダクションシステムの信頼性を確保するための包括的な開発・テスト・デバッグプリンシプル。
テスト駆動開発、エラーハンドリング、統合テストを通じてシステムの堅牢性を保証する。

### 1. Test-First Error Discovery Principle
**テストファーストエラー発見原則**

```
エラーは本番環境で発見するのではなく、テスト環境で事前に発見・修正する
```

- **統合テストの必須化**: 個別メソッドテストだけでは不十分
- **実際のワークフローテスト**: システム全体の動作パターンをテスト
- **エッジケーステスト**: undefined、null、空文字等の境界値テスト

### 2. Defensive Programming by Default
**デフォルト防御的プログラミング**

```javascript
// ❌ 危険: 直接プロパティアクセス
const score = metrics.security.securityScore;

// ✅ 安全: 防御的アクセス
const score = metrics.security ?
  metrics.security.securityScore :
  DEFAULT_SECURITY_SCORE;

// ✅ より安全: Optional Chaining（可能な場合）
const score = metrics.security?.securityScore ?? DEFAULT_SECURITY_SCORE;
```

- **すべての外部入力を疑う**: API戻り値、設定ファイル、環境変数
- **デフォルト値の必須設定**: 予期しない状態でも継続動作可能
- **早期バリデーション**: データ使用前に型・存在チェック

### 3. Interface Contract Verification
**インターフェース契約検証**

```javascript
// ❌ 暗黙の契約依存
function processQuality(report) {
  return report.overallQuality.toFixed(1); // 契約違反で実行時エラー
}

// ✅ 明示的契約検証
function processQuality(report) {
  if (!report?.assessment?.overallScore) {
    throw new Error('Invalid quality report structure');
  }
  return report.assessment.overallScore.toFixed(1);
}
```

- **API契約の明示化**: 入力・出力の構造を明確に定義
- **バージョン間互換性**: 構造変更時の後方互換性確保
- **契約違反の早期検出**: 実行時ではなく開発時に発見

## 信頼性テスト戦略

### 必須テストパターン

#### A. エラーハンドリングテスト
```python
def test_undefinedメトリクスでも正常動作する():
    """undefinedメトリクスが渡されても例外を投げずに処理すること"""
    result = evaluator.calculate_assessment({
        'code_metrics': None,
        'test_metrics': None,
        'security_metrics': None
    })
    assert result['overall_score'] >= 0
    assert result['success'] == True

def test_不正なデータ形式でエラーメッセージを返す():
    """不正なデータ形式では適切なエラーメッセージを返すこと"""
    result = evaluator.calculate_assessment("invalid_data")
    assert result['success'] == False
    assert 'データ形式' in result['error']
```

#### B. 統合ワークフローテスト
```python
def test_システム全体が正常に動作する():
    """システム全体の統合テスト"""
    # 1. システム初期化
    system = QualitySystem()

    # 2. データ準備
    test_codebase = create_test_codebase()

    # 3. 完全な評価実行
    result = system.perform_full_evaluation(test_codebase)

    # 4. 結果検証
    assert result['success'] == True
    assert isinstance(result['score'], (int, float))
    assert 0 <= result['score'] <= 100
    assert 'assessment' in result
    assert 'timestamp' in result
```

#### C. インターフェース契約テスト
```python
def test_API契約_期待される構造でデータを返す():
    """APIが期待される構造でデータを返すこと"""
    result = api.get_quality_report(project_id=1)

    # 必須フィールドの存在確認
    required_fields = ['assessment', 'timestamp', 'success']
    for field in required_fields:
        assert field in result, f"必須フィールド '{field}' が存在しません"

    # assessment構造の確認
    assessment = result['assessment']
    assert 'overall_score' in assessment
    assert isinstance(assessment['overall_score'], (int, float))
    assert 0 <= assessment['overall_score'] <= 100
```

### 系統的デバッグアプローチ

```
1. エラーの再現 → テストケースで確実に再現
2. 原因の特定 → ログ・デバッガーで根本原因調査
3. 修正の実装 → 最小限の変更で問題解決
4. テストで検証 → 修正が問題を解決することを確認
5. 回帰テスト → 他機能に影響がないことを確認
```

### 修正品質基準

- **単一責任**: 1つの修正は1つの問題のみ解決
- **最小影響**: 既存コードへの影響を最小限に
- **テスト可能**: 修正内容をテストで検証可能
- **文書化**: 修正理由と変更内容を明確に記録

## 堅牢なシステム設計

### エラーハンドリング戦略

```python
class QualityEvaluator:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.default_config = self._load_default_config()

    def evaluate_quality(self, codebase=None):
        """堅牢な品質評価メソッド"""
        try:
            # 防御的バリデーション
            if codebase is None:
                codebase = {}

            metrics = self._collect_metrics(codebase)
            assessment = self._calculate_assessment(metrics)

            return {
                'success': True,
                'assessment': {
                    'overall_score': assessment.get('overall_score', 0),
                    'category_scores': assessment.get('category_scores', {}),
                    'grade': assessment.get('grade', 'F')
                },
                'timestamp': datetime.now().isoformat(),
                'error': None
            }

        except ValidationError as e:
            self.logger.error(f'バリデーションエラー: {e}')
            return self._create_error_response(f'入力データの検証に失敗しました: {e}')

        except Exception as e:
            self.logger.error(f'品質評価中にエラーが発生: {e}', exc_info=True)
            return self._create_error_response('品質評価処理でエラーが発生しました')

    def _create_error_response(self, error_message):
        """統一されたエラーレスポンスを作成"""
        return {
            'success': False,
            'assessment': self._get_default_assessment(),
            'timestamp': datetime.now().isoformat(),
            'error': error_message
        }

    def _get_default_assessment(self):
        """デフォルトの評価結果"""
        return {
            'overall_score': 0,
            'category_scores': {},
            'grade': 'F'
        }
```

### リソース管理とタイムアウト

```python
import asyncio
from contextlib import asynccontextmanager

class ResourceManager:
    def __init__(self, max_concurrent=10, timeout=30):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.timeout = timeout

    @asynccontextmanager
    async def managed_resource(self, resource_name):
        """リソースの安全な管理"""
        async with self.semaphore:
            self.logger.info(f"リソース取得: {resource_name}")
            try:
                # タイムアウト付きでリソース処理
                async with asyncio.timeout(self.timeout):
                    yield resource_name
            except asyncio.TimeoutError:
                self.logger.error(f"タイムアウト: {resource_name}")
                raise
            finally:
                self.logger.info(f"リソース解放: {resource_name}")

# 使用例
async def process_with_timeout(data):
    rm = ResourceManager(max_concurrent=5, timeout=10)

    async with rm.managed_resource("quality_analysis") as resource:
        # 実際の処理
        result = await analyze_quality(data)
        return result
```

## プロダクション品質チェックリスト

### 起動前チェック ✅

- [ ] 全ユニットテストがパス
- [ ] 統合テストがパス
- [ ] システム起動テストがパス
- [ ] エラーハンドリングテストがパス
- [ ] メモリリーク・パフォーマンステストがパス
- [ ] セキュリティテストがパス

### コードレビューチェック ✅

- [ ] 防御的プログラミングが実装されている
- [ ] エラーハンドリングが適切
- [ ] インターフェース契約が明確
- [ ] テストカバレッジが十分（80%以上）
- [ ] ログ・監視が適切
- [ ] リソース管理が実装されている

### デプロイ前チェック ✅

- [ ] 本番相当環境でのテスト完了
- [ ] ロールバック手順確認済み
- [ ] 監視・アラート設定済み
- [ ] 文書化完了（変更履歴、運用手順）
- [ ] 依存関係の脆弱性チェック完了
- [ ] パフォーマンステスト完了

## 継続的改善

### 品質メトリクス監視

- **テスト成功率**: 95%以上を維持
- **エラー発生率**: 本番環境で月1件未満
- **MTTR（平均復旧時間）**: 30分以内
- **テストカバレッジ**: 80%以上
- **コードレビューカバレッジ**: 100%

### 学習サイクル

```
問題発生 → 原因分析 → プロセス改善 → 再発防止策 → 文書化 → チーム共有
```

### インシデント対応フロー

1. **検知**: 自動監視またはユーザー報告
2. **初期対応**: 影響範囲の特定と応急処置
3. **根本原因分析**: ログ調査と再現テスト
4. **恒久対策**: 修正実装とテスト
5. **予防策**: 同様の問題を防ぐ仕組みの実装
6. **文書化**: インシデント報告書の作成
7. **改善**: プロセスと監視の見直し

---

**適用優先度**: 🔴 絶対最高（すべてのプロダクションコードに適用必須）
**更新頻度**: インシデント発生時とプロジェクト経験に基づいて随時更新