/**
 * Fart IDE - Executor
 */

class FartExecutor {
    constructor(ide) {
        this.ide = ide;
        this.graph = ide.graph;
        this.running = false;
        this.frameId = null;
    }

    start() {
        this.running = true;
        this.loop();
    }

    loop() {
        if (!this.running) return;
        this.graph.runStep(1);
        this.frameId = requestAnimationFrame(() => this.loop());
    }

    stop() {
        this.running = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }
}
