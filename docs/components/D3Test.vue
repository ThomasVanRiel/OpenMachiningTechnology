<template>
  <div class="plot-wrapper">
    <div class="controls">
      <div class="slider-container">
        <label for="barCount">Number of bars: {{ barCount }}</label>
        <input 
          id="barCount"
          v-model.number="barCount" 
          type="range" 
          min="3" 
          max="20" 
          step="1" 
          class="slider"
        />
        <div class="slider-labels">
          <span>3</span>
          <span>20</span>
        </div>
      </div>
    </div>
    <div ref="container" class="chart-container">
      <svg ref="svg"></svg>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, nextTick, computed } from 'vue'
import * as d3 from 'd3'

const props = defineProps({
  data: {
    type: Array,
    default: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]
  },
  height: {
    type: Number,
    default: 200
  }
})

const svg = ref(null)
const container = ref(null)
const barCount = ref(7) // Default number of bars to show

// Computed property to get the subset of data based on barCount
const displayData = computed(() => {
  return props.data.slice(0, barCount.value)
})

const drawChart = async () => {
  await nextTick()
  
  if (!container.value) return
  
  const containerWidth = container.value.clientWidth
  const svgEl = d3.select(svg.value)
  svgEl.selectAll('*').remove() // Clear previous renders

  svgEl.attr('width', containerWidth).attr('height', props.height)

  const x = d3
    .scaleBand()
    .domain(displayData.value.map((d, i) => i))
    .range([0, containerWidth])
    .padding(0.1)

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(displayData.value)])
    .nice()
    .range([props.height, 0])

  svgEl
    .selectAll('rect')
    .data(displayData.value)
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
watch(() => barCount.value, drawChart)

// Cleanup
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.plot-wrapper {
  width: 100%;
}

.controls {
  margin-bottom: 1rem;
  padding: 1rem;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.slider-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.slider-container label {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #d1d5db;
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  transition: background 0.2s;
}

.slider::-webkit-slider-thumb:hover {
  background: #2563eb;
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
  transition: background 0.2s;
}

.slider::-moz-range-thumb:hover {
  background: #2563eb;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: -0.25rem;
}

.chart-container {
  width: 100%;
}

svg {
  width: 100%;
  height: auto;
  display: block;
}
</style>
