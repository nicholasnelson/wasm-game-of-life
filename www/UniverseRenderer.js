function mouseToThree(mouseX, mouseY, width, height) {
  return new THREE.Vector3(
    (mouseX / width) * 2 - 1,
    -(mouseY / height) * 2 + 1,
    1,
  );
}

function getPositionFromIndex(index, width) {
  return [
    index / width,
    index % width,
  ];
}

function sortIntersectsByDistanceToRay(intersects) {
  return intersects.sort((a, b) => {
    if (a.distanceToRay > b.distanceToRay) {
      return 1;
    } if (a.distanceToRay < b.distanceToRay) {
      return -1;
    }
    return 0;
  });
}

function toRadians(angle) {
  return angle * (Math.PI / 180);
}

function getScaleFromZ(cameraZPosition, fov, height) {
  const halfFov = fov / 2;
  const halfFovRadians = toRadians(halfFov);
  const halfFovHeight = Math.tan(halfFovRadians) * cameraZPosition;
  const fovHeight = halfFovHeight * 2;
  const scale = height / fovHeight;
  return scale;
}

function getZFromScale(scale, fov, height) {
  const halfFov = fov / 2;
  const halfFovRadians = toRadians(halfFov);
  const scaleHeight = height / scale;
  const cameraZPosition = scaleHeight / (2 * Math.tan(halfFovRadians));
  return cameraZPosition;
}

function createGridObject(width, height, spacing = 1, color = 0x222222) {
  const material = new THREE.LineBasicMaterial({
    color,
  });

  const gridObject = new THREE.Object3D();
  const geometry = new THREE.Geometry();

  for (let i = -width / 2; i <= width / 2; i += spacing) {
    geometry.vertices.push(new THREE.Vector3(-height / 2, i));
    geometry.vertices.push(new THREE.Vector3(height / 2, i));
  }

  for (let i = -height / 2; i <= height / 2; i += spacing) {
    geometry.vertices.push(new THREE.Vector3(i, -width / 2));
    geometry.vertices.push(new THREE.Vector3(i, width / 2));
  }

  const line = new THREE.LineSegments(geometry, material);
  gridObject.add(line);
  gridObject.position.set(-spacing / 2, spacing / 2, 1);

  return gridObject;
}

export default class UniverseRenderer {
  constructor(universe, container) {
    this.universe = universe;

    this.fov = 75;
    this.near = 0.1;
    this.far = 100;

    // Create Renderer
    this.renderer = new THREE.WebGLRenderer();
    container.append(this.renderer.domElement);
    this.renderer.setSize(container.width(), container.height());

    this.camera = new THREE.PerspectiveCamera(
      this.fov,
      this.width() / this.height(),
      this.near,
      this.far,
    );

    this.raycaster = new THREE.Raycaster();

    // Generate shared vertices for meshes
    const vertices = Float32Array.from(
      { length: this.universe.width * this.universe.height * 3 },
      (v, k) => {
        const cell = Math.floor(k / 3);
        // Check if we're looking for the X, Y, or Z coord
        switch (k % 3) {
          case 0: // X
            return (cell % universe.width) - universe.width / 2;
          case 1: // Y
            return universe.height / 2 - Math.floor(cell / universe.width);
          default: // Z
            return 1;
        }
      },
    );

    const verticesBuffer = new THREE.BufferAttribute(vertices, 3);

    const material = new THREE.PointsMaterial({ vertexColors: THREE.VertexColors });

    // (1 scene per cell buffer)
    this.scenes = universe.getCellBufferArrays().map((buffer) => {
      const scene = new THREE.Scene();
      const geometry = new THREE.BufferGeometry();
      const colorBuffer = new THREE.BufferAttribute(buffer, 3);
      geometry.setAttribute('position', verticesBuffer);
      geometry.setAttribute('color', colorBuffer);
      const mesh = new THREE.Points(geometry, material);
      scene.add(mesh);

      scene.add(createGridObject(universe.width, universe.height));

      return { scene, mesh };
    });

    this.setupZoom();
    this.setupInputs();
  }

  setupZoom() {
    const view = d3.select(this.renderer.domElement);
    const zoom = d3.zoom()
      .scaleExtent([
        getScaleFromZ(this.far, this.fov, this.height()),
        getScaleFromZ(this.near, this.fov, this.height()),
      ]).on('zoom', (event) => {
        const scale = event.transform.k;
        const x = -(event.transform.x - this.width() / 2) / scale;
        const y = (event.transform.y - this.height() / 2) / scale;
        const z = getZFromScale(scale, this.fov, this.height());
        this.camera.position.set(x, y, z);
      });
    view.call(zoom);
    const initialscale = getScaleFromZ(this.far, this.fov, this.height());
    const initialtransform = d3.zoomIdentity
      .translate(
        this.width() / 2,
        this.height() / 2,
      )
      .scale(initialscale);
    view.call(zoom.transform, initialtransform);
    this.camera.position.set(0, 0, this.far);
  }

  setupInputs() {
    const view = d3.select(this.renderer.domElement);
    view.on('mousemove', (event) => this.mouseMoveHandler(event));
    view.on('click', (event) => this.clickHandler(event));
  }

  mouseMoveHandler(event) {
    const [mouseX, mouseY] = d3.pointer(event);
    const gridPosition = this.checkGridIntersects([mouseX, mouseY]);
    if (gridPosition.length > 0) {
      // eslint-disable-next-line no-console
      console.log(this.universe.getCellStats(...gridPosition));
    }
  }

  clickHandler(event) {
    const [mouseX, mouseY] = d3.pointer(event);
    const gridPosition = this.checkGridIntersects([mouseX, mouseY]);
    if (gridPosition.length > 0) {
      this.universe.toggleCell(...gridPosition);
    }
  }

  checkGridIntersects(mousePosition) {
    const bufferIndex = this.universe.currentBufferIndex;
    const mouseVector = mouseToThree(...mousePosition, this.width(), this.height());
    this.raycaster.setFromCamera(mouseVector, this.camera);
    const intersects = this.raycaster.intersectObject(this.scenes[bufferIndex].mesh);
    if (intersects[0]) {
      const sortedintersects = sortIntersectsByDistanceToRay(intersects);
      const intersect = sortedintersects[0];
      const { index } = intersect;
      return getPositionFromIndex(index, this.universe.width);
    }
    return [];
  }

  height() {
    return this.renderer.domElement.height;
  }

  width() {
    return this.renderer.domElement.width;
  }

  render() {
    const bufferIndex = this.universe.currentBufferIndex;
    this.scenes[bufferIndex].mesh.geometry.getAttribute('color').needsUpdate = true;
    this.renderer.render(this.scenes[bufferIndex].scene, this.camera);
  }
}
