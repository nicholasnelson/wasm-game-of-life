import { Universe, Cell } from "wasm-game-of-life";
import { memory } from "wasm-game-of-life/wasm_game_of_life_bg";

const TPS_TARGET = 60;

const CELL_SIZE = 5; // px
const GRID_COLOR = "#AAAAAA";

const CELL_COLORS_GRADIANT = [
    { "type": Cell.Green,   "color": "#DAF7A6" },
    { "type": Cell.Yellow,  "color": "#FFC300" },
    { "type": Cell.Red,     "color": "#FF5733" },
    { "type": Cell.Magenta, "color": "#C70039" },
    { "type": Cell.Blue,    "color": "#900C3F" },
    { "type": Cell.Cyan,    "color": "#581845" },
];

const CELL_COLORS_RAINBOW = [
    { "type": Cell.Green,   "color": "#00FF00" },
    { "type": Cell.Yellow,  "color": "#FFFF00" },
    { "type": Cell.Red,     "color": "#FF0000" },
    { "type": Cell.Magenta, "color": "#8B00FF" },
    { "type": Cell.Blue,    "color": "#2E2B5F" },
    { "type": Cell.Cyan,    "color": "#0000FF" },
];

const CELL_COLORS = [
    { "type": Cell.Green,   "color": "#4CBB17" },
    { "type": Cell.Yellow,  "color": "#FFD987" },
    { "type": Cell.Red,     "color": "#FF0002" },
    { "type": Cell.Magenta, "color": "#6A0400" },
    { "type": Cell.Blue,    "color": "#0001FC" },
    { "type": Cell.Cyan,    "color": "#AAAAFF" },
];

const WIDTH = 128;
const HEIGHT = 128;

const universe = Universe.new(WIDTH, HEIGHT);

const canvas = document.getElementById("game-of-life-canvas");
canvas.height = (CELL_SIZE + 1) * HEIGHT + 1;
canvas.width = (CELL_SIZE + 1) * WIDTH + 1;
const ctx = canvas.getContext('2d');

const playPauseButton = document.getElementById("play-pause");
const stepButton = document.getElementById("step");
const randomiseButton = document.getElementById("randomise");
const setPatternButton = document.getElementById("set-pattern");

let simulationRunning = true;

let lastRender = -1;


const renderLoop = (timestamp) => {
    fps.render();
    
    if (simulationRunning && timestamp > lastRender + 1000 / TPS_TARGET) {
        for (let i = 0; i < 1; i++) {
            universe.tick();
            lastRender = timestamp;
        }
    }

    clearCanvas();
    //drawGrid();
    drawCells();

    requestAnimationFrame(renderLoop);
};

const clearCanvas = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

const drawGrid = () => {
    ctx.beginPath();
    ctx.strokeStyle = GRID_COLOR;

    // Vertical lines
    for (let i = 0; i <= WIDTH; i++) {
        ctx.moveTo(i * (CELL_SIZE + 1) + 1,                            0);
        ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * HEIGHT + 1);
    }

    // Horizontal lines
    for (let j = 0; j <= HEIGHT; j++) {
        ctx.moveTo(0,                           j * (CELL_SIZE + 1) + 1);
        ctx.lineTo((CELL_SIZE + 1) * WIDTH + 1, j * (CELL_SIZE + 1) + 1);
    }

    ctx.stroke();
}

const drawCells = () => {
    const cellsPtr = universe.cells();
    const cells = new Uint8Array(memory.buffer, cellsPtr, WIDTH * HEIGHT)

    
    for (let cell_color of CELL_COLORS) {
        ctx.beginPath();
        ctx.fillStyle = cell_color.color;
        for (let row = 0; row < HEIGHT; row++) {
            for (let col = 0; col < WIDTH; col++) {
                const idx = universe.get_index(row, col);
    
                if (cells[idx] === cell_color.type) {
                    ctx.fillRect(
                        col * (CELL_SIZE + 1) + 1,
                        row * (CELL_SIZE + 1) + 1,
                        CELL_SIZE,
                        CELL_SIZE
                    );
                }
            }
        }
        ctx.stroke();
    }

};

canvas.addEventListener("click", event => {
    const boundingRect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;

    const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
    const canvasTop = (event.clientY - boundingRect.top) * scaleY;

    const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), HEIGHT - 1);
    const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), WIDTH - 1);

    if (event.ctrlKey) {
        console.log(universe.get_cell_stats(row, col));
    } else {
        universe.toggle_cell(row, col);
    }

});

const fps = new class {
    constructor() {
        this.fps = document.getElementById("fps");
        this.frames = [];
        this.lastFrameTimeStamp = performance.now();
    }

    render() {
        const now = performance.now();
        const delta = now - this.lastFrameTimeStamp;
        this.lastFrameTimeStamp = now;
        const fps = 1 / delta * 1000;

        this.frames.push(fps);
        if (this.frames.length > 100) {
            this.frames.shift();
        }

        let min = Infinity;
        let max = -Infinity;
        let sum = 0;
        for (let i = 0; i < this.frames.length; i++) {
            sum += this.frames[i];
            min = Math.min(this.frames[i], min);
            max = Math.max(this.frames[i], max);
        }
        let mean = sum / this.frames.length;

        this.fps.textContent = `
Frames per Second:
         latest = ${Math.round(fps)}
avg of last 100 = ${Math.round(mean)}
min of last 100 = ${Math.round(min)}
max of last 100 = ${Math.round(max)}
`.trim();
    }
};

playPauseButton.addEventListener("click", event => {
    simulationRunning = !simulationRunning;
    playPauseButton.textContent = simulationRunning ? "⏸" : "▶";
});

stepButton.addEventListener("click", event => {
    universe.tick();
});

randomiseButton.addEventListener("click", event => {
    universe.randomise();
});

setPatternButton.addEventListener("click", event => {
    universe.set_pattern();
});

universe.set_pattern();

requestAnimationFrame(renderLoop);