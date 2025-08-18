
import numpy as np
from typing import List, Dict, Tuple
import json
import time
import sqlite3
from .optical_engine import OpticalEngine, Ray, Surface, Material, PhysicsMode

class KaleidoscopeSimulator:
    """万華鏡シミュレーターのメインクラス"""

    def __init__(self, db_path="database/kaleidoscope.db"):
        self.db_path = db_path
        self.engine = OpticalEngine()
        self.current_config = None
        self.current_surfaces = []
        self.performance_metrics = {}

    def load_config_from_db(self, config_id: int) -> Dict:
        """データベースから設定を読み込む"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # 基本設定の取得
            cursor.execute("""
                SELECT name, mirror_count, mirror_angles, materials, physics_mode
                FROM kaleidoscope_configs 
                WHERE id = ?
            """, (config_id,))

            config_row = cursor.fetchone()
            if not config_row:
                raise ValueError(f"Configuration with id {config_id} not found")

            name, mirror_count, mirror_angles_json, materials_json, physics_mode = config_row

            # 光源情報の取得
            cursor.execute("""
                SELECT wavelength, intensity, position_x, position_y, position_z, type
                FROM light_sources
                WHERE config_id = ?
            """, (config_id,))

            light_sources = cursor.fetchall()

            # マテリアル情報の取得
            material_ids = json.loads(materials_json)
            materials = {}
            for mat_id in set(material_ids):
                cursor.execute("""
                    SELECT name, reflectance, dispersion, roughness, 
                           refractive_index, absorption_coefficient
                    FROM materials WHERE id = ?
                """, (mat_id,))
                mat_row = cursor.fetchone()
                if mat_row:
                    materials[mat_id] = Material(*mat_row)

            config = {
                'id': config_id,
                'name': name,
                'mirror_count': mirror_count,
                'mirror_angles': json.loads(mirror_angles_json),
                'materials': materials,
                'material_ids': material_ids,
                'physics_mode': PhysicsMode(physics_mode),
                'light_sources': light_sources
            }

            self.current_config = config
            return config

    def create_mirror_surfaces(self, config: Dict) -> List[Surface]:
        """ミラー面の生成"""
        surfaces = []
        mirror_count = config['mirror_count']
        mirror_angles = config['mirror_angles']
        material_ids = config['material_ids']

        # 万華鏡の中心からの距離
        radius = 1.0

        for i in range(mirror_count):
            # 角度計算
            angle = 2.0 * np.pi * i / mirror_count

            # ミラーの位置と法線ベクトル
            # 内向きの法線（中心に向かう）
            normal = np.array([-np.cos(angle), -np.sin(angle), 0.0])
            point = np.array([radius * np.cos(angle), radius * np.sin(angle), 0.0])

            # マテリアルIDの取得
            mat_id = material_ids[i] if i < len(material_ids) else material_ids[0]

            surface = Surface(point=point, normal=normal, material_id=mat_id)
            surfaces.append(surface)

        self.current_surfaces = surfaces
        return surfaces

    def setup_optical_engine(self, config: Dict):
        """光学エンジンの設定"""
        self.engine = OpticalEngine(config['physics_mode'])

        # マテリアルの追加
        for mat_id, material in config['materials'].items():
            self.engine.add_material(mat_id, material)

    def generate_initial_rays(self, config: Dict, num_rays: int = 100) -> List[Ray]:
        """初期光線の生成"""
        rays = []

        for light_source in config['light_sources']:
            wavelength, intensity, pos_x, pos_y, pos_z, light_type = light_source

            # 各光源から複数の光線を生成
            rays_per_source = num_rays // len(config['light_sources'])

            for i in range(rays_per_source):
                # 光源位置からランダムな方向への光線
                origin = np.array([pos_x, pos_y, pos_z])

                # ランダムな方向（下向き優先）
                theta = np.random.uniform(0, np.pi/3)  # 60度コーン内
                phi = np.random.uniform(0, 2*np.pi)

                direction = np.array([
                    np.sin(theta) * np.cos(phi),
                    np.sin(theta) * np.sin(phi),
                    -np.cos(theta)  # 下向き
                ])

                ray = Ray(
                    origin=origin,
                    direction=direction,
                    wavelength=wavelength,
                    intensity=intensity / rays_per_source
                )

                rays.append(ray)

        return rays

    def run_simulation(self, config_id: int, num_rays: int = 100, 
                      max_bounces: int = 10) -> Dict:
        """シミュレーション実行"""
        start_time = time.time()

        # 設定の読み込み
        config = self.load_config_from_db(config_id)

        # 光学エンジンの設定
        self.setup_optical_engine(config)

        # ミラー面の生成
        surfaces = self.create_mirror_surfaces(config)

        # 初期光線の生成
        initial_rays = self.generate_initial_rays(config, num_rays)

        # 光線追跡の実行
        all_ray_paths = []
        for ray in initial_rays:
            ray_path = self.engine.trace_ray(ray, surfaces, max_bounces)
            all_ray_paths.extend(ray_path)

        # パフォーマンス指標の計算
        computation_time = time.time() - start_time

        self.performance_metrics = {
            'ray_count': len(all_ray_paths),
            'computation_time': computation_time,
            'initial_rays': len(initial_rays),
            'avg_bounces': len(all_ray_paths) / len(initial_rays) if initial_rays else 0,
            'total_intensity': sum(ray.intensity for ray in all_ray_paths)
        }

        # 結果の保存
        self.save_simulation_result(config_id)

        return {
            'config': config,
            'ray_paths': all_ray_paths,
            'surfaces': surfaces,
            'performance': self.performance_metrics
        }

    def save_simulation_result(self, config_id: int):
        """シミュレーション結果をデータベースに保存"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO simulation_results 
                (config_id, performance_data, ray_count, computation_time, 
                 memory_usage, quality_score)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                config_id,
                json.dumps(self.performance_metrics),
                self.performance_metrics['ray_count'],
                self.performance_metrics['computation_time'],
                0,  # メモリ使用量（実装保留）
                self.calculate_quality_score()
            ))

            conn.commit()

    def calculate_quality_score(self) -> float:
        """品質スコアの計算"""
        # 光線数、計算時間、総強度から品質を評価
        metrics = self.performance_metrics

        # 正規化された指標
        ray_score = min(1.0, metrics['ray_count'] / 1000.0)
        time_score = max(0.0, 1.0 - metrics['computation_time'] / 10.0)  # 10秒以内が理想
        intensity_score = min(1.0, metrics['total_intensity'] / metrics['initial_rays'] * 10)

        return (ray_score + time_score + intensity_score) / 3.0

    def create_pattern_visualization_data(self, ray_paths: List[Ray]) -> Dict:
        """パターン可視化用データの生成"""
        # 光線の最終位置と色情報を収集
        pattern_points = []

        for ray in ray_paths:
            # 観察面（z=0）での投影位置を計算
            if ray.direction[2] != 0:
                t = -ray.origin[2] / ray.direction[2]
                if t > 0:  # 前方投影のみ
                    projection_point = ray.origin + t * ray.direction
                    rgb = self.engine.calculate_wavelength_to_rgb(ray.wavelength)

                    pattern_points.append({
                        'x': projection_point[0],
                        'y': projection_point[1],
                        'intensity': ray.intensity,
                        'rgb': rgb,
                        'wavelength': ray.wavelength
                    })

        return {
            'points': pattern_points,
            'bounds': self.calculate_pattern_bounds(pattern_points)
        }

    def calculate_pattern_bounds(self, points: List[Dict]) -> Dict:
        """パターンの境界計算"""
        if not points:
            return {'min_x': 0, 'max_x': 0, 'min_y': 0, 'max_y': 0}

        x_coords = [p['x'] for p in points]
        y_coords = [p['y'] for p in points]

        return {
            'min_x': min(x_coords),
            'max_x': max(x_coords),
            'min_y': min(y_coords),
            'max_y': max(y_coords)
        }

# テスト用の実行関数
if __name__ == "__main__":
    simulator = KaleidoscopeSimulator()

    # デフォルト設定でシミュレーション実行
    try:
        result = simulator.run_simulation(config_id=1, num_rays=50, max_bounces=5)
        print(f"シミュレーション完了:")
        print(f"  光線数: {result['performance']['ray_count']}")
        print(f"  計算時間: {result['performance']['computation_time']:.3f}秒")
        print(f"  平均反射回数: {result['performance']['avg_bounces']:.2f}")
    except Exception as e:
        print(f"シミュレーションエラー: {e}")
