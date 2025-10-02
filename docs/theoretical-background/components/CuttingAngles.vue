<template>
    <div class="cutting-angles-container">
        <div ref="canvas" class="canvas-container"></div>
        <div class="controls">
            <div class="slider-group">
                <label for="rake-slider">Rake Angle (α): {{ rakeDeg }}°</label>
                <input 
                    id="rake-slider"
                    type="range" 
                    v-model="rakeDeg" 
                    :min="params.rakeAngleMin" 
                    :max="params.rakeAngleMax" 
                    :step="params.rakeAngleStep"
                    class="slider"
                />
            </div>
            <div class="slider-group">
                <label for="clearance-slider">Clearance Angle (γ): {{ reliefDeg }}°</label>
                <input 
                    id="clearance-slider"
                    type="range" 
                    v-model="reliefDeg" 
                    :min="params.reliefAngleMin" 
                    :max="params.reliefAngleMax" 
                    :step="params.reliefAngleStep"
                    class="slider"
                />
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'

// Color configuration - centralized for easy maintenance
const colors = {
  rakeAngle: 'black',           // Rake angle line and arc color
  reliefAngle: 'black',          // Relief angle line and arc color  
  betaAngle: 'black',          // Beta angle arc color
  referenceLines: 'black',     // Dashed reference lines
  hatchPattern: 'gray',        // Hatching pattern for cutting zone
  arrowMarker: 'black',         // Arrow marker color
  sliderThumb: '#4CAF50',      // Slider thumb color
  labelText: '#333'            // Label text color
}

// Numerical parameters - centralized for easy maintenance
const params = {
  // Slider constraints
  rakeAngleMin: -30,           // Minimum rake angle (degrees)
  rakeAngleMax: 30,            // Maximum rake angle (degrees)
  rakeAngleStep: 1,            // Rake angle slider step size
  reliefAngleMin: 0,           // Minimum relief angle (degrees)
  reliefAngleMax: 20,          // Maximum relief angle (degrees)
  reliefAngleStep: 1,          // Relief angle slider step size
  
  // Default angle values
  defaultRakeAngle: 10,        // Default rake angle (degrees)
  defaultReliefAngle: 5,       // Default relief angle (degrees)
  
  // Diagram geometry
  lineLength: 200,             // Length of angle lines
  arcRadius: 160,              // Radius for main angle arcs
  betaRadius: 140,             // Radius for beta angle arc
  labelOffset: 20,             // Offset for angle labels from arcs
  centerY: 300,                // Y coordinate of diagram center
  
  // SVG dimensions and styling
  svgHeight: 500,              // SVG canvas height
  canvasHeight: 400,           // Canvas container height
  lineStrokeWidth: 2,          // Main line stroke width
  referenceStrokeWidth: 1,     // Reference line stroke width
  
  // Hatching pattern
  hatchSize: 8,                // Size of hatching pattern squares
  hatchRotation: 45,           // Rotation angle for hatching pattern
  
  // Arrow configuration
  arrowWidth: 6,               // Arrow marker width
  arrowHeight: 4,              // Arrow marker height
  arrowPointOffset: 2,         // Arrow point offset
  arrowPolygonSize: 3,         // Arrow polygon half-size
  arrowPolygonLength: 5,       // Arrow polygon length
  arrowPolygonTip: 2,          // Arrow polygon tip offset
  
  // Text styling
  labelFontSize: '18px',       // Font size for angle labels
  
  // Opacity and visual effects
  cuttingZoneOpacity: 0.7,     // Opacity for cutting zone fill
  
  // Dash pattern
  dashPattern: '5,5',          // Dash pattern for reference lines
  
  // UI spacing
  containerGap: 20,            // Gap between container elements
  controlsPadding: 15,         // Padding for controls section
  sliderGroupMargin: 15,       // Margin between slider groups
  labelMargin: 5,              // Margin below labels
  
  // Slider styling
  sliderHeight: 6,             // Slider track height
  sliderBorderRadius: 3,       // Slider track border radius
  sliderOpacity: 0.7,          // Default slider opacity
  sliderThumbSize: 20,         // Slider thumb size
  transitionDuration: 0.2      // Transition duration in seconds
}

