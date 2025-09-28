<script setup>
import * as Plot from "@observablehq/plot";
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from "vue";
import penguins from "./penguins.json";

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const props = defineProps({
  options: {
    type: Object,
    default: () => ({
      marks: [
        Plot.dot(penguins, {x: 'culmen_length_mm', y: 'culmen_depth_mm'}),
      ],
    }),
    validator: (value) => {
      return value && typeof value === 'object' && Array.isArray(value.marks);
    }
  },
  debounceMs: {
    type: Number,
    default: 150,
    validator: (value) => value >= 0
  }
});

const plotContainer = ref(null);
const isLoading = ref(false);
const error = ref(null);

// Configuration for responsive plot
const createPlotOptions = (containerWidth, userOptions) => ({
  ...userOptions,
  width: containerWidth,
  style: {
    background: "transparent",
    ...userOptions.style
  }
});

const renderPlot = async () => {
  await nextTick();
  
  if (!plotContainer.value) return;
  
  try {
    isLoading.value = true;
    error.value = null;
    
    // Get the container width
    const containerWidth = plotContainer.value.clientWidth;
    
    // Skip rendering if container has no width
    if (containerWidth === 0) return;
    
    // Clear any existing plot
    plotContainer.value.innerHTML = '';
    
    // Create plot options with full width
    const plotOptions = createPlotOptions(containerWidth, props.options);
    
    // Create and append the new plot
    const plot = Plot.plot(plotOptions);
    plotContainer.value.append(plot);
  } catch (err) {
    error.value = err.message;
    console.error('Error rendering plot:', err);
  } finally {
    isLoading.value = false;
  }
};

// Use ResizeObserver for more accurate container resizing
let resizeObserver = null;
const debouncedRenderPlot = debounce(renderPlot, props.debounceMs);

onMounted(() => {
  renderPlot();
  
  // Set up ResizeObserver to watch container size changes
  if (plotContainer.value && window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      debouncedRenderPlot();
    });
    resizeObserver.observe(plotContainer.value);
  } else {
    // Fallback to window resize for older browsers
    window.addEventListener('resize', debouncedRenderPlot);
  }
});

watch(() => props.options, renderPlot, { deep: true });

// Cleanup
onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  } else {
    window.removeEventListener('resize', debouncedRenderPlot);
  }
});
</script>

<template>
  <div ref="plotContainer" class="plot-container">
    <div v-if="isLoading" class="loading">Loading chart...</div>
    <div v-if="error" class="error">Error: {{ error }}</div>
  </div>
</template>

<style scoped>
.plot-container {
  width: 100%;
  position: relative;
}

.plot-container :deep(svg) {
  width: 100%;
  height: auto;
  display: block;
}

.loading, .error {
  padding: 1rem;
  text-align: center;
  border-radius: 4px;
}

.loading {
  background-color: #f0f9ff;
  color: #0369a1;
}

.error {
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}
</style>

