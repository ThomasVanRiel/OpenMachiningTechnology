<template>
  <div class="plot-wrapper">
    <!-- Sliders will be dynamically inserted here -->
    <div ref="sliderContainer" class="flex gap-4 mt-4">
    </div>
    <div ref="machiningContainer" class="chart-container">
      <div class="loading-message">Loading 3D visualization...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { SliderGenerator } from './SliderGenerator'
import { CSG } from 'three-csg-ts'

// Template refs
const machiningContainer = ref<HTMLDivElement>()
const sliderContainer = ref<HTMLDivElement>()

// Reactive variables
const objects: THREE.Object3D[] = []
let cleanupFunction: (() => void) | null = null

// Machining parameters
let bhmin = 0.2
let bhmax = 0.7
let T = 1
let vb = 0.4
let p = 0.4
let q = 0.1
let m = 0.25
let n = 0.45
let CTVB = 0.8
let P = 6
let ks11 = 1200
let z_kienzle = 0.5
let vmin = 0.6
let vmax = 0.9
let hmin = 0.1
let hmax = 0.6
let bmin = 0.1
let bmax = 0.9

function initMachiningWindow() {
  const container = machiningContainer.value
  const sliderContainerEl = sliderContainer.value
  if (!container || !sliderContainerEl) {
    console.error('MachiningWindow: Container refs not found!')
    return
  }
  
  // Theme detection functions
  const isDarkTheme = () => document.documentElement.classList.contains('dark')
  const getThemeColors = () => {
    const dark = isDarkTheme()
    return {
      axes: dark ? 0xffffff : 0x000000,
      grid: dark ? 0x444444 : 0xcccccc,
      gridHelper: dark ? 0x666666 : 0xcccccc,
      text: dark ? '#ffffff' : '#000000',
      dashedLine: dark ? 0xffffff : 0x000000
    }
  }
  
  // Initialize slider generator
  const sliderGen = new SliderGenerator()
  
  // Create sliders using the generator
  const bhminSlider = sliderGen.createSlider({
    name: 'bhmin',
    min: 0.01,
    max: 0.99,
    step: 0.01,
    defaultValue: bhmin,
    displayPrecision: 2,
    label: 'b/h min',
    containerClass: 'flex flex-col',
    onUpdate: (value) => {
      bhmin = value
      Generate()
    }
  })
  
  const bhmaxSlider = sliderGen.createSlider({
    name: 'bhmax',
    min: 0.01,
    max: 0.99,
    step: 0.01,
    defaultValue: bhmax,
    displayPrecision: 2,
    label: 'b/h max',
    containerClass: 'flex flex-col',
    onUpdate: (value) => {
      bhmax = value
      Generate()
    }
  })
  
  const vminSlider = sliderGen.createSlider({
    name: 'vmin',
    min: 0.01,
    max: 2,
    step: 0.01,
    defaultValue: vmin,
    displayPrecision: 2,
    label: 'v min',
    containerClass: 'flex flex-col',
    onUpdate: (value) => {
      vmin = value
      Generate()
    }
  })

  const vmaxSlider = sliderGen.createSlider({
    name: 'vmax',
    min: 0.01,
    max: 2,
    step: 0.01,
    defaultValue: 0.9,
    displayPrecision: 2,
    label: 'v max',
    containerClass: 'flex flex-col',
    onUpdate: (value) => {
      vmax = value
      Generate()
    }
  })

  const zkienzleSlider = sliderGen.createSlider({
    name: 'z_kienzle',
    min: 0.01,
    max: 1,
    step: 0.01,
    defaultValue: z_kienzle,
    displayPrecision: 2,
    label: 'z Kienzle',
    containerClass: 'flex flex-col',
    onUpdate: (value) => {
      z_kienzle = value
      Generate()
    }
  })

  const PSlider = sliderGen.createSlider({
    name: 'P',
    min: 1,
    max: 10,
    step: 0.1,
    defaultValue: P,
    displayPrecision: 2,
    label: 'P',
    containerClass: 'flex flex-col',
    onUpdate: (value) => {
      P = value
      Generate()
    }
  })

  const TSlider = sliderGen.createSlider({
    name: 'T',
    min: 0.01,
    max: 2,
    step: 0.01,
    defaultValue: T,
    displayPrecision: 2,
    label: 'T',
    containerClass: 'flex flex-col',
    onUpdate: (value) => {
      T = value
      Generate()
    }
  })
  
  sliderContainerEl.appendChild(TSlider.container)
  sliderContainerEl.appendChild(PSlider.container)
  
  // Add sliders to container
  sliderContainerEl.appendChild(vminSlider.container)
  sliderContainerEl.appendChild(vmaxSlider.container)
  sliderContainerEl.appendChild(bhminSlider.container)
  sliderContainerEl.appendChild(bhmaxSlider.container)
  sliderContainerEl.appendChild(zkienzleSlider.container)
  
  // Scene setup (keeping your existing Three.js code)
  const scene = new THREE.Scene()
  // Remove background to make it transparent
  scene.background = null
  
  // Camera setup
  const containerWidth = container.clientWidth || 800
  const containerHeight = container.clientHeight || 600
  
  const aspect = containerWidth / containerHeight
  const frustumSize = 2
  const camera = new THREE.OrthographicCamera(
    -frustumSize * aspect / 2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    -frustumSize / 2,
    0.1,
    1000
  )
  camera.position.set(2, 2, 3)
  camera.lookAt(0, 0, 0)
  
  // Renderer setup
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setClearColor(0x000000, 0) // Transparent background
  renderer.setSize(containerWidth, containerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0.5, 0.5, 0.5)
  controls.enablePan = false
  controls.enableRotate = true
  controls.enableZoom = false
  controls.update()
  
  container.appendChild(renderer.domElement)
  
  // Hide loading message
  const loadingMessage = container.querySelector('.loading-message')
  if (loadingMessage) {
    loadingMessage.style.display = 'none'
  }
  
  // Get theme colors
  let themeColors = getThemeColors()
  
  // Create grid with theme colors
  let gridHelper = new THREE.GridHelper(1, 10, themeColors.gridHelper, themeColors.grid)
  gridHelper.translateX(0.5)
  gridHelper.translateZ(0.5)
  scene.add(gridHelper)
  
  // Create axes with theme colors
  const axesHelper = new THREE.AxesHelper(1)
  axesHelper.setColors(
    new THREE.Color(themeColors.axes), 
    new THREE.Color(themeColors.axes), 
    new THREE.Color(themeColors.axes)
  )
  scene.add(axesHelper)
  
  // Materials
  const dashedLineMaterial = new THREE.LineDashedMaterial({ 
    color: themeColors.dashedLine, 
    linewidth: 1, 
    scale: 1, 
    dashSize: 0.03, 
    gapSize: 0.01 
  })

  const surfaceMaterial = new THREE.MeshMatcapMaterial({
    color: 0xffffff,
    opacity: 0.8,
    transparent: true,
    side: THREE.DoubleSide,
  })
  
  // Add axis labels
  const createAxisLabel = (text: string, position: THREE.Vector3, size: number = 1) => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.font = `bold 128px 'Source Serif 4'`
      ctx.fillStyle = themeColors.text
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, canvas.width / 2, canvas.height / 2)
    }
    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(0.2*size, 0.2*size, 0.2*size)
    sprite.position.copy(position)
    return sprite
  }
  
  // Axis labels
  const vLabel = createAxisLabel('v', new THREE.Vector3(0, 1.1, 0))
  const hLabel = createAxisLabel('h', new THREE.Vector3(1.1, 0, 0))
  const bLabel = createAxisLabel('b', new THREE.Vector3(0, 0, 1.1))
  scene.add(vLabel)
  scene.add(hLabel)
  scene.add(bLabel)
  
  // Function to update theme colors dynamically
  const updateThemeColors = () => {
    themeColors = getThemeColors()
    
    // Update grid colors - need to recreate grid for color changes
    scene.remove(gridHelper)
    gridHelper = new THREE.GridHelper(1, 10, themeColors.gridHelper, themeColors.grid)
    gridHelper.translateX(0.5)
    gridHelper.translateZ(0.5)
    scene.add(gridHelper)
    
    // Update axes colors
    axesHelper.setColors(
      new THREE.Color(themeColors.axes),
      new THREE.Color(themeColors.axes),
      new THREE.Color(themeColors.axes)
    )
    
    // Update dashed line material
    dashedLineMaterial.color.setHex(themeColors.dashedLine)
    
    // Update axis labels
    ;[vLabel, hLabel, bLabel].forEach((label, index) => {
      const texts = ['v', 'h', 'b']
      
      // Recreate the label with new color
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.font = `bold 128px 'Source Serif 4'`
        ctx.fillStyle = themeColors.text
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(texts[index], canvas.width / 2, canvas.height / 2)
      }
      const texture = new THREE.CanvasTexture(canvas)
      label.material.map?.dispose()
      label.material.map = texture
      label.material.needsUpdate = true
    })
  }
  
  const Generate = () => {
    // Remove old surface from scene
    for (let obj of objects) {
      scene.remove(obj)
    }
    objects.length = 0 // Clear the array
    
    // Draw bhmax line
    const bhmaxPoints = []
    bhmaxPoints.push(new THREE.Vector3(0, 0, 0))
    if (bhmax > 0.5) {
      bhmaxPoints.push(new THREE.Vector3((1-bhmax)*2, 0, 1))
    } else if (bhmax < 0.5) {
      bhmaxPoints.push(new THREE.Vector3(1, 0, (bhmax)*2))
    } else {
      bhmaxPoints.push(new THREE.Vector3(1, 0, 1))
    }
    
    const bhmaxGeometry = new THREE.BufferGeometry().setFromPoints(bhmaxPoints)
    const bhmaxLine = new THREE.Line(bhmaxGeometry, dashedLineMaterial)
    bhmaxLine.computeLineDistances()
    objects.push(bhmaxLine)
    scene.add(bhmaxLine)
    
    // Draw bhmin line
    const bhminPoints = []
    bhminPoints.push(new THREE.Vector3(0, 0, 0))
    if (bhmin > 0.5) {
      bhminPoints.push(new THREE.Vector3((1-bhmin)*2, 0, 1))
    } else if (bhmin < 0.5) {
      bhminPoints.push(new THREE.Vector3(1, 0, (bhmin)*2))
    } else {
      bhminPoints.push(new THREE.Vector3(1, 0, 1))
    }
    
    const bhminGeometry = new THREE.BufferGeometry().setFromPoints(bhminPoints)
    const bhminLine = new THREE.Line(bhminGeometry, dashedLineMaterial)
    bhminLine.computeLineDistances()
    objects.push(bhminLine)
    scene.add(bhminLine)
    
    // Use ExtrudeGeometry for the prism between bhmin and bhmax
    // Define the 2D shape for extrusion (in x-z plane)
    const prismShape = new THREE.Shape()
    prismShape.moveTo(bhminPoints[0].x*2, bhminPoints[0].z*2)
    prismShape.lineTo(bhminPoints[1].x*2, bhminPoints[1].z*2)
    prismShape.lineTo(bhmaxPoints[1].x*2, bhmaxPoints[1].z*2)
    prismShape.lineTo(bhmaxPoints[0].x*2, bhmaxPoints[0].z*2)
    prismShape.lineTo(bhminPoints[0].x*2, bhminPoints[0].z*2) // Close the shape

    // Extrude settings: height = 1 (from y=0 to y=1)
    const extrudeSettings = {
      steps: 1,
      depth: -1,
      bevelEnabled: false,
      curveSegments: 1
    }

    // Extrude along the y-axis
    const prismGeometry = new THREE.ExtrudeGeometry(prismShape, extrudeSettings)

    // Move the geometry so its base is at y=0
    prismGeometry.rotateX(Math.PI / 2)
    prismGeometry.computeVertexNormals()

    const prismMesh = new THREE.Mesh(prismGeometry, surfaceMaterial)
    objects.push(prismMesh)
    scene.add(prismMesh)

    function createSurfaceMesh(surfaceFn: (x: number, z: number) => number, color = 0x2196f3) {
      const segments = 100
      const geometry = new THREE.BufferGeometry()
      const positions = []
      const normals = []
      const indices = []

      for (let i = 0; i <= segments; i++) {
        for (let j = 0; j <= segments; j++) {
          const x = i / segments
          const z = j / segments
          const y = surfaceFn(x, z)

          positions.push(x, y, z)
          normals.push(0, 1, 0) // Approximate normal
        }
      }

      for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments; j++) {
          const a = i * (segments + 1) + j
          const b = a + 1
          const c = a + (segments + 1)
          const d = c + 1

          indices.push(a, b, d)
          indices.push(a, d, c)
        }
      }

      for (let i = 0; i <= segments; i++) {
        for (let j = 0; j <= segments; j++) {
          // Calculate normal using central differences
          const x = i / segments
          const z = j / segments
          const dx = 1 / segments
          const dz = 1 / segments

          // Partial derivatives
          const y = surfaceFn(x, z)
          const y_dx = surfaceFn(Math.min(x + dx, 1), z) - surfaceFn(Math.max(x - dx, 0), z)
          const y_dz = surfaceFn(x, Math.min(z + dz, 1)) - surfaceFn(x, Math.max(z - dz, 0))

          // Normal vector
          const normal = new THREE.Vector3(-y_dx, 2 * dx, -y_dz)
          normal.normalize()

          // Replace the approximate normal
          const idx = (i * (segments + 1) + j) * 3
          normals[idx] = normal.x
          normals[idx + 1] = normal.y
          normals[idx + 2] = normal.z
        }
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
      geometry.setIndex(indices)

      return new THREE.Mesh(geometry, surfaceMaterial)
    }

    // Taylor surface
    const taylorSurfaceFn = (x: number, z: number) => {
      return CTVB * Math.pow(vb, n) / (Math.pow(z, q) * Math.pow(x, p) * Math.pow(T, m))
    }

    const taylorSurfaceMesh = createSurfaceMesh(taylorSurfaceFn, 0x2196f3)

    // Kienzle surface
    const kienzleSurfaceFn = (x: number, z: number) => {
      return P * 60 / (ks11 * x*Math.pow(z, 1-z_kienzle))
    }

    const kienzleSurfaceMesh = createSurfaceMesh(kienzleSurfaceFn, 0x2196f3)

    // vmax limit plane
    const vmaxPlaneFn = (x: number, z: number) => {
      return vmax
    }
    const vmaxPlaneMesh = createSurfaceMesh(vmaxPlaneFn, 0x4caf50)

    // Combine into a mesh: at each (x, z), y = max(vminPlane, min(taylorSurface, kienzleSurface))
    function combinedSurfaceFn(x: number, z: number) {
      const taylorY = taylorSurfaceFn(x, z)
      const kienzleY = kienzleSurfaceFn(x, z)
      const vminY = vmaxPlaneFn(x, z)
      return Math.min(taylorY, kienzleY, vminY)
    }

    const combinedSurfaceMesh = createSurfaceMesh(combinedSurfaceFn, 0xff9800)

    // Create a mesh from the base plane (y=0) up to the combined surface
    function createVolumeMesh(surfaceFn: (x: number, z: number) => number, color = 0x90caf9) {
      const segments = 50
      const geometry = new THREE.BufferGeometry()
      const positions = []
      const normals = []
      const indices = []

      // Top surface (combined)
      for (let i = 0; i <= segments; i++) {
        for (let j = 0; j <= segments; j++) {
          const x = i / segments
          const z = j / segments
          const y = surfaceFn(x, z)
          positions.push(x, y, z)
          normals.push(0, 1, 0) // Approximate normal
        }
      }
      // Bottom surface (y=0)
      for (let i = 0; i <= segments; i++) {
        for (let j = 0; j <= segments; j++) {
          const x = i / segments
          const z = j / segments
          positions.push(x, 0, z)
          normals.push(0, -1, 0)
        }
      }

      // Top surface indices
      for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments; j++) {
          const a = i * (segments + 1) + j
          const b = a + 1
          const c = a + (segments + 1)
          const d = c + 1
          indices.push(a, b, d)
          indices.push(a, d, c)
        }
      }
      // Bottom surface indices (reverse order for correct normal)
      const offset = (segments + 1) * (segments + 1)
      for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments; j++) {
          const a = offset + i * (segments + 1) + j
          const b = a + 1
          const c = a + (segments + 1)
          const d = c + 1
          indices.push(a, d, b)
          indices.push(a, c, d)
        }
      }
      // Side faces
      for (let i = 0; i < segments; i++) {
        // z=0 edge
        let topA = i * (segments + 1)
        let topB = (i + 1) * (segments + 1)
        let botA = offset + i * (segments + 1)
        let botB = offset + (i + 1) * (segments + 1)
        indices.push(topA, botB, botA)
        indices.push(topA, topB, botB)

        // z=segments edge
        topA = i * (segments + 1) + segments
        topB = (i + 1) * (segments + 1) + segments
        botA = offset + i * (segments + 1) + segments
        botB = offset + (i + 1) * (segments + 1) + segments
        indices.push(topA, botA, botB)
        indices.push(topA, botB, topB)
      }
      for (let j = 0; j < segments; j++) {
        // x=0 edge
        let topA = j
        let topB = j + 1
        let botA = offset + j
        let botB = offset + j + 1
        indices.push(topA, botA, botB)
        indices.push(topA, botB, topB)

        // x=segments edge
        topA = segments * (segments + 1) + j
        topB = segments * (segments + 1) + j + 1
        botA = offset + segments * (segments + 1) + j
        botB = offset + segments * (segments + 1) + j + 1
        indices.push(topA, botB, botA)
        indices.push(topA, topB, botB)
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
      geometry.setIndex(indices)

      geometry.computeVertexNormals()

      return new THREE.Mesh(geometry, surfaceMaterial)
    }

    const volumeMesh = createVolumeMesh(combinedSurfaceFn, 0x90caf9)
    objects.push(volumeMesh)
    scene.add(volumeMesh)
    
    // Create box geometry with limits in x (hmin, hmax) and z (bmin, bmax)
    const boxWidth = hmax - hmin
    const boxHeight = vmax - vmin
    const boxDepth = bmax - bmin
    const boxGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth)

    // Center the box at the middle of the limits
    const boxMesh = new THREE.Mesh(boxGeometry, surfaceMaterial)
    boxMesh.position.set(
      hmin + boxWidth / 2,
      vmin + boxHeight / 2,
      bmin + boxDepth / 2
    )
    boxMesh.updateMatrix()
    objects.push(boxMesh)
    scene.add(boxMesh)

    // Boolean intersection (conjunction) of volumeMesh and boxMesh
    // Using ThreeCSG for mesh boolean operations
    try {
      // Convert meshes to CSG
      const volumeCSG = CSG.fromMesh(volumeMesh)
      const boxCSG = CSG.fromMesh(boxMesh)
      const prismCSG = CSG.fromMesh(prismMesh)

      // Perform intersection: volume ∩ box ∩ prism
      const intersectCSG = volumeCSG.intersect(boxCSG).subtract(prismCSG)

      // Create mesh from result
      const intersectMesh = CSG.toMesh(intersectCSG, volumeMesh.matrix, surfaceMaterial)
      intersectMesh.material = surfaceMaterial
      objects.push(intersectMesh)
      scene.add(intersectMesh)

      // Optionally hide original meshes
      volumeMesh.visible = false
      boxMesh.visible = false
      prismMesh.visible = false
    } catch (err) {
      console.warn('CSG intersection failed:', err)
    }
  }
  
  // Initial generation
  Generate()
  
  // Animation loop
  let animationId: number
  const animate = () => {
    animationId = requestAnimationFrame(animate)
    renderer.render(scene, camera)
  }
  
  // Handle window resize
  const handleResize = () => {
    if (!container) return
    const newWidth = container.clientWidth || 800
    const newHeight = container.clientHeight || 600
    camera.updateProjectionMatrix()
    renderer.setSize(newWidth, newHeight)
  }
  
  window.addEventListener('resize', handleResize)
  
  // Listen for theme changes
  const themeObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        updateThemeColors()
      }
    })
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
  
  // Start animation
  animate()
  
  // Cleanup function
  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    window.removeEventListener('resize', handleResize)
    themeObserver.disconnect()
    if (container && renderer.domElement) {
      container.removeChild(renderer.domElement)
    }
    renderer.dispose()
  }
}

onMounted(async () => {
  await nextTick()
  cleanupFunction = initMachiningWindow()
})

onUnmounted(() => {
  if (cleanupFunction) {
    cleanupFunction()
  }
})
</script>

<style scoped>
.plot-wrapper {
  width: 100%;
}

.chart-container {
  position: relative;
  width: 100%;
  height: 48rem;
  min-height: 48rem;
  overflow: hidden;
  background: transparent;
  display: block;
}

.chart-container canvas {
  display: block;
}

.loading-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #666;
  font-style: italic;
}

/* Enhanced slider styling */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  @apply bg-gray-200 dark:bg-gray-700;
  border-radius: 9999px;
  height: 8px;
  outline: none;
  transition: background 0.3s ease;
}

input[type="range"]:hover {
  @apply bg-gray-300 dark:bg-gray-600;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  @apply bg-white dark:bg-gray-800 border-gray-700 dark:border-gray-300;
  border-width: 2px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  @apply bg-gray-100 dark:bg-gray-700;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  @apply bg-white dark:bg-gray-800 border-gray-700 dark:border-gray-300;
  border-width: 2px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

input[type="range"]::-moz-range-thumb:hover {
  @apply bg-gray-100 dark:bg-gray-700;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
</style>