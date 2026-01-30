/**
 * Fart IDE - Node Definitions
 */

const FartNodes = {
    registerAll() {
        this.registerEventNodes();
        this.registerControlNodes();
        this.registerLogicNodes();
        this.registerMathNodes();
        this.registerVariableNodes();
        this.registerIONodes();
        this.registerTextNodes();
        this.registerArrayNodes();
        this.registerSpriteNodes();
        this.registerUtilityNodes();
    },

    // ========================================
    // EVENT NODES
    // ========================================
    registerEventNodes() {
        function OnStart() {
            this.addOutput("", LiteGraph.EVENT);
            this._triggered = false;
            this._interval = Infinity;
            this._lastTrigger = -Infinity;
            this.size = [140, 30];
        }
        OnStart.title = "🚀 On Start";
        OnStart.desc = "Triggers once when program starts";
        OnStart.prototype.onStart = function() {
            this._triggered = false;
            this._lastTrigger = -Infinity;
        };
        OnStart.prototype.onExecute = function() {
            const now = Date.now();
            if (now - this._lastTrigger >= this._interval) {
                this._lastTrigger = now;
                this.triggerSlot(0);
            }
        };
        LiteGraph.registerNodeType("fart/events/on_start", OnStart);

        function OnUpdate() {
            this.addOutput("", LiteGraph.EVENT);
            this.addOutput("dt", "number");
            this._lastTime = 0;
        }
        OnUpdate.title = "🔄 On Update";
        OnUpdate.prototype.onStart = function() { this._lastTime = Date.now(); };
        OnUpdate.prototype.onExecute = function() {
            const now = Date.now();
            this.setOutputData(1, now - this._lastTime);
            this._lastTime = now;
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/events/on_update", OnUpdate);

        function Timer() {
            this.addOutput("", LiteGraph.EVENT);
            this.addOutput("count", "number");
            this.properties = { interval: 1000 };
            this.addWidget("number", "Interval", 1000, (v) => { this.properties.interval = Math.max(1, v); });
            this._lastTrigger = 0;
            this._count = 0;
        }
        Timer.title = "⏱️ Timer";
        Timer.prototype.onStart = function() { this._lastTrigger = Date.now(); this._count = 0; };
        Timer.prototype.onExecute = function() {
            const now = Date.now();
            if (now - this._lastTrigger >= this.properties.interval) {
                this._lastTrigger = now;
                this._count++;
                this.setOutputData(1, this._count);
                this.triggerSlot(0);
            }
        };
        LiteGraph.registerNodeType("fart/events/timer", Timer);

        function Button() {
            this.addOutput("", LiteGraph.EVENT);
            this.addOutput("clicks", "number");
            this._clicks = 0;
            this.addWidget("button", "Click Me", null, () => {
                this._clicks++;
                this.setOutputData(1, this._clicks);
                this.triggerSlot(0);
            });
            this.size = [160, 50];
        }
        Button.title = "🔘 Button";
        Button.prototype.onStart = function() { this._clicks = 0; };
        LiteGraph.registerNodeType("fart/events/button", Button);

        function OnKeyPress() {
            this.addOutput("", LiteGraph.EVENT);
            this.addOutput("key", "string");
            this.properties = { key: "" };
            this.addWidget("text", "Key", "", (v) => { this.properties.key = v.toLowerCase(); });
            this._pressed = null;
            
            this._handler = (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                const filter = this.properties.key.toLowerCase();
                if (!filter || e.key.toLowerCase() === filter || e.code.toLowerCase() === filter) {
                    this._pressed = e.key;
                }
            };
            document.addEventListener("keydown", this._handler);
        }
        OnKeyPress.title = "⌨️ On Key";
        OnKeyPress.prototype.onStart = function() { this._pressed = null; };
        OnKeyPress.prototype.onExecute = function() {
            if (this._pressed !== null) {
                this.setOutputData(1, this._pressed);
                this.triggerSlot(0);
                this._pressed = null;
            }
        };
        OnKeyPress.prototype.onRemoved = function() {
            document.removeEventListener("keydown", this._handler);
        };
        LiteGraph.registerNodeType("fart/events/on_key", OnKeyPress);
    },

    // ========================================
    // CONTROL NODES
    // ========================================
    registerControlNodes() {
        function Sequence() {
            this.addInput("", LiteGraph.ACTION);
            this.addOutput("1", LiteGraph.EVENT);
            this.addOutput("2", LiteGraph.EVENT);
            this.addOutput("3", LiteGraph.EVENT);
        }
        Sequence.title = "📋 Sequence";
        Sequence.prototype.onAction = function() {
            for (let i = 0; i < this.outputs.length; i++) this.triggerSlot(i);
        };
        LiteGraph.registerNodeType("fart/control/sequence", Sequence);

        function Branch() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("cond", "boolean");
            this.addOutput("true", LiteGraph.EVENT);
            this.addOutput("false", LiteGraph.EVENT);
        }
        Branch.title = "🔀 Branch";
        Branch.prototype.onAction = function() {
            this.triggerSlot(this.getInputData(1) ? 0 : 1);
        };
        LiteGraph.registerNodeType("fart/control/branch", Branch);

        function Loop() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("count", "number");
            this.addOutput("loop", LiteGraph.EVENT);
            this.addOutput("index", "number");
            this.addOutput("done", LiteGraph.EVENT);
            this.properties = { count: 10 };
            this.addWidget("number", "Count", 10, (v) => { this.properties.count = Math.max(0, Math.floor(v)); });
        }
        Loop.title = "🔁 Repeat";
        Loop.prototype.onAction = function() {
            const count = this.getInputData(1) ?? this.properties.count;
            for (let i = 0; i < count; i++) {
                this.setOutputData(1, i);
                this.triggerSlot(0);
            }
            this.triggerSlot(2);
        };
        LiteGraph.registerNodeType("fart/control/loop", Loop);

        function Wait() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("ms", "number");
            this.addOutput("", LiteGraph.EVENT);
            this.properties = { delay: 1000 };
            this.addWidget("number", "Delay", 1000, (v) => { this.properties.delay = Math.max(0, v); });
        }
        Wait.title = "⏳ Wait";
        Wait.prototype.onAction = function() {
            setTimeout(() => this.triggerSlot(0), this.getInputData(1) ?? this.properties.delay);
        };
        LiteGraph.registerNodeType("fart/control/wait", Wait);

        function Gate() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("open", "boolean");
            this.addOutput("", LiteGraph.EVENT);
            this.properties = { open: true };
            this.addWidget("toggle", "Open", true, (v) => { this.properties.open = v; });
        }
        Gate.title = "🚧 Gate";
        Gate.prototype.onAction = function() {
            if (this.getInputData(1) ?? this.properties.open) this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/control/gate", Gate);
    },

    // ========================================
    // LOGIC NODES
    // ========================================
    registerLogicNodes() {
        const logic = [
            ["and", "AND", (a, b) => a && b],
            ["or", "OR", (a, b) => a || b],
            ["xor", "XOR", (a, b) => a !== b],
            ["nand", "NAND", (a, b) => !(a && b)]
        ];

        logic.forEach(([name, title, fn]) => {
            function Node() {
                this.addInput("A", "boolean");
                this.addInput("B", "boolean");
                this.addOutput("out", "boolean");
            }
            Node.title = title;
            Node.prototype.onExecute = function() {
                this.setOutputData(0, fn(!!this.getInputData(0), !!this.getInputData(1)));
            };
            LiteGraph.registerNodeType(`fart/logic/${name}`, Node);
        });

        function Not() {
            this.addInput("in", "boolean");
            this.addOutput("out", "boolean");
        }
        Not.title = "NOT";
        Not.prototype.onExecute = function() { this.setOutputData(0, !this.getInputData(0)); };
        LiteGraph.registerNodeType("fart/logic/not", Not);

        function Compare() {
            this.addInput("A", "");
            this.addInput("B", "");
            this.addOutput("out", "boolean");
            this.properties = { op: "==" };
            this.addWidget("combo", "Op", "==", (v) => { this.properties.op = v; },
                { values: ["==", "!=", "<", ">", "<=", ">="] });
        }
        Compare.title = "⚖️ Compare";
        Compare.prototype.onExecute = function() {
            const a = this.getInputData(0) ?? 0;
            const b = this.getInputData(1) ?? 0;
            const ops = { "==": a == b, "!=": a != b, "<": a < b, ">": a > b, "<=": a <= b, ">=": a >= b };
            this.setOutputData(0, ops[this.properties.op] ?? false);
        };
        LiteGraph.registerNodeType("fart/logic/compare", Compare);

        function BoolConst() {
            this.addOutput("out", "boolean");
            this.properties = { value: true };
            this.addWidget("toggle", "Value", true, (v) => { this.properties.value = v; });
        }
        BoolConst.title = "☑️ Boolean";
        BoolConst.prototype.onExecute = function() { this.setOutputData(0, this.properties.value); };
        LiteGraph.registerNodeType("fart/logic/boolean", BoolConst);
    },

    // ========================================
    // MATH NODES
    // ========================================
    registerMathNodes() {
        function NumberConst() {
            this.addOutput("out", "number");
            this.properties = { value: 0 };
            this.addWidget("number", "Value", 0, (v) => { this.properties.value = v; });
        }
        NumberConst.title = "🔢 Number";
        NumberConst.prototype.onExecute = function() { this.setOutputData(0, this.properties.value); };
        LiteGraph.registerNodeType("fart/math/number", NumberConst);

        const ops = [
            ["add", "➕ Add", (a,b) => a + b],
            ["subtract", "➖ Subtract", (a,b) => a - b],
            ["multiply", "✖️ Multiply", (a,b) => a * b],
            ["divide", "➗ Divide", (a,b) => b !== 0 ? a / b : 0],
            ["modulo", "% Mod", (a,b) => b !== 0 ? a % b : 0],
            ["power", "^ Power", Math.pow],
            ["min", "⬇️ Min", Math.min],
            ["max", "⬆️ Max", Math.max]
        ];

        ops.forEach(([name, title, fn]) => {
            function Op() {
                this.addInput("A", "number");
                this.addInput("B", "number");
                this.addOutput("out", "number");
            }
            Op.title = title;
            Op.prototype.onExecute = function() {
                this.setOutputData(0, fn(this.getInputData(0) ?? 0, this.getInputData(1) ?? 0));
            };
            LiteGraph.registerNodeType(`fart/math/${name}`, Op);
        });

        const funcs = [
            ["abs", "|x| Abs", Math.abs],
            ["floor", "⬇️ Floor", Math.floor],
            ["ceil", "⬆️ Ceil", Math.ceil],
            ["round", "🔄 Round", Math.round],
            ["sqrt", "√ Sqrt", Math.sqrt],
            ["sin", "∿ Sin", Math.sin],
            ["cos", "∿ Cos", Math.cos],
            ["negate", "± Negate", x => -x]
        ];

        funcs.forEach(([name, title, fn]) => {
            function Func() {
                this.addInput("in", "number");
                this.addOutput("out", "number");
            }
            Func.title = title;
            Func.prototype.onExecute = function() { this.setOutputData(0, fn(this.getInputData(0) ?? 0)); };
            LiteGraph.registerNodeType(`fart/math/${name}`, Func);
        });

        function Random() {
            this.addInput("min", "number");
            this.addInput("max", "number");
            this.addOutput("out", "number");
            this.properties = { min: 0, max: 100, integer: false };
            this.addWidget("number", "Min", 0, (v) => { this.properties.min = v; });
            this.addWidget("number", "Max", 100, (v) => { this.properties.max = v; });
            this.addWidget("toggle", "Integer", false, (v) => { this.properties.integer = v; });
        }
        Random.title = "🎲 Random";
        Random.prototype.onExecute = function() {
            const min = this.getInputData(0) ?? this.properties.min;
            const max = this.getInputData(1) ?? this.properties.max;
            let val = Math.random() * (max - min) + min;
            this.setOutputData(0, this.properties.integer ? Math.floor(val) : val);
        };
        LiteGraph.registerNodeType("fart/math/random", Random);
    },

    // ========================================
    // VARIABLE NODES
    // ========================================
    registerVariableNodes() {
        function GetVar() {
            this.addOutput("value", "");
            this.properties = { name: "myVar" };
            this.addWidget("text", "Name", "myVar", (v) => {
                this.properties.name = v;
                this.title = "📤 " + v;
            });
            this.title = "📤 myVar";
        }
        GetVar.title = "📤 Get Variable";
        GetVar.prototype.onExecute = function() {
            if (window.fartIDE) {
                this.setOutputData(0, window.fartIDE.getVariable(this.properties.name));
            }
        };
        LiteGraph.registerNodeType("fart/var/get", GetVar);

        function SetVar() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("value", "");
            this.addOutput("", LiteGraph.EVENT);
            this.addOutput("value", "");
            this.properties = { name: "myVar" };
            this.addWidget("text", "Name", "myVar", (v) => {
                this.properties.name = v;
                this.title = "📥 " + v;
            });
            this.title = "📥 myVar";
        }
        SetVar.title = "📥 Set Variable";
        SetVar.prototype.onAction = function() {
            if (window.fartIDE) {
                const val = this.getInputData(1);
                window.fartIDE.setVariable(this.properties.name, val);
                this.setOutputData(1, val);
            }
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/var/set", SetVar);

        function ChangeVar() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("amount", "number");
            this.addOutput("", LiteGraph.EVENT);
            this.addOutput("new", "number");
            this.properties = { name: "myVar", amount: 1 };
            this.addWidget("text", "Name", "myVar", (v) => { this.properties.name = v; });
            this.addWidget("number", "Amount", 1, (v) => { this.properties.amount = v; });
        }
        ChangeVar.title = "🔄 Change Variable";
        ChangeVar.prototype.onAction = function() {
            if (window.fartIDE) {
                const current = parseFloat(window.fartIDE.getVariable(this.properties.name)) || 0;
                const amount = this.getInputData(1) ?? this.properties.amount;
                const newVal = current + amount;
                window.fartIDE.setVariable(this.properties.name, newVal);
                this.setOutputData(1, newVal);
            }
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/var/change", ChangeVar);
    },

    // ========================================
    // I/O NODES
    // ========================================
    registerIONodes() {
        function Print() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("msg", "");
            this.addOutput("", LiteGraph.EVENT);
        }
        Print.title = "📝 Print";
        Print.prototype.onAction = function() {
            let msg = this.getInputData(1);
            if (msg === undefined || msg === null) msg = String(msg);
            else if (typeof msg === "object") msg = JSON.stringify(msg);
            else msg = String(msg);
            if (window.fartIDE) window.fartIDE.log(msg, "log");
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/io/print", Print);

        function LogType() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("msg", "");
            this.addOutput("", LiteGraph.EVENT);
            this.properties = { type: "info" };
            this.addWidget("combo", "Type", "info", (v) => { this.properties.type = v; },
                { values: ["log", "info", "warn", "error", "success"] });
        }
        LogType.title = "📋 Log";
        LogType.prototype.onAction = function() {
            let msg = this.getInputData(1);
            if (typeof msg === "object") msg = JSON.stringify(msg);
            if (window.fartIDE) window.fartIDE.log(String(msg ?? ""), this.properties.type);
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/io/log", LogType);

        function Alert() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("msg", "string");
            this.addOutput("", LiteGraph.EVENT);
            this.properties = { message: "Hello!" };
            this.addWidget("text", "Message", "Hello!", (v) => { this.properties.message = v; });
        }
        Alert.title = "⚠️ Alert";
        Alert.prototype.onAction = function() {
            alert(this.getInputData(1) ?? this.properties.message);
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/io/alert", Alert);

        function Prompt() {
            this.addInput("", LiteGraph.ACTION);
            this.addOutput("", LiteGraph.EVENT);
            this.addOutput("answer", "string");
            this.properties = { question: "Enter:" };
            this.addWidget("text", "Question", "Enter:", (v) => { this.properties.question = v; });
        }
        Prompt.title = "❓ Ask";
        Prompt.prototype.onAction = function() {
            this.setOutputData(1, prompt(this.properties.question));
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/io/prompt", Prompt);
    },

    // ========================================
    // TEXT NODES
    // ========================================
    registerTextNodes() {
        function TextConst() {
            this.addOutput("out", "string");
            this.properties = { value: "Hello" };
            this.addWidget("text", "Value", "Hello", (v) => { this.properties.value = v; });
        }
        TextConst.title = "📝 Text";
        TextConst.prototype.onExecute = function() { this.setOutputData(0, this.properties.value); };
        LiteGraph.registerNodeType("fart/text/string", TextConst);

        function Join() {
            this.addInput("A", "string");
            this.addInput("B", "string");
            this.addOutput("out", "string");
            this.properties = { sep: "" };
            this.addWidget("text", "Sep", "", (v) => { this.properties.sep = v; });
        }
        Join.title = "🔗 Join";
        Join.prototype.onExecute = function() {
            this.setOutputData(0, String(this.getInputData(0) ?? "") + this.properties.sep + String(this.getInputData(1) ?? ""));
        };
        LiteGraph.registerNodeType("fart/text/join", Join);

        function Length() {
            this.addInput("text", "string");
            this.addOutput("len", "number");
        }
        Length.title = "📏 Length";
        Length.prototype.onExecute = function() {
            this.setOutputData(0, String(this.getInputData(0) ?? "").length);
        };
        LiteGraph.registerNodeType("fart/text/length", Length);

        function ToNumber() {
            this.addInput("text", "string");
            this.addOutput("num", "number");
        }
        ToNumber.title = "🔢 To Number";
        ToNumber.prototype.onExecute = function() {
            this.setOutputData(0, parseFloat(this.getInputData(0)) || 0);
        };
        LiteGraph.registerNodeType("fart/text/to_number", ToNumber);

        function ToText() {
            this.addInput("value", "");
            this.addOutput("text", "string");
        }
        ToText.title = "📝 To Text";
        ToText.prototype.onExecute = function() {
            const v = this.getInputData(0);
            this.setOutputData(0, typeof v === "object" ? JSON.stringify(v) : String(v ?? ""));
        };
        LiteGraph.registerNodeType("fart/text/to_text", ToText);
    },

    // ========================================
    // ARRAY NODES
    // ========================================
    registerArrayNodes() {
        function CreateArray() {
            this.addOutput("array", "array");
            this._arr = [];
        }
        CreateArray.title = "📋 Create Array";
        CreateArray.prototype.onStart = function() { this._arr = []; };
        CreateArray.prototype.onExecute = function() { this.setOutputData(0, this._arr); };
        LiteGraph.registerNodeType("fart/array/create", CreateArray);

        function CombineArray() {
            this.addOutput("array", "array");
            this.properties = { inputCount: 2 };
            this.addInput("0", "");
            this.addInput("1", "");
            
            this.addWidget("button", "+ Add", null, () => {
                this.addInput(String(this.inputs.length), "");
                this.properties.inputCount = this.inputs.length;
                this.size[1] += 24;
                this.setDirtyCanvas(true, true);
            });
            
            this.addWidget("button", "- Remove", null, () => {
                if (this.inputs.length > 0) {
                    this.removeInput(this.inputs.length - 1);
                    this.properties.inputCount = this.inputs.length;
                    this.size[1] -= 24;
                    this.setDirtyCanvas(true, true);
                }
            });
            
            this.size = [160, 120];
        }
        CombineArray.title = "🔗 Combine Array";
        CombineArray.prototype.onExecute = function() {
            const arr = [];
            for (let i = 0; i < this.inputs.length; i++) {
                arr.push(this.getInputData(i) ?? null);
            }
            this.setOutputData(0, arr);
        };
        CombineArray.prototype.onConfigure = function(config) {
            const count = config.properties?.inputCount || 2;
            while (this.inputs.length < count) {
                this.addInput(String(this.inputs.length), "");
            }
            this.size[1] = 80 + (this.inputs.length * 24);
        };
        LiteGraph.registerNodeType("fart/array/combine", CombineArray);

        function ArrayPush() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("array", "array");
            this.addInput("item", "");
            this.addOutput("", LiteGraph.EVENT);
            this.addOutput("array", "array");
        }
        ArrayPush.title = "➕ Push";
        ArrayPush.prototype.onAction = function() {
            let arr = this.getInputData(1);
            arr = Array.isArray(arr) ? [...arr] : [];
            arr.push(this.getInputData(2));
            this.setOutputData(1, arr);
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/array/push", ArrayPush);

        function ArrayGet() {
            this.addInput("array", "array");
            this.addInput("index", "number");
            this.addOutput("item", "");
            this.properties = { index: 0 };
        }
        ArrayGet.title = "📤 Get Item";
        ArrayGet.prototype.onExecute = function() {
            const arr = this.getInputData(0) || [];
            let i = Math.floor(this.getInputData(1) ?? this.properties.index);
            if (i < 0) i = arr.length + i;
            this.setOutputData(0, arr[i]);
        };
        LiteGraph.registerNodeType("fart/array/get", ArrayGet);

        function ArrayLength() {
            this.addInput("array", "array");
            this.addOutput("length", "number");
        }
        ArrayLength.title = "📏 Array Length";
        ArrayLength.prototype.onExecute = function() {
            const arr = this.getInputData(0);
            this.setOutputData(0, Array.isArray(arr) ? arr.length : 0);
        };
        LiteGraph.registerNodeType("fart/array/length", ArrayLength);

        function ForEach() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("array", "array");
            this.addOutput("each", LiteGraph.EVENT);
            this.addOutput("done", LiteGraph.EVENT);
            this.addOutput("item", "");
            this.addOutput("index", "number");
        }
        ForEach.title = "🔁 For Each";
        ForEach.prototype.onAction = function() {
            const arr = this.getInputData(1) || [];
            for (let i = 0; i < arr.length; i++) {
                this.setOutputData(2, arr[i]);
                this.setOutputData(3, i);
                this.triggerSlot(0);
            }
            this.triggerSlot(1);
        };
        LiteGraph.registerNodeType("fart/array/foreach", ForEach);
    },

    // ========================================
    // SPRITE NODES
    // ========================================
    registerSpriteNodes() {
        function GetSprite() {
            this.addOutput("sprite", "sprite");
            this.properties = { name: "Sprite1" };
            this.addWidget("text", "Name", "Sprite1", (v) => {
                this.properties.name = v;
                this.title = "🎭 " + v;
            });
            this.title = "🎭 Sprite1";
        }
        GetSprite.title = "🎭 Get Sprite";
        GetSprite.prototype.onExecute = function() {
            if (window.fartIDE) {
                this.setOutputData(0, window.fartIDE.spriteManager.getSprite(this.properties.name));
            }
        };
        LiteGraph.registerNodeType("fart/sprite/get", GetSprite);

        function MoveSteps() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("sprite", "sprite");
            this.addInput("steps", "number");
            this.addOutput("", LiteGraph.EVENT);
            this.properties = { steps: 10 };
            this.addWidget("number", "Steps", 10, (v) => { this.properties.steps = v; });
        }
        MoveSteps.title = "➡️ Move";
        MoveSteps.prototype.onAction = function() {
            const sprite = this.getInputData(1);
            if (sprite) sprite.move(this.getInputData(2) ?? this.properties.steps);
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/sprite/move", MoveSteps);

        function GoToXY() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("sprite", "sprite");
            this.addInput("x", "number");
            this.addInput("y", "number");
            this.addOutput("", LiteGraph.EVENT);
        }
        GoToXY.title = "📍 Go To";
        GoToXY.prototype.onAction = function() {
            const sprite = this.getInputData(1);
            if (sprite) sprite.goTo(this.getInputData(2) ?? 0, this.getInputData(3) ?? 0);
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/sprite/goto", GoToXY);

        function Turn() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("sprite", "sprite");
            this.addInput("degrees", "number");
            this.addOutput("", LiteGraph.EVENT);
            this.properties = { degrees: 15 };
            this.addWidget("number", "Degrees", 15, (v) => { this.properties.degrees = v; });
        }
        Turn.title = "🔄 Turn";
        Turn.prototype.onAction = function() {
            const sprite = this.getInputData(1);
            if (sprite) sprite.turn(this.getInputData(2) ?? this.properties.degrees);
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/sprite/turn", Turn);

        function Say() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("sprite", "sprite");
            this.addInput("text", "string");
            this.addOutput("", LiteGraph.EVENT);
            this.properties = { text: "Hello!", duration: 0 };
            this.addWidget("text", "Text", "Hello!", (v) => { this.properties.text = v; });
            this.addWidget("number", "Duration", 0, (v) => { this.properties.duration = v; });
        }
        Say.title = "💬 Say";
        Say.prototype.onAction = function() {
            const sprite = this.getInputData(1);
            if (sprite) sprite.say(this.getInputData(2) ?? this.properties.text, this.properties.duration);
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/sprite/say", Say);

        function ShowSprite() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("sprite", "sprite");
            this.addOutput("", LiteGraph.EVENT);
        }
        ShowSprite.title = "👁️ Show";
        ShowSprite.prototype.onAction = function() {
            const sprite = this.getInputData(1);
            if (sprite) sprite.visible = true;
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/sprite/show", ShowSprite);

        function HideSprite() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("sprite", "sprite");
            this.addOutput("", LiteGraph.EVENT);
        }
        HideSprite.title = "🙈 Hide";
        HideSprite.prototype.onAction = function() {
            const sprite = this.getInputData(1);
            if (sprite) sprite.visible = false;
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/sprite/hide", HideSprite);

        function SetSize() {
            this.addInput("", LiteGraph.ACTION);
            this.addInput("sprite", "sprite");
            this.addInput("size", "number");
            this.addOutput("", LiteGraph.EVENT);
            this.properties = { size: 100 };
            this.addWidget("number", "Size %", 100, (v) => { this.properties.size = v; });
        }
        SetSize.title = "📐 Set Size";
        SetSize.prototype.onAction = function() {
            const sprite = this.getInputData(1);
            const size = (this.getInputData(2) ?? this.properties.size) / 100;
            if (sprite) { sprite.scaleX = size; sprite.scaleY = size; }
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/sprite/size", SetSize);

        function GetX() {
            this.addInput("sprite", "sprite");
            this.addOutput("x", "number");
        }
        GetX.title = "📍 X Position";
        GetX.prototype.onExecute = function() {
            const sprite = this.getInputData(0);
            this.setOutputData(0, sprite ? sprite.x : 0);
        };
        LiteGraph.registerNodeType("fart/sprite/get_x", GetX);

        function GetY() {
            this.addInput("sprite", "sprite");
            this.addOutput("y", "number");
        }
        GetY.title = "📍 Y Position";
        GetY.prototype.onExecute = function() {
            const sprite = this.getInputData(0);
            this.setOutputData(0, sprite ? sprite.y : 0);
        };
        LiteGraph.registerNodeType("fart/sprite/get_y", GetY);
    },

    // ========================================
    // UTILITY NODES
    // ========================================
    registerUtilityNodes() {
        function Comment() {
            this.properties = { text: "Comment" };
            this.addWidget("text", "Text", "Comment", (v) => {
                this.properties.text = v;
                this.title = "💬 " + v;
            });
            this.size = [200, 50];
            this.color = "#335";
            this.bgcolor = "#223";
        }
        Comment.title = "💬 Comment";
        LiteGraph.registerNodeType("fart/utils/comment", Comment);

        function Watch() {
            this.addInput("value", "");
            this._display = "null";
            this.size = [140, 50];
        }
        Watch.title = "👁️ Watch";
        Watch.prototype.onExecute = function() {
            const v = this.getInputData(0);
            this._display = v === undefined ? "undefined" : typeof v === "object" ? JSON.stringify(v) : String(v);
        };
        Watch.prototype.onDrawForeground = function(ctx) {
            ctx.font = "12px monospace";
            ctx.fillStyle = "#FFF";
            ctx.textAlign = "center";
            const text = this._display.length > 18 ? this._display.slice(0, 15) + "..." : this._display;
            ctx.fillText(text, this.size[0] / 2, this.size[1] / 2 + 5);
        };
        LiteGraph.registerNodeType("fart/utils/watch", Watch);

        function Beep() {
            this.addInput("", LiteGraph.ACTION);
            this.addOutput("", LiteGraph.EVENT);
            this.properties = { freq: 440, dur: 200 };
            this.addWidget("number", "Freq", 440, (v) => { this.properties.freq = v; });
            this.addWidget("number", "Duration", 200, (v) => { this.properties.dur = v; });
        }
        Beep.title = "🔔 Beep";
        Beep.prototype.onAction = function() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = this.properties.freq;
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + this.properties.dur / 1000);
                osc.start();
                osc.stop(ctx.currentTime + this.properties.dur / 1000);
            } catch (e) {}
            this.triggerSlot(0);
        };
        LiteGraph.registerNodeType("fart/utils/beep", Beep);

        function Timestamp() {
            this.addOutput("ms", "number");
        }
        Timestamp.title = "⏱️ Timestamp";
        Timestamp.prototype.onExecute = function() { this.setOutputData(0, Date.now()); };
        LiteGraph.registerNodeType("fart/utils/timestamp", Timestamp);
    }
};