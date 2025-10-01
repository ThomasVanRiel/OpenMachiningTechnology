```markdown
## D3 Canvas Vue Component Example

Below is a basic Vue component that initializes a D3 canvas:

```vue
<template>
    <div ref="canvas" class="canvas-container"></div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import * as d3 from 'd3'

const canvas = ref(null)

onMounted(() => {
    // Get the container width
    const containerWidth = canvas.value.clientWidth
    
    const svg = d3.select(canvas.value)
        .append('svg')
        .attr('width', '100%')
        .attr('viewBox', `0 0 ${containerWidth} 300`)
        .attr('height', 500)

    // Define arrowhead marker
    const defs = svg.append('defs')
    
    const arrowMarker = defs.append('marker')
        .attr('id', 'arrowhead')
        .attr('markerWidth', 6)
        .attr('markerHeight', 4)
        .attr('refX', 0)
        .attr('refY', 2)
        .attr('orient', 'auto')
        .attr('markerUnits', 'strokeWidth')
    
    arrowMarker.append('path')
        .attr('d', 'M0,0 L0,4 L6,2 z')
        .attr('fill', 'blue')

    // Define hatching pattern for the cutting zone
    const hatchPattern = defs.append('pattern')
        .attr('id', 'diagonalHatch')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 8)
        .attr('height', 8)
        .attr('patternTransform', 'rotate(45)')

    hatchPattern.append('path')
        .attr('d', 'M0,0 L0,8')
        .attr('stroke', 'gray')
        .attr('stroke-width', 1)


    // Draw a line from the center outwards at a variable angle with the vertical axis (rake angle)
    const rakeDeg = -20 // Change this value for different angles
    const reliefDeg = 5 // Relief angle in degrees
    const lineLength = 200
    const arcRadius = 160
    const betaRadius = 140
    const labelOffset = 20

    const rakeRad = (rakeDeg * Math.PI) / 180
    const reliefRad = (reliefDeg * Math.PI) / 180

    const x1 = containerWidth / 2
    const y1 = 150
    
    // Rake angle line
    const x2 = x1 + lineLength * Math.sin(rakeRad)
    const y2 = y1 - lineLength * Math.cos(rakeRad)

    svg.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', 'blue')
        .attr('stroke-width', 2)
    
    // Relief angle line (measured from horizontal)
    const x3 = x1 + lineLength * Math.cos(reliefRad)
    const y3 = y1 - lineLength * Math.sin(reliefRad)

    svg.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x3)
        .attr('y2', y3)
        .attr('stroke', 'red')
        .attr('stroke-width', 2)

    // Add reference lines for angle measurement
    // Vertical reference line for rake angle
    svg.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x1)
        .attr('y2', y1 - lineLength)
        .attr('stroke', 'gray')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,5')

    // Horizontal reference line for relief angle
    svg.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x1 + lineLength)
        .attr('y2', y1)
        .attr('stroke', 'gray')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,5')

    // Add arcs to indicate angles
    
    // Filled pie section between rake and relief lines (cutting zone)
    const pieArc = d3.arc()
        .innerRadius(0)
        .outerRadius(lineLength)
        .startAngle(rakeRad) // Start from rake line
        .endAngle(Math.PI/2 - reliefRad) // End at relief line

    svg.append('path')
        .attr('d', pieArc)
        .attr('transform', `translate(${x1}, ${y1})`)
        .attr('fill', 'url(#diagonalHatch)')
        .attr('opacity', 0.7)
    
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
        .attr('stroke', 'blue')
        .attr('stroke-width', 2)

    // Add arrows to the ends of the rake arc
    // Arrow at the start of the rake arc (vertical reference)
    const startArrowX = x1 + arcRadius * Math.cos(-Math.PI/2+rakeRad)
    const startArrowY = y1 + arcRadius * Math.sin(-Math.PI/2+rakeRad)
    
    svg.append('polygon')
        .attr('points', `${startArrowX-3},${startArrowY-5} ${startArrowX+3},${startArrowY-5} ${startArrowX},${startArrowY+2}`)
        .attr('fill', 'blue')
        .attr('transform', `rotate(${rakeRad * 180 / Math.PI - 90}, ${startArrowX}, ${startArrowY})`)

    // Arrow at the end of the rake arc
    const endArrowX = x1 + arcRadius * Math.cos(-Math.PI/2)
    const endArrowY = y1 + arcRadius * Math.sin(-Math.PI/2)
    
    svg.append('polygon')
        .attr('points', `${endArrowX-3},${endArrowY-5} ${endArrowX+3},${endArrowY-5} ${endArrowX},${endArrowY+2}`)
        .attr('fill', 'blue')
        .attr('transform', `rotate(${90}, ${endArrowX}, ${endArrowY})`)

    

    // Relief angle arc (from horizontal reference to relief line)
    // Relief line goes upward from horizontal, so angle should be negative
    const reliefArc = d3.arc()
        .innerRadius(arcRadius)
        .outerRadius(arcRadius)
        .startAngle(Math.PI/2) // Start from horizontal (rightward)
        .endAngle(Math.PI/2-reliefRad) // End at relief angle (counter-clockwise from horizontal, upward)

    svg.append('path')
        .attr('d', reliefArc)
        .attr('transform', `translate(${x1}, ${y1})`)
        .attr('fill', 'none')
        .attr('stroke', 'red')
        .attr('stroke-width', 2)

    // Beta angle arc (between rake and relief lines)
    const betaArc = d3.arc()
        .innerRadius(betaRadius)
        .outerRadius(betaRadius)
        .startAngle(rakeRad) // Start from relief line
        .endAngle(Math.PI/2-reliefRad) // End at rake line

    svg.append('path')
        .attr('d', betaArc)
        .attr('transform', `translate(${x1}, ${y1})`)
        .attr('fill', 'none')
        .attr('stroke', 'green')
        .attr('stroke-width', 2)

    // Add angle labels
    // Rake angle label (α)
    const rakeLabel_x = x1 + (arcRadius + labelOffset) * Math.sin(rakeRad / 2)
    const rakeLabel_y = y1 - (arcRadius + labelOffset) * Math.cos(rakeRad / 2)
    
    svg.append('text')
        .attr('x', rakeLabel_x)
        .attr('y', rakeLabel_y)
        .attr('text-anchor', 'middle')
        .attr('fill', 'blue')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .text('α')

    // Relief angle label (δ)
    const reliefLabel_x = x1 + (arcRadius + labelOffset) * Math.cos(reliefRad / 2)
    const reliefLabel_y = y1 - (arcRadius + labelOffset) * Math.sin(reliefRad / 2)
    
    svg.append('text')
        .attr('x', reliefLabel_x)
        .attr('y', reliefLabel_y)
        .attr('text-anchor', 'middle')
        .attr('fill', 'red')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .text('γ')

    // Beta angle label (β) - between rake and relief lines
    const betaAngle = (Math.PI/2 - rakeRad + reliefRad) / 2 // Middle angle between the two lines
    const betaLabel_x = x1 + (betaRadius + labelOffset) * Math.cos(betaAngle)
    const betaLabel_y = y1 - (betaRadius + labelOffset) * Math.sin(betaAngle)
    
    svg.append('text')
        .attr('x', betaLabel_x)
        .attr('y', betaLabel_y)
        .attr('text-anchor', 'middle')
        .attr('fill', 'green')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .text('β')

})
</script>

<style scoped>
.canvas-container {
    width: 100%;
}
</style>
```