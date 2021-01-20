import { Universe as RustUniverse } from "wasm-game-of-life";
import { memory } from "wasm-game-of-life/wasm_game_of_life_bg";

export class Universe {

    constructor(width, height) {
        this._width = width;
        this._height = height;
        this._running = false;
        this._target_tps;
        this.CELL_BUFFER_COUNT = 2;
        this._universe = RustUniverse.new(width, height);
    }

    tick(cycles = 1) {
        for (let i = 0; i < cycles; i++) {
            this.currentBufferIndex = this._universe.tick();
        }
    }

    run(target_tps) {
        if (target_tps) {
            this._target_tps = target_tps;
        }
        this._running = true;
    }

    stop() {
        this._running = false;
    }

    getCellBufferArrays() {
        let cellBuffers = [];
        for (let i = 0; i < this.CELL_BUFFER_COUNT; i++) {
            cellBuffers.push(
                new Uint8Array(
                    memory.buffer,
                    this._universe.get_cell_buffer_ptr(i),
                    this._width * this._height * 3
                ));
        }
        return cellBuffers;
    }

    getCellStats(row, col) {
        return this._universe.get_cell_stats(row, col);
    }

    toggleCell(row, col) {
        this._universe.toggle_cell(row, col);
    }
    
    randomise() {
        this._universe.randomise();
    }

    setPattern() {
        this._universe.set_pattern();
    }

    width() {
        return this._width;
    }

    height() {
        return this._height;
    }


}