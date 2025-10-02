<template>
    <div class="interactive-content-container">
        <!-- Controls Section -->
        <div v-if="showControls" class="controls-section" :class="controlsPosition">
            <div class="controls-header" v-if="controlsTitle">
                <h3>{{ controlsTitle }}</h3>
            </div>
            <div class="controls-grid" :style="{ gridTemplateColumns: gridCols }">
                <div 
                    v-for="input in inputs" 
                    :key="input.name"
                    class="input-group"
                    :class="input.containerClass"
                >
                    <!-- Slider Input -->
                    <div v-if="input.type === 'slider'" class="slider-group">
                        <label 
                            :for="`${input.name}-slider`"
                            class="input-label"
                            :class="input.labelClass"
                        >
                            {{ input.label || input.name }}: 
                            <span class="value-display" :class="input.valueClass">
                                {{ formatValue(values[input.name], input.displayPrecision) }}{{ input.unit || '' }}
                            </span>
                        </label>
                        <input 
                            :id="`${input.name}-slider`"
                            type="range" 
                            :value="values[input.name]" 
                            :min="input.min" 
                            :max="input.max" 
                            :step="input.step || 0.01"
                            class="slider"
                            :class="input.sliderClass"
                            @input="onInputChange(input.name, $event.target.value)"
                        />
                        <div v-if="input.description" class="input-description">
                            {{ input.description }}
                        </div>
                    </div>

                    <!-- Number Input -->
                    <div v-else-if="input.type === 'number'" class="number-group">
                        <label 
                            :for="`${input.name}-number`"
                            class="input-label"
                            :class="input.labelClass"
                        >
                            {{ input.label || input.name }}{{ input.unit ? ` (${input.unit})` : '' }}
                        </label>
                        <input 
                            :id="`${input.name}-number`"
                            type="number" 
                            :value="values[input.name]" 
                            :min="input.min" 
                            :max="input.max" 
                            :step="input.step || 0.01"
                            class="number-input"
                            :class="input.inputClass"
                            @input="onInputChange(input.name, $event.target.value)"
                        />
                        <div v-if="input.description" class="input-description">
                            {{ input.description }}
                        </div>
                    </div>

                    <!-- Select Input -->
                    <div v-else-if="input.type === 'select'" class="select-group">
                        <label 
                            :for="`${input.name}-select`"
                            class="input-label"
                            :class="input.labelClass"
                        >
                            {{ input.label || input.name }}
                        </label>
                        <select 
                            :id="`${input.name}-select`"
                            :value="values[input.name]" 
                            class="select-input"
                            :class="input.selectClass"
                            @change="onInputChange(input.name, $event.target.value)"
                        >
                            <option 
                                v-for="option in input.options" 
                                :key="option.value"
                                :value="option.value"
                            >
                                {{ option.label || option.value }}
                            </option>
                        </select>
                        <div v-if="input.description" class="input-description">
                            {{ input.description }}
                        </div>
                    </div>

                    <!-- Checkbox Input -->
                    <div v-else-if="input.type === 'checkbox'" class="checkbox-group">
                        <label 
                            :for="`${input.name}-checkbox`"
                            class="checkbox-label"
                            :class="input.labelClass"
                        >
                            <input 
                                :id="`${input.name}-checkbox`"
                                type="checkbox" 
                                :checked="values[input.name]" 
                                class="checkbox-input"
                                :class="input.checkboxClass"
                                @change="onInputChange(input.name, $event.target.checked)"
                            />
                            {{ input.label || input.name }}
                        </label>
                        <div v-if="input.description" class="input-description">
                            {{ input.description }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Content Section -->
        <div class="content-section" :class="{ 'with-controls': showControls }">
            <slot :values="values" :updateValue="updateValue"></slot>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'

// Input configuration interface
const props = defineProps({
    // Array of input configurations
    inputs: {
        type: Array,
        default: () => [],
        validator: (inputs) => {
            return inputs.every(input => 
                input.name && 
                input.type && 
                ['slider', 'number', 'select', 'checkbox'].includes(input.type)
            )
        }
    },
    
    // Initial values for inputs
    initialValues: {
        type: Object,
        default: () => ({})
    },
    
    // Controls layout and appearance
    showControls: {
        type: Boolean,
        default: true
    },
    
    controlsTitle: {
        type: String,
        default: ''
    },
    
    controlsPosition: {
        type: String,
        default: 'top', // 'top', 'bottom', 'left', 'right'
        validator: (value) => ['top', 'bottom', 'left', 'right'].includes(value)
    },
    
    // Grid layout for controls
    controlsColumns: {
        type: Number,
        default: 1
    },
    
    // Debounce input changes (milliseconds)
    debounceMs: {
        type: Number,
        default: 50
    }
})

// Emit events
const emit = defineEmits(['update:values', 'input-change'])

// Reactive state
const values = reactive({})

// Computed grid columns
const gridCols = computed(() => {
    if (props.controlsColumns === 1) return '1fr'
    return `repeat(${props.controlsColumns}, 1fr)`
})

// Initialize values
const initializeValues = () => {
    // Set default values from input configs
    props.inputs.forEach(input => {
        const initialValue = props.initialValues[input.name] ?? input.defaultValue ?? getDefaultValueForType(input)
        values[input.name] = initialValue
    })
}

// Get default value based on input type
const getDefaultValueForType = (input) => {
    switch (input.type) {
        case 'slider':
        case 'number':
            return input.min ?? 0
        case 'select':
            return input.options?.[0]?.value ?? ''
        case 'checkbox':
            return false
        default:
            return null
    }
}

// Format value for display
const formatValue = (value, precision = 2) => {
    if (typeof value !== 'number') return value
    return parseFloat(value).toFixed(precision)
}

// Debounce utility
let debounceTimeouts = {}
const debounce = (key, func, wait) => {
    clearTimeout(debounceTimeouts[key])
    debounceTimeouts[key] = setTimeout(func, wait)
}

// Handle input changes
const onInputChange = (name, value) => {
    const input = props.inputs.find(i => i.name === name)
    
    // Convert value to appropriate type
    let processedValue = value
    if (input?.type === 'slider' || input?.type === 'number') {
        processedValue = parseFloat(value)
    } else if (input?.type === 'checkbox') {
        processedValue = Boolean(value)
    }
    
    // Update reactive values immediately for UI responsiveness
    values[name] = processedValue
    
    // Debounced emission - only emit update:values for performance
    if (props.debounceMs > 0) {
        debounce('update-values', () => {
            emit('update:values', { ...values })
        }, props.debounceMs)
    } else {
        emit('update:values', { ...values })
    }
}

// Emit change events
const emitChange = (name, value) => {
    emit('update:values', { ...values })
}

// Method to programmatically update values
const updateValue = (name, value) => {
    if (values.hasOwnProperty(name)) {
        values[name] = value
        emitChange(name, value)
    }
}

// Expose methods for parent components
defineExpose({
    updateValue,
    getValues: () => ({ ...values }),
    resetValues: initializeValues
})

// Initialize on mount
onMounted(() => {
    initializeValues()
    
    // Initial emission
    emit('update:values', { ...values })
})

// Watch for changes in inputs prop to reinitialize
watch(() => props.inputs, () => {
    initializeValues()
}, { deep: true })
</script>

<style scoped>
.interactive-content-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.interactive-content-container.left,
.interactive-content-container.right {
    flex-direction: row;
}

.controls-section {
    flex-shrink: 0;
    /*
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 2px solid #e9ecef;
    */
}

.controls-section.left {
    order: 1;
    margin-right: 20px;
    min-width: 250px;
}

.controls-section.right {
    order: 2;
    margin-left: 20px;
    min-width: 250px;
}

.controls-section.bottom {
    order: 2;
}

.controls-header h3 {
    margin: 0 0 15px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #495057;
}

.controls-grid {
    display: grid;
    gap: 15px;
    align-items: start;
}

.input-group {
    display: flex;
    flex-direction: column;
}

.input-label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
    color: #495057;
    font-size: 0.9rem;
}

