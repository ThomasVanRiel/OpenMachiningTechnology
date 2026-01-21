<template>
    <InteractiveContent
        :inputs="inputConfigs"
        :initial-values="initialValues"
        :controls-columns="4"
        controls-position="top"
        :debounce-ms="10"
        @update:values="onValuesUpdate"
    >
        <template #default="{ values }">
            <div class="machining-window-container">
                <div ref="containerRef" class="canvas-container"></div>
            </div>
        </template>
    </InteractiveContent>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import InteractiveContent from '/components/InteractiveContent.vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSG } from 'three-csg-ts';

// Configuration for the interactive inputs
const inputConfigs = ref([
    {
        name: 'T',
        type: 'slider',
        label: 'T',
        min: 0.01,
        max: 2,
        step: 0.01,
        defaultValue: 1,
        displayPrecision: 2,
        description: 'Tool life parameter'
    },
    {
        name: 'P',
        type: 'slider',
        label: 'P',
        min: 1,
        max: 10,
        step: 0.1,
        defaultValue: 6,
        displayPrecision: 2,
        description: 'Power parameter'
    },
    {
        name: 'vmin',
        type: 'slider',
        label: 'v min',
        min: 0.01,
        max: 2,
        step: 0.01,
        defaultValue: 0.6,
        displayPrecision: 2,
        description: 'Minimum cutting speed'
    },
    {
        name: 'vmax',
        type: 'slider',
        label: 'v max',
        min: 0.01,
        max: 2,
        step: 0.01,
        defaultValue: 0.9,
        displayPrecision: 2,
        description: 'Maximum cutting speed'
    },
    {
        name: 'bhmin',
        type: 'slider',
        label: 'b/h min',
        min: 0.01,
        max: 0.99,
        step: 0.01,
        defaultValue: 0.2,
        displayPrecision: 2,
        description: 'Minimum b/h ratio'
    },
    {
        name: 'bhmax',
        type: 'slider',
        label: 'b/h max',
        min: 0.01,
        max: 0.99,
        step: 0.01,
        defaultValue: 0.7,
        displayPrecision: 2,
        description: 'Maximum b/h ratio'
    },
    {
        name: 'z_kienzle',
        type: 'slider',
        label: 'z Kienzle',
        min: 0.01,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
        displayPrecision: 2,
        description: 'Kienzle exponent'
    }
]);

// Initial values for the inputs
const initialValues = ref({
    T: 1,
    P: 6,
    vmin: 0.6,
    vmax: 0.9,
    bhmin: 0.2,
    bhmax: 0.7,
    z_kienzle: 0.5
});

// Current values (updated via callback)
let currentValues = {
    T: 1,
    P: 6,
    vmin: 0.6,
    vmax: 0.9,
    bhmin: 0.2,
    bhmax: 0.7,
    z_kienzle: 0.5
};

// Constants
const vb = 0.4;
const p = 0.4;
const q = 0.1;
const m = 0.25;
const n = 0.45;
const CTVB = 0.8;
const ks11 = 1200;
const hmin = 0.1;
const hmax = 0.6;
const bmin = 0.1;
const bmax = 0.9;

// Refs
const containerRef = ref<HTMLDivElement | null>(null);

// Three.js objects
let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let gridHelper: THREE.GridHelper;
let axesHelper: THREE.AxesHelper;
let vLabel: THREE.Sprite;
let hLabel: THREE.Sprite;
let bLabel: THREE.Sprite;
let dashedLineMaterial: THREE.LineDashedMaterial;
let surfaceMaterial: THREE.MeshMatcapMaterial;
let animationId: number;
let themeObserver: MutationObserver;
const objects: THREE.Object3D[] = [];

// Theme detection functions
const isDarkTheme = () => document.documentElement.classList.contains('dark');
const getThemeColors = () => {
    const dark = isDarkTheme();
    return {
        axes: dark ? 0xffffff : 0x000000,
        grid: dark ? 0x444444 : 0xcccccc,
        gridHelper: dark ? 0x666666 : 0xcccccc,
        text: dark ? '#ffffff' : '#000000',
        dashedLine: dark ? 0xffffff : 0x000000
    };
};

// Create axis label helper
const createAxisLabel = (text: string, position: THREE.Vector3, size: number = 1) => {
    const themeColors = getThemeColors();
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.font = `bold 128px 'Source Serif 4'`;
        ctx.fillStyle = themeColors.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.2 * size, 0.2 * size, 0.2 * size);
    sprite.position.copy(position);
    return sprite;
};

