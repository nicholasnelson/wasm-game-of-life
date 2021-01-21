// eslint-disable-next-line import/no-unresolved
import { Universe as RustUniverse } from 'wasm-game-of-life';
// eslint-disable-next-line import/no-unresolved
import { memory } from 'wasm-game-of-life/wasm_game_of_life_bg';

export default class Universe {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.running = false;
    this.targetTps = 30;
    this.CELLBUFFERCOUNT = 2;
    this.universe = RustUniverse.new(width, height);
  }

  tick(cycles = 1) {
    for (let i = 0; i < cycles; i++) {
      this.currentBufferIndex = this.universe.tick();
    }
  }

  run(targetTps) {
    if (targetTps) {
      this.targetTps = targetTps;
    }
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  getCellBufferArrays() {
    const cellBuffers = [];
    for (let i = 0; i < this.CELLBUFFERCOUNT; i++) {
      cellBuffers.push(
        new Uint8Array(
          memory.buffer,
          this.universe.get_cell_buffer_ptr(i),
          this.width * this.height * 3,
        ),
      );
    }
    return cellBuffers;
  }

  getCellStats(row, col) {
    return this.universe.get_cell_stats(row, col);
  }

  toggleCell(row, col) {
    this.universe.toggle_cell(row, col);
  }

  randomise() {
    this.universe.randomise();
  }

  setPattern() {
    this.universe.set_pattern();
  }
}