.value-display {
    font-weight: 500;
    color: #007bff;
    font-family: 'Courier New', monospace;
}

.slider {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #ddd;
    outline: none;
    opacity: 0.7;
    transition: opacity 0.2s;
    cursor: pointer;
}

.slider:hover {
    opacity: 1;
}

.slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #007bff;
    cursor: pointer;
    transition: background-color 0.2s;
}

.slider::-webkit-slider-thumb:hover {
    background: #0056b3;
}

.slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #007bff;
    cursor: pointer;
    border: none;
    transition: background-color 0.2s;
}

.slider::-moz-range-thumb:hover {
    background: #0056b3;
}

.number-input,
.select-input {
    padding: 8px 12px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.9rem;
    background: white;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.number-input:focus,
.select-input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    margin: 0;
}

.checkbox-input {
    margin-right: 8px;
    cursor: pointer;
}

.input-description {
    margin-top: 4px;
    font-size: 0.8rem;
    color: #6c757d;
    font-style: italic;
}

.content-section {
    flex: 1;
    min-height: 0; /* Important for flex children */
}

.content-section.with-controls {
    position: relative;
}

/* Responsive layout */
@media (max-width: 768px) {
    .interactive-content-container.left,
    .interactive-content-container.right {
        flex-direction: column;
    }
    
    .controls-section.left,
    .controls-section.right {
        order: 1;
        margin: 0 0 20px 0;
        min-width: unset;
    }
    
    .controls-grid {
        grid-template-columns: 1fr !important;
    }
}
</style>