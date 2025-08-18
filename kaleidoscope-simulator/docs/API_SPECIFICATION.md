# 万華鏡シミュレーター API仕様書

## 概要

万華鏡シミュレーターは、真の光学物理計算に基づく万華鏡パターン生成システムです。フレネル方程式、スネルの法則、レイリー散乱などの光学理論を実装し、リアルタイムでの万華鏡パターン生成と可視化を提供します。

## ベースURL

```
http://localhost:5000/api
```

## 認証

現在のバージョンでは認証は不要です。

## エンドポイント一覧

### 1. 設定管理

#### GET /configs
万華鏡設定一覧を取得

**レスポンス:**
```json
{
  "success": true,
  "configs": [
    {
      "id": 1,
      "name": "Default Triangle",
      "mirror_count": 3,
      "physics_mode": "dry",
      "created_at": "2024-01-01T00:00:00"
    }
  ]
}
```

#### GET /config/{id}
特定の設定詳細を取得

**パラメータ:**
- `id` (integer): 設定ID

**レスポンス:**
```json
{
  "success": true,
  "config": {
    "id": 1,
    "name": "Default Triangle",
    "mirror_count": 3,
    "mirror_angles": [60, 60, 60],
    "materials": {
      "1": {
        "name": "Silver Mirror",
        "reflectance": 0.95,
        "dispersion": 1.0,
        "roughness": 0.02,
        "refractive_index": 0.05,
        "absorption_coefficient": 0.001
      }
    },
    "material_ids": [1, 1, 1],
    "physics_mode": "dry",
    "light_sources": [
      {
        "wavelength": 550.0,
        "intensity": 1.0,
        "position_x": 0.0,
        "position_y": 0.0,
        "position_z": 1.0,
        "type": "point"
      }
    ]
  }
}
```

#### POST /config
新しい設定を作成

**リクエストボディ:**
```json
{
  "name": "Custom Configuration",
  "mirror_count": 4,
  "mirror_angles": [90, 90, 90, 90],
  "material_ids": [1, 2, 1, 2],
  "physics_mode": "wet",
  "light_sources": [
    {
      "wavelength": 650.0,
      "intensity": 1.2,
      "position": [0.0, 0.0, 1.5],
      "type": "point"
    }
  ]
}
```

**レスポンス:**
```json
{
  "success": true,
  "config_id": 2
}
```

### 2. 材料管理

#### GET /materials
利用可能な材料一覧を取得

**レスポンス:**
```json
{
  "success": true,
  "materials": [
    {
      "id": 1,
      "name": "Silver Mirror",
      "reflectance": 0.95,
      "dispersion": 1.0,
      "roughness": 0.02,
      "refractive_index": 0.05,
      "absorption_coefficient": 0.001,
      "description": "高反射率の銀ミラー"
    }
  ]
}
```

### 3. シミュレーション実行

#### POST /simulate
万華鏡シミュレーションを実行

**リクエストボディ:**
```json
{
  "config_id": 1,
  "num_rays": 200,
  "max_bounces": 15
}
```

**パラメータ詳細:**
- `config_id` (integer, optional): 使用する設定ID。nullの場合は新規設定として扱う
- `num_rays` (integer): 生成する光線数 (10-500)
- `max_bounces` (integer): 最大反射回数 (3-20)
- `mirror_count` (integer, optional): ミラー数 (config_idがnullの場合必須)
- `material_ids` (array, optional): 材料IDの配列
- `physics_mode` (string, optional): 物理モード ("dry" or "wet")
- `light_sources` (array, optional): 光源設定

**レスポンス:**
```json
{
  "success": true,
  "simulation_result": {
    "ray_paths": [
      {
        "origin": [0.0, 0.0, 1.0],
        "direction": [0.0, 0.0, -1.0],
        "wavelength": 550.0,
        "intensity": 0.95,
        "rgb": [0.0, 1.0, 0.0]
      }
    ],
    "surfaces": [
      {
        "point": [1.0, 0.0, 0.0],
        "normal": [-1.0, 0.0, 0.0],
        "material_id": 1
      }
    ],
    "pattern_data": {
      "points": [
        {
          "x": 0.5,
          "y": 0.3,
          "intensity": 0.8,
          "rgb": [0.0, 1.0, 0.0],
          "wavelength": 550.0
        }
      ],
      "bounds": {
        "min_x": -1.0,
        "max_x": 1.0,
        "min_y": -1.0,
        "max_y": 1.0
      }
    },
    "performance": {
      "ray_count": 1245,
      "computation_time": 0.285,
      "initial_rays": 200,
      "avg_bounces": 6.225,
      "total_intensity": 85.6
    }
  }
}
```