// Update theme colors dynamically
const updateThemeColors = () => {
    const themeColors = getThemeColors();

    // Update grid colors - need to recreate grid for color changes
    scene.remove(gridHelper);
    gridHelper = new THREE.GridHelper(1, 10, themeColors.gridHelper, themeColors.grid);
    gridHelper.translateX(0.5);
    gridHelper.translateZ(0.5);
    scene.add(gridHelper);

    // Update axes colors
    axesHelper.setColors(
        new THREE.Color(themeColors.axes),
        new THREE.Color(themeColors.axes),
        new THREE.Color(themeColors.axes)
    );

    // Update dashed line material
    dashedLineMaterial.color.setHex(themeColors.dashedLine);

    // Update axis labels
    [vLabel, hLabel, bLabel].forEach((label, index) => {
        const texts = ['v', 'h', 'b'];

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.font = `bold 128px 'Source Serif 4'`;
            ctx.fillStyle = themeColors.text;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(texts[index], canvas.width / 2, canvas.height / 2);
        }
        const texture = new THREE.CanvasTexture(canvas);
        label.material.map?.dispose();
        label.material.map = texture;
        label.material.needsUpdate = true;
    });
};

// Generate function
const generate = () => {
    if (!scene) return;

    // Remove old surface from scene
    for (const obj of objects) {
        scene.remove(obj);
    }
    objects.length = 0;

    // Draw bhmax line
    const bhmaxPoints: THREE.Vector3[] = [];
    bhmaxPoints.push(new THREE.Vector3(0, 0, 0));
    if (currentValues.bhmax > 0.5) {
        bhmaxPoints.push(new THREE.Vector3((1 - currentValues.bhmax) * 2, 0, 1));
    } else if (currentValues.bhmax < 0.5) {
        bhmaxPoints.push(new THREE.Vector3(1, 0, currentValues.bhmax * 2));
    } else {
        bhmaxPoints.push(new THREE.Vector3(1, 0, 1));
    }

    const bhmaxGeometry = new THREE.BufferGeometry().setFromPoints(bhmaxPoints);
    const bhmaxLine = new THREE.Line(bhmaxGeometry, dashedLineMaterial);
    bhmaxLine.computeLineDistances();
    objects.push(bhmaxLine);
    scene.add(bhmaxLine);

    // Draw bhmin line
    const bhminPoints: THREE.Vector3[] = [];
    bhminPoints.push(new THREE.Vector3(0, 0, 0));
    if (currentValues.bhmin > 0.5) {
        bhminPoints.push(new THREE.Vector3((1 - currentValues.bhmin) * 2, 0, 1));
    } else if (currentValues.bhmin < 0.5) {
        bhminPoints.push(new THREE.Vector3(1, 0, currentValues.bhmin * 2));
    } else {
        bhminPoints.push(new THREE.Vector3(1, 0, 1));
    }

    const bhminGeometry = new THREE.BufferGeometry().setFromPoints(bhminPoints);
    const bhminLine = new THREE.Line(bhminGeometry, dashedLineMaterial);
    bhminLine.computeLineDistances();
    objects.push(bhminLine);
    scene.add(bhminLine);

    // Use ExtrudeGeometry for the prism between bhmin and bhmax
    const prismShape = new THREE.Shape();
    prismShape.moveTo(bhminPoints[0].x * 2, bhminPoints[0].z * 2);
    prismShape.lineTo(bhminPoints[1].x * 2, bhminPoints[1].z * 2);
    prismShape.lineTo(bhmaxPoints[1].x * 2, bhmaxPoints[1].z * 2);
    prismShape.lineTo(bhmaxPoints[0].x * 2, bhmaxPoints[0].z * 2);
    prismShape.lineTo(bhminPoints[0].x * 2, bhminPoints[0].z * 2);

    const extrudeSettings = {
        steps: 1,
        depth: -1,
        bevelEnabled: false,
        curveSegments: 1
    };

    const prismGeometry = new THREE.ExtrudeGeometry(prismShape, extrudeSettings);
    prismGeometry.rotateX(Math.PI / 2);
    prismGeometry.computeVertexNormals();

    const prismMesh = new THREE.Mesh(prismGeometry, surfaceMaterial);
    objects.push(prismMesh);
    scene.add(prismMesh);

    function createSurfaceMesh(surfaceFn: (x: number, z: number) => number) {
        const segments = 100;
        const geometry = new THREE.BufferGeometry();
        const positions: number[] = [];
        const normals: number[] = [];
        const indices: number[] = [];

        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= segments; j++) {
                const x = i / segments;
                const z = j / segments;
                const y = surfaceFn(x, z);

                positions.push(x, y, z);
                normals.push(0, 1, 0);
            }
        }

        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
                const a = i * (segments + 1) + j;
                const b = a + 1;
                const c = a + (segments + 1);
                const d = c + 1;

                indices.push(a, b, d);
                indices.push(a, d, c);
            }
        }

        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= segments; j++) {
                const x = i / segments;
                const z = j / segments;
                const dx = 1 / segments;
                const dz = 1 / segments;

                const y_dx = surfaceFn(Math.min(x + dx, 1), z) - surfaceFn(Math.max(x - dx, 0), z);
                const y_dz = surfaceFn(x, Math.min(z + dz, 1)) - surfaceFn(x, Math.max(z - dz, 0));

                const normal = new THREE.Vector3(-y_dx, 2 * dx, -y_dz);
                normal.normalize();

                const idx = (i * (segments + 1) + j) * 3;
                normals[idx] = normal.x;
                normals[idx + 1] = normal.y;
                normals[idx + 2] = normal.z;
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setIndex(indices);

        return new THREE.Mesh(geometry, surfaceMaterial);
    }

    // Taylor surface
    const taylorSurfaceFn = (x: number, z: number) => {
        return CTVB * Math.pow(vb, n) / (Math.pow(z, q) * Math.pow(x, p) * Math.pow(currentValues.T, m));
    };

    // Kienzle surface
    const kienzleSurfaceFn = (x: number, z: number) => {
        return currentValues.P * 60 / (ks11 * x * Math.pow(z, 1 - currentValues.z_kienzle));
    };

    // vmax limit plane
    const vmaxPlaneFn = () => {
        return currentValues.vmax;
    };

    // Combined surface function
    function combinedSurfaceFn(x: number, z: number) {
        const taylorY = taylorSurfaceFn(x, z);
        const kienzleY = kienzleSurfaceFn(x, z);
        const vmaxY = vmaxPlaneFn();
        return Math.min(taylorY, kienzleY, vmaxY);
    }

    // Create volume mesh
    function createVolumeMesh(surfaceFn: (x: number, z: number) => number) {
        const segments = 50;
        const geometry = new THREE.BufferGeometry();
        const positions: number[] = [];
        const normals: number[] = [];
        const indices: number[] = [];

        // Top surface (combined)
        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= segments; j++) {
                const x = i / segments;
                const z = j / segments;
                const y = surfaceFn(x, z);
                positions.push(x, y, z);
                normals.push(0, 1, 0);
            }
        }
        // Bottom surface (y=0)
        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= segments; j++) {
                const x = i / segments;
                const z = j / segments;
                positions.push(x, 0, z);
                normals.push(0, -1, 0);
            }
        }

        // Top surface indices
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
                const a = i * (segments + 1) + j;
                const b = a + 1;
                const c = a + (segments + 1);
                const d = c + 1;
                indices.push(a, b, d);
                indices.push(a, d, c);
            }
        }
        // Bottom surface indices
        const offset = (segments + 1) * (segments + 1);
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
                const a = offset + i * (segments + 1) + j;
                const b = a + 1;
                const c = a + (segments + 1);
                const d = c + 1;
                indices.push(a, d, b);
                indices.push(a, c, d);
            }
        }
        // Side faces
        for (let i = 0; i < segments; i++) {
            let topA = i * (segments + 1);
            let topB = (i + 1) * (segments + 1);
            let botA = offset + i * (segments + 1);
            let botB = offset + (i + 1) * (segments + 1);
            indices.push(topA, botB, botA);
            indices.push(topA, topB, botB);

            topA = i * (segments + 1) + segments;
            topB = (i + 1) * (segments + 1) + segments;
            botA = offset + i * (segments + 1) + segments;
            botB = offset + (i + 1) * (segments + 1) + segments;
            indices.push(topA, botA, botB);
            indices.push(topA, botB, topB);
        }
        for (let j = 0; j < segments; j++) {
            let topA = j;
            let topB = j + 1;
            let botA = offset + j;
            let botB = offset + j + 1;
            indices.push(topA, botA, botB);
            indices.push(topA, botB, topB);

            topA = segments * (segments + 1) + j;
            topB = segments * (segments + 1) + j + 1;
            botA = offset + segments * (segments + 1) + j;
            botB = offset + segments * (segments + 1) + j + 1;
            indices.push(topA, botB, botA);
            indices.push(topA, topB, botB);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        return new THREE.Mesh(geometry, surfaceMaterial);
    }

    const volumeMesh = createVolumeMesh(combinedSurfaceFn);
    objects.push(volumeMesh);
    scene.add(volumeMesh);

    // Create box geometry with limits
    const boxWidth = hmax - hmin;
    const boxHeight = currentValues.vmax - currentValues.vmin;
    const boxDepth = bmax - bmin;
    const boxGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

    const boxMesh = new THREE.Mesh(boxGeometry, surfaceMaterial);
    boxMesh.position.set(
        hmin + boxWidth / 2,
        currentValues.vmin + boxHeight / 2,
        bmin + boxDepth / 2
    );
    boxMesh.updateMatrix();
    objects.push(boxMesh);
    scene.add(boxMesh);

    // Boolean intersection
    try {
        const volumeCSG = CSG.fromMesh(volumeMesh);
        const boxCSG = CSG.fromMesh(boxMesh);
        const prismCSG = CSG.fromMesh(prismMesh);

        const intersectCSG = volumeCSG.intersect(boxCSG).subtract(prismCSG);

        const intersectMesh = CSG.toMesh(intersectCSG, volumeMesh.matrix, surfaceMaterial);
        intersectMesh.material = surfaceMaterial;
        objects.push(intersectMesh);
        scene.add(intersectMesh);

        volumeMesh.visible = false;
        boxMesh.visible = false;
        prismMesh.visible = false;
    } catch (err) {
        console.warn('CSG intersection failed:', err);
    }
};