const canvas = ref(null)
const rakeDeg = ref(params.defaultRakeAngle)
const reliefDeg = ref(params.defaultReliefAngle)

let svg = null
let containerWidth = 0


const drawDiagram = () => {
    if (!svg) return
    
    // Clear previous content except defs
    svg.selectAll('*:not(defs)').remove()
    
    // Ensure hatching pattern exists (re-add if needed)
    if (svg.select('#diagonalHatch').empty()) {
        const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs')
        
        const hatchPattern = defs.append('pattern')
            .attr('id', 'diagonalHatch')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', params.hatchSize)
            .attr('height', params.hatchSize)
            .attr('patternTransform', `rotate(${params.hatchRotation})`)

        hatchPattern.append('path')
            .attr('d', `M0,0 L0,${params.hatchSize}`)
            .attr('stroke', colors.hatchPattern)
            .attr('stroke-width', params.referenceStrokeWidth)
    }

    const lineLength = params.lineLength
    const arcRadius = params.arcRadius
    const betaRadius = params.betaRadius
    const labelOffset = params.labelOffset

    const rakeRad = (rakeDeg.value * Math.PI) / 180
    const reliefRad = (reliefDeg.value * Math.PI) / 180

    const x1 = containerWidth / 2
    const y1 = params.centerY
    
    // Rake angle line
    const x2 = x1 + lineLength * Math.sin(rakeRad)
    const y2 = y1 - lineLength * Math.cos(rakeRad)

    svg.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', colors.rakeAngle)
        .attr('stroke-width', params.lineStrokeWidth)
    
    // Relief angle line (measured from horizontal)
    const x3 = x1 + lineLength * Math.cos(reliefRad)
    const y3 = y1 - lineLength * Math.sin(reliefRad)

    svg.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x3)
        .attr('y2', y3)
        .attr('stroke', colors.reliefAngle)
        .attr('stroke-width', params.lineStrokeWidth)

    // Add reference lines for angle measurement
    // Vertical reference line for rake angle
    svg.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x1)
        .attr('y2', y1 - lineLength)
        .attr('stroke', colors.referenceLines)
        .attr('stroke-width', params.referenceStrokeWidth)
        .attr('stroke-dasharray', params.dashPattern)

    // Horizontal reference line for clearance angle
    svg.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x1 + lineLength)
        .attr('y2', y1)
        .attr('stroke', colors.referenceLines)
        .attr('stroke-width', params.referenceStrokeWidth)
        .attr('stroke-dasharray', params.dashPattern)

    // Add arcs to indicate angles
    
    // Filled pie section between rake and clearance lines (cutting zone)
    const pieArc = d3.arc()
        .innerRadius(0)
        .outerRadius(lineLength)
        .startAngle(rakeRad) // Start from rake line
        .endAngle(Math.PI/2 - reliefRad) // End at clearance line

    svg.append('path')
        .attr('d', pieArc)
        .attr('transform', `translate(${x1}, ${y1})`)
        .attr('fill', 'url(#diagonalHatch)')
        .attr('opacity', params.cuttingZoneOpacity)
    
    // Rake angle arc (from vertical reference to rake line)
    // In D3, 0 is rightward, -π/2 is upward, π/2 is downward
    const rakeArc = d3.arc()
        .innerRadius(arcRadius)
        .outerRadius(arcRadius)
        .startAngle(0) // Start from vertical (upward)
        .endAngle(rakeRad) // End at rake angle (clockwise from vertical)

    svg.append('path')
        .attr('d', rakeArc)
        .attr('transform', `translate(${x1}, ${y1})`)
        .attr('fill', 'none')
        .attr('stroke', colors.rakeAngle)
        .attr('stroke-width', params.lineStrokeWidth)

    // Add arrows to the ends of the rake arc
    // Arrow at the start of the rake arc (vertical reference)
    const startArrowX = x1 + arcRadius * Math.cos(-Math.PI/2+rakeRad)
    const startArrowY = y1 + arcRadius * Math.sin(-Math.PI/2+rakeRad)
    
    svg.append('polygon')
        .attr('points', `${startArrowX-params.arrowPolygonSize},${startArrowY-params.arrowPolygonLength} ${startArrowX+params.arrowPolygonSize},${startArrowY-params.arrowPolygonLength} ${startArrowX},${startArrowY+params.arrowPolygonTip}`)
        .attr('fill', colors.rakeAngle)
        .attr('transform', `rotate(${rakeRad * 180 / Math.PI - 90}, ${startArrowX}, ${startArrowY})`)

    // Arrow at the end of the rake arc
    const endArrowX = x1 + arcRadius * Math.cos(-Math.PI/2)
    const endArrowY = y1 + arcRadius * Math.sin(-Math.PI/2)
    
    svg.append('polygon')
        .attr('points', `${endArrowX-params.arrowPolygonSize},${endArrowY-params.arrowPolygonLength} ${endArrowX+params.arrowPolygonSize},${endArrowY-params.arrowPolygonLength} ${endArrowX},${endArrowY+params.arrowPolygonTip}`)
        .attr('fill', colors.rakeAngle)
        .attr('transform', `rotate(${90}, ${endArrowX}, ${endArrowY})`)

    

    // Relief angle arc (from horizontal reference to clearance line)
    // Relief line goes upward from horizontal, so angle should be negative
    const reliefArc = d3.arc()
        .innerRadius(arcRadius)
        .outerRadius(arcRadius)
        .startAngle(Math.PI/2) // Start from horizontal (rightward)
        .endAngle(Math.PI/2-reliefRad) // End at clearance angle (counter-clockwise from horizontal, upward)

    svg.append('path')
        .attr('d', reliefArc)
        .attr('transform', `translate(${x1}, ${y1})`)
        .attr('fill', 'none')
        .attr('stroke', colors.reliefAngle)
        .attr('stroke-width', params.lineStrokeWidth)

    // Beta angle arc (between rake and clearance lines)
    const betaArc = d3.arc()
        .innerRadius(betaRadius)
        .outerRadius(betaRadius)
        .startAngle(rakeRad) // Start from clearance line
        .endAngle(Math.PI/2-reliefRad) // End at rake line

    svg.append('path')
        .attr('d', betaArc)
        .attr('transform', `translate(${x1}, ${y1})`)
        .attr('fill', 'none')
        .attr('stroke', colors.betaAngle)
        .attr('stroke-width', params.lineStrokeWidth)

    // Add angle labels
    // Rake angle label (α)
    const rakeLabel_x = x1 + (arcRadius + labelOffset) * Math.sin(rakeRad / 2)
    const rakeLabel_y = y1 - (arcRadius + labelOffset) * Math.cos(rakeRad / 2)
    
    svg.append('text')
        .attr('x', rakeLabel_x)
        .attr('y', rakeLabel_y)
        .attr('text-anchor', 'middle')
        .attr('fill', colors.rakeAngle)
        .attr('font-size', params.labelFontSize)
        .attr('font-weight', 'bold')
        .text('α')

    // Relief angle label (δ)
    const reliefLabel_x = x1 + (arcRadius + labelOffset) * Math.cos(reliefRad / 2)
    const reliefLabel_y = y1 - (arcRadius + labelOffset) * Math.sin(reliefRad / 2)
    
    svg.append('text')
        .attr('x', reliefLabel_x)
        .attr('y', reliefLabel_y)
        .attr('text-anchor', 'middle')
        .attr('fill', colors.reliefAngle)
        .attr('font-size', params.labelFontSize)
        .attr('font-weight', 'bold')
        .text('γ')

    // Beta angle label (β) - between rake and clearance lines
    const betaAngle = (Math.PI/2 - rakeRad + reliefRad) / 2 // Middle angle between the two lines
    const betaLabel_x = x1 + (betaRadius + labelOffset) * Math.cos(betaAngle)
    const betaLabel_y = y1 - (betaRadius + labelOffset) * Math.sin(betaAngle)
    
    svg.append('text')
        .attr('x', betaLabel_x)
        .attr('y', betaLabel_y)
        .attr('text-anchor', 'middle')
        .attr('fill', colors.betaAngle)
        .attr('font-size', params.labelFontSize)
        .attr('font-weight', 'bold')
        .text('β')
}

