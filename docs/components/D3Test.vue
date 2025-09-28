<template>
  <div ref="container" class="chart-container">
    <svg ref="svg"></svg>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, nextTick } from 'vue'
import * as d3 from 'd3'

const props = defineProps({
  data: {
    type: Array,
    default: [10, 15, 20, 25, 30, 35, 40]
  },
  height: {
    type: Number,
    default: 200
  }
})

const svg = ref(null)
const container = ref(null)

const drawChart = async () => {
  await nextTick()
  
  if (!container.value) return
  
  const containerWidth = container.value.clientWidth
  const svgEl = d3.select(svg.value)
  svgEl.selectAll('*').remove() // Clear previous renders

  svgEl.attr('width', containerWidth).attr('height', props.height)

  const x = d3
    .scaleBand()
    .domain(props.data.map((d, i) => i))
    .range([0, containerWidth])
    .padding(0.1)

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(props.data)])
    .nice()
    .range([props.height, 0])

  svgEl
    .selectAll('rect')
    .data(props.data)
    .join('rect')
    .attr('x', (_, i) => x(i))
    .attr('y', d => y(d))
    .attr('width', x.bandwidth())
    .attr('height', d => props.height - y(d))
    .attr('fill', 'steelblue')
}

// Handle window resize
const handleResize = () => {
  drawChart()
}

onMounted(() => {
  drawChart()
  window.addEventListener('resize', handleResize)
})

watch(() => props.data, drawChart)

// Cleanup
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.chart-container {
  width: 100%;
}

svg {
  width: 100%;
  height: auto;
  display: block;
}
</style>
