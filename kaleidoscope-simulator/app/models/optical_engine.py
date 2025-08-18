
import numpy as np
import math
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
from enum import Enum

class PhysicsMode(Enum):
    DRY = "dry"
    WET = "wet"

@dataclass
class Ray:
    """光線を表すクラス"""
    origin: np.ndarray  # 光線の起点 (3D)
    direction: np.ndarray  # 光線の方向ベクトル (3D)
    wavelength: float  # 波長 (nm)
    intensity: float  # 強度
    polarization: np.ndarray = None  # 偏光状態

    def __post_init__(self):
        # 方向ベクトルを正規化
        self.direction = self.direction / np.linalg.norm(self.direction)
        if self.polarization is None:
            self.polarization = np.array([1.0, 0.0])  # デフォルトはs偏光

@dataclass
class Surface:
    """反射面を表すクラス"""
    point: np.ndarray  # 面上の一点 (3D)
    normal: np.ndarray  # 法線ベクトル (3D)
    material_id: int  # マテリアルID

    def __post_init__(self):
        # 法線ベクトルを正規化
        self.normal = self.normal / np.linalg.norm(self.normal)

@dataclass
class Material:
    """材料特性を表すクラス"""
    name: str
    reflectance: float  # 反射率
    dispersion: float  # 分散
    roughness: float  # 表面粗さ
    refractive_index: float  # 屈折率
    absorption_coefficient: float  # 吸収係数