onMounted(() => {
    // Get the container width
    containerWidth = canvas.value.clientWidth
    
    svg = d3.select(canvas.value)
        .append('svg')
        .attr('width', '100%')
        .attr('viewBox', `0 0 ${containerWidth} ${params.svgHeight}`)
        .attr('height', params.svgHeight)

    // Define arrowhead marker
    const defs = svg.append('defs')
    
    const arrowMarker = defs.append('marker')
        .attr('id', 'arrowhead')
        .attr('markerWidth', params.arrowWidth)
        .attr('markerHeight', params.arrowHeight)
        .attr('refX', 0)
        .attr('refY', params.arrowPointOffset)
        .attr('orient', 'auto')
        .attr('markerUnits', 'strokeWidth')
    
    arrowMarker.append('path')
        .attr('d', `M0,0 L0,${params.arrowHeight} L${params.arrowWidth},${params.arrowPointOffset} z`)
        .attr('fill', colors.arrowMarker)

    // Define hatching pattern for the cutting zone
    const hatchPattern = defs.append('pattern')
        .attr('id', 'diagonalHatch')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', params.hatchSize)
        .attr('height', params.hatchSize)
        .attr('patternTransform', `rotate(${params.hatchRotation})`)

    hatchPattern.append('path')
        .attr('d', `M0,0 L0,${params.hatchSize}`)
        .attr('stroke', colors.hatchPattern)
        .attr('stroke-width', params.referenceStrokeWidth)

    // Draw initial diagram
    drawDiagram()
})