### 4. パフォーマンス情報

#### GET /performance
パフォーマンス履歴を取得

**レスポンス:**
```json
{
  "success": true,
  "history": [
    {
      "timestamp": "2024-01-01T12:00:00",
      "ray_count": 1245,
      "computation_time": 0.285,
      "quality_score": 0.87,
      "config_name": "Default Triangle"
    }
  ]
}
```

## WebSocket イベント

WebSocketエンドポイント: `ws://localhost:5000/socket.io/`

### 接続イベント

#### connect
クライアント接続時に発生

**サーバーからの応答:**
```json
{
  "event": "connected",
  "data": "Connected to kaleidoscope simulator"
}
```

#### disconnect
クライアント切断時に発生

### シミュレーションイベント

#### realtime_simulation
リアルタイムシミュレーションの実行

**クライアントからの送信:**
```json
{
  "config_id": 1,
  "num_rays": 50,
  "max_bounces": 5
}
```

**サーバーからの応答:**
```json
{
  "event": "simulation_result",
  "pattern_data": {
    "points": [/* パターンデータ */],
    "bounds": {/* 境界情報 */}
  },
  "performance": {/* パフォーマンス情報 */}
}
```

#### update_config
設定変更の通知

**クライアントからの送信:**
```json
{
  "config_changes": {
    "mirror_count": 4,
    "physics_mode": "wet"
  }
}
```

**サーバーからの応答（ブロードキャスト）:**
```json
{
  "event": "config_updated",
  "data": {/* 変更された設定 */}
}
```

### エラーイベント

#### simulation_error
シミュレーション実行エラー

```json
{
  "event": "simulation_error",
  "error": "Invalid configuration: mirror count must be between 3 and 8"
}
```

#### update_error
設定更新エラー

```json
{
  "event": "update_error", 
  "error": "Failed to update configuration"
}
```

## エラーレスポンス

すべてのAPIエンドポイントは、エラー時に以下の形式でレスポンスを返します：

```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

### 一般的なHTTPステータスコード

- `200 OK`: 正常処理
- `400 Bad Request`: リクエストパラメータエラー
- `404 Not Found`: リソースが見つからない
- `500 Internal Server Error`: サーバー内部エラー

## 光学物理パラメータ

### 材料特性

- `reflectance`: 反射率 (0.0-1.0)
- `dispersion`: 分散係数 (0.5-2.0)
- `roughness`: 表面粗さ (0.001-0.1)
- `refractive_index`: 屈折率 (1.0-3.0)
- `absorption_coefficient`: 吸収係数 (0.001-0.1)

### 光源パラメータ

- `wavelength`: 波長 (380-750 nm)
- `intensity`: 強度 (0.1-2.0)
- `position`: 3D座標 [x, y, z]
- `type`: 光源タイプ ("point", "directional", "area")

### 物理モード

- `dry`: 標準的な反射特性
- `wet`: 水分による反射率向上、散乱角度の変化

## 使用例

### 基本的なシミュレーション実行

```javascript
// 設定一覧の取得
fetch('/api/configs')
  .then(response => response.json())
  .then(data => console.log(data.configs));

// シミュレーション実行
fetch('/api/simulate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    config_id: 1,
    num_rays: 100,
    max_bounces: 10
  })
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    // パターンデータの処理
    renderPattern(data.simulation_result.pattern_data);
  }
});
```

### WebSocketを使用したリアルタイム通信

```javascript
const socket = io();

socket.on('connect', () => {
  console.log('Connected to simulator');
});

socket.on('simulation_result', (data) => {
  // リアルタイム結果の処理
  updatePattern(data.pattern_data);
  updateMetrics(data.performance);
});

// リアルタイムシミュレーション開始
socket.emit('realtime_simulation', {
  config_id: 1,
  num_rays: 50,
  max_bounces: 5
});
```

## 制限事項

- 同時接続数: 最大100クライアント
- 最大光線数: 500本 (パフォーマンス考慮)
- 最大反射回数: 20回
- WebSocketメッセージサイズ: 最大1MB

## バージョン情報

- API Version: 1.0
- 光学エンジンバージョン: 1.0
- 対応ブラウザ: Chrome 90+, Firefox 88+, Safari 14+

## サポート

技術的な質問やバグレポートについては、プロジェクトリポジトリのIssueをご利用ください。
