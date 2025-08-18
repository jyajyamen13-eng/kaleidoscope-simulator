// 万華鏡シミュレーター - メインJavaScript

class KaleidoscopeApp {
    constructor() {
        this.socket = null;
        this.currentConfig = null;
        this.realtimeMode = false;
        this.materials = [];
        this.charts = {};

        this.init();
    }

    init() {
        this.initializeSocket();
        this.bindEvents();
        this.loadInitialData();
        this.setupCharts();
    }

    initializeSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('WebSocket connected');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
            this.updateConnectionStatus(false);
        });

        this.socket.on('simulation_result', (data) => {
            this.handleSimulationResult(data);
        });

        this.socket.on('simulation_error', (data) => {
            this.showError('シミュレーションエラー: ' + data.error);
        });

        this.socket.on('config_updated', (data) => {
            this.handleConfigUpdate(data);
        });
    }

    bindEvents() {
        // スライダーイベント
        document.getElementById('mirror-count').addEventListener('input', (e) => {
            document.getElementById('mirror-count-value').textContent = e.target.value;
            this.updateMaterialSelectors(parseInt(e.target.value));
            this.onConfigChange();
        });

        document.getElementById('wavelength').addEventListener('input', (e) => {
            document.getElementById('wavelength-value').textContent = e.target.value + 'nm';
            this.updateWavelengthColor(e.target.value);
            this.onConfigChange();
        });

        document.getElementById('intensity').addEventListener('input', (e) => {
            document.getElementById('intensity-value').textContent = e.target.value;
            this.onConfigChange();
        });

        document.getElementById('num-rays').addEventListener('input', (e) => {
            document.getElementById('num-rays-value').textContent = e.target.value;
        });

        document.getElementById('max-bounces').addEventListener('input', (e) => {
            document.getElementById('max-bounces-value').textContent = e.target.value;
        });

        // ボタンイベント
        document.getElementById('run-simulation').addEventListener('click', () => {
            this.runSimulation();
        });

        document.getElementById('realtime-toggle').addEventListener('click', () => {
            this.toggleRealtimeMode();
        });

        document.getElementById('load-config').addEventListener('click', () => {
            this.loadConfig();
        });

        document.getElementById('save-config').addEventListener('click', () => {
            this.showSaveModal();
        });

        document.getElementById('export-image').addEventListener('click', () => {
            this.exportImage();
        });

        // その他のイベント
        document.getElementById('physics-mode').addEventListener('change', () => {
            this.onConfigChange();
        });

        // モーダルイベント
        this.bindModalEvents();
    }

    bindModalEvents() {
        const modal = document.getElementById('save-modal');
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancel-save');
        const saveForm = document.getElementById('save-form');

        closeBtn.onclick = () => this.hideSaveModal();
        cancelBtn.onclick = () => this.hideSaveModal();

        saveForm.onsubmit = (e) => {
            e.preventDefault();
            this.saveConfig();
        };

        window.onclick = (e) => {
            if (e.target === modal) {
                this.hideSaveModal();
            }
        };
    }

    async loadInitialData() {
        try {
            // 設定一覧の読み込み
            const configsResponse = await fetch('/api/configs');
            const configsData = await configsResponse.json();

            if (configsData.success) {
                this.populateConfigSelect(configsData.configs);
            }

            // 材料一覧の読み込み
            const materialsResponse = await fetch('/api/materials');
            const materialsData = await materialsResponse.json();

            if (materialsData.success) {
                this.materials = materialsData.materials;
                this.populateMaterialsList();
                this.updateMaterialSelectors(3); // デフォルト3枚ミラー
            }

            // パフォーマンス履歴の読み込み
            this.loadPerformanceHistory();

        } catch (error) {
            console.error('初期データ読み込みエラー:', error);
            this.showError('初期データの読み込みに失敗しました');
        }
    }

    populateConfigSelect(configs) {
        const select = document.getElementById('config-select');
        select.innerHTML = '<option value="">設定を選択...</option>';

        configs.forEach(config => {
            const option = document.createElement('option');
            option.value = config.id;
            option.textContent = `${config.name} (${config.mirror_count}枚ミラー)`;
            select.appendChild(option);
        });
    }

    populateMaterialsList() {
        const container = document.getElementById('materials-list');
        container.innerHTML = '';

        this.materials.forEach(material => {
            const item = document.createElement('div');
            item.className = 'material-item';
            item.innerHTML = `
                <div class="material-name">${material.name}</div>
                <div class="material-props">
                    反射率: ${(material.reflectance * 100).toFixed(1)}% | 
                    粗さ: ${material.roughness.toFixed(3)}
                </div>
            `;
            container.appendChild(item);
        });
    }

    updateMaterialSelectors(mirrorCount) {
        const container = document.getElementById('material-selectors');
        container.innerHTML = '';

        for (let i = 0; i < mirrorCount; i++) {
            const selector = document.createElement('div');
            selector.className = 'material-selector';
            selector.innerHTML = `
                <label for="material-${i}">ミラー ${i + 1}:</label>
                <select id="material-${i}" class="material-select">
                    ${this.materials.map(material => 
                        `<option value="${material.id}">${material.name}</option>`
                    ).join('')}
                </select>
            `;
            container.appendChild(selector);

            // イベントリスナーの追加
            selector.querySelector('select').addEventListener('change', () => {
                this.onConfigChange();
            });
        }
    }

    updateWavelengthColor(wavelength) {
        // 波長に基づく色の計算と表示
        const rgb = this.wavelengthToRGB(parseFloat(wavelength));
        const colorIndicator = document.getElementById('wavelength-value');
        colorIndicator.style.color = `rgb(${rgb[0] * 255}, ${rgb[1] * 255}, ${rgb[2] * 255})`;
    }

    wavelengthToRGB(wavelength) {
        // 簡易的な波長→RGB変換
        if (wavelength < 380 || wavelength > 750) return [0, 0, 0];

        let r, g, b;

        if (wavelength >= 380 && wavelength < 440) {
            r = -(wavelength - 440) / (440 - 380);
            g = 0.0;
            b = 1.0;
        } else if (wavelength >= 440 && wavelength < 490) {
            r = 0.0;
            g = (wavelength - 440) / (490 - 440);
            b = 1.0;
        } else if (wavelength >= 490 && wavelength < 510) {
            r = 0.0;
            g = 1.0;
            b = -(wavelength - 510) / (510 - 490);
        } else if (wavelength >= 510 && wavelength < 580) {
            r = (wavelength - 510) / (580 - 510);
            g = 1.0;
            b = 0.0;
        } else if (wavelength >= 580 && wavelength < 645) {
            r = 1.0;
            g = -(wavelength - 645) / (645 - 580);
            b = 0.0;
        } else if (wavelength >= 645 && wavelength <= 750) {
            r = 1.0;
            g = 0.0;
            b = 0.0;
        }

        return [r, g, b];
    }

    onConfigChange() {
        if (this.realtimeMode) {
            // リアルタイムモードの場合は自動実行
            this.runRealtimeSimulation();
        }
    }

    async runSimulation() {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.add('active');

        try {
            const config = this.getCurrentConfig();

            const response = await fetch('/api/simulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });

            const data = await response.json();

            if (data.success) {
                this.displaySimulationResult(data.simulation_result);
                this.updatePerformanceMetrics(data.simulation_result.performance);
                this.addToHistory(config, data.simulation_result.performance);
            } else {
                this.showError('シミュレーションエラー: ' + data.error);
            }

        } catch (error) {
            console.error('Simulation error:', error);
            this.showError('シミュレーション実行中にエラーが発生しました');
        } finally {
            loadingOverlay.classList.remove('active');
        }
    }

    runRealtimeSimulation() {
        const config = this.getRealtimeConfig();
        this.socket.emit('realtime_simulation', config);
    }

    getCurrentConfig() {
        const materialSelects = document.querySelectorAll('.material-select');
        const materialIds = Array.from(materialSelects).map(select => parseInt(select.value));

        return {
            config_id: null, // 新規設定
            mirror_count: parseInt(document.getElementById('mirror-count').value),
            material_ids: materialIds,
            physics_mode: document.getElementById('physics-mode').value,
            num_rays: parseInt(document.getElementById('num-rays').value),
            max_bounces: parseInt(document.getElementById('max-bounces').value),
            light_sources: [{
                wavelength: parseFloat(document.getElementById('wavelength').value),
                intensity: parseFloat(document.getElementById('intensity').value),
                position: [0.0, 0.0, 1.0],
                type: 'point'
            }]
        };
    }

    getRealtimeConfig() {
        const config = this.getCurrentConfig();
        config.num_rays = 50; // リアルタイム用に軽量化
        config.max_bounces = 5;
        return config;
    }

    displaySimulationResult(result) {
        // パターンデータの可視化
        if (result.pattern_data && result.pattern_data.points) {
            window.visualizer.renderPattern(result.pattern_data);
        }

        // スペクトル分析の更新
        this.updateSpectrumChart(result.ray_paths);
    }

    updatePerformanceMetrics(performance) {
        document.getElementById('ray-count').textContent = performance.ray_count;
        document.getElementById('computation-time').textContent = performance.computation_time.toFixed(3) + 's';

        // 品質スコアの計算と表示
        const qualityScore = this.calculateQualityScore(performance);
        document.getElementById('quality-score').textContent = (qualityScore * 100).toFixed(1) + '%';

        // パフォーマンス指標の更新
        this.updatePerformanceIndicator(performance);

        // 最終更新時刻の更新
        document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
    }

    calculateQualityScore(performance) {
        // 簡易的な品質スコア計算
        const rayScore = Math.min(1.0, performance.ray_count / 1000.0);
        const timeScore = Math.max(0.0, 1.0 - performance.computation_time / 10.0);
        return (rayScore + timeScore) / 2.0;
    }

    updatePerformanceIndicator(performance) {
        const indicator = document.getElementById('performance-indicator');
        const score = this.calculateQualityScore(performance);

        indicator.className = 'performance-' + (score > 0.7 ? 'good' : score > 0.4 ? 'medium' : 'poor');
        indicator.textContent = score > 0.7 ? 'Good' : score > 0.4 ? 'Medium' : 'Poor';
    }

    toggleRealtimeMode() {
        this.realtimeMode = !this.realtimeMode;
        const button = document.getElementById('realtime-toggle');
        button.textContent = 'リアルタイム: ' + (this.realtimeMode ? 'ON' : 'OFF');
        button.className = 'btn ' + (this.realtimeMode ? 'btn-success' : 'btn-info');

        if (this.realtimeMode) {
            this.runRealtimeSimulation();
        }
    }

    updateConnectionStatus(connected) {
        const status = document.getElementById('connection-status');
        const wsStatus = document.getElementById('ws-status');

        if (connected) {
            status.textContent = '接続中';
            status.className = 'status-connected';
            wsStatus.textContent = '接続';
        } else {
            status.textContent = '未接続';
            status.className = 'status-disconnected';
            wsStatus.textContent = '切断';
        }
    }

    handleSimulationResult(data) {
        if (data.pattern_data) {
            window.visualizer.renderPattern(data.pattern_data);
        }

        if (data.performance) {
            this.updatePerformanceMetrics(data.performance);
        }
    }

    handleConfigUpdate(data) {
        // 他のクライアントからの設定変更を反映
        console.log('Config updated:', data);
    }

    showError(message) {
        // エラーメッセージの表示（簡単な実装）
        alert(message);
        console.error(message);
    }

    showSaveModal() {
        document.getElementById('save-modal').classList.add('active');
    }

    hideSaveModal() {
        document.getElementById('save-modal').classList.remove('active');
    }

    async saveConfig() {
        const name = document.getElementById('config-name').value;
        const description = document.getElementById('config-description').value;

        const config = this.getCurrentConfig();
        config.name = name;
        config.description = description;

        try {
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });

            const data = await response.json();

            if (data.success) {
                this.hideSaveModal();
                this.loadInitialData(); // 設定一覧の再読み込み
                alert('設定が保存されました');
            } else {
                this.showError('保存エラー: ' + data.error);
            }

        } catch (error) {
            console.error('Save error:', error);
            this.showError('設定の保存中にエラーが発生しました');
        }
    }

    async loadConfig() {
        const configId = document.getElementById('config-select').value;
        if (!configId) return;

        try {
            const response = await fetch(`/api/config/${configId}`);
            const data = await response.json();

            if (data.success) {
                this.applyConfig(data.config);
            } else {
                this.showError('設定読み込みエラー: ' + data.error);
            }

        } catch (error) {
            console.error('Load config error:', error);
            this.showError('設定の読み込み中にエラーが発生しました');
        }
    }

    applyConfig(config) {
        document.getElementById('mirror-count').value = config.mirror_count;
        document.getElementById('mirror-count-value').textContent = config.mirror_count;
        document.getElementById('physics-mode').value = config.physics_mode;

        // 材料セレクターの更新
        this.updateMaterialSelectors(config.mirror_count);

        // 材料の設定
        config.material_ids.forEach((matId, index) => {
            const select = document.getElementById(`material-${index}`);
            if (select) {
                select.value = matId;
            }
        });

        // 光源設定
        if (config.light_sources && config.light_sources.length > 0) {
            const lightSource = config.light_sources[0];
            document.getElementById('wavelength').value = lightSource.wavelength;
            document.getElementById('wavelength-value').textContent = lightSource.wavelength + 'nm';
            document.getElementById('intensity').value = lightSource.intensity;
            document.getElementById('intensity-value').textContent = lightSource.intensity;
            this.updateWavelengthColor(lightSource.wavelength);
        }

        this.currentConfig = config;
    }

    exportImage() {
        const canvas = document.getElementById('kaleidoscope-canvas');
        const link = document.createElement('a');
        link.download = 'kaleidoscope_pattern.png';
        link.href = canvas.toDataURL();
        link.click();
    }

    setupCharts() {
        // スペクトル分析チャートの初期化
        const spectrumCtx = document.getElementById('spectrum-chart').getContext('2d');
        this.charts.spectrum = new Chart(spectrumCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'スペクトル強度',
                    data: [],
                    borderColor: '#3498db',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: '#ecf0f1' }
                    }
                },
                scales: {
                    x: { 
                        ticks: { color: '#ecf0f1' },
                        grid: { color: '#34495e' }
                    },
                    y: { 
                        ticks: { color: '#ecf0f1' },
                        grid: { color: '#34495e' }
                    }
                }
            }
        });

        // パフォーマンスチャートの初期化
        const perfCtx = document.getElementById('performance-chart').getContext('2d');
        this.charts.performance = new Chart(perfCtx, {
            type: 'doughnut',
            data: {
                labels: ['計算時間', '品質', 'その他'],
                datasets: [{
                    data: [30, 60, 10],
                    backgroundColor: ['#e74c3c', '#27ae60', '#95a5a6']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: '#ecf0f1' }
                    }
                }
            }
        });
    }

    updateSpectrumChart(rayPaths) {
        if (!rayPaths || rayPaths.length === 0) return;

        // 波長別の強度分布を計算
        const spectrum = {};
        rayPaths.forEach(ray => {
            const wavelength = Math.round(ray.wavelength / 10) * 10; // 10nm刻み
            spectrum[wavelength] = (spectrum[wavelength] || 0) + ray.intensity;
        });

        const wavelengths = Object.keys(spectrum).sort((a, b) => a - b);
        const intensities = wavelengths.map(w => spectrum[w]);

        this.charts.spectrum.data.labels = wavelengths;
        this.charts.spectrum.data.datasets[0].data = intensities;
        this.charts.spectrum.update();
    }

    async loadPerformanceHistory() {
        try {
            const response = await fetch('/api/performance');
            const data = await response.json();

            if (data.success) {
                this.displayPerformanceHistory(data.history);
            }

        } catch (error) {
            console.error('Performance history load error:', error);
        }
    }

    displayPerformanceHistory(history) {
        const container = document.getElementById('simulation-history');
        container.innerHTML = '';

        history.slice(0, 10).forEach(item => { // 最新10件
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div style="font-weight: bold;">${item.config_name}</div>
                <div style="font-size: 0.8rem; color: #95a5a6;">
                    ${item.ray_count}光線 | ${item.computation_time.toFixed(2)}s | 
                    ${(item.quality_score * 100).toFixed(1)}%
                </div>
                <div style="font-size: 0.7rem; color: #7f8c8d;">
                    ${new Date(item.timestamp).toLocaleString()}
                </div>
            `;
            container.appendChild(historyItem);
        });
    }

    addToHistory(config, performance) {
        // 履歴の追加（簡易実装）
        this.loadPerformanceHistory();
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    window.kaleidoscopeApp = new KaleidoscopeApp();
});
