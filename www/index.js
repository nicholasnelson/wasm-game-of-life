import Universe from './Universe';
import UniverseRenderer from './UniverseRenderer';

const TPS_TARGET = 60;

const WIDTH = 32;
const HEIGHT = 32;

const playPauseButton = document.getElementById('play-pause');
const stepButton = document.getElementById('step');
const randomiseButton = document.getElementById('randomise');
const setPatternButton = document.getElementById('set-pattern');

let simulationRunning = true;

let lastTick = -1;

const webglContainer = $('#webgl-container');
const universe = new Universe(WIDTH, HEIGHT);
const universeRenderer = new UniverseRenderer(universe, webglContainer);

const renderLoop = (timestamp) => {
  if (simulationRunning && timestamp > lastTick + 1000 / TPS_TARGET) {
    universe.tick();
    lastTick = timestamp;
  }

  universeRenderer.render();

  requestAnimationFrame(renderLoop);
};

playPauseButton.addEventListener('click', () => {
  simulationRunning = !simulationRunning;
  playPauseButton.textContent = simulationRunning ? '⏸' : '▶';
});

stepButton.addEventListener('click', () => {
  universe.tick();
});

randomiseButton.addEventListener('click', () => {
  universe.randomise();
});

setPatternButton.addEventListener('click', () => {
  universe.setPattern();
});

requestAnimationFrame(renderLoop);