// Handle values update from InteractiveContent
const onValuesUpdate = (values: typeof currentValues) => {
    currentValues = values;
    generate();
};

// Handle window resize
const handleResize = () => {
    if (!containerRef.value) return;
    camera.updateProjectionMatrix();
    renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
};

// Animation loop
const animate = () => {
    animationId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
};

onMounted(() => {
    const container = containerRef.value;
    if (!container) return;

    const themeColors = getThemeColors();

    // Scene setup
    scene = new THREE.Scene();
    scene.background = null;

    // Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    const frustumSize = 2;
    camera = new THREE.OrthographicCamera(
        -frustumSize * aspect / 2,
        frustumSize * aspect / 2,
        frustumSize / 2,
        -frustumSize / 2,
        0.1,
        1000
    );
    camera.position.set(2, 2, 3);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0.5, 0.5, 0.5);
    controls.enablePan = false;
    controls.enableRotate = true;
    controls.enableZoom = false;
    controls.update();

    container.appendChild(renderer.domElement);

    // Create grid with theme colors
    gridHelper = new THREE.GridHelper(1, 10, themeColors.gridHelper, themeColors.grid);
    gridHelper.translateX(0.5);
    gridHelper.translateZ(0.5);
    scene.add(gridHelper);

    // Create axes with theme colors
    axesHelper = new THREE.AxesHelper(1);
    axesHelper.setColors(
        new THREE.Color(themeColors.axes),
        new THREE.Color(themeColors.axes),
        new THREE.Color(themeColors.axes)
    );
    scene.add(axesHelper);

    // Materials
    dashedLineMaterial = new THREE.LineDashedMaterial({
        color: themeColors.dashedLine,
        linewidth: 1,
        scale: 1,
        dashSize: 0.03,
        gapSize: 0.01
    });

    surfaceMaterial = new THREE.MeshMatcapMaterial({
        color: 0xffffff,
        opacity: 0.8,
        transparent: true,
        side: THREE.DoubleSide,
    });

    // Axis labels
    vLabel = createAxisLabel('v', new THREE.Vector3(0, 1.1, 0));
    hLabel = createAxisLabel('h', new THREE.Vector3(1.1, 0, 0));
    bLabel = createAxisLabel('b', new THREE.Vector3(0, 0, 1.1));
    scene.add(vLabel);
    scene.add(hLabel);
    scene.add(bLabel);

    // Initial generation
    generate();

    // Start animation
    animate();

    // Handle resize
    window.addEventListener('resize', handleResize);

    // Listen for theme changes
    themeObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                updateThemeColors();
            }
        });
    });
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
    });
});

onUnmounted(() => {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    window.removeEventListener('resize', handleResize);
    if (themeObserver) {
        themeObserver.disconnect();
    }
    if (containerRef.value && renderer?.domElement) {
        containerRef.value.removeChild(renderer.domElement);
    }
    renderer?.dispose();
});
</script>

<style scoped>
.machining-window-container {
    width: 100%;
    display: flex;
    flex-direction: column;
}

.canvas-container {
    width: 100%;
    height: 48rem;
    position: relative;
    overflow: hidden;
    border: 2px dashed;
    @apply border-gray-300 dark:border-gray-600;
}
</style>
