/**
 * Fart IDE - Extensions System
 */

const FartExtensions = {
    registry: [],
    
    register(extension) {
        this.registry.push(extension);
        if (window.fartIDE && extension.init) {
            extension.init(window.fartIDE);
        }
        console.log(`Extension registered: ${extension.name || 'Unknown'}`);
    },
    
    getAll() {
        return this.registry;
    }
};
