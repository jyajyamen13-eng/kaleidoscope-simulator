# 万華鏡シミュレーター - デプロイメント設定

## 必要な依存関係

requirements.txt
```
Flask==2.3.3
Flask-SocketIO==5.3.6
numpy==1.24.3
scipy==1.11.1
matplotlib==3.7.2
Pillow==10.0.0
python-socketio==5.8.0
python-engineio==4.7.1
eventlet==0.33.3
```

## 開発環境のセットアップ

### 1. 仮想環境の作成
```bash
python -m venv kaleidoscope_env
source kaleidoscope_env/bin/activate  # Linux/Mac
# kaleidoscope_env\Scripts\activate  # Windows
```

### 2. 依存関係のインストール
```bash
pip install -r requirements.txt
```

### 3. データベースの初期化
```bash
cd kaleidoscope_simulator
python database/init_db.py
```

### 4. アプリケーションの起動
```bash
python app.py
```

アプリケーションは http://localhost:5000 でアクセス可能です。

## 本番環境デプロイ

### Gunicorn + Nginx設定

#### 1. Gunicorn設定ファイル (gunicorn.conf.py)
```python
bind = "127.0.0.1:5000"
workers = 4
worker_class = "eventlet"
worker_connections = 1000
timeout = 30
keepalive = 2
user = "www-data"
group = "www-data"
tmp_upload_dir = None
max_requests = 1000
max_requests_jitter = 100
preload_app = True
```

#### 2. Nginx設定
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /path/to/kaleidoscope_simulator/app/static/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

#### 3. Systemdサービス設定
```ini
[Unit]
Description=Kaleidoscope Simulator
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/kaleidoscope_simulator
Environment=PATH=/path/to/kaleidoscope_env/bin
ExecStart=/path/to/kaleidoscope_env/bin/gunicorn -c gunicorn.conf.py app:app
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always

[Install]
WantedBy=multi-user.target
```

### Docker設定

#### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# システム依存関係のインストール
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Python依存関係のインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションファイルのコピー
COPY . .

# データベース初期化
RUN python database/init_db.py

# ポート設定
EXPOSE 5000

# アプリケーション起動
CMD ["gunicorn", "-c", "gunicorn.conf.py", "app:app"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  kaleidoscope:
    build: .
    ports:
      - "5000:5000"
    volumes:
      - ./database:/app/database
      - ./logs:/app/logs
    environment:
      - FLASK_ENV=production
      - SECRET_KEY=your-secret-key-here
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - kaleidoscope
    restart: unless-stopped
```

## 環境変数設定

.env ファイルの例:
```
FLASK_ENV=production
SECRET_KEY=your-very-secret-key-here
DATABASE_URL=sqlite:///database/kaleidoscope.db
MAX_RAYS=500
MAX_BOUNCES=20
MAX_CLIENTS=100
DEBUG=False
```

## パフォーマンス最適化

### 1. CPUコア数の設定
```python
# gunicorn.conf.py
import multiprocessing
workers = multiprocessing.cpu_count() * 2 + 1
```

### 2. Redis利用（セッション管理）
```python
# app.py に追加
import redis
from flask_session import Session

app.config['SESSION_TYPE'] = 'redis'
app.config['SESSION_REDIS'] = redis.from_url('redis://localhost:6379')
Session(app)
```

### 3. キャッシュ設定
```python
from flask_caching import Cache

cache = Cache(app, config={'CACHE_TYPE': 'redis'})
```

## 監視とログ

### ログ設定
```python
import logging
from logging.handlers import RotatingFileHandler

if not app.debug:
    file_handler = RotatingFileHandler('logs/kaleidoscope.log', 
                                     maxBytes=10240000, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
```

### システム監視
- CPU使用率
- メモリ使用量
- ディスク容量
- ネットワーク帯域
- WebSocket接続数
- レスポンス時間

## セキュリティ設定

### HTTPS設定
```python
from flask_talisman import Talisman

Talisman(app, force_https=True)
```

### CORS設定
```python
from flask_cors import CORS

CORS(app, origins=['https://your-domain.com'])
```

### Rate Limiting
```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["1000 per day", "100 per hour"]
)
```

## バックアップ設定

### データベースバックアップスクリプト
```bash
#!/bin/bash
BACKUP_DIR="/backup/kaleidoscope"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="database/kaleidoscope.db"

mkdir -p $BACKUP_DIR
cp $DB_FILE $BACKUP_DIR/kaleidoscope_$DATE.db
find $BACKUP_DIR -name "kaleidoscope_*.db" -mtime +7 -delete
```

### 設定ファイルのバックアップ
- データベース
- 設定ファイル
- ログファイル
- アップロードされたファイル

## 負荷テスト

### Apache Bench (ab) を使用した基本テスト
```bash
ab -n 1000 -c 10 http://localhost:5000/
ab -n 100 -c 5 -p simulation_request.json -T application/json http://localhost:5000/api/simulate
```

### WebSocket負荷テスト
```python
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:5000/socket.io/?transport=websocket"
    async with websockets.connect(uri) as websocket:
        # テストメッセージ送信
        await websocket.send(json.dumps({
            "type": "realtime_simulation",
            "data": {"config_id": 1, "num_rays": 50}
        }))
        response = await websocket.recv()
        print(response)

# 複数接続テスト
asyncio.gather(*[test_websocket() for _ in range(50)])
```

## トラブルシューティング

### 一般的な問題

1. **メモリ不足**: 光線数やバウンス回数を減らす
2. **CPU過負荷**: ワーカー数を調整
3. **WebSocket接続エラー**: Nginx設定を確認
4. **データベース接続エラー**: パス設定を確認

### デバッグ方法
```python
# デバッグモードでの起動
export FLASK_ENV=development
export FLASK_DEBUG=1
python app.py
```

### パフォーマンス分析
```python
import cProfile
import pstats

def profile_simulation():
    pr = cProfile.Profile()
    pr.enable()
    # シミュレーション実行
    pr.disable()
    stats = pstats.Stats(pr)
    stats.sort_stats('cumulative')
    stats.print_stats(10)
```

## 更新とメンテナンス

### アプリケーション更新手順
1. サービス停止
2. バックアップ作成
3. コード更新
4. 依存関係更新
5. データベースマイグレーション
6. サービス再起動
7. 動作確認

### 定期メンテナンス
- ログファイルの定期削除
- データベース最適化
- セキュリティアップデート
- パフォーマンス監視

## サポートとドキュメント

- API仕様書: /docs/API_SPECIFICATION.md
- ユーザーマニュアル: /docs/USER_MANUAL.md
- 技術仕様書: /docs/TECHNICAL_SPECIFICATION.md
- 変更履歴: /CHANGELOG.md
