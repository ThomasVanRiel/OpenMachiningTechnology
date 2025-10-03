# InteractiveContent.vue - Generic Interactive Component

## Overview

The `InteractiveContent.vue` component is a flexible, reusable Vue component that provides a standardized way to create interactive interfaces with various input controls (sliders, number inputs, selects, checkboxes) and pass their values to child components.

## Features

- **Multiple Input Types**: Supports sliders, number inputs, select dropdowns, and checkboxes
- **Flexible Layout**: Configurable control positioning (top, bottom, left, right)
- **Grid Layout**: Customizable number of columns for control layout
- **Debounced Updates**: Configurable debouncing to prevent excessive updates
- **Slot-based Content**: Uses Vue slots to render child components with reactive values
- **Type Safety**: Full TypeScript-compatible prop validation
- **Responsive Design**: Mobile-friendly responsive layout

## Props

### Input Configuration
- `inputs` (Array): Array of input configuration objects
- `initialValues` (Object): Initial values for inputs
- `debounceMs` (Number): Debounce delay in milliseconds (default: 100)

### Layout Configuration
- `showControls` (Boolean): Whether to show controls section (default: true)
- `controlsTitle` (String): Optional title for controls section
- `controlsPosition` (String): Position of controls ('top', 'bottom', 'left', 'right')
- `controlsColumns` (Number): Number of columns in controls grid (default: 1)

## Input Configuration Schema

Each input in the `inputs` array should have the following structure:

```javascript
{
  name: string,              // Unique identifier for the input
  type: 'slider' | 'number' | 'select' | 'checkbox',
  label?: string,            // Display label (defaults to name)
  min?: number,              // Minimum value (for slider/number)
  max?: number,              // Maximum value (for slider/number)
  step?: number,             // Step size (for slider/number)
  defaultValue?: any,        // Default value
  unit?: string,             // Unit suffix (e.g., '°', 'mm')
  displayPrecision?: number, // Decimal places for display
  description?: string,      // Help text
  options?: Array,           // Options for select input
  // CSS class overrides
  containerClass?: string,
  labelClass?: string,
  sliderClass?: string,
  inputClass?: string,
  selectClass?: string,
  checkboxClass?: string,
  valueClass?: string
}
```

## Events

- `@update:values`: Emitted when any input value changes, provides complete values object
- `@input-change`: Emitted for individual input changes, provides `{ name, value, values }`

## Usage Examples

### Single File Component with Interactive Controls

The recommended approach is to create a single component that incorporates both the `InteractiveContent` wrapper and the visualization logic:

```vue
<template>
  <InteractiveContent
    :inputs="inputConfigs"
    :initial-values="initialValues"
    :controls-columns="2"
    controls-title="Configuration"
    @update:values="onValuesUpdate"
  >
    <template #default="{ values }">
      <!-- Your visualization content here -->
      <div class="visualization-container">
        <div ref="canvas" class="canvas"></div>
      </div>
    </template>
  </InteractiveContent>
</template>

<script setup>
import { ref } from 'vue'
import InteractiveContent from './InteractiveContent.vue'

const inputConfigs = ref([
  {
    name: 'angle',
    type: 'slider',
    label: 'Rotation Angle',
    min: 0,
    max: 360,
    step: 1,
    unit: '°',
    displayPrecision: 0
  },
  {
    name: 'speed',
    type: 'slider',
    label: 'Speed',
    min: 0,
    max: 200,
    step: 5,
    unit: ' RPM'
  }
])

const initialValues = ref({ angle: 45, speed: 100 })
const currentValues = ref({ angle: 45, speed: 100 })

const onValuesUpdate = (values) => {
  currentValues.value = values
  // Trigger visualization update here
  updateVisualization()
}

// Your visualization logic here
const updateVisualization = () => {
  // Use currentValues.value to update your visualization
}
</script>
```

### Mixed Input Types Example

