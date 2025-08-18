// 万華鏡シミュレーター - コントロール拡張

class KaleidoscopeControls {
    constructor() {
        this.presets = [];
        this.currentPreset = null;
        this.animationSpeed = 1.0;

        this.init();
    }

    init() {
        this.bindAdvancedControls();
        this.setupPresetManagement();
        this.initializeAnimationControls();
    }

    bindAdvancedControls() {
        // 高度なシミュレーション設定
        this.bindPhysicsControls();
        this.bindLightSourceControls();
        this.bindMaterialControls();
        this.bindExportControls();
    }

    bindPhysicsControls() {
        // 物理モード切り替えでの詳細設定
        const physicsMode = document.getElementById('physics-mode');

        physicsMode.addEventListener('change', (e) => {
            const mode = e.target.value;
            this.updatePhysicsSettings(mode);

            // リアルタイムモードが有効な場合は自動更新
            if (window.kaleidoscopeApp && window.kaleidoscopeApp.realtimeMode) {
                window.kaleidoscopeApp.runRealtimeSimulation();
            }
        });

        // 詳細物理パラメータの追加コントロール
        this.addAdvancedPhysicsControls();
    }

    addAdvancedPhysicsControls() {
        const physicsSection = document.querySelector('.panel-section h3')
            .parentNode.querySelector('.materials-section').parentNode;

        const advancedControls = document.createElement('div');
        advancedControls.className = 'advanced-physics-controls';
        advancedControls.innerHTML = `
            <h4>高度な物理設定</h4>
            <div class="form-group">
                <label for="dispersion-factor">分散係数:</label>
                <input type="range" id="dispersion-factor" min="0.5" max="2.0" step="0.1" value="1.0">
                <span id="dispersion-factor-value">1.0</span>
            </div>
            <div class="form-group">
                <label for="absorption-rate">吸収率:</label>
                <input type="range" id="absorption-rate" min="0.001" max="0.1" step="0.001" value="0.01">
                <span id="absorption-rate-value">0.01</span>
            </div>
            <div class="form-group">
                <label for="scattering-angle">散乱角度:</label>
                <input type="range" id="scattering-angle" min="0" max="45" step="1" value="5">
                <span id="scattering-angle-value">5°</span>
            </div>
        `;

        physicsSection.appendChild(advancedControls);

        // イベントリスナーの追加
        ['dispersion-factor', 'absorption-rate', 'scattering-angle'].forEach(id => {
            const slider = document.getElementById(id);
            const valueSpan = document.getElementById(id + '-value');

            slider.addEventListener('input', (e) => {
                const value = e.target.value;
                const unit = id === 'scattering-angle' ? '°' : '';
                valueSpan.textContent = value + unit;

                if (window.kaleidoscopeApp) {
                    window.kaleidoscopeApp.onConfigChange();
                }
            });
        });
    }

    updatePhysicsSettings(mode) {
        const controls = document.querySelector('.advanced-physics-controls');
        if (!controls) return;

        // ウェットモードでは特別な設定を適用
        if (mode === 'wet') {
            document.getElementById('dispersion-factor').value = 1.2;
            document.getElementById('absorption-rate').value = 0.005;
            document.getElementById('scattering-angle').value = 8;
        } else {
            document.getElementById('dispersion-factor').value = 1.0;
            document.getElementById('absorption-rate').value = 0.01;
            document.getElementById('scattering-angle').value = 5;
        }

        // 値表示の更新
        ['dispersion-factor', 'absorption-rate', 'scattering-angle'].forEach(id => {
            const slider = document.getElementById(id);
            const valueSpan = document.getElementById(id + '-value');
            const unit = id === 'scattering-angle' ? '°' : '';
            valueSpan.textContent = slider.value + unit;
        });
    }

    bindLightSourceControls() {
        // 複数光源の管理
        this.addMultiLightSourceControls();

        // 光源パラメータの詳細コントロール
        this.addLightSourceParameters();
    }

    addMultiLightSourceControls() {
        const lightSection = document.querySelector('.panel-section h3')
            .parentNode.querySelector('h3');

        // 光源セクションを探してコントロールを追加
        let lightSectionContainer = null;
        document.querySelectorAll('.panel-section h3').forEach(h3 => {
            if (h3.textContent.includes('光源設定')) {
                lightSectionContainer = h3.parentNode;
            }
        });

        if (lightSectionContainer) {
            const multiLightControls = document.createElement('div');
            multiLightControls.className = 'multi-light-controls';
            multiLightControls.innerHTML = `
                <div class="form-group">
                    <label for="light-count">光源数:</label>
                    <input type="range" id="light-count" min="1" max="5" value="1">
                    <span id="light-count-value">1</span>
                    <button id="add-light-source" class="btn btn-sm btn-primary">光源追加</button>
                </div>
                <div id="light-sources-container">
                    <!-- 動的に追加される光源設定 -->
                </div>
            `;

            lightSectionContainer.appendChild(multiLightControls);

            // イベントリスナーの追加
            document.getElementById('light-count').addEventListener('input', (e) => {
                const count = parseInt(e.target.value);
                document.getElementById('light-count-value').textContent = count;
                this.updateLightSourceCount(count);
            });

            document.getElementById('add-light-source').addEventListener('click', () => {
                this.addLightSource();
            });
        }
    }

