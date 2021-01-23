import { GUI } from 'dat.gui';

import Universe from './Universe';
import UniverseRenderer from './UniverseRenderer';

export default class UniverseController {
  constructor(webglContainer) {
    this.webglContainer = webglContainer;
    this.simulationRunning = false;
    this.lastTick = -1;
    this.tpsTarget = 60;
    this.newWidth = 128;
    this.newHeight = 128;
  }

  initialise() {
    // Clean up any existing things
    if (this.gui) {
      this.gui.destroy();
    }
    if (this.universeRenderer) {
      this.universeRenderer.destroy();
    }

    // TODO: Cleanup to remove old universe and universerenderer artifacts
    this.universe = new Universe(Math.floor(this.newWidth), Math.floor(this.newHeight));
    this.universeRenderer = new UniverseRenderer(this.universe, this.webglContainer);

    // Create the GUI
    this.gui = new GUI();
    const newUniverseGui = this.gui.addFolder('New Universe');
    newUniverseGui.open();
    newUniverseGui.add(this, 'newWidth', 8).name('Width');
    newUniverseGui.add(this, 'newHeight', 8).name('Height');
    newUniverseGui.add(this, 'initialise', 8).name('Create!');
    const universeGui = this.gui.addFolder('Current Universe');
    universeGui.open();
    universeGui.add(this.universe, 'randomise').name('Randomise');
    const timeGui = this.gui.addFolder('Time');
    timeGui.open();
    timeGui.add(this, 'simulationRunning').name('Running');
    timeGui.add(this.universe, 'tick').name('Step');
  }

  renderLoop(timestamp) {
    if (this.simulationRunning && timestamp > this.lastTick + 1000 / this.tpsTarget) {
      this.universe.tick();
      this.lastTick = timestamp;
    }
    this.universeRenderer.render();
    requestAnimationFrame((t) => this.renderLoop(t));
  }
}
