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
        Plot.dot(penguins, {x: 'culmen_length_mm', y: 'culmen_depth_mm', tip:true}),
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
  },
  showYPower: {
    type: Boolean,
    default: true
  },
  initialYPower: {
    type: Number,
    default: 1,
    validator: (value) => value >= 0.1
  }
});

const plotContainer = ref(null);
const isLoading = ref(false);
const error = ref(null);
const yPower = ref(props.initialYPower);

// Transform the data using power instead of multiplication
const getTransformedData = (originalData, yPow, yField = 'culmen_depth_mm') => {
  if (yPow === 1) return originalData;
  
  return originalData.map(item => ({
    ...item,
    [yField]: Math.pow(item[yField], yPow)
  }));
};

// Create plot options with responsive width and transformed data
const createResponsivePlotOptions = (containerWidth, yPow) => {
  // Get transformed data
  const transformedData = getTransformedData(penguins, yPow);
  
  // Calculate the y-axis domain based on transformed data
  const yValues = transformedData.map(d => d.culmen_depth_mm).filter(v => !isNaN(v) && isFinite(v));
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  
  // Add padding based on the range
  const yRange = yMax - yMin;
  const padding = yRange * 0.05; // 5% padding
  
  // Ensure we don't go below 0 if all values are positive and close to 0
  const domainMin = yMin > 0 && (yMin - padding) < 0 ? 0 : yMin - padding;
  const domainMax = yMax + padding;
  
  console.log(`Power: ${yPow}, Y domain: [${domainMin.toFixed(2)}, ${domainMax.toFixed(2)}], Original range: [${Math.min(...penguins.map(d => d.culmen_depth_mm)).toFixed(2)}, ${Math.max(...penguins.map(d => d.culmen_depth_mm)).toFixed(2)}]`);
  
  return {
    width: containerWidth,
    style: {
      background: "transparent"
    },
    y: {
      domain: [domainMin, domainMax],
      label: `Culmen depth (mm)^${yPow.toFixed(2)}`
    },
    x: {
      label: "Culmen length (mm)"
    },
    marks: [
      Plot.dot(transformedData, {x: 'culmen_length_mm', y: 'culmen_depth_mm', tip: true}),
    ],
  };
};

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
    
    // Create plot options with responsive width and transformed data
    const plotOptions = createResponsivePlotOptions(containerWidth, yPower.value);
    
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
// Use immediate rendering for slider changes (no debouncing for direct user interaction)
watch(() => yPower.value, renderPlot, { immediate: false });

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
  <div class="plot-wrapper">
    <div v-if="showYPower" class="controls">
      <div class="slider-container">
        <label for="yPower">Y Power: {{ yPower.toFixed(2) }}</label>
        <input 
          id="yPower"
          v-model.number="yPower" 
          type="range" 
          min="0.1" 
          max="3" 
          step="0.1" 
          class="slider"
        />
        <div class="slider-labels">
          <span>0.1</span>
          <span>3.0</span>
        </div>
      </div>
    </div>
    <div ref="plotContainer" class="plot-container">
      <div v-if="isLoading" class="loading">Loading chart...</div>
      <div v-if="error" class="error">Error: {{ error }}</div>
    </div>
  </div>
</template>

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