    addLightSourceParameters() {
        // 光源の詳細パラメータ（偏光、コヒーレンス等）
        const advancedLightControls = document.createElement('div');
        advancedLightControls.className = 'advanced-light-controls';
        advancedLightControls.innerHTML = `
            <h4>光源特性</h4>
            <div class="form-group">
                <label for="polarization">偏光角度:</label>
                <input type="range" id="polarization" min="0" max="180" value="0">
                <span id="polarization-value">0°</span>
            </div>
            <div class="form-group">
                <label for="coherence">コヒーレンス:</label>
                <input type="range" id="coherence" min="0.1" max="1.0" step="0.1" value="1.0">
                <span id="coherence-value">1.0</span>
            </div>
            <div class="form-group">
                <label for="beam-width">ビーム幅:</label>
                <input type="range" id="beam-width" min="1" max="30" value="10">
                <span id="beam-width-value">10°</span>
            </div>
        `;

        const lightSection = document.querySelector('.multi-light-controls').parentNode;
        lightSection.appendChild(advancedLightControls);

        // イベントリスナーの追加
        ['polarization', 'coherence', 'beam-width'].forEach(id => {
            const slider = document.getElementById(id);
            const valueSpan = document.getElementById(id + '-value');

            slider.addEventListener('input', (e) => {
                const value = e.target.value;
                const unit = id === 'coherence' ? '' : '°';
                valueSpan.textContent = value + unit;

                if (window.kaleidoscopeApp) {
                    window.kaleidoscopeApp.onConfigChange();
                }
            });
        });
    }

