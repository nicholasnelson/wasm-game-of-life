export class UniverseRenderer {

    constructor(universe, container) {
        this._universe = universe;

        this._fov = 75;
        this._near = 0.1;
        this._far = 100;

        // Create Renderer
        this._renderer = new THREE.WebGLRenderer();
        container.append(this._renderer.domElement);
        this._renderer.setSize(container.width(), container.height());

        this._camera = new THREE.PerspectiveCamera(this._fov, this._width() / this._height(), this._near, this._far);

        this._raycaster = new THREE.Raycaster();

        // Generate shared vertices for meshes
        const vertices = Float32Array.from({ length: this._universe.width() * this._universe.height() * 3 }, (v, k) => {
            let cell = Math.floor(k / 3);
            // Check if we're looking for the X, Y, or Z coord
            switch (k % 3) {
                case 0: // X
                    return cell % universe.width() - universe.width() / 2;
                case 1: // Y
                    return universe.height() / 2 - Math.floor(cell / universe.width());
                case 2: // Z
                    return 1;
            }
        });

        const verticesBuffer = new THREE.BufferAttribute(vertices, 3);

        const material = new THREE.PointsMaterial({ vertexColors: THREE.VertexColors });

        // (1 scene per cell buffer)
        this._scenes = universe.getCellBufferArrays().map((buffer, index) => {
            const scene = new THREE.Scene();
            const geometry = new THREE.BufferGeometry();
            const colorBuffer = new THREE.BufferAttribute(buffer, 3);
            geometry.setAttribute('position', verticesBuffer);
            geometry.setAttribute('color', colorBuffer);
            const mesh = new THREE.Points(geometry, material);
            scene.add(mesh);
            return { scene, mesh };
        });

        this._setupZoom();
        this._setupInputs();

    }

    _setupZoom() {
        const view = d3.select(this._renderer.domElement);
        const zoom = d3.zoom()
            .scaleExtent([
                getScaleFromZ(this._far, this._fov, this._height()),
                getScaleFromZ(this._near, this._fov, this._height())
            ]).on('zoom', (event) => {
                let scale = event.transform.k;
                let x = -(event.transform.x - this._width() / 2) / scale;
                let y = (event.transform.y - this._height() / 2) / scale;
                let z = getZFromScale(scale, this._fov, this._height());
                this._camera.position.set(x, y, z);
            });
        view.call(zoom);
        let initial_scale = getScaleFromZ(this._far, this._fov, this._height());
        let initial_transform = d3.zoomIdentity
            .translate(
                this._width() / 2,
                this._height() / 2)
            .scale(initial_scale);
        view.call(zoom.transform, initial_transform);
        this._camera.position.set(0, 0, this._far);
    }

    _setupInputs() {
        const view = d3.select(this._renderer.domElement);
        view.on('mousemove', event => this._mouseMoveHandler(event));
        view.on('click', event => this._clickHandler(event))
    }

    _mouseMoveHandler(event) {
        let [mouseX, mouseY] = d3.pointer(event);
        let gridPosition = this._checkGridIntersects([mouseX, mouseY]);
        if (gridPosition.length > 0) {
            console.log(this._universe.getCellStats(...gridPosition));
        }
    }

    _clickHandler(event) {
        let [mouseX, mouseY] = d3.pointer(event);
        let gridPosition = this._checkGridIntersects([mouseX, mouseY]);
        if (gridPosition.length > 0) {
            this._universe.toggleCell(...gridPosition)
        }
    }

    _checkGridIntersects(mousePosition) {
        let bufferIndex = this._universe.currentBufferIndex;
        let mouseVector = mouseToThree(...mousePosition, this._width(), this._height());
        this._raycaster.setFromCamera(mouseVector, this._camera);
        let intersects = this._raycaster.intersectObject(this._scenes[bufferIndex].mesh);
        if (intersects[0]) {
            let sorted_intersects = sortIntersectsByDistanceToRay(intersects);
            let intersect = sorted_intersects[0];
            let index = intersect.index;
            return getPositionFromIndex(index, this._universe.width());
        } else {
            return [];
        }
    }

    _height() {
        return this._renderer.domElement.height;
    }

    _width() {
        return this._renderer.domElement.width;
    }

    render() {
        const bufferIndex = this._universe.currentBufferIndex;
        this._scenes[bufferIndex].mesh.geometry.getAttribute('color').needsUpdate = true;
        this._renderer.render(this._scenes[bufferIndex].scene, this._camera);
    }
}

/**
 * Helper Functions
 */

function mouseToThree(mouseX, mouseY, width, height) {
    return new THREE.Vector3(
        mouseX / width * 2 - 1,
        -(mouseY / height) * 2 + 1,
        1
    );
}

function getPositionFromIndex(index, width) {
    return [
        index / width,
        index % width
    ];
}

function sortIntersectsByDistanceToRay(intersects) {
    return intersects.sort((a, b) => {
        if (a.distanceToRay > b.distanceToRay) {
            return 1;
        } else if (a.distanceToRay < b.distanceToRay) {
            return -1;
        } else {
            return 0;
        }
    })
}

function getScaleFromZ(camera_z_position, fov, height) {
    let half_fov = fov / 2;
    let half_fov_radians = toRadians(half_fov);
    let half_fov_height = Math.tan(half_fov_radians) * camera_z_position;
    let fov_height = half_fov_height * 2;
    let scale = height / fov_height; // Divide visualization height by height derived from field of view
    return scale;
}

function getZFromScale(scale, fov, height) {
    let half_fov = fov / 2;
    let half_fov_radians = toRadians(half_fov);
    let scale_height = height / scale;
    let camera_z_position = scale_height / (2 * Math.tan(half_fov_radians));
    return camera_z_position;
}

function toRadians(angle) {
    return angle * (Math.PI / 180);
}