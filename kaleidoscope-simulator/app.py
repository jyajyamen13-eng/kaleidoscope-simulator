
from flask import Flask, request, jsonify, render_template, send_file
from flask_socketio import SocketIO, emit
import json
import os
import sys
from datetime import datetime
import numpy as np

# プロジェクトルートをパスに追加
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.kaleidoscope_simulator import KaleidoscopeSimulator
from models.optical_engine import Material, PhysicsMode

app = Flask(__name__)
app.config['SECRET_KEY'] = 'kaleidoscope_secret_key_2024'
socketio = SocketIO(app, cors_allowed_origins="*")

# グローバルシミュレーターインスタンス
simulator = KaleidoscopeSimulator()

@app.route('/')
def index():
    """メインページ"""
    return render_template('index.html')

@app.route('/api/configs', methods=['GET'])
def get_configs():
    """設定一覧の取得"""
    try:
        import sqlite3
        with sqlite3.connect(simulator.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, mirror_count, physics_mode, created_at
                FROM kaleidoscope_configs
                ORDER BY created_at DESC
            """)

            configs = []
            for row in cursor.fetchall():
                configs.append({
                    'id': row[0],
                    'name': row[1],
                    'mirror_count': row[2],
                    'physics_mode': row[3],
                    'created_at': row[4]
                })

            return jsonify({'success': True, 'configs': configs})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/config/<int:config_id>', methods=['GET'])
def get_config(config_id):
    """特定の設定取得"""
    try:
        config = simulator.load_config_from_db(config_id)

        # PhysicsMode を文字列に変換
        config['physics_mode'] = config['physics_mode'].value

        # Material オブジェクトを辞書に変換
        materials_dict = {}
        for mat_id, material in config['materials'].items():
            materials_dict[mat_id] = {
                'name': material.name,
                'reflectance': material.reflectance,
                'dispersion': material.dispersion,
                'roughness': material.roughness,
                'refractive_index': material.refractive_index,
                'absorption_coefficient': material.absorption_coefficient
            }
        config['materials'] = materials_dict

        return jsonify({'success': True, 'config': config})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/materials', methods=['GET'])
def get_materials():
    """材料一覧の取得"""
    try:
        import sqlite3
        with sqlite3.connect(simulator.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, reflectance, dispersion, roughness, 
                       refractive_index, absorption_coefficient, description
                FROM materials
                ORDER BY name
            """)

            materials = []
            for row in cursor.fetchall():
                materials.append({
                    'id': row[0],
                    'name': row[1],
                    'reflectance': row[2],
                    'dispersion': row[3],
                    'roughness': row[4],
                    'refractive_index': row[5],
                    'absorption_coefficient': row[6],
                    'description': row[7]
                })

            return jsonify({'success': True, 'materials': materials})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/simulate', methods=['POST'])
def run_simulation():
    """シミュレーション実行"""
    try:
        data = request.json
        config_id = data.get('config_id', 1)
        num_rays = data.get('num_rays', 100)
        max_bounces = data.get('max_bounces', 10)

        # シミュレーション実行
        result = simulator.run_simulation(config_id, num_rays, max_bounces)

        # Numpy配列を通常のリストに変換
        ray_paths_serializable = []
        for ray in result['ray_paths']:
            ray_data = {
                'origin': ray.origin.tolist(),
                'direction': ray.direction.tolist(),
                'wavelength': float(ray.wavelength),
                'intensity': float(ray.intensity),
                'rgb': simulator.engine.calculate_wavelength_to_rgb(ray.wavelength)
            }
            ray_paths_serializable.append(ray_data)

        # 表面情報も変換
        surfaces_serializable = []
        for surface in result['surfaces']:
            surface_data = {
                'point': surface.point.tolist(),
                'normal': surface.normal.tolist(),
                'material_id': surface.material_id
            }
            surfaces_serializable.append(surface_data)

        # パターンデータの生成
        pattern_data = simulator.create_pattern_visualization_data(result['ray_paths'])

        response = {
            'success': True,
            'simulation_result': {
                'ray_paths': ray_paths_serializable[:500],  # 表示用に制限
                'surfaces': surfaces_serializable,
                'pattern_data': pattern_data,
                'performance': result['performance']
            }
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/config', methods=['POST'])
def create_config():
    """新しい設定の作成"""
    try:
        data = request.json

        import sqlite3
        with sqlite3.connect(simulator.db_path) as conn:
            cursor = conn.cursor()

            # 設定の挿入
            cursor.execute("""
                INSERT INTO kaleidoscope_configs 
                (name, mirror_count, mirror_angles, materials, physics_mode)
                VALUES (?, ?, ?, ?, ?)
            """, (
                data['name'],
                data['mirror_count'],
                json.dumps(data['mirror_angles']),
                json.dumps(data['material_ids']),
                data['physics_mode']
            ))

            config_id = cursor.lastrowid

            # 光源の挿入
            for light_source in data['light_sources']:
                cursor.execute("""
                    INSERT INTO light_sources
                    (config_id, wavelength, intensity, position_x, position_y, 
                     position_z, type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    config_id,
                    light_source['wavelength'],
                    light_source['intensity'],
                    light_source['position'][0],
                    light_source['position'][1],
                    light_source['position'][2],
                    light_source['type']
                ))

            conn.commit()

            return jsonify({'success': True, 'config_id': config_id})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/performance', methods=['GET'])
def get_performance_history():
    """パフォーマンス履歴の取得"""
    try:
        import sqlite3
        with sqlite3.connect(simulator.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT sr.timestamp, sr.ray_count, sr.computation_time, 
                       sr.quality_score, kc.name
                FROM simulation_results sr
                JOIN kaleidoscope_configs kc ON sr.config_id = kc.id
                ORDER BY sr.timestamp DESC
                LIMIT 50
            """)

            history = []
            for row in cursor.fetchall():
                history.append({
                    'timestamp': row[0],
                    'ray_count': row[1],
                    'computation_time': row[2],
                    'quality_score': row[3],
                    'config_name': row[4]
                })

            return jsonify({'success': True, 'history': history})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# WebSocket イベントハンドラ
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('connected', {'data': 'Connected to kaleidoscope simulator'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('realtime_simulation')
def handle_realtime_simulation(data):
    """リアルタイムシミュレーション"""
    try:
        config_id = data.get('config_id', 1)
        num_rays = data.get('num_rays', 50)  # リアルタイム用に軽量化
        max_bounces = data.get('max_bounces', 5)

        # シミュレーション実行
        result = simulator.run_simulation(config_id, num_rays, max_bounces)

        # パターンデータの生成
        pattern_data = simulator.create_pattern_visualization_data(result['ray_paths'])

        # 結果を送信
        emit('simulation_result', {
            'pattern_data': pattern_data,
            'performance': result['performance']
        })

    except Exception as e:
        emit('simulation_error', {'error': str(e)})

@socketio.on('update_config')
def handle_config_update(data):
    """設定更新時のリアルタイム反映"""
    try:
        # 設定変更を他のクライアントにブロードキャスト
        emit('config_updated', data, broadcast=True)

    except Exception as e:
        emit('update_error', {'error': str(e)})

if __name__ == '__main__':
    # 開発サーバーとして起動
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