    updateLightSourceCount(count) {
        const container = document.getElementById('light-sources-container');
        container.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const lightSource = document.createElement('div');
            lightSource.className = 'light-source-item';
            lightSource.innerHTML = `
                <div class="light-source-header">
                    <h5>光源 ${i + 1}</h5>
                    <button class="btn btn-sm btn-secondary remove-light" data-index="${i}">削除</button>
                </div>
                <div class="form-group">
                    <label for="light-${i}-wavelength">波長:</label>
                    <input type="range" id="light-${i}-wavelength" min="380" max="750" value="${550 + i * 50}">
                    <span id="light-${i}-wavelength-value">${550 + i * 50}nm</span>
                </div>
                <div class="form-group">
                    <label for="light-${i}-intensity">強度:</label>
                    <input type="range" id="light-${i}-intensity" min="0.1" max="2.0" step="0.1" value="1.0">
                    <span id="light-${i}-intensity-value">1.0</span>
                </div>
            `;

            container.appendChild(lightSource);

            // 各光源のイベントリスナー
            ['wavelength', 'intensity'].forEach(param => {
                const slider = document.getElementById(`light-${i}-${param}`);
                const valueSpan = document.getElementById(`light-${i}-${param}-value`);

                slider.addEventListener('input', (e) => {
                    const value = e.target.value;
                    const unit = param === 'wavelength' ? 'nm' : '';
                    valueSpan.textContent = value + unit;

                    if (window.kaleidoscopeApp) {
                        window.kaleidoscopeApp.onConfigChange();
                    }
                });
            });

            // 削除ボタンのイベントリスナー
            lightSource.querySelector('.remove-light').addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removeLightSource(index);
            });
        }
    }

    addLightSource() {
        const currentCount = document.getElementById('light-count').value;
        const newCount = Math.min(5, parseInt(currentCount) + 1);

        document.getElementById('light-count').value = newCount;
        document.getElementById('light-count-value').textContent = newCount;
        this.updateLightSourceCount(newCount);
    }

    removeLightSource(index) {
        const currentCount = document.getElementById('light-count').value;
        const newCount = Math.max(1, parseInt(currentCount) - 1);

        document.getElementById('light-count').value = newCount;
        document.getElementById('light-count-value').textContent = newCount;
        this.updateLightSourceCount(newCount);
    }

    bindMaterialControls() {
        // カスタム材料の作成機能
        this.addCustomMaterialControls();
    }

    addCustomMaterialControls() {
        const materialsSection = document.getElementById('materials-list').parentNode;

        const customMaterialControls = document.createElement('div');
        customMaterialControls.className = 'custom-material-controls';
        customMaterialControls.innerHTML = `
            <h4>カスタム材料</h4>
            <button id="create-material" class="btn btn-sm btn-success">材料作成</button>
            <div id="material-editor" class="material-editor" style="display: none;">
                <div class="form-group">
                    <label for="material-name">材料名:</label>
                    <input type="text" id="material-name" placeholder="カスタム材料">
                </div>
                <div class="form-group">
                    <label for="custom-reflectance">反射率:</label>
                    <input type="range" id="custom-reflectance" min="0.1" max="1.0" step="0.01" value="0.9">
                    <span id="custom-reflectance-value">0.9</span>
                </div>
                <div class="form-group">
                    <label for="custom-roughness">表面粗さ:</label>
                    <input type="range" id="custom-roughness" min="0.001" max="0.1" step="0.001" value="0.02">
                    <span id="custom-roughness-value">0.02</span>
                </div>
                <div class="form-group">
                    <label for="custom-refractive">屈折率:</label>
                    <input type="range" id="custom-refractive" min="1.0" max="3.0" step="0.01" value="1.5">
                    <span id="custom-refractive-value">1.5</span>
                </div>
                <div class="form-actions">
                    <button id="save-material" class="btn btn-sm btn-primary">保存</button>
                    <button id="cancel-material" class="btn btn-sm btn-secondary">キャンセル</button>
                </div>
            </div>
        `;

        materialsSection.appendChild(customMaterialControls);

        // イベントリスナーの追加
        document.getElementById('create-material').addEventListener('click', () => {
            this.showMaterialEditor();
        });

        document.getElementById('save-material').addEventListener('click', () => {
            this.saveMaterial();
        });

        document.getElementById('cancel-material').addEventListener('click', () => {
            this.hideMaterialEditor();
        });

        // 材料パラメータのスライダー
        ['custom-reflectance', 'custom-roughness', 'custom-refractive'].forEach(id => {
            const slider = document.getElementById(id);
            const valueSpan = document.getElementById(id + '-value');

            slider.addEventListener('input', (e) => {
                valueSpan.textContent = e.target.value;
            });
        });
    }

    showMaterialEditor() {
        document.getElementById('material-editor').style.display = 'block';
        document.getElementById('create-material').style.display = 'none';
    }

    hideMaterialEditor() {
        document.getElementById('material-editor').style.display = 'none';
        document.getElementById('create-material').style.display = 'block';
    }

    saveMaterial() {
        const materialData = {
            name: document.getElementById('material-name').value || 'カスタム材料',
            reflectance: parseFloat(document.getElementById('custom-reflectance').value),
            roughness: parseFloat(document.getElementById('custom-roughness').value),
            refractive_index: parseFloat(document.getElementById('custom-refractive').value),
            dispersion: 1.0,
            absorption_coefficient: 0.01,
            description: 'ユーザー作成のカスタム材料'
        };

        // 材料リストに追加（簡易実装）
        this.addMaterialToList(materialData);
        this.hideMaterialEditor();

        // フォームリセット
        document.getElementById('material-name').value = '';
        document.getElementById('custom-reflectance').value = 0.9;
        document.getElementById('custom-roughness').value = 0.02;
        document.getElementById('custom-refractive').value = 1.5;
    }

    addMaterialToList(material) {
        const container = document.getElementById('materials-list');
        const item = document.createElement('div');
        item.className = 'material-item custom-material';
        item.innerHTML = `
            <div class="material-name">${material.name}</div>
            <div class="material-props">
                反射率: ${(material.reflectance * 100).toFixed(1)}% | 
                粗さ: ${material.roughness.toFixed(3)}
            </div>
        `;
        container.appendChild(item);
    }

    bindExportControls() {
        // 高度なエクスポート機能
        this.addAdvancedExportControls();
    }

    addAdvancedExportControls() {
        const exportButton = document.getElementById('export-image');
        const exportContainer = exportButton.parentNode;

        // エクスポートオプションの追加
        const exportOptions = document.createElement('div');
        exportOptions.className = 'export-options';
        exportOptions.innerHTML = `
            <select id="export-format">
                <option value="png">PNG</option>
                <option value="jpg">JPEG</option>
                <option value="svg">SVG</option>
            </select>
            <select id="export-resolution">
                <option value="1">1x (現在サイズ)</option>
                <option value="2">2x (高解像度)</option>
                <option value="4">4x (最高品質)</option>
            </select>
        `;

        exportContainer.appendChild(exportOptions);

        // エクスポートボタンのイベント更新
        exportButton.removeEventListener('click', window.kaleidoscopeApp.exportImage);
        exportButton.addEventListener('click', () => {
            this.exportImageWithOptions();
        });
    }

    exportImageWithOptions() {
        const format = document.getElementById('export-format').value;
        const resolution = parseInt(document.getElementById('export-resolution').value);

        const canvas = document.getElementById('kaleidoscope-canvas');
        let exportCanvas = canvas;

        // 高解像度の場合は一時的なキャンバスを作成
        if (resolution > 1) {
            exportCanvas = document.createElement('canvas');
            exportCanvas.width = canvas.width * resolution;
            exportCanvas.height = canvas.height * resolution;

            const ctx = exportCanvas.getContext('2d');
            ctx.scale(resolution, resolution);
            ctx.drawImage(canvas, 0, 0);
        }

        // ファイル形式に応じたMIMEタイプ
        const mimeTypes = {
            png: 'image/png',
            jpg: 'image/jpeg',
            svg: 'image/svg+xml'
        };

        const link = document.createElement('a');
        link.download = `kaleidoscope_pattern_${Date.now()}.${format}`;
        link.href = exportCanvas.toDataURL(mimeTypes[format]);
        link.click();
    }

    setupPresetManagement() {
        // プリセット管理機能の拡張
        this.loadPresets();
        this.bindPresetControls();
    }

    loadPresets() {
        // ローカルストレージからプリセットを読み込み
        const savedPresets = localStorage.getItem('kaleidoscope_presets');
        if (savedPresets) {
            this.presets = JSON.parse(savedPresets);
            this.updatePresetSelect();
        }
    }

    updatePresetSelect() {
        const select = document.getElementById('config-select');

        // カスタムプリセットの追加
        this.presets.forEach(preset => {
            const option = document.createElement('option');
            option.value = `custom_${preset.id}`;
            option.textContent = `${preset.name} (カスタム)`;
            select.appendChild(option);
        });
    }

    bindPresetControls() {
        // プリセット管理のための追加コントロール
        const configControls = document.querySelector('.config-controls');

        const presetControls = document.createElement('div');
        presetControls.className = 'preset-controls';
        presetControls.innerHTML = `
            <button id="save-preset" class="btn btn-sm btn-info">プリセット保存</button>
            <button id="delete-preset" class="btn btn-sm btn-danger">削除</button>
        `;

        configControls.appendChild(presetControls);

        // イベントリスナーの追加
        document.getElementById('save-preset').addEventListener('click', () => {
            this.saveCurrentAsPreset();
        });

        document.getElementById('delete-preset').addEventListener('click', () => {
            this.deleteCurrentPreset();
        });
    }

    saveCurrentAsPreset() {
        if (!window.kaleidoscopeApp) return;

        const config = window.kaleidoscopeApp.getCurrentConfig();
        const name = prompt('プリセット名を入力してください:', `カスタム設定 ${this.presets.length + 1}`);

        if (name) {
            const preset = {
                id: Date.now(),
                name: name,
                config: config,
                created: new Date().toISOString()
            };

            this.presets.push(preset);
            localStorage.setItem('kaleidoscope_presets', JSON.stringify(this.presets));
            this.updatePresetSelect();
        }
    }

    deleteCurrentPreset() {
        const select = document.getElementById('config-select');
        const selectedValue = select.value;

        if (selectedValue.startsWith('custom_')) {
            const presetId = selectedValue.replace('custom_', '');
            this.presets = this.presets.filter(p => p.id != presetId);
            localStorage.setItem('kaleidoscope_presets', JSON.stringify(this.presets));

            // select要素からも削除
            const option = select.querySelector(`option[value="${selectedValue}"]`);
            if (option) {
                option.remove();
            }

            select.value = '';
        }
    }

    initializeAnimationControls() {
        // アニメーション制御の追加
        this.addAnimationControls();
    }

    addAnimationControls() {
        // 可視化エリアにアニメーション制御を追加
        const visHeader = document.querySelector('.vis-header .view-controls');

        const animationControls = document.createElement('div');
        animationControls.className = 'animation-controls';
        animationControls.innerHTML = `
            <button id="play-animation" class="btn btn-sm">▶️</button>
            <button id="pause-animation" class="btn btn-sm">⏸️</button>
            <input type="range" id="animation-speed" min="0.1" max="3.0" step="0.1" value="1.0">
        `;

        visHeader.appendChild(animationControls);

        // イベントリスナーの追加
        document.getElementById('play-animation').addEventListener('click', () => {
            if (window.visualizer) {
                window.visualizer.startAnimation();
            }
        });

        document.getElementById('pause-animation').addEventListener('click', () => {
            if (window.visualizer) {
                window.visualizer.stopAnimation();
            }
        });

        document.getElementById('animation-speed').addEventListener('input', (e) => {
            this.animationSpeed = parseFloat(e.target.value);
            // アニメーション速度の適用（実装は可視化エンジン側で対応）
        });
    }
}

// コントロール拡張の初期化
document.addEventListener('DOMContentLoaded', () => {
    // メインアプリの初期化後に実行
    setTimeout(() => {
        window.kaleidoscopeControls = new KaleidoscopeControls();
    }, 1000);
});
