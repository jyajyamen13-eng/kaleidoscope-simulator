
import sqlite3
import os
from datetime import datetime

class KaleidoscopeDatabase:
    def __init__(self, db_path="database/kaleidoscope.db"):
        self.db_path = db_path
        # データベースディレクトリが存在しない場合は作成
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.init_database()

    def init_database(self):
        """データベースのテーブルを初期化"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # kaleidoscope_configs テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS kaleidoscope_configs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    mirror_count INTEGER NOT NULL DEFAULT 3,
                    mirror_angles TEXT NOT NULL, -- JSON配列として保存
                    materials TEXT NOT NULL,     -- JSON配列として保存
                    physics_mode TEXT NOT NULL DEFAULT 'dry', -- 'dry' or 'wet'
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # light_sources テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS light_sources (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    config_id INTEGER,
                    wavelength REAL NOT NULL,
                    intensity REAL NOT NULL DEFAULT 1.0,
                    position_x REAL NOT NULL DEFAULT 0.0,
                    position_y REAL NOT NULL DEFAULT 0.0,
                    position_z REAL NOT NULL DEFAULT 1.0,
                    type TEXT NOT NULL DEFAULT 'point', -- 'point', 'directional', 'area'
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (config_id) REFERENCES kaleidoscope_configs (id)
                )
            """)

            # materials テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS materials (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    reflectance REAL NOT NULL DEFAULT 0.9,
                    dispersion REAL NOT NULL DEFAULT 1.0,
                    roughness REAL NOT NULL DEFAULT 0.0,
                    refractive_index REAL NOT NULL DEFAULT 1.5,
                    absorption_coefficient REAL NOT NULL DEFAULT 0.01,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # simulation_results テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS simulation_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    config_id INTEGER,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    performance_data TEXT, -- JSON形式でパフォーマンス指標を保存
                    ray_count INTEGER,
                    computation_time REAL,
                    memory_usage REAL,
                    quality_score REAL,
                    FOREIGN KEY (config_id) REFERENCES kaleidoscope_configs (id)
                )
            """)

            # user_presets テーブル（ユーザー設定保存用）
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_presets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    config_data TEXT NOT NULL, -- JSON形式で設定全体を保存
                    is_favorite BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_used TIMESTAMP
                )
            """)

            conn.commit()
            print("Database tables initialized successfully")

    def insert_default_materials(self):
        """デフォルトマテリアルの挿入"""
        default_materials = [
            ("Silver Mirror", 0.95, 1.0, 0.02, 0.05, 0.001, "高反射率の銀ミラー"),
            ("Glass Mirror", 0.90, 1.0, 0.01, 1.52, 0.005, "標準ガラスミラー"),
            ("Aluminum Mirror", 0.88, 1.0, 0.03, 1.44, 0.002, "アルミニウムミラー"),
            ("Gold Mirror", 0.92, 1.0, 0.05, 0.47, 0.003, "金メッキミラー"),
            ("Copper Mirror", 0.85, 1.0, 0.04, 0.62, 0.004, "銅ミラー")
        ]

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            for material in default_materials:
                cursor.execute("""
                    INSERT OR IGNORE INTO materials 
                    (name, reflectance, dispersion, roughness, refractive_index, 
                     absorption_coefficient, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, material)
            conn.commit()
            print("Default materials inserted")

    def insert_default_config(self):
        """デフォルト設定の挿入"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # デフォルトの万華鏡設定
            default_angles = json.dumps([60, 60, 60])  # 正三角形
            default_materials = json.dumps([1, 1, 1])  # すべて最初のマテリアル

            cursor.execute("""
                INSERT OR IGNORE INTO kaleidoscope_configs 
                (id, name, mirror_count, mirror_angles, materials, physics_mode)
                VALUES (1, 'Default Triangle', 3, ?, ?, 'dry')
            """, (default_angles, default_materials))

            # デフォルト光源
            cursor.execute("""
                INSERT OR IGNORE INTO light_sources 
                (config_id, wavelength, intensity, position_x, position_y, position_z, type)
                VALUES (1, 550.0, 1.0, 0.0, 0.0, 1.0, 'point')
            """)

            conn.commit()
            print("Default configuration inserted")

if __name__ == "__main__":
    # データベース初期化の実行
    db = KaleidoscopeDatabase()
    db.insert_default_materials()
    db.insert_default_config()
    print("Database initialization completed!")
