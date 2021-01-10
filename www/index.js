import { Universe, Cell } from "wasm-game-of-life";
import { memory } from "wasm-game-of-life/wasm_game_of_life_bg";

const CELL_SIZE = 5; // px
const GRID_COLOR = "#CCCCCC";
// UNUSED : const DEAD_COLOR = "#FFFFFF";
const ALIVE_COLOR = "#000000";

const WIDTH = 256;
const HEIGHT = 256;

const universe = Universe.new(WIDTH, HEIGHT);

const canvas = document.getElementById("game-of-life-canvas");
canvas.height = (CELL_SIZE + 1) * HEIGHT + 1;
canvas.width = (CELL_SIZE + 1) * WIDTH + 1;
const ctx = canvas.getContext('2d');

const playPauseButton = document.getElementById("play-pause");

let simulationRunning = false;

const renderLoop = () => {
    fps.render();
    
    if (simulationRunning) {
        for (let i = 0; i < 1; i++) {
            universe.tick();
        }
    }

    clearCanvas();
    drawGrid();
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

    ctx.beginPath();
    ctx.fillStyle = ALIVE_COLOR;

    for (let row = 0; row < HEIGHT; row++) {
        for (let col = 0; col < WIDTH; col++) {
            const idx = universe.get_index(row, col);

            if (cells[idx] === Cell.Alive) {
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
};

canvas.addEventListener("click", event => {
    const boundingRect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;

    const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
    const canvasTop = (event.clientY - boundingRect.top) * scaleY;

    const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), HEIGHT - 1);
    const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), WIDTH - 1);

    universe.toggle_cell(row, col);

    drawGrid();
    drawCells();
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

requestAnimationFrame(renderLoop);