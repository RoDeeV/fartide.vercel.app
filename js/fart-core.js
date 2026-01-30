/**
 * Fart IDE - Core Module
 * Skeuomorphic Edition
 */

class FartIDE {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.graph = null;
        this.graphCanvas = null;
        this.executor = null;
        this.variables = new Map();
        this.isRunning = false;
        this.selectedNode = null;
        this.executionStartTime = 0;
        this.commandHistory = [];
        this.historyIndex = -1;
        this.spriteManager = null;
        
        this.init();
    }

    init() {
        this.setupStage();
        this.setupLiteGraph();
        this.registerNodes();
        this.setupUI();
        this.setupEventListeners();
        this.loadAutoSave();
        
        this.graphCanvas.setDirty(true, true);
        
        this.log('Fart IDE initialized!', 'success');
        this.log('Type "help" for commands', 'info');
        this.updateStatus('Ready');
    }

    setupStage() {
        const stageCanvas = document.getElementById('stage-canvas');
        this.spriteManager = new SpriteManager(stageCanvas);
        
        const renderStage = () => {
            this.spriteManager.render();
            requestAnimationFrame(renderStage);
        };
        renderStage();
    }

    setupLiteGraph() {
        LiteGraph.debug = false;
        LiteGraph.catch_errors = true;
        LiteGraph.throw_errors = false;
        LiteGraph.allow_scripts = false;
        
        this.graph = new LGraph();
        
        const canvas = document.getElementById(this.canvasId);
        const container = document.getElementById('canvas-area');
        const frame = container.querySelector('.canvas-frame');
        
        canvas.width = frame.clientWidth;
        canvas.height = frame.clientHeight;
        
        this.graphCanvas = new LGraphCanvas(canvas, this.graph);
        
        this.graphCanvas.background_image = null;
        this.graphCanvas.render_canvas_border = false;
        this.graphCanvas.render_connections_shadows = false;
        this.graphCanvas.render_curved_connections = true;
        this.graphCanvas.render_connection_arrows = true;
        this.graphCanvas.connections_width = 3;
        this.graphCanvas.highquality_render = true;
        this.graphCanvas.show_info = false;
        this.graphCanvas.allow_searchbox = true;
        this.graphCanvas.render_grid = true;
        
        this.graphCanvas.background_color = '#1a1f2e';
        this.graphCanvas.clear_background_color = '#1a1f2e';
        
        const self = this;
        const orig = this.graphCanvas.drawBackCanvas;
        this.graphCanvas.drawBackCanvas = function() {
            orig.apply(this, arguments);
            self.drawCustomGrid(this);
        };
        
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.graphCanvas.onNodeSelected = (node) => this.onNodeSelected(node);
        this.graphCanvas.onNodeDeselected = (node) => this.onNodeDeselected(node);
        
        this.graph.onNodeAdded = () => this.updateCounts();
        this.graph.onNodeRemoved = (node) => {
            this.updateCounts();
            if (this.selectedNode === node) {
                this.selectedNode = null;
                this.showNodeProperties(null);
            }
        };
        this.graph.onConnectionChange = () => this.updateCounts();
        
        this.startRendering();
    }

    drawCustomGrid(canvas) {
        const ctx = canvas.bgcanvas.getContext('2d');
        const gridSize = 40;
        const scale = canvas.ds.scale;
        const offset = canvas.ds.offset;
        
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        
        const startX = (offset[0] % gridSize) * scale;
        const startY = (offset[1] % gridSize) * scale;
        
        for (let x = startX; x < canvas.bgcanvas.width; x += gridSize * scale) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.bgcanvas.height);
            ctx.stroke();
        }
        
        for (let y = startY; y < canvas.bgcanvas.height; y += gridSize * scale) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.bgcanvas.width, y);
            ctx.stroke();
        }
        
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        const major = gridSize * 5;
        const majorX = (offset[0] % major) * scale;
        const majorY = (offset[1] % major) * scale;
        
        for (let x = majorX; x < canvas.bgcanvas.width; x += major * scale) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.bgcanvas.height);
            ctx.stroke();
        }
        
        for (let y = majorY; y < canvas.bgcanvas.height; y += major * scale) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.bgcanvas.width, y);
            ctx.stroke();
        }
    }

    startRendering() {
        const render = () => {
            this.graphCanvas.draw(true, true);
            this.renderFrameId = requestAnimationFrame(render);
        };
        render();
    }

    resizeCanvas() {
        const container = document.getElementById('canvas-area');
        const frame = container.querySelector('.canvas-frame');
        const canvas = document.getElementById(this.canvasId);
        
        canvas.width = frame.clientWidth;
        canvas.height = frame.clientHeight;
        this.graphCanvas.setDirty(true, true);
    }

    registerNodes() {
        FartNodes.registerAll();
    }

    setupUI() {
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
        this.updateSpritesList();
    }

    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('btn-new').addEventListener('click', () => this.newProject());
        document.getElementById('btn-open').addEventListener('click', () => this.openProject());
        document.getElementById('btn-save').addEventListener('click', () => this.saveProject());
        document.getElementById('btn-run').addEventListener('click', () => this.runProgram());
        document.getElementById('btn-stop').addEventListener('click', () => this.stopProgram());
        document.getElementById('btn-step').addEventListener('click', () => this.stepProgram());
        document.getElementById('btn-clear-graph').addEventListener('click', () => this.clearGraph());
        document.getElementById('btn-settings').addEventListener('click', () => this.showSettings());
        document.getElementById('btn-help').addEventListener('click', () => this.showHelp());
        
        // Stage controls
        document.getElementById('btn-reset-stage').addEventListener('click', () => {
            this.spriteManager.resetSprites();
            this.log('Stage reset', 'info');
        });
        
        document.getElementById('btn-fullscreen-stage').addEventListener('click', () => {
            const stage = document.getElementById('stage-container');
            if (stage.requestFullscreen) {
                stage.requestFullscreen();
            }
        });
        
        // File input
        document.getElementById('file-input').addEventListener('change', (e) => this.handleFileOpen(e));
        
        // Console
        document.getElementById('console-clear').addEventListener('click', () => this.clearConsole());
        document.getElementById('console-send').addEventListener('click', () => this.sendConsoleInput());
        
        const consoleInput = document.getElementById('console-input');
        consoleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendConsoleInput();
            else if (e.key === 'ArrowUp') { e.preventDefault(); this.navigateHistory(-1); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); this.navigateHistory(1); }
        });
        
        // Variables and Sprites
        document.getElementById('add-variable').addEventListener('click', () => this.addVariable());
        document.getElementById('add-sprite').addEventListener('click', () => this.showAddSpriteDialog());
        document.getElementById('sprite-file-input').addEventListener('change', (e) => this.handleSpriteImage(e));
        
        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoom(0.2));
        document.getElementById('zoom-out').addEventListener('click', () => this.zoom(-0.2));
        document.getElementById('zoom-fit').addEventListener('click', () => this.zoomReset());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Auto-save
        setInterval(() => this.autoSave(), 30000);
        setInterval(() => this.updateZoomLevel(), 200);
    }

    // ========================================
    // TAB SWITCHING
    // ========================================
    
    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    }

    // ========================================
    // SPRITES
    // ========================================
    
    showAddSpriteDialog() {
        const emojis = ['😀', '😎', '🐱', '🐶', '🦊', '🐸', '🐵', '🐰', '🦁', '🐼', '⭐', '❤️', '🚀', '🎮', '⚽', '🏀'];
        
        let emojiHtml = emojis.map(e => 
            `<button class="emoji-btn" data-emoji="${e}">${e}</button>`
        ).join('');
        
        this.showModal('🎭 Add Sprite', `
            <style>
                .emoji-btn { font-size:1.5rem; padding:8px; margin:4px; border:2px solid transparent; border-radius:8px; background:rgba(0,0,0,0.2); cursor:pointer; transition: all 0.15s; }
                .emoji-btn:hover { background:rgba(255,255,255,0.1); }
                .emoji-btn.selected { border-color: var(--color-primary); background:rgba(59,130,246,0.2); }
                .sprite-dialog-input { width:100%; padding:10px 12px; font-size:0.9rem; background:var(--surface-800); border:1px solid rgba(0,0,0,0.3); border-radius:6px; color:var(--text-inverse); margin-top:8px; }
                .sprite-dialog-input:focus { outline:none; border-color:var(--color-primary); }
                .sprite-dialog-section { margin-bottom:20px; }
                .sprite-dialog-label { display:block; font-weight:600; margin-bottom:8px; color:var(--surface-200); }
                .emoji-grid { display:flex; flex-wrap:wrap; gap:4px; }
                .upload-btn { width:100%; padding:12px; background:var(--surface-600); border:2px dashed var(--surface-400); border-radius:8px; color:var(--surface-300); font-size:0.9rem; cursor:pointer; transition: all 0.15s; }
                .upload-btn:hover { border-color:var(--color-primary); color:var(--text-inverse); }
            </style>
            <div class="sprite-dialog-section">
                <label class="sprite-dialog-label">Sprite Name</label>
                <input type="text" id="new-sprite-name" class="sprite-dialog-input" value="Sprite${this.spriteManager.sprites.length + 1}">
            </div>
            <div class="sprite-dialog-section">
                <label class="sprite-dialog-label">Choose Emoji</label>
                <div class="emoji-grid">${emojiHtml}</div>
            </div>
            <div class="sprite-dialog-section">
                <label class="sprite-dialog-label">Or Upload Image</label>
                <button id="upload-sprite-img" class="upload-btn">Choose Image File...</button>
            </div>
        `, [
            { text: 'Cancel', action: 'cancel', type: 'secondary' },
            { text: 'Create Sprite', action: 'create', type: 'primary', callback: () => this.createSpriteFromDialog() }
        ]);
        
        // Emoji selection
        setTimeout(() => {
            document.querySelectorAll('.emoji-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this._selectedEmoji = btn.dataset.emoji;
                });
            });
            
            // Select first emoji by default
            const firstEmoji = document.querySelector('.emoji-btn');
            if (firstEmoji) {
                firstEmoji.classList.add('selected');
                this._selectedEmoji = firstEmoji.dataset.emoji;
            }
            
            document.getElementById('upload-sprite-img')?.addEventListener('click', () => {
                document.getElementById('sprite-file-input').click();
            });
        }, 50);
        
        this._pendingImageData = null;
    }

    createSpriteFromDialog() {
        const nameInput = document.getElementById('new-sprite-name');
        const name = nameInput?.value || 'Sprite';
        const sprite = this.spriteManager.addSprite(name, { emoji: this._selectedEmoji || '😀' });
        
        if (this._pendingImageData) {
            sprite.loadCostume(this._pendingImageData, 'costume1').then(() => {
                this.updateSpritesList();
                this.spriteManager.render();
            });
            this._pendingImageData = null;
        }
        
        this.updateSpritesList();
        this.log(`🎭 Created sprite: ${name}`, 'success');
    }

    handleSpriteImage(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            this._pendingImageData = event.target.result;
            this.log(`Image loaded: ${file.name}`, 'info');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    updateSpritesList() {
        const container = document.getElementById('sprites-list');
        const spriteCount = document.getElementById('sprite-count');
        
        if (spriteCount) {
            spriteCount.textContent = this.spriteManager.sprites.length;
        }
        
        if (this.spriteManager.sprites.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-text">No sprites yet</div>
                    <div class="empty-hint">Click "Add Sprite" to create one</div>
                </div>
            `;
            document.getElementById('sprite-properties')?.classList.add('hidden');
            return;
        }
        
        container.innerHTML = '';
        
        this.spriteManager.sprites.forEach(sprite => {
            const item = document.createElement('div');
            item.className = 'sprite-item' + (this.spriteManager.selectedSprite === sprite ? ' selected' : '');
            
            let thumbnailContent;
            if (sprite.costume && sprite.costume.image) {
                thumbnailContent = `<img src="${sprite.costume.image.src}" alt="${sprite.name}">`;
            } else {
                thumbnailContent = `<span class="placeholder">${sprite.defaultEmoji}</span>`;
            }
            
            item.innerHTML = `
                <div class="sprite-thumbnail">${thumbnailContent}</div>
                <div class="sprite-info">
                    <div class="sprite-name">${this.escapeHtml(sprite.name)}</div>
                    <div class="sprite-coords">x: ${Math.round(sprite.x)}, y: ${Math.round(sprite.y)}</div>
                </div>
                <div class="sprite-actions">
                    <button class="sprite-action-btn" data-action="costume" title="Add Costume">🖼</button>
                    <button class="sprite-action-btn delete" data-action="delete" title="Delete">🗑</button>
                </div>
            `;
            
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.sprite-action-btn')) {
                    this.spriteManager.selectSprite(sprite);
                    this.updateSpritesList();
                    this.switchTab('sprites');
                }
            });
            
            item.querySelector('[data-action="costume"]').addEventListener('click', (e) => {
                e.stopPropagation();
                this._costumeTargetSprite = sprite;
                
                const input = document.getElementById('sprite-file-input');
                const handler = (evt) => {
                    const file = evt.target.files[0];
                    if (file && this._costumeTargetSprite) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            this._costumeTargetSprite.loadCostume(ev.target.result, `costume${this._costumeTargetSprite.costumes.length + 1}`)
                                .then(() => {
                                    this.updateSpritesList();
                                    this.spriteManager.render();
                                    this.log(`Costume added to ${this._costumeTargetSprite.name}`, 'success');
                                });
                        };
                        reader.readAsDataURL(file);
                    }
                    evt.target.value = '';
                    input.removeEventListener('change', handler);
                };
                
                input.addEventListener('change', handler);
                input.click();
            });
            
            item.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete sprite "${sprite.name}"?`)) {
                    this.spriteManager.removeSprite(sprite);
                    this.updateSpritesList();
                    this.log(`Deleted sprite: ${sprite.name}`, 'info');
                }
            });
            
            container.appendChild(item);
        });
        
        if (this.spriteManager.selectedSprite) {
            this.showSpriteProperties(this.spriteManager.selectedSprite);
        }
    }

    showSpriteProperties(sprite) {
        const container = document.getElementById('sprite-properties');
        
        if (!sprite) {
            container?.classList.add('hidden');
            return;
        }
        
        container?.classList.remove('hidden');
        
        container.innerHTML = `
            <div class="property-section">
                <div class="property-section-title">Sprite Properties</div>
                <div class="property-row">
                    <label>Name</label>
                    <input type="text" id="sprite-prop-name" value="${this.escapeHtml(sprite.name)}">
                </div>
                <div class="property-row">
                    <label>X</label>
                    <input type="number" id="sprite-prop-x" value="${Math.round(sprite.x)}">
                </div>
                <div class="property-row">
                    <label>Y</label>
                    <input type="number" id="sprite-prop-y" value="${Math.round(sprite.y)}">
                </div>
                <div class="property-row">
                    <label>Rotation</label>
                    <input type="number" id="sprite-prop-rotation" value="${Math.round(sprite.rotation)}">
                </div>
                <div class="property-row">
                    <label>Scale</label>
                    <input type="number" id="sprite-prop-scale" value="${sprite.scaleX}" step="0.1" min="0.1" max="10">
                </div>
                <div class="property-row">
                    <label>Visible</label>
                    <input type="checkbox" id="sprite-prop-visible" ${sprite.visible ? 'checked' : ''}>
                </div>
                <div class="property-row">
                    <label>Draggable</label>
                    <input type="checkbox" id="sprite-prop-draggable" ${sprite.draggable ? 'checked' : ''}>
                </div>
            </div>
        `;
        
        const bindProp = (id, prop, parser = v => v) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => {
                    if (el.type === 'checkbox') {
                        sprite[prop] = el.checked;
                    } else {
                        sprite[prop] = parser(el.value);
                    }
                    this.updateSpritesList();
                    this.spriteManager.render();
                });
            }
        };
        
        bindProp('sprite-prop-name', 'name');
        bindProp('sprite-prop-x', 'x', parseFloat);
        bindProp('sprite-prop-y', 'y', parseFloat);
        bindProp('sprite-prop-rotation', 'rotation', parseFloat);
        
        document.getElementById('sprite-prop-scale')?.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value);
            sprite.scaleX = val;
            sprite.scaleY = val;
            this.spriteManager.render();
        });
        
        bindProp('sprite-prop-visible', 'visible');
        bindProp('sprite-prop-draggable', 'draggable');
    }

    // ========================================
    // PROJECT MANAGEMENT
    // ========================================
    
    newProject() {
        if (this.graph._nodes.length > 0 || this.spriteManager.sprites.length > 0) {
            if (!confirm('Create new project? Unsaved changes will be lost.')) return;
        }
        this.stopProgram();
        this.graph.clear();
        this.variables.clear();
        this.spriteManager.clear();
        this.updateVariablesList();
        this.updateSpritesList();
        this.clearConsole();
        this.log('New project created', 'info');
        this.updateStatus('New project');
    }

    openProject() {
        document.getElementById('file-input').click();
    }

    handleFileOpen(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.stopProgram();
                this.graph.configure(data.graph);
                
                this.variables.clear();
                if (data.variables) {
                    Object.entries(data.variables).forEach(([k, v]) => this.variables.set(k, v));
                }
                
                if (data.stage) {
                    await this.spriteManager.deserialize(data.stage);
                }
                
                this.updateVariablesList();
                this.updateSpritesList();
                this.updateCounts();
                this.log(`Loaded: ${file.name}`, 'success');
            } catch (error) {
                this.log(`Error: ${error.message}`, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    saveProject() {
        const data = {
            version: '1.0',
            created: new Date().toISOString(),
            graph: this.graph.serialize(),
            variables: Object.fromEntries(this.variables),
            stage: this.spriteManager.serialize()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fart-project-${Date.now()}.fart`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.log('Project saved!', 'success');
    }

    autoSave() {
        if (this.graph._nodes.length === 0 && this.variables.size === 0 && this.spriteManager.sprites.length === 0) return;
        const data = {
            graph: this.graph.serialize(),
            variables: Object.fromEntries(this.variables),
            stage: this.spriteManager.serialize()
        };
        localStorage.setItem('fart-autosave', JSON.stringify(data));
    }

    loadAutoSave() {
        const saved = localStorage.getItem('fart-autosave');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                const hasContent = data.graph?.nodes?.length > 0 || 
                                  (data.variables && Object.keys(data.variables).length > 0) ||
                                  (data.stage?.sprites?.length > 0);
                                  
                if (hasContent && confirm('Restore previous session?')) {
                    this.graph.configure(data.graph);
                    
                    this.variables.clear();
                    if (data.variables) {
                        Object.entries(data.variables).forEach(([k, v]) => this.variables.set(k, v));
                    }
                    
                    if (data.stage) {
                        this.spriteManager.deserialize(data.stage);
                    }
                    
                    this.updateVariablesList();
                    this.updateSpritesList();
                    this.updateCounts();
                    this.log('Session restored', 'info');
                }
            } catch (e) {
                console.warn('Autosave load failed:', e);
            }
        }
    }

    clearGraph() {
        if (this.graph._nodes.length === 0) return;
        if (confirm('Clear all nodes from canvas?')) {
            this.stopProgram();
            this.graph.clear();
            this.log('Canvas cleared', 'info');
        }
    }

    // ========================================
    // EXECUTION
    // ========================================
    
    runProgram() {
        if (this.isRunning) return;
        
        if (this.graph._nodes.length === 0) {
            this.log('No nodes to execute!', 'warn');
            return;
        }
        
        this.isRunning = true;
        this.executionStartTime = Date.now();
        
        // Update UI
        document.getElementById('btn-run').disabled = true;
        document.getElementById('btn-stop').disabled = false;
        document.getElementById('execution-indicator').classList.remove('hidden');
        
        const badge = document.getElementById('execution-status');
        badge.className = 'execution-badge running';
        badge.querySelector('.badge-text').textContent = 'Running';
        
        // Initialize nodes
        this.graph._nodes.forEach(node => { if (node.onStart) node.onStart(); });
        
        // Start executor
        this.executor = new FartExecutor(this);
        this.executor.start();
        
        this.log('Program started', 'success');
        this.updateStatus('Running...');
        
        // Update time display
        this.executionTimer = setInterval(() => {
            const elapsed = ((Date.now() - this.executionStartTime) / 1000).toFixed(1);
            document.getElementById('execution-time').textContent = `${elapsed}s`;
        }, 100);
    }

    stopProgram() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        if (this.executor) { this.executor.stop(); this.executor = null; }
        if (this.executionTimer) { clearInterval(this.executionTimer); this.executionTimer = null; }
        
        // Update UI
        document.getElementById('btn-run').disabled = false;
        document.getElementById('btn-stop').disabled = true;
        document.getElementById('execution-indicator').classList.add('hidden');
        
        const badge = document.getElementById('execution-status');
        badge.className = 'execution-badge stopped';
        badge.querySelector('.badge-text').textContent = 'Stopped';
        
        document.getElementById('execution-time').textContent = '0.0s';
        
        // Clean up nodes
        this.graph._nodes.forEach(node => {
            if (node.onStop) node.onStop();
            node.boxcolor = null;
        });
        
        this.log('Program stopped', 'warn');
        this.updateStatus('Stopped');
    }

    stepProgram() {
        if (this.graph._nodes.length === 0) {
            this.log('No nodes to execute', 'warn');
            return;
        }
        
        const badge = document.getElementById('execution-status');
        badge.className = 'execution-badge running';
        badge.querySelector('.badge-text').textContent = 'Stepping';
        
        this.graph.runStep(1);
        this.log('Stepped', 'info');
    }

    // ========================================
    // VARIABLES
    // ========================================
    
    addVariable(name = null, value = 0) {
        let varName = name || 'var';
        let counter = 1;
        while (this.variables.has(varName)) varName = `var${counter++}`;
        this.variables.set(varName, value);
        this.updateVariablesList();
        this.log(`Created: ${varName} = ${value}`, 'info');
    }

    getVariable(name) {
        return this.variables.get(name);
    }

    setVariable(name, value) {
        this.variables.set(name, value);
        this.updateVariablesList();
    }

    updateVariablesList() {
        const container = document.getElementById('variables-list');
        
        if (this.variables.size === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-text">No variables</div>
                    <div class="empty-hint">Click "Add Variable" to create one</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        this.variables.forEach((value, name) => {
            const item = document.createElement('div');
            item.className = 'variable-item';
            
            const type = Array.isArray(value) ? 'arr' : typeof value === 'object' ? 'obj' : 
                         typeof value === 'number' ? 'num' : typeof value === 'boolean' ? 'bool' : 'str';
            const displayVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
            
            item.innerHTML = `
                <input type="text" class="var-name" value="${this.escapeHtml(name)}" data-original="${this.escapeHtml(name)}">
                <input type="text" class="var-value" value="${this.escapeHtml(displayVal)}">
                <span class="var-type">${type}</span>
                <button class="var-delete">×</button>
            `;
            
            const nameInput = item.querySelector('.var-name');
            const valueInput = item.querySelector('.var-value');
            const typeSpan = item.querySelector('.var-type');
            
            nameInput.addEventListener('change', () => {
                const oldName = nameInput.dataset.original;
                const newName = nameInput.value.trim();
                if (newName && newName !== oldName && !this.variables.has(newName)) {
                    const val = this.variables.get(oldName);
                    this.variables.delete(oldName);
                    this.variables.set(newName, val);
                    nameInput.dataset.original = newName;
                } else {
                    nameInput.value = oldName;
                }
            });
            
            valueInput.addEventListener('change', () => {
                const parsed = this.parseValue(valueInput.value);
                this.variables.set(nameInput.dataset.original, parsed);
                typeSpan.textContent = Array.isArray(parsed) ? 'arr' : typeof parsed === 'object' ? 'obj' : 
                                       typeof parsed === 'number' ? 'num' : typeof parsed === 'boolean' ? 'bool' : 'str';
            });
            
            item.querySelector('.var-delete').addEventListener('click', () => {
                this.variables.delete(nameInput.dataset.original);
                this.updateVariablesList();
            });
            
            container.appendChild(item);
        });
    }

    parseValue(str) {
        const t = str.trim();
        if (t === 'true') return true;
        if (t === 'false') return false;
        if (t === 'null') return null;
        if (!isNaN(t) && t !== '') return parseFloat(t);
        try {
            if ((t.startsWith('[') && t.endsWith(']')) || (t.startsWith('{') && t.endsWith('}'))) {
                return JSON.parse(t);
            }
        } catch {}
        return str;
    }

    // ========================================
    // CONSOLE
    // ========================================
    
    log(message, type = 'log') {
        const output = document.getElementById('console-output');
        
        // Remove welcome message if present
        const welcome = output.querySelector('.console-welcome');
        if (welcome) welcome.remove();
        
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        line.innerHTML = `<span class="timestamp">[${time}]</span> ${this.escapeHtml(String(message))}`;
        output.appendChild(line);
        
        if (document.getElementById('console-autoscroll')?.checked) {
            output.scrollTop = output.scrollHeight;
        }
    }

    clearConsole() {
        const output = document.getElementById('console-output');
        output.innerHTML = `
            <div class="console-welcome">
                <div class="welcome-text">Fart IDE Console</div>
                <div class="welcome-hint">Type 'help' for commands</div>
            </div>
        `;
    }

    navigateHistory(dir) {
        if (this.commandHistory.length === 0) return;
        this.historyIndex = Math.max(0, Math.min(this.commandHistory.length, this.historyIndex + dir));
        document.getElementById('console-input').value = this.commandHistory[this.historyIndex] || '';
    }

    sendConsoleInput() {
        const input = document.getElementById('console-input');
        const cmd = input.value.trim();
        if (!cmd) return;
        
        this.commandHistory.push(cmd);
        this.historyIndex = this.commandHistory.length;
        this.log(`> ${cmd}`, 'input');
        input.value = '';
        
        this.executeCommand(cmd);
    }

    executeCommand(command) {
        const parts = command.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        try {
            switch (cmd) {
                case 'help': case '?': this.showCommandHelp(); break;
                case 'clear': case 'cls': this.clearConsole(); break;
                case 'run': this.runProgram(); break;
                case 'stop': this.stopProgram(); break;
                case 'step': this.stepProgram(); break;
                case 'vars': case 'variables':
                    this.log(JSON.stringify(Object.fromEntries(this.variables), null, 2), 'output');
                    break;
                case 'set':
                    if (args.length >= 2) {
                        this.setVariable(args[0], this.parseValue(args.slice(1).join(' ')));
                        this.log(`${args[0]} set`, 'success');
                    } else this.log('Usage: set <name> <value>', 'warn');
                    break;
                case 'get':
                    if (args[0]) this.log(`${args[0]} = ${JSON.stringify(this.getVariable(args[0]))}`, 'output');
                    break;
                case 'del': case 'delete':
                    if (args[0] && this.variables.has(args[0])) {
                        this.variables.delete(args[0]);
                        this.updateVariablesList();
                        this.log(`Deleted: ${args[0]}`, 'success');
                    }
                    break;
                case 'sprites':
                    this.spriteManager.sprites.forEach(s => 
                        this.log(`${s.name}: (${Math.round(s.x)}, ${Math.round(s.y)})`, 'output')
                    );
                    break;
                case 'nodes':
                    this.log(`Nodes: ${this.graph._nodes.length}`, 'info');
                    this.graph._nodes.forEach((n, i) => this.log(`  ${i}: ${n.title}`, 'output'));
                    break;
                case 'new': this.newProject(); break;
                case 'save': this.saveProject(); break;
                case 'open': this.openProject(); break;
                case 'zoom':
                    if (args[0]) {
                        this.graphCanvas.ds.scale = parseFloat(args[0]) / 100;
                        this.updateZoomLevel();
                    } else {
                        this.log(`Zoom: ${Math.round(this.graphCanvas.ds.scale * 100)}%`, 'info');
                    }
                    break;
                case 'reset': this.zoomReset(); break;
                case 'time': this.log(new Date().toLocaleString(), 'output'); break;
                default:
                    try {
                        const result = eval(command);
                        if (result !== undefined) this.log(typeof result === 'object' ? JSON.stringify(result) : String(result), 'output');
                    } catch {
                        this.log(`Unknown command: ${cmd}. Type 'help' for commands.`, 'error');
                    }
            }
        } catch (e) {
            this.log(`Error: ${e.message}`, 'error');
        }
    }

    showCommandHelp() {
        const commands = [
            'help      - Show commands',
            'clear     - Clear console',
            'run       - Run program',
            'stop      - Stop program',
            'step      - Step through',
            'vars      - List variables',
            'set x 10  - Set variable',
            'get x     - Get variable',
            'del x     - Delete variable',
            'sprites   - List sprites',
            'nodes     - List nodes',
            'new       - New project',
            'save      - Save project',
            'open      - Open project',
            'zoom 150  - Set zoom',
            'reset     - Reset view'
        ];
        commands.forEach(c => this.log(c, 'info'));
    }

    // ========================================
    // NODE PROPERTIES
    // ========================================
    
    onNodeSelected(node) {
        this.selectedNode = node;
        this.showNodeProperties(node);
        this.switchTab('properties');
    }

    onNodeDeselected(node) {
        if (this.selectedNode === node) {
            this.selectedNode = null;
            this.showNodeProperties(null);
        }
    }

    showNodeProperties(node) {
        const container = document.getElementById('node-properties');
        
        if (!node) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚙</div>
                    <div class="empty-text">No selection</div>
                    <div class="empty-hint">Select a node to view properties</div>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="node-info-card">
                <div class="node-title">${this.escapeHtml(node.title)}</div>
                <div class="node-type">${this.escapeHtml(node.type)}</div>
            </div>
        `;
        
        if (node.properties && Object.keys(node.properties).length > 0) {
            html += `<div class="property-section"><div class="property-section-title">Properties</div>`;
            Object.entries(node.properties).forEach(([key, value]) => {
                const displayVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
                html += `
                    <div class="property-row">
                        <label>${this.escapeHtml(key)}</label>
                        <input type="text" data-prop="${this.escapeHtml(key)}" value="${this.escapeHtml(displayVal)}">
                    </div>
                `;
            });
            html += `</div>`;
        }
        
        container.innerHTML = html;
        
        container.querySelectorAll('input[data-prop]').forEach(input => {
            input.addEventListener('change', () => {
                node.properties[input.dataset.prop] = this.parseValue(input.value);
                if (node.onPropertyChanged) node.onPropertyChanged(input.dataset.prop, node.properties[input.dataset.prop]);
            });
        });
    }

    // ========================================
    // ZOOM & UTILITIES
    // ========================================
    
    zoom(delta) {
        this.graphCanvas.ds.scale = Math.max(0.2, Math.min(3, this.graphCanvas.ds.scale + delta));
        this.updateZoomLevel();
    }

    zoomReset() {
        this.graphCanvas.ds.scale = 1;
        this.graphCanvas.ds.offset = [0, 0];
        this.updateZoomLevel();
    }

    updateZoomLevel() {
        document.getElementById('zoom-level').textContent = Math.round(this.graphCanvas.ds.scale * 100);
    }

    updateStatus(msg) {
        document.getElementById('status-message').textContent = msg;
    }

    updateCounts() {
        document.getElementById('node-count').textContent = this.graph._nodes?.length || 0;
        document.getElementById('connection-count').textContent = this.graph.links ? Object.keys(this.graph.links).length : 0;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'F5') { e.preventDefault(); if (!this.isRunning) this.runProgram(); }
        if (e.key === 'Escape' && this.isRunning) this.stopProgram();
        if (e.key === 'F10') { e.preventDefault(); this.stepProgram(); }
        if (e.key === 'F1') { e.preventDefault(); this.showHelp(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); this.saveProject(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') { e.preventDefault(); this.openProject(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); this.newProject(); }
    }

    // ========================================
    // MODALS
    // ========================================
    
    showModal(title, content, buttons = []) {
        const overlay = document.getElementById('modal-overlay');
        const container = document.getElementById('modal-container');
        
        container.innerHTML = `
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close">×</button>
            </div>
            <div class="modal-body">${content}</div>
            ${buttons.length ? `
                <div class="modal-footer">
                    ${buttons.map(b => `<button class="modal-btn ${b.type || 'secondary'}" data-action="${b.action}">${b.text}</button>`).join('')}
                </div>
            ` : ''}
        `;
        
        overlay.classList.remove('hidden');
        
        container.querySelector('.modal-close').addEventListener('click', () => this.hideModal());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) this.hideModal(); });
        
        container.querySelectorAll('.modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const handler = buttons.find(b => b.action === btn.dataset.action);
                if (handler?.callback) handler.callback();
                this.hideModal();
            });
        });
    }

    hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }

    showSettings() {
        this.showModal('⚙ Settings', `
            <p style="color:var(--surface-300);">Settings panel coming in a future update.</p>
        `, [{ text: 'Close', action: 'close', type: 'primary' }]);
    }

    showHelp() {
        this.showModal('Help', `
            <h4>Getting Started</h4>
            <p>Right-click on the canvas to add nodes. Connect them by dragging from outputs to inputs.</p>
            
            <h4>Working with Sprites</h4>
            <p>Add sprites in the Sprites tab. Use sprite nodes to control them: move, rotate, say, show/hide.</p>
            
            <h4>Running Your Program</h4>
            <p>Add an "On Start" event node, connect your logic, then click Run or press F5.</p>
            
            <h4>Keyboard Shortcuts</h4>
            <ul>
                <li><code>F5</code> - Run program</li>
                <li><code>Esc</code> - Stop program</li>
                <li><code>F10</code> - Step through</li>
                <li><code>Ctrl+S</code> - Save project</li>
                <li><code>Ctrl+O</code> - Open project</li>
                <li><code>Ctrl+N</code> - New project</li>
            </ul>
            
            <h4>Console Commands</h4>
            <p>Type <code>help</code> in the console for available commands.</p>
        `, [{ text: 'Got it!', action: 'close', type: 'primary' }]);
    }
}