class OpticalEngine:
    """光学計算エンジン"""

    def __init__(self, physics_mode: PhysicsMode = PhysicsMode.DRY):
        self.physics_mode = physics_mode
        self.materials = {}

    def add_material(self, material_id: int, material: Material):
        """材料を追加"""
        self.materials[material_id] = material

    def fresnel_coefficients(self, n1: float, n2: float, theta_i: float) -> Tuple[float, float]:
        """
        フレネル方程式による反射係数と透過係数の計算

        Args:
            n1: 入射側の屈折率
            n2: 透過側の屈折率
            theta_i: 入射角 (ラジアン)

        Returns:
            (rs, rp): s偏光とp偏光の反射係数
        """
        cos_theta_i = np.cos(theta_i)

        # スネルの法則で透過角を計算
        sin_theta_t = (n1 / n2) * np.sin(theta_i)

        # 全反射の場合
        if sin_theta_t > 1.0:
            return 1.0, 1.0

        cos_theta_t = np.sqrt(1.0 - sin_theta_t**2)

        # フレネル方程式
        rs_num = n1 * cos_theta_i - n2 * cos_theta_t
        rs_den = n1 * cos_theta_i + n2 * cos_theta_t
        rs = (rs_num / rs_den)**2

        rp_num = n2 * cos_theta_i - n1 * cos_theta_t
        rp_den = n2 * cos_theta_i + n1 * cos_theta_t
        rp = (rp_num / rp_den)**2

        return rs, rp

    def snells_law(self, n1: float, n2: float, incident_dir: np.ndarray, 
                   normal: np.ndarray) -> Optional[np.ndarray]:
        """
        スネルの法則による屈折方向の計算

        Args:
            n1: 入射側の屈折率
            n2: 透過側の屈折率
            incident_dir: 入射方向ベクトル
            normal: 面の法線ベクトル

        Returns:
            屈折方向ベクトル（全反射の場合はNone）
        """
        cos_theta_i = -np.dot(incident_dir, normal)

        # 入射角が鈍角の場合、法線を反転
        if cos_theta_i < 0:
            normal = -normal
            cos_theta_i = -cos_theta_i

        n_ratio = n1 / n2
        discriminant = 1.0 - n_ratio**2 * (1.0 - cos_theta_i**2)

        # 全反射の場合
        if discriminant < 0:
            return None

        cos_theta_t = np.sqrt(discriminant)
        refracted = n_ratio * incident_dir + (n_ratio * cos_theta_i - cos_theta_t) * normal

        return refracted / np.linalg.norm(refracted)

    def reflect_ray(self, ray: Ray, surface: Surface) -> Ray:
        """
        光線の反射計算

        Args:
            ray: 入射光線
            surface: 反射面

        Returns:
            反射光線
        """
        material = self.materials[surface.material_id]

        # 入射角の計算
        cos_theta_i = -np.dot(ray.direction, surface.normal)

        # 法線が反対向きの場合は修正
        if cos_theta_i < 0:
            normal = -surface.normal
            cos_theta_i = -cos_theta_i
        else:
            normal = surface.normal

        # 理想的な反射方向
        ideal_reflection = ray.direction - 2.0 * cos_theta_i * normal

        # 表面粗さによるランダム散乱
        if material.roughness > 0:
            # ランダムな散乱角度
            scatter_angle = np.random.normal(0, material.roughness)

            # 接線方向のランダムベクトル生成
            tangent1 = np.cross(normal, np.array([1, 0, 0]))
            if np.linalg.norm(tangent1) < 0.1:
                tangent1 = np.cross(normal, np.array([0, 1, 0]))
            tangent1 = tangent1 / np.linalg.norm(tangent1)
            tangent2 = np.cross(normal, tangent1)

            # 散乱を適用
            scatter_dir = (ideal_reflection + 
                         scatter_angle * tangent1 * np.random.random() +
                         scatter_angle * tangent2 * np.random.random())
            reflection_dir = scatter_dir / np.linalg.norm(scatter_dir)
        else:
            reflection_dir = ideal_reflection

        # 反射率による強度減衰
        theta_i = np.arccos(cos_theta_i)

        # フレネル反射率の計算（空気から材料への反射として近似）
        n1 = 1.0  # 空気
        n2 = material.refractive_index
        rs, rp = self.fresnel_coefficients(n1, n2, theta_i)

        # 偏光状態に基づく反射率
        s_component = ray.polarization[0]**2
        p_component = ray.polarization[1]**2
        effective_reflectance = material.reflectance * (rs * s_component + rp * p_component)

        # ウェットモードでは反射率が向上
        if self.physics_mode == PhysicsMode.WET:
            effective_reflectance = min(1.0, effective_reflectance * 1.1)

        new_intensity = ray.intensity * effective_reflectance

        # 波長による吸収
        absorption_loss = np.exp(-material.absorption_coefficient * ray.wavelength / 1000.0)
        new_intensity *= absorption_loss

        return Ray(
            origin=surface.point,
            direction=reflection_dir,
            wavelength=ray.wavelength,
            intensity=new_intensity,
            polarization=ray.polarization.copy()
        )

    def ray_surface_intersection(self, ray: Ray, surface: Surface) -> Optional[float]:
        """
        光線と面の交点計算（簡単な平面との交点）

        Args:
            ray: 光線
            surface: 面

        Returns:
            交点までの距離（交点がない場合はNone）
        """
        denominator = np.dot(ray.direction, surface.normal)

        # 光線が面と平行な場合
        if abs(denominator) < 1e-6:
            return None

        # 面の方程式: dot(surface.normal, (p - surface.point)) = 0
        # 光線の方程式: p = ray.origin + t * ray.direction
        t = np.dot(surface.normal, surface.point - ray.origin) / denominator

        # 後方への交点は無効
        if t < 1e-6:
            return None

        return t

    def calculate_wavelength_to_rgb(self, wavelength: float) -> Tuple[float, float, float]:
        """
        波長をRGB色に変換

        Args:
            wavelength: 波長 (nm)

        Returns:
            (R, G, B) 値 (0-1)
        """
        if wavelength < 380 or wavelength > 750:
            return (0.0, 0.0, 0.0)

        if 380 <= wavelength < 440:
            R = -(wavelength - 440) / (440 - 380)
            G = 0.0
            B = 1.0
        elif 440 <= wavelength < 490:
            R = 0.0
            G = (wavelength - 440) / (490 - 440)
            B = 1.0
        elif 490 <= wavelength < 510:
            R = 0.0
            G = 1.0
            B = -(wavelength - 510) / (510 - 490)
        elif 510 <= wavelength < 580:
            R = (wavelength - 510) / (580 - 510)
            G = 1.0
            B = 0.0
        elif 580 <= wavelength < 645:
            R = 1.0
            G = -(wavelength - 645) / (645 - 580)
            B = 0.0
        elif 645 <= wavelength <= 750:
            R = 1.0
            G = 0.0
            B = 0.0

        # 強度による減衰（紫外線・赤外線領域）
        factor = 1.0
        if wavelength < 420:
            factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380)
        elif wavelength > 700:
            factor = 0.3 + 0.7 * (750 - wavelength) / (750 - 700)

        return (R * factor, G * factor, B * factor)

    def trace_ray(self, ray: Ray, surfaces: List[Surface], max_bounces: int = 10) -> List[Ray]:
        """
        光線追跡メインルーチン

        Args:
            ray: 初期光線
            surfaces: 反射面のリスト
            max_bounces: 最大反射回数

        Returns:
            反射過程の光線リスト
        """
        ray_path = [ray]
        current_ray = ray

        for bounce in range(max_bounces):
            # 最も近い交点を見つける
            closest_distance = float('inf')
            closest_surface = None

            for surface in surfaces:
                distance = self.ray_surface_intersection(current_ray, surface)
                if distance is not None and distance < closest_distance:
                    closest_distance = distance
                    closest_surface = surface

            # 交点が見つからない場合は終了
            if closest_surface is None:
                break

            # 交点を計算
            intersection_point = current_ray.origin + closest_distance * current_ray.direction

            # 交点での面情報を更新
            intersection_surface = Surface(
                point=intersection_point,
                normal=closest_surface.normal,
                material_id=closest_surface.material_id
            )

            # 反射計算
            reflected_ray = self.reflect_ray(current_ray, intersection_surface)

            # 強度が閾値以下になったら終了
            if reflected_ray.intensity < 0.01:
                break

            ray_path.append(reflected_ray)
            current_ray = reflected_ray

        return ray_path

# テスト用の使用例
if __name__ == "__main__":
    # エンジンの初期化
    engine = OpticalEngine(PhysicsMode.DRY)

    # 材料定義
    silver_mirror = Material("Silver Mirror", 0.95, 1.0, 0.02, 0.05, 0.001)
    engine.add_material(1, silver_mirror)

    # 初期光線
    initial_ray = Ray(
        origin=np.array([0.0, 0.0, 1.0]),
        direction=np.array([0.0, 0.0, -1.0]),
        wavelength=550.0,
        intensity=1.0
    )

    # テスト用の三角形ミラー配置
    surfaces = [
        Surface(np.array([0.0, 0.0, 0.0]), np.array([0.0, 1.0, 0.0]), 1),
        Surface(np.array([0.5, -0.5, 0.0]), np.array([-0.866, 0.5, 0.0]), 1),
        Surface(np.array([-0.5, -0.5, 0.0]), np.array([0.866, 0.5, 0.0]), 1)
    ]

    # 光線追跡実行
    ray_path = engine.trace_ray(initial_ray, surfaces, max_bounces=5)

    print(f"追跡された光線数: {len(ray_path)}")
    for i, ray in enumerate(ray_path):
        rgb = engine.calculate_wavelength_to_rgb(ray.wavelength)
        print(f"光線 {i}: 位置={ray.origin}, 強度={ray.intensity:.3f}, RGB={rgb}")