// Watch for changes in slider values and redraw
watch([rakeDeg, reliefDeg], () => {
    drawDiagram()
})
</script>

<style scoped>
.cutting-angles-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: v-bind('params.containerGap + "px"');
}

.controls {
    padding: v-bind('params.controlsPadding + "px"');
    flex-shrink: 0;
    position: relative;
    z-index: 10;
}

.slider-group {
    margin-bottom: v-bind('params.sliderGroupMargin + "px"');
}

.slider-group:last-child {
    margin-bottom: 0;
}

.slider-group label {
    display: block;
    margin-bottom: v-bind('params.labelMargin + "px"');
    font-weight: bold;
    color: v-bind('colors.labelText');
}

.slider {
    width: 100%;
    height: v-bind('params.sliderHeight + "px"');
    border-radius: v-bind('params.sliderBorderRadius + "px"');
    background: #ddd;
    outline: none;
    opacity: v-bind('params.sliderOpacity');
    transition: opacity v-bind('params.transitionDuration + "s"');
}

.slider:hover {
    opacity: 1;
}

.slider::-webkit-slider-thumb {
    appearance: none;
    width: v-bind('params.sliderThumbSize + "px"');
    height: v-bind('params.sliderThumbSize + "px"');
    border-radius: 50%;
    background: v-bind('colors.sliderThumb');
    cursor: pointer;
}

.slider::-moz-range-thumb {
    width: v-bind('params.sliderThumbSize + "px"');
    height: v-bind('params.sliderThumbSize + "px"');
    border-radius: 50%;
    background: v-bind('colors.sliderThumb');
    cursor: pointer;
    border: none;
}

.canvas-container {
    width: 100%;
    position: relative;
    height: v-bind('params.canvasHeight + "px"');
}
</style>
```