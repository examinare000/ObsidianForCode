# 70. Docker環境管理

## Docker設定標準

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
      DATABASE_URL: postgresql://user:password@db:5432/myapp
    volumes:
      - .:/app
      - app_cache:/app/.cache
    working_dir: /app
    command: python manage.py runserver 0.0.0.0:8000
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
  app_cache:

networks:
  default:
    name: myapp_network
```

### 言語別Dockerイメージ標準

#### Python
```yaml
services:
  app:
    image: python:3.11-alpine
    environment:
      PYTHONPATH: /app
      PYTHONUNBUFFERED: 1
    volumes:
      - .:/app
      - pip_cache:/root/.cache/pip
    working_dir: /app
    command: python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

volumes:
  pip_cache:
```

#### Node.js
```yaml
services:
  app:
    image: node:18-alpine
    environment:
      NODE_ENV: development
    volumes:
      - .:/app
      - node_modules:/app/node_modules
    working_dir: /app
    command: npm run dev
    ports:
      - "3000:3000"

volumes:
  node_modules:
```

#### Go
```yaml
services:
  app:
    image: golang:1.21-alpine
    environment:
      CGO_ENABLED: 0
      GOOS: linux
    volumes:
      - .:/app
      - go_cache:/go/pkg/mod
    working_dir: /app
    command: go run main.go
    ports:
      - "8080:8080"

volumes:
  go_cache:
```

## 開発環境構築

### 基本セットアップ
```bash
# プロジェクトディレクトリに移動
cd /path/to/project

# 環境変数ファイルを作成
cp .env.example .env

# Docker環境を起動
docker compose up -d

# ログを確認
docker compose logs -f app
```

### 開発用コマンド
```bash
# コンテナに入る
docker compose exec app bash

# 特定のコマンドを実行
docker compose run --rm app python manage.py migrate
docker compose run --rm app npm test
docker compose run --rm app go test ./...

# 依存関係をインストール
docker compose run --rm app pip install -r requirements.txt
docker compose run --rm app npm install

# 環境をリセット
docker compose down -v
docker compose up --build -d
```

## ツール作成原則

### Docker化必須原則
ツールを作成する際は、必ずDockerコンテナ上で実行できるようにします。

#### 開発ツールのDocker化例
```yaml
# compose.yml
services:
  dev-tools:
    build:
      context: .
      dockerfile: Dockerfile.tools
    volumes:
      - .:/workspace
    working_dir: /workspace
    environment:
      - PYTHONPATH=/workspace
    profiles:
      - tools

  test:
    extends: dev-tools
    command: pytest tests/ -v
    profiles:
      - test

  lint:
    extends: dev-tools
    command: flake8 src/
    profiles:
      - lint

  format:
    extends: dev-tools
    command: black src/ tests/
    profiles:
      - format
```

#### 実行例
```bash
# テスト実行
docker compose --profile test run --rm test

# リント実行
docker compose --profile lint run --rm lint

# フォーマット実行
docker compose --profile format run --rm format

# 開発用コンテナに入る
docker compose --profile tools run --rm dev-tools bash
```

### Dockerfile作成標準

#### Python用Dockerfile
```dockerfile
FROM python:3.11-alpine

# システムパッケージをインストール
RUN apk add --no-cache \
    gcc \
    musl-dev \
    postgresql-dev \
    git

# 作業ディレクトリを設定
WORKDIR /app

# 依存関係をコピーしてインストール
COPY requirements*.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションをコピー
COPY . .

# 非rootユーザーを作成
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

USER appuser

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

#### Node.js用Dockerfile
```dockerfile
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonをコピーして依存関係をインストール
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションをコピー
COPY . .

# 非rootユーザーを作成
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["npm", "start"]
```

### マルチステージビルド

#### 本番用最適化Dockerfile
```dockerfile
# ビルドステージ
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 本番ステージ
FROM node:18-alpine AS production

# セキュリティ強化
RUN apk add --no-cache dumb-init

# 非rootユーザーを作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# 必要なファイルのみコピー
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# 本番依存関係のみインストール
RUN npm ci --only=production && npm cache clean --force

USER nodejs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

## 環境変数管理

### .env設定
```bash
# .env.example
# データベース
DATABASE_URL=postgresql://user:password@db:5432/myapp
REDIS_URL=redis://redis:6379/0

# アプリケーション
APP_ENV=development
APP_PORT=8000
APP_SECRET_KEY=your-secret-key-here

# 外部API
EXTERNAL_API_KEY=your-api-key-here
EXTERNAL_API_URL=https://api.example.com

# ログレベル
LOG_LEVEL=DEBUG
```

### Docker Compose環境変数
```yaml
services:
  app:
    env_file:
      - .env
    environment:
      # 開発環境固有の設定
      DEBUG: "true"
      DEVELOPMENT: "true"
    # または環境変数ファイルから読み込み
    # env_file: .env.development
```

## 開発効率向上

### ホットリロード設定
```yaml
services:
  app:
    volumes:
      - .:/app
      - /app/node_modules  # node_modules除外
    environment:
      NODE_ENV: development
    command: npm run dev  # ホットリロード有効
```

### デバッグ設定
```yaml
services:
  app:
    ports:
      - "8000:8000"
      - "9229:9229"  # Node.js デバッガーポート
    environment:
      NODE_OPTIONS: "--inspect=0.0.0.0:9229"
    command: npm run debug
```

### パフォーマンス最適化
```yaml
services:
  app:
    # CPUとメモリの制限
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
        reservations:
          memory: 512M

    # ヘルスチェック
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## トラブルシューティング

### 一般的な問題と解決策

#### ポート競合
```bash
# 使用中のポートを確認
docker compose ps

# 特定のポートを使用しているプロセスを確認
lsof -i :8000

# 別のポートを使用
# compose.yml で ports を変更: "8001:8000"
```

#### ボリューム権限問題
```bash
# 権限を修正
docker compose exec app chown -R $(id -u):$(id -g) /app

# または Dockerfile で権限設定
USER $(id -u):$(id -g)
```

#### キャッシュ問題
```bash
# イメージを完全に再ビルド
docker compose build --no-cache

# 全てのDockerキャッシュをクリア
docker system prune -a
```

---

**適用優先度**: 🟠 高（Docker使用プロジェクトでは必須）
**更新頻度**: Dockerベストプラクティスの進化に合わせて更新