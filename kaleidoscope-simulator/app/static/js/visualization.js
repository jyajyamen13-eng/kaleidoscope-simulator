// 万華鏡シミュレーター - 可視化エンジン

class KaleidoscopeVisualizer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.currentPattern = null;
        this.animationFrame = null;
        this.viewMode = '2d'; // '2d' or '3d'

        this.init();
    }

    init() {
        this.canvas = document.getElementById('kaleidoscope-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.resizeCanvas();
        this.bindEvents();

        // 初期パターンの表示
        this.renderDefaultPattern();
    }

    bindEvents() {
        // ウィンドウリサイズイベント
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            if (this.currentPattern) {
                this.renderPattern(this.currentPattern);
            }
        });

        // ビューモード切り替え
        document.getElementById('view-2d').addEventListener('click', () => {
            this.setViewMode('2d');
        });

        document.getElementById('view-3d').addEventListener('click', () => {
            this.setViewMode('3d');
        });
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        // アスペクト比を維持しながらコンテナにフィット
        const maxSize = Math.min(rect.width - 40, rect.height - 40);

        this.canvas.width = maxSize;
        this.canvas.height = maxSize;
        this.canvas.style.width = maxSize + 'px';
        this.canvas.style.height = maxSize + 'px';
    }

    setViewMode(mode) {
        this.viewMode = mode;

        // ボタンの状態更新
        document.getElementById('view-2d').classList.toggle('active', mode === '2d');
        document.getElementById('view-3d').classList.toggle('active', mode === '3d');

        // 現在のパターンを再描画
        if (this.currentPattern) {
            this.renderPattern(this.currentPattern);
        }
    }

    renderDefaultPattern() {
        // デフォルトの美しいパターンを表示
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(this.canvas.width, this.canvas.height) / 2 - 20;

        // 放射状のグラデーション背景
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(52, 152, 219, 0.1)');
        gradient.addColorStop(0.5, 'rgba(155, 89, 182, 0.05)');
        gradient.addColorStop(1, 'rgba(26, 26, 46, 0.8)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.fill();

        // デフォルトの対称パターン
        this.renderDefaultSymmetryPattern(centerX, centerY, radius);

        // 説明テキスト
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.font = '16px Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('シミュレーション実行でパターンを生成', centerX, centerY + radius + 30);
    }

    renderDefaultSymmetryPattern(centerX, centerY, radius) {
        const mirrorCount = 3;

        for (let mirror = 0; mirror < mirrorCount; mirror++) {
            const angle = (mirror * 2 * Math.PI) / mirrorCount;

            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(angle);

            // ミラーラインの表示
            this.ctx.strokeStyle = '#3498db';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(radius * 0.8, 0);
            this.ctx.stroke();

            // 装飾的な光線
            for (let i = 0; i < 5; i++) {
                const lightRadius = radius * (0.2 + i * 0.1);
                const hue = (mirror * 120 + i * 20) % 360;

                this.ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.3)`;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, lightRadius, -Math.PI/6, Math.PI/6);
                this.ctx.stroke();
            }

            this.ctx.restore();
        }
    }

    renderPattern(patternData) {
        this.currentPattern = patternData;

        if (this.viewMode === '2d') {
            this.render2DPattern(patternData);
        } else {
            this.render3DPattern(patternData);
        }
    }

    render2DPattern(patternData) {
        // キャンバスクリア
        this.ctx.fillStyle = '#0f0f23';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!patternData.points || patternData.points.length === 0) {
            this.renderDefaultPattern();
            return;
        }

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const scale = Math.min(this.canvas.width, this.canvas.height) / 4; // スケール調整

        // 背景の同心円
        this.drawBackgroundGrids(centerX, centerY);

        // 光点の描画
        patternData.points.forEach(point => {
            this.drawLightPoint(
                centerX + point.x * scale,
                centerY + point.y * scale,
                point.intensity,
                point.rgb,
                point.wavelength
            );
        });

        // 万華鏡対称性の適用
        this.applySymmetry(patternData, centerX, centerY, scale);

        // 統計情報の表示
        this.drawPatternStats(patternData);
    }

    render3DPattern(patternData) {
        // 3D風の描画（疑似3D）
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!patternData.points || patternData.points.length === 0) {
            this.renderDefaultPattern();
            return;
        }

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const scale = Math.min(this.canvas.width, this.canvas.height) / 6;

        // Z軸に沿った層分けで3D効果
        const layers = this.groupPointsByDepth(patternData.points);

        layers.forEach((layer, depth) => {
            const layerAlpha = 1.0 - depth * 0.2; // 奥行きによる透明度
            const layerScale = scale * (1.0 - depth * 0.1); // 奥行きによるスケール

            layer.forEach(point => {
                this.draw3DLightPoint(
                    centerX + point.x * layerScale,
                    centerY + point.y * layerScale,
                    point.intensity * layerAlpha,
                    point.rgb,
                    depth
                );
            });
        });

        // 3D万華鏡効果
        this.apply3DSymmetry(patternData, centerX, centerY, scale);
    }

    drawBackgroundGrids(centerX, centerY) {
        const maxRadius = Math.min(this.canvas.width, this.canvas.height) / 2;

        // 同心円
        this.ctx.strokeStyle = 'rgba(52, 73, 94, 0.3)';
        this.ctx.lineWidth = 1;

        for (let r = 50; r < maxRadius; r += 50) {
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
            this.ctx.stroke();
        }

        // 放射線
        for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 6) {
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(
                centerX + Math.cos(angle) * maxRadius,
                centerY + Math.sin(angle) * maxRadius
            );
            this.ctx.stroke();
        }
    }

    drawLightPoint(x, y, intensity, rgb, wavelength) {
        const size = Math.max(1, intensity * 8);
        const alpha = Math.min(1.0, intensity * 2);

        // 光のグロー効果
        const glowSize = size * 3;
        const glowGradient = this.ctx.createRadialGradient(x, y, 0, x, y, glowSize);
        glowGradient.addColorStop(0, `rgba(${rgb[0] * 255}, ${rgb[1] * 255}, ${rgb[2] * 255}, ${alpha})`);
        glowGradient.addColorStop(0.5, `rgba(${rgb[0] * 255}, ${rgb[1] * 255}, ${rgb[2] * 255}, ${alpha * 0.3})`);
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = glowGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, glowSize, 0, 2 * Math.PI);
        this.ctx.fill();

        // 中心の明るい点
        this.ctx.fillStyle = `rgba(${rgb[0] * 255}, ${rgb[1] * 255}, ${rgb[2] * 255}, ${Math.min(1.0, alpha * 1.5)})`;
        this.ctx.beginPath();
        this.ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    draw3DLightPoint(x, y, intensity, rgb, depth) {
        const size = Math.max(1, intensity * 6 * (1 - depth * 0.2));
        const alpha = Math.min(1.0, intensity * 1.5 * (1 - depth * 0.3));

        // 3D効果のための影
        const shadowOffset = depth * 2;
        this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.3})`;
        this.ctx.beginPath();
        this.ctx.arc(x + shadowOffset, y + shadowOffset, size, 0, 2 * Math.PI);
        this.ctx.fill();

        // メインの光点
        this.drawLightPoint(x, y, intensity, rgb, 0);
    }

    applySymmetry(patternData, centerX, centerY, scale) {
        // 万華鏡の対称性を適用（3つ折り対称）
        const segments = 3;

        for (let segment = 1; segment < segments; segment++) {
            const angle = (segment * 2 * Math.PI) / segments;

            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(angle);
            this.ctx.translate(-centerX, -centerY);

            // 半透明で対称パターンを描画
            this.ctx.globalAlpha = 0.7;

            patternData.points.forEach(point => {
                this.drawLightPoint(
                    centerX + point.x * scale,
                    centerY + point.y * scale,
                    point.intensity * 0.8,
                    point.rgb,
                    point.wavelength
                );
            });

            this.ctx.restore();
        }
    }

    apply3DSymmetry(patternData, centerX, centerY, scale) {
        // 3Dでの対称性適用
        const segments = 6; // 3D では より多くの対称性

        for (let segment = 1; segment < segments; segment++) {
            const angle = (segment * 2 * Math.PI) / segments;
            const depth = Math.floor(segment / 2);

            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(angle);
            this.ctx.scale(1 - depth * 0.1, 1 - depth * 0.1);
            this.ctx.translate(-centerX, -centerY);

            this.ctx.globalAlpha = 0.5 - depth * 0.1;

            patternData.points.forEach(point => {
                this.draw3DLightPoint(
                    centerX + point.x * scale,
                    centerY + point.y * scale,
                    point.intensity * (0.8 - depth * 0.2),
                    point.rgb,
                    depth
                );
            });

            this.ctx.restore();
        }
    }

    groupPointsByDepth(points) {
        // 強度に基づいて深度層を作成
        const layers = [[], [], [], []];

        points.forEach(point => {
            const depthIndex = Math.floor((1 - point.intensity) * 3);
            const layer = Math.max(0, Math.min(3, depthIndex));
            layers[layer].push(point);
        });

        return layers;
    }

    drawPatternStats(patternData) {
        // パターンの統計情報を表示
        const stats = this.calculatePatternStats(patternData);

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 200, 80);

        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = '12px Segoe UI';
        this.ctx.textAlign = 'left';

        this.ctx.fillText(`光点数: ${stats.pointCount}`, 15, 25);
        this.ctx.fillText(`平均強度: ${stats.avgIntensity.toFixed(3)}`, 15, 40);
        this.ctx.fillText(`波長範囲: ${stats.wavelengthRange}`, 15, 55);
        this.ctx.fillText(`対称性: ${stats.symmetry}`, 15, 70);
    }

    calculatePatternStats(patternData) {
        if (!patternData.points || patternData.points.length === 0) {
            return {
                pointCount: 0,
                avgIntensity: 0,
                wavelengthRange: 'N/A',
                symmetry: 'N/A'
            };
        }

        const points = patternData.points;
        const pointCount = points.length;
        const avgIntensity = points.reduce((sum, p) => sum + p.intensity, 0) / pointCount;

        const wavelengths = points.map(p => p.wavelength);
        const minWl = Math.min(...wavelengths);
        const maxWl = Math.max(...wavelengths);

        return {
            pointCount,
            avgIntensity,
            wavelengthRange: `${minWl.toFixed(0)}-${maxWl.toFixed(0)}nm`,
            symmetry: '3-fold'
        };
    }

    startAnimation() {
        // アニメーション開始（リアルタイムモード用）
        const animate = () => {
            if (this.currentPattern) {
                this.renderPattern(this.currentPattern);
            }
            this.animationFrame = requestAnimationFrame(animate);
        };

        if (!this.animationFrame) {
            animate();
        }
    }

    stopAnimation() {
        // アニメーション停止
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    exportCanvas() {
        // キャンバス内容をエクスポート
        return this.canvas.toDataURL('image/png');
    }

    clear() {
        // キャンバスクリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.renderDefaultPattern();
    }
}

// グローバルに可視化エンジンを初期化
document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new KaleidoscopeVisualizer();
});
