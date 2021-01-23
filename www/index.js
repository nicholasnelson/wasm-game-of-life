import UniverseController from './UniverseController';

const universeController = new UniverseController($('#webgl-container'));

universeController.initialise();

requestAnimationFrame((t) => universeController.renderLoop(t));