```vue
<template>
  <InteractiveContent
    :inputs="inputConfigs"
    :controls-columns="2"
    controls-title="Configuration"
    @update:values="onValuesUpdate"
  >
    <template #default="{ values }">
      <!-- Inline visualization using current values -->
      <div class="my-visualization">
        <p>Temperature: {{ currentValues.temperature }}°C</p>
        <p>Material: {{ currentValues.material }}</p>
        <p>Grid: {{ currentValues.showGrid ? 'On' : 'Off' }}</p>
      </div>
    </template>
  </InteractiveContent>
</template>

<script setup>
import { ref } from 'vue'
import InteractiveContent from './InteractiveContent.vue'

const inputConfigs = ref([
  {
    name: 'temperature',
    type: 'number',
    label: 'Temperature',
    min: 0,
    max: 1000,
    step: 10,
    unit: '°C'
  },
  {
    name: 'material',
    type: 'select',
    label: 'Material',
    options: [
      { value: 'steel', label: 'Steel' },
      { value: 'aluminum', label: 'Aluminum' },
      { value: 'titanium', label: 'Titanium' }
    ]
  },
  {
    name: 'showGrid',
    type: 'checkbox',
    label: 'Show Grid'
  }
])

const initialValues = ref({
  temperature: 20,
  material: 'steel',
  showGrid: false
})

const currentValues = ref({
  temperature: 20,
  material: 'steel',
  showGrid: false
})

const onValuesUpdate = (values) => {
  currentValues.value = values
}
</script>
```

## Refactoring Existing Components

To refactor an existing component to work with `InteractiveContent`, consolidate everything into a single file:

### Before (Original Component)
```vue
<template>
  <div>
    <div class="controls">
      <input v-model="angle" type="range" min="0" max="360" />
    </div>
    <div class="visualization">
      <!-- SVG content -->
    </div>
  </div>
</template>

<script setup>
const angle = ref(45)
watch(angle, updateVisualization)
</script>
```

### After (Single Consolidated Component)
```vue
<template>
  <InteractiveContent
    :inputs="inputConfigs"
    :initial-values="initialValues"
    @update:values="onValuesUpdate"
  >
    <template #default="{ values }">
      <div class="visualization">
        <!-- SVG content using currentValues -->
      </div>
    </template>
  </InteractiveContent>
</template>

<script setup>
import { ref } from 'vue'
import InteractiveContent from './InteractiveContent.vue'

const inputConfigs = ref([
  {
    name: 'angle',
    type: 'slider',
    label: 'Angle',
    min: 0,
    max: 360,
    step: 1,
    unit: '°'
  }
])

const initialValues = ref({ angle: 45 })
const currentValues = ref({ angle: 45 })

const onValuesUpdate = (values) => {
  currentValues.value = values
  updateVisualization()
}

const updateVisualization = () => {
  // Use currentValues.value.angle for visualization
}
</script>
```

## File Structure

With this approach, you only need **two files per interactive component**:

1. `InteractiveContent.vue` - The shared generic component (one instance for the entire project)
2. `YourComponentInteractive.vue` - Your specific component combining controls and visualization

For example:
- `InteractiveContent.vue` (shared)
- `CuttingAnglesInteractive.vue`
- `PlotFigureInteractive.vue`
- `MachiningWindowInteractive.vue`

## Advanced Features

### Custom Styling
Override default styles using CSS class props:

```javascript
{
  name: 'custom',
  type: 'slider',
  sliderClass: 'my-custom-slider',
  labelClass: 'my-custom-label'
}
```

### Programmatic Updates
Access component methods via template ref:

```vue
<template>
  <InteractiveContent ref="interactive" :inputs="inputs">
    <!-- content -->
  </InteractiveContent>
  <button @click="resetValues">Reset</button>
</template>

<script setup>
const interactive = ref(null)

const resetValues = () => {
  interactive.value.resetValues()
}
</script>
```

## Benefits

1. **Consistency**: Standardized appearance and behavior across components
2. **Reusability**: One component handles all interactive input scenarios
3. **Maintainability**: Centralized input logic reduces code duplication
4. **Flexibility**: Highly configurable without losing simplicity
5. **Separation of Concerns**: Clear separation between controls and visualization
6. **Accessibility**: Built-in proper labeling and keyboard navigation