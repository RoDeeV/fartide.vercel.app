/**
 * Fart IDE - Sprite System
 */

class FartSprite {
    constructor(name, options = {}) {
        this.id = 'sprite_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.name = name || 'Sprite';
        this.x = options.x ?? 0;
        this.y = options.y ?? 0;
        this.rotation = options.rotation ?? 0;
        this.scaleX = options.scaleX ?? 1;
        this.scaleY = options.scaleY ?? 1;
        this.visible = options.visible ?? true;
        this.opacity = options.opacity ?? 1;
        this.costume = null;
        this.costumes = [];
        this.currentCostumeIndex = 0;
        this.sayText = '';
        this.sayTimer = null;
        this.draggable = false;
        this.isDragging = false;
        this.defaultEmoji = options.emoji || '😀';
    }

    loadCostume(src, name = 'costume') {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const maxSize = 200;
                let width = img.width;
                let height = img.height;
                
                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                const costume = {
                    name: name,
                    image: img,
                    width: width,
                    height: height,
                    originalWidth: img.width,
                    originalHeight: img.height
                };
                
                this.costumes.push(costume);
                if (this.costumes.length === 1) {
                    this.currentCostumeIndex = 0;
                    this.costume = costume;
                }
                
                resolve(costume);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = src;
        });
    }

    getDisplaySize() {
        if (this.costume) {
            return {
                width: this.costume.width * this.scaleX,
                height: this.costume.height * this.scaleY
            };
        }
        return { width: 50 * this.scaleX, height: 50 * this.scaleY };
    }

    setCostume(index) {
        if (index >= 0 && index < this.costumes.length) {
            this.currentCostumeIndex = index;
            this.costume = this.costumes[index];
        }
    }

    nextCostume() {
        if (this.costumes.length > 0) {
            this.currentCostumeIndex = (this.currentCostumeIndex + 1) % this.costumes.length;
            this.costume = this.costumes[this.currentCostumeIndex];
        }
    }

    move(steps) {
        const rad = (this.rotation - 90) * Math.PI / 180;
        this.x += Math.cos(rad) * steps;
        this.y += Math.sin(rad) * steps;
    }

    goTo(x, y) {
        this.x = x;
        this.y = y;
    }

    async glideTo(x, y, duration = 1000) {
        const startX = this.x;
        const startY = this.y;
        const startTime = Date.now();
        
        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                this.x = startX + (x - startX) * progress;
                this.y = startY + (y - startY) * progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            animate();
        });
    }

    pointInDirection(angle) {
        this.rotation = angle;
    }

    pointTowards(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        this.rotation = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    }

    turn(degrees) {
        this.rotation += degrees;
    }

    say(text, duration = 0) {
        this.sayText = String(text);
        
        if (this.sayTimer) {
            clearTimeout(this.sayTimer);
            this.sayTimer = null;
        }
        
        if (duration > 0) {
            this.sayTimer = setTimeout(() => {
                this.sayText = '';
                this.sayTimer = null;
            }, duration);
        }
    }

    containsPoint(px, py) {
        const size = this.getDisplaySize();
        const halfW = size.width / 2;
        const halfH = size.height / 2;
        
        return px >= this.x - halfW && px <= this.x + halfW &&
               py >= this.y - halfH && py <= this.y + halfH;
    }

    draw(ctx, stageWidth, stageHeight) {
        if (!this.visible) return;
        
        const centerX = stageWidth / 2 + this.x;
        const centerY = stageHeight / 2 - this.y;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.globalAlpha = this.opacity;
        ctx.scale(this.scaleX, this.scaleY);
        
        if (this.costume && this.costume.image) {
            const w = this.costume.width;
            const h = this.costume.height;
            ctx.drawImage(this.costume.image, -w / 2, -h / 2, w, h);
        } else {
            ctx.font = '40px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.defaultEmoji, 0, 0);
        }
        
        ctx.restore();
        
        if (this.sayText) {
            this.drawSpeechBubble(ctx, centerX, centerY);
        }
    }

    drawSpeechBubble(ctx, x, y) {
        const padding = 10;
        const maxWidth = 150;
        const fontSize = 14;
        
        ctx.font = `${fontSize}px sans-serif`;
        
        const words = this.sayText.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            if (ctx.measureText(testLine).width > maxWidth - padding * 2) {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        if (currentLine) lines.push(currentLine);
        
        const lineHeight = fontSize + 4;
        const textWidth = Math.min(maxWidth, Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2);
        const textHeight = lines.length * lineHeight + padding * 2;
        
        const bubbleX = x - textWidth / 2;
        const bubbleY = y - this.getDisplaySize().height / 2 - textHeight - 15;
        
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bubbleX, bubbleY, textWidth, textHeight, 8);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x - 8, bubbleY + textHeight);
        ctx.lineTo(x, bubbleY + textHeight + 10);
        ctx.lineTo(x + 8, bubbleY + textHeight);
        ctx.fillStyle = 'white';
        ctx.fill();
        
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        lines.forEach((line, i) => {
            ctx.fillText(line, x, bubbleY + padding + i * lineHeight);
        });
    }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            visible: this.visible,
            opacity: this.opacity,
            defaultEmoji: this.defaultEmoji,
            currentCostumeIndex: this.currentCostumeIndex,
            costumes: this.costumes.map(c => ({
                name: c.name,
                src: c.image.src,
                width: c.width,
                height: c.height
            }))
        };
    }
}

class SpriteManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.sprites = [];
        this.selectedSprite = null;
        this.backgroundColor = '#ffffff';
        this.backgroundImage = null;
        this.stageWidth = 640;
        this.stageHeight = 360;
        this.draggingSprite = null;
        
        this.setupMouseEvents();
    }

    setupMouseEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.stageWidth / rect.width;
            const scaleY = this.stageHeight / rect.height;
            const x = (e.clientX - rect.left) * scaleX - this.stageWidth / 2;
            const y = this.stageHeight / 2 - (e.clientY - rect.top) * scaleY;
            
            const coordX = document.getElementById('coord-x');
            const coordY = document.getElementById('coord-y');
            if (coordX) coordX.textContent = Math.round(x);
            if (coordY) coordY.textContent = Math.round(y);
            
            if (this.draggingSprite) {
                this.draggingSprite.x = x;
                this.draggingSprite.y = y;
                this.render();
            }
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.stageWidth / rect.width;
            const scaleY = this.stageHeight / rect.height;
            const x = (e.clientX - rect.left) * scaleX - this.stageWidth / 2;
            const y = this.stageHeight / 2 - (e.clientY - rect.top) * scaleY;
            
            for (let i = this.sprites.length - 1; i >= 0; i--) {
                const sprite = this.sprites[i];
                if (sprite.visible && sprite.containsPoint(x, y)) {
                    if (sprite.draggable) {
                        this.draggingSprite = sprite;
                    }
                    this.selectSprite(sprite);
                    break;
                }
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.draggingSprite = null;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.draggingSprite = null;
        });
    }

    addSprite(name, options = {}) {
        const sprite = new FartSprite(name, options);
        this.sprites.push(sprite);
        this.render();
        return sprite;
    }

    removeSprite(spriteOrId) {
        const id = typeof spriteOrId === 'string' ? spriteOrId : spriteOrId.id;
        const index = this.sprites.findIndex(s => s.id === id);
        if (index !== -1) {
            if (this.selectedSprite === this.sprites[index]) {
                this.selectedSprite = null;
            }
            this.sprites.splice(index, 1);
            this.render();
            return true;
        }
        return false;
    }

    getSprite(nameOrId) {
        return this.sprites.find(s => s.id === nameOrId || s.name === nameOrId);
    }

    getSpriteByIndex(index) {
        return this.sprites[index];
    }

    selectSprite(sprite) {
        this.selectedSprite = sprite;
        if (window.fartIDE) {
            window.fartIDE.updateSpritesList();
            window.fartIDE.showSpriteProperties(sprite);
        }
    }

    render() {
        const ctx = this.ctx;
        
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, this.stageWidth, this.stageHeight);
        
        if (this.backgroundImage) {
            ctx.drawImage(this.backgroundImage, 0, 0, this.stageWidth, this.stageHeight);
        }
        
        this.sprites.forEach(sprite => {
            sprite.draw(ctx, this.stageWidth, this.stageHeight);
        });
    }

    clear() {
        this.sprites = [];
        this.selectedSprite = null;
        this.backgroundColor = '#ffffff';
        this.backgroundImage = null;
        this.render();
    }

    resetSprites() {
        this.sprites.forEach(sprite => {
            sprite.x = 0;
            sprite.y = 0;
            sprite.rotation = 0;
            sprite.sayText = '';
        });
        this.render();
    }

    serialize() {
        return {
            backgroundColor: this.backgroundColor,
            sprites: this.sprites.map(s => s.serialize())
        };
    }

    async deserialize(data) {
        this.backgroundColor = data.backgroundColor || '#ffffff';
        this.sprites = [];
        
        for (const spriteData of (data.sprites || [])) {
            const sprite = new FartSprite(spriteData.name, {
                x: spriteData.x,
                y: spriteData.y,
                rotation: spriteData.rotation,
                scaleX: spriteData.scaleX,
                scaleY: spriteData.scaleY,
                visible: spriteData.visible,
                opacity: spriteData.opacity,
                emoji: spriteData.defaultEmoji
            });
            sprite.id = spriteData.id;
            
            for (const costumeData of (spriteData.costumes || [])) {
                try {
                    await sprite.loadCostume(costumeData.src, costumeData.name);
                } catch (e) {
                    console.warn('Failed to load costume:', e);
                }
            }
            
            if (spriteData.currentCostumeIndex !== undefined) {
                sprite.setCostume(spriteData.currentCostumeIndex);
            }
            
            this.sprites.push(sprite);
        }
        
        this.render();
    }
}