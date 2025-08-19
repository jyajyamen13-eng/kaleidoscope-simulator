# 万華鏡シミュレーター - 光学物理計算システム

![万華鏡シミュレーター](docs/images/kaleidoscope_banner.png)

## 概要

万華鏡シミュレーターは、真の光学物理理論に基づく本格的な万華鏡パターン生成システムです。フレネル方程式、スネルの法則、レイリー散乱などの高度な光学理論を実装し、リアルタイムで美しい万華鏡パターンを生成・可視化します。

## 主な特徴

### 🔬 真の光学物理計算
- **フレネル方程式**: 偏光を考慮した正確な反射率計算
- **スネルの法則**: 屈折現象の物理的シミュレーション
- **レイリー散乱**: 表面粗さによる散乱効果
- **分散効果**: 波長による屈折率変化

### 🌈 高度な可視化機能
- **2D/3D表示**: 多角的な万華鏡パターン表示
- **リアルタイム更新**: パラメータ変更の即座反映
- **スペクトル分析**: 色彩分布の科学的分析
- **高解像度エクスポート**: 研究・教育用の画像出力

### 🔧 柔軟な設定システム
- **多様な材料**: 銀、金、ガラス等の物理的特性
- **複数光源**: 波長・強度・位置の個別設定
- **物理モード**: ドライ・ウェット環境の切り替え
- **プリセット管理**: 設定の保存・共有機能

### 🚀 高性能アーキテクチャ
- **SQLiteデータベース**: 設定とシミュレーション結果の永続化
- **WebSocket通信**: リアルタイム双方向通信
- **RESTful API**: 外部システムとの統合
- **響応式UI**: デスクトップ・モバイル対応

## 技術仕様

### システム要件
- Python 3.8以上
- NumPy, SciPy (数値計算)
- Flask, Flask-SocketIO (Webアプリケーション)
- SQLite (データベース)

### アーキテクチャ
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend UI   │◄──►│  Flask Backend   │◄──►│  Optical Engine │
│ HTML/CSS/JS     │    │  REST API        │    │  NumPy/SciPy    │
│ WebSocket       │    │  WebSocket       │    │  Physics Calc   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ SQLite Database  │
                       │ Config & Results │
                       └──────────────────┘
```

## クイックスタート

### 1. リポジトリのクローン
```bash
git clone https://github.com/your-username/kaleidoscope-simulator.git
cd kaleidoscope-simulator
```

### 2. 仮想環境のセットアップ
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows
```

### 3. 依存関係のインストール
```bash
pip install -r requirements.txt
```

### 4. データベースの初期化
```bash
python database/init_db.py
```

### 5. アプリケーションの起動
```bash
python app.py
```

### 6. ブラウザでアクセス
http://localhost:5000 を開いてシミュレーターをお楽しみください！

## 使用方法

### 基本的な操作手順

1. **設定の選択**: 左パネルから万華鏡設定を選択
2. **パラメータ調整**: ミラー数、材料、光源特性を設定
3. **シミュレーション実行**: 「シミュレーション実行」ボタンをクリック
4. **結果の確認**: 中央エリアで生成されたパターンを観察
5. **分析とエクスポート**: スペクトル分析結果の確認と画像保存

### 高度な機能

#### リアルタイムモード
```javascript
// WebSocketを使用したリアルタイム更新
socket.emit('realtime_simulation', {
  config_id: 1,
  num_rays: 100,
  max_bounces: 10
});
```

#### カスタム材料作成
```python
custom_material = {
    "name": "カスタム合金",
    "reflectance": 0.92,
    "roughness": 0.015,
    "refractive_index": 1.8
}
```

#### API経由でのシミュレーション
```bash
curl -X POST http://localhost:5000/api/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "config_id": 1,
    "num_rays": 200,
    "max_bounces": 15
  }'
```

## API仕様

詳細なAPI仕様については [API仕様書](docs/API_SPECIFICATION.md) をご参照ください。

### 主要エンドポイント

- `GET /api/configs` - 設定一覧取得
- `POST /api/simulate` - シミュレーション実行
- `GET /api/materials` - 材料一覧取得
- `WebSocket /socket.io/` - リアルタイム通信

## 開発者ガイド

### プロジェクト構造
```
kaleidoscope_simulator/
├── app/
│   ├── models/              # データモデル・物理エンジン
│   ├── views/               # ビューコントローラ
│   ├── static/              # CSS, JavaScript, 画像
│   └── templates/           # HTMLテンプレート
├── database/                # データベーススキーマ・初期化
├── config/                  # 設定ファイル
├── tests/                   # テストスイート
├── docs/                    # ドキュメント
├── app.py                   # メインアプリケーション
└── requirements.txt         # Python依存関係
```

### 開発環境のセットアップ

1. **開発用依存関係の追加**:
```bash
pip install pytest pytest-cov black flake8
```

2. **テストの実行**:
```bash
pytest tests/ -v --cov=app
```

3. **コード品質チェック**:
```bash
black . --check
flake8 app/
```

### 貢献方法

1. フォークを作成
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## デプロイメント

本番環境でのデプロイについては [デプロイメントガイド](docs/DEPLOYMENT_GUIDE.md) をご参照ください。

### Docker を使用した簡単デプロイ
```bash
docker-compose up -d
```

### システム要件（本番環境）
- **CPU**: 4コア以上推奨
- **メモリ**: 8GB以上推奨
- **ストレージ**: SSD 50GB以上
- **ネットワーク**: 安定したインターネット接続

## 教育・研究での活用

### 教育分野
- **物理学教育**: 光学現象の視覚的理解
- **数学教育**: 対称性と幾何学の学習
- **プログラミング教育**: 科学計算の実践例

### 研究分野
- **光学研究**: 新材料の反射特性分析
- **パターン解析**: 対称性パターンの数理研究
- **可視化技術**: 科学データの表現手法

## ライセンス

このプロジェクトは MIT License の下で公開されています。詳細は [LICENSE](LICENSE) ファイルをご覧ください。

## サポート・コミュニティ

### 問い合わせ
- **バグレポート**: [GitHub Issues](https://github.com/your-username/kaleidoscope-simulator/issues)
- **機能要望**: [GitHub Discussions](https://github.com/your-username/kaleidoscope-simulator/discussions)
- **技術サポート**: support@kaleidoscope-sim.com

### コミュニティ
- **Discord**: [万華鏡シミュレーター コミュニティ](https://discord.gg/kaleidoscope-sim)
- **Twitter**: [@KaleidoscopeSim](https://twitter.com/KaleidoscopeSim)

## 謝辞

このプロジェクトは以下の優れたオープンソースライブラリを使用しています：
- NumPy & SciPy - 科学計算
- Flask & Flask-SocketIO - Webアプリケーション
- Chart.js - データ可視化
- その他多数のライブラリ開発者の皆様

## 変更履歴

詳細な変更履歴は [CHANGELOG.md](CHANGELOG.md) をご参照ください。

### v1.0.0 (2024-01-01)
- 初回リリース
- 基本的な光学計算エンジン実装
- WebベースUI完成
- リアルタイムシミュレーション対応

---

**万華鏡シミュレーター** - 科学と芸術の美しい融合
## デプロイテスト
