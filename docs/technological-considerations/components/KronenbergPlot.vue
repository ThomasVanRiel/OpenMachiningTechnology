<template>
    <InteractiveContent
        :inputs="inputConfigs"
        :initial-values="initialValues"
        :controls-columns="3"
        controls-position="top"
        :debounce-ms="10"
        @update:values="onValuesUpdate"
        expandable
        expanded-width="70vw"
        expanded-height="80vh"
    >
        <template #default="{ expanded }">
            <div class="kronenberg-wrapper" :class="{ 'kronenberg-expanded': expanded }">
                <div ref="containerRef" class="kronenberg-container">
                    <canvas ref="canvasRef"></canvas>
                </div>

                <details class="mt-4">
                    <summary class="cursor-pointer font-medium text-gray-700 dark:text-gray-300">Axis Scales</summary>
                    <div class="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="flex flex-col">
                            <label class="inline-block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Q scale: <span class="font-mono">{{ scales.Q.toFixed(0) }}</span>
                            </label>
                            <input type="range" v-model.number="scales.Q" min="1" max="100" step="1" class="slider" @input="redraw" />
                        </div>
                        <div class="flex flex-col">
                            <label class="inline-block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                P scale: <span class="font-mono">{{ scales.P.toFixed(2) }}</span>
                            </label>
                            <input type="range" v-model.number="scales.P" min="0.1" max="2" step="0.05" class="slider" @input="redraw" />
                        </div>
                        <div class="flex flex-col">
                            <label class="inline-block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                v scale: <span class="font-mono">{{ scales.v.toFixed(3) }}</span>
                            </label>
                            <input type="range" v-model.number="scales.v" min="0.01" max="0.2" step="0.005" class="slider" @input="redraw" />
                        </div>
                        <div class="flex flex-col">
                            <label class="inline-block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Fc scale: <span class="font-mono">{{ scales.Fc.toFixed(3) }}</span>
                            </label>
                            <input type="range" v-model.number="scales.Fc" min="0.005" max="0.1" step="0.001" class="slider" @input="redraw" />
                        </div>
                    </div>
                </details>
            </div>
        </template>
    </InteractiveContent>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import InteractiveContent from '/components/InteractiveContent.vue';

// Configuration for the interactive inputs
const inputConfigs = ref([
    {
        name: 'Kc11',
        type: 'slider',
        label: 'Kc1.1 (N/mm²)',
        min: 500,
        max: 3000,
        step: 10,
        defaultValue: 1680,
        displayPrecision: 0,
        description: 'Specific cutting force'
    },
    {
        name: 'b',
        type: 'slider',
        label: 'b - Cut width (mm)',
        min: 0.5,
        max: 10,
        step: 0.1,
        defaultValue: 2,
        displayPrecision: 1,
        description: 'Cutting width'
    },
    {
        name: 'e',
        type: 'slider',
        label: 'e - Exponent',
        min: 0.1,
        max: 0.5,
        step: 0.01,
        defaultValue: 0.26,
        displayPrecision: 2,
        description: 'Material exponent'
    },
    {
        name: 'Pm',
        type: 'slider',
        label: 'Pm - Power (kW)',
        min: 1,
        max: 20,
        step: 0.1,
        defaultValue: 5.6,
        displayPrecision: 1,
        description: 'Machine power'
    },
    {
        name: 'vopt_coeff',
        type: 'slider',
        label: 'v_opt coeff',
        min: 0.5,
        max: 5,
        step: 0.1,
        defaultValue: 2.2,
        displayPrecision: 1,
        description: 'Optimal velocity coefficient'
    },
    {
        name: 'vopt_exp',
        type: 'slider',
        label: 'v_opt exp',
        min: 0.1,
        max: 0.8,
        step: 0.01,
        defaultValue: 0.42,
        displayPrecision: 2,
        description: 'Optimal velocity exponent'
    }
]);

// Initial values
const initialValues = ref({
    Kc11: 1680,
    b: 2,
    e: 0.26,
    Pm: 5.6,
    vopt_coeff: 2.2,
    vopt_exp: 0.42
});

// Current parameter values
let currentValues = {
    Kc11: 1680,
    b: 2,
    e: 0.26,
    Pm: 5.6,
    vopt_coeff: 2.2,
    vopt_exp: 0.42,
    A_min: 0.1,
    A_max: 10,
    band_low: 0.8,
    band_high: 1.0
};

// Scale factors for different axes
const scales = reactive({
    Q: 20,
    P: 0.5,
    v: 0.05,
    Fc: 1/60
});

// Refs
const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Canvas context
let ctx: CanvasRenderingContext2D | null = null;

// Mouse state
let mouseX: number | null = null;
let mouseY: number | null = null;

// Theme detection
const isDarkTheme = () => document.documentElement.classList.contains('dark');
const getThemeColors = () => {
    const dark = isDarkTheme();
    return {
        background: dark ? '#1f2937' : '#ffffff',
        grid: dark ? '#374151' : '#e5e7eb',
        gridMajor: dark ? '#4b5563' : '#d1d5db',
        text: dark ? '#f3f4f6' : '#1f2937',
        Q: '#3b82f6',
        P: '#f97316',
        v: '#22c55e',
        Fc: '#ef4444',
        hatch: dark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)'
    };
};

let colors = getThemeColors();

// Plot dimensions
function getPlotDimensions() {
    const container = containerRef.value;
    if (!container) return { width: 800, height: 600, margin: { top: 20, right: 40, bottom: 60, left: 240 }, plotWidth: 520, plotHeight: 480 };
    const rect = container.getBoundingClientRect();
    return {
        width: rect.width,
        height: rect.height,
        margin: { top: 20, right: 40, bottom: 60, left: 240 },
        get plotWidth() { return this.width - this.margin.left - this.margin.right; },
        get plotHeight() { return this.height - this.margin.top - this.margin.bottom; }
    };
}

// Log scale helpers
function logScale(value: number, min: number, max: number, pixelRange: number): number {
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const logVal = Math.log10(value);
    return ((logVal - logMin) / (logMax - logMin)) * pixelRange;
}

// Calculate values at a given A
function getValuesAtA(A: number) {
    const { Kc11, b, e, Pm, vopt_coeff, vopt_exp } = currentValues;
    const K = Kc11 * b;
    const B = 1 - e;

    const Fc = K * Math.pow(A / b, B);
    const Vm = (Pm * 1000 / Fc) * 60;
    const vopt = vopt_coeff * Math.pow(A, -vopt_exp) * 60;
    const v_eff = Math.min(Vm, vopt);
    const Popt = (vopt / 60 * Fc) / 1000;
    const P_eff = Math.min(Pm, Popt);
    const Q_eff = (v_eff * Fc) * (A / b / 1000 / 1000);

    return { A, Fc, Vm, vopt, v_eff, Pm, Popt, P_eff, Q_eff };
}

// Draw function
function draw() {
    if (!ctx || !canvasRef.value) return;

    colors = getThemeColors();
    const dim = getPlotDimensions();
    const { Kc11, b, e, Pm, vopt_coeff, vopt_exp, A_min, A_max, band_low, band_high } = currentValues;

    // Clear canvas
    ctx.clearRect(0, 0, dim.width, dim.height);

    const xToPixel = (A: number) => dim.margin.left + logScale(A, A_min, A_max, dim.plotWidth);
    const yToPixel = (y: number) => dim.margin.top + dim.plotHeight - logScale(y, 1, 100, dim.plotHeight);

    // Draw grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 0.5;

    // X grid
    const xTicks = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    xTicks.forEach(tick => {
        if (tick >= A_min && tick <= A_max) {
            const x = xToPixel(tick);
            ctx!.beginPath();
            ctx!.moveTo(x, dim.margin.top);
            ctx!.lineTo(x, dim.margin.top + dim.plotHeight);
            ctx!.strokeStyle = [0.1, 1, 10].includes(tick) ? colors.gridMajor : colors.grid;
            ctx!.lineWidth = [0.1, 1, 10].includes(tick) ? 1.5 : 0.5;
            ctx!.stroke();
        }
    });

    // Y grid
    const yTicks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    yTicks.forEach(tick => {
        const y = yToPixel(tick);
        ctx!.beginPath();
        ctx!.moveTo(dim.margin.left, y);
        ctx!.lineTo(dim.margin.left + dim.plotWidth, y);
        ctx!.strokeStyle = [1, 10, 100].includes(tick) ? colors.gridMajor : colors.grid;
        ctx!.lineWidth = [1, 10, 100].includes(tick) ? 1.5 : 0.5;
        ctx!.stroke();
    });

    // Generate data points
    const numPoints = 200;
    const xs: number[] = [];
    for (let i = 0; i < numPoints; i++) {
        xs.push(Math.pow(10, Math.log10(A_min) + i * (Math.log10(A_max) - Math.log10(A_min)) / (numPoints - 1)));
    }

    // Calculate curves
    const K = Kc11 * b;
    const B = 1 - e;
    const Fc_values = xs.map(A => K * Math.pow(A / b, B));
    const Pm_values = xs.map(() => Pm);
    const Vm_values = Fc_values.map((Fc, i) => (Pm_values[i] * 1000 / Fc) * 60);
    const vopts = xs.map(A => vopt_coeff * Math.pow(A, -vopt_exp) * 60);
    const vmin = Vm_values.map((vm, i) => Math.min(vm, vopts[i]));
    const Popts = vopts.map((v, i) => (v / 60 * Fc_values[i]) / 1000);
    const Pmins = Pm_values.map((pm, i) => Math.min(pm, Popts[i]));
    const Qm_values = Vm_values.map((vm, i) => (vm * Fc_values[i]) * (xs[i] / b / 1000 / 1000));
    const Qopt = vopts.map((v, i) => (v * Fc_values[i]) * (xs[i] / b / 1000 / 1000));
    const Qs = Qm_values.map((qm, i) => Math.min(qm, Qopt[i]));

    // Critical point
    let xcrit: number | null = null;
    let idxcrit: number | null = null;
    if (B !== vopt_exp) {
        xcrit = Math.pow((Pm * 1000 * Math.pow(b, B)) / (vopt_coeff * K), 1 / (B - vopt_exp));
        let minDiff = Infinity;
        xs.forEach((x, i) => {
            const diff = Math.abs(x - xcrit!);
            if (diff < minDiff) {
                minDiff = diff;
                idxcrit = i;
            }
        });
    }

    // Helper to draw a line
    function drawLine(data: number[], scale: number, color: string, dashed = false, lineWidth = 2) {
        ctx!.strokeStyle = color;
        ctx!.lineWidth = lineWidth;
        if (dashed) ctx!.setLineDash([8, 4]);
        else ctx!.setLineDash([]);

        ctx!.beginPath();
        let started = false;
        for (let i = 0; i < xs.length; i++) {
            const x = xToPixel(xs[i]);
            const y = yToPixel(data[i] * scale);
            if (y >= dim.margin.top && y <= dim.margin.top + dim.plotHeight) {
                if (!started) {
                    ctx!.moveTo(x, y);
                    started = true;
                } else {
                    ctx!.lineTo(x, y);
                }
            }
        }
        ctx!.stroke();
        ctx!.setLineDash([]);
    }

    // Draw hatched band
    ctx.fillStyle = colors.hatch;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < xs.length; i++) {
        const x = xToPixel(xs[i]);
        const y = yToPixel(vmin[i] * band_high * scales.v);
        if (!started) {
            ctx.moveTo(x, y);
            started = true;
        } else {
            ctx.lineTo(x, y);
        }
    }
    for (let i = xs.length - 1; i >= 0; i--) {
        const x = xToPixel(xs[i]);
        const y = yToPixel(vmin[i] * band_low * scales.v);
        ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Draw lines
    drawLine(Fc_values, scales.Fc, colors.Fc, false);
    drawLine(Pm_values, scales.P, colors.P, true);
    drawLine(Vm_values, scales.v, colors.v, true);
    drawLine(vopts, scales.v, colors.v, true);
    drawLine(vmin, scales.v, colors.v, false);
    drawLine(Popts, scales.P, colors.P, true);
    drawLine(Pmins, scales.P, colors.P, false);
    drawLine(Qs, scales.Q, colors.Q, false);

    // Draw critical point
    if (xcrit !== null && idxcrit !== null) {
        const cx = xToPixel(xcrit);

        ctx.strokeStyle = colors.text;
        ctx.setLineDash([6, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, dim.margin.top);
        ctx.lineTo(cx, dim.margin.top + dim.plotHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        const points = [
            { y: Qs[idxcrit] * scales.Q, color: colors.Q },
            { y: Pmins[idxcrit] * scales.P, color: colors.P },
            { y: vmin[idxcrit] * scales.v, color: colors.v }
        ];
        points.forEach(pt => {
            ctx!.fillStyle = colors.text;
            ctx!.beginPath();
            ctx!.arc(cx, yToPixel(pt.y), 5, 0, Math.PI * 2);
            ctx!.fill();
        });

        ctx.fillStyle = colors.text;
        ctx.font = "bold 12px 'Source Sans 3'";
        ctx.textAlign = 'center';
        ctx.fillText(`A_crit = ${xcrit.toFixed(2)} mm²`, cx, dim.margin.top + dim.plotHeight + 35);
    }

    // X-axis ticks
    ctx.strokeStyle = colors.text;
    const xMinorTicks = [0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9, 2, 3, 4, 6, 7, 8, 9];
    ctx.lineWidth = 1;
    xMinorTicks.forEach(tick => {
        if (tick >= A_min && tick <= A_max) {
            const x = xToPixel(tick);
            ctx!.beginPath();
            ctx!.moveTo(x, dim.margin.top + dim.plotHeight);
            ctx!.lineTo(x, dim.margin.top + dim.plotHeight + 4);
            ctx!.stroke();
        }
    });

    ctx.fillStyle = colors.text;
    ctx.font = "12px 'Source Sans 3'";
    ctx.textAlign = 'center';
    ctx.lineWidth = 2;
    [0.1, 0.5, 1, 5, 10].forEach(tick => {
        if (tick >= A_min && tick <= A_max) {
            const x = xToPixel(tick);
            ctx!.beginPath();
            ctx!.moveTo(x, dim.margin.top + dim.plotHeight);
            ctx!.lineTo(x, dim.margin.top + dim.plotHeight + 8);
            ctx!.stroke();
            ctx!.fillText(tick.toString(), x, dim.margin.top + dim.plotHeight + 20);
        }
    });
    ctx.font = "bold 14px 'Source Sans 3'";
    ctx.fillText('A (mm²)', dim.margin.left + dim.plotWidth / 2, dim.margin.top + dim.plotHeight + 50);

    // Y-axis scales
    const axisConfigs = [
        { name: 'Q', unit: 'mm³/min', scale: scales.Q, color: colors.Q, offset: 0 },
        { name: 'P', unit: 'kW', scale: scales.P, color: colors.P, offset: 55 },
        { name: 'v', unit: 'm/min', scale: scales.v, color: colors.v, offset: 110 },
        { name: 'F', unit: 'N', scale: scales.Fc, color: colors.Fc, offset: 165 }
    ];

    axisConfigs.forEach(axis => {
        const axisX = dim.margin.left - axis.offset - 10;

        ctx!.strokeStyle = axis.color;
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.moveTo(axisX, dim.margin.top);
        ctx!.lineTo(axisX, dim.margin.top + dim.plotHeight);
        ctx!.stroke();

        ctx!.fillStyle = axis.color;
        ctx!.strokeStyle = axis.color;
        ctx!.lineWidth = 1;
        ctx!.font = "8px 'Source Sans 3'";
        ctx!.textAlign = 'right';
        const minorTicks = [2, 3, 4, 5, 6, 7, 8, 9, 20, 30, 40, 50, 60, 70, 80, 90];
        minorTicks.forEach(internalVal => {
            const y = yToPixel(internalVal);
            ctx!.beginPath();
            ctx!.moveTo(axisX - 3, y);
            ctx!.lineTo(axisX, y);
            ctx!.stroke();

            const realVal = internalVal / axis.scale;
            let label: string;
            if (realVal >= 1000) label = (realVal / 1000).toFixed(0) + 'k';
            else if (realVal >= 100) label = realVal.toFixed(0);
            else if (realVal >= 10) label = realVal.toFixed(0);
            else if (realVal >= 1) label = realVal.toFixed(1);
            else label = realVal.toFixed(2);
            ctx!.fillText(label, axisX - 5, y + 3);
        });

        ctx!.fillStyle = axis.color;
        ctx!.font = "10px 'Source Sans 3'";
        ctx!.textAlign = 'right';
        ctx!.lineWidth = 2;

        [1, 10, 100].forEach(internalVal => {
            const realVal = internalVal / axis.scale;
            const y = yToPixel(internalVal);

            ctx!.beginPath();
            ctx!.moveTo(axisX - 6, y);
            ctx!.lineTo(axisX, y);
            ctx!.stroke();

            let label: string;
            if (realVal >= 1000) label = (realVal / 1000).toFixed(0) + 'k';
            else if (realVal >= 100) label = realVal.toFixed(0);
            else if (realVal >= 10) label = realVal.toFixed(1);
            else label = realVal.toFixed(2);
            ctx!.fillText(label, axisX - 8, y + 4);
        });

        ctx!.save();
        ctx!.translate(axisX - 30, dim.margin.top + dim.plotHeight / 2);
        ctx!.rotate(-Math.PI / 2);
        ctx!.font = "bold 12px 'Source Sans 3'";
        ctx!.textAlign = 'center';
        ctx!.fillText(`${axis.name} (${axis.unit})`, 0, 0);
        ctx!.restore();
    });

    // Legend
    const legendX = dim.margin.left +20;
    const legendY = dim.margin.top + 20;
    const legendItems = [
        { label: 'Fᴄ', color: colors.Fc },
        { label: 'Pₘ / Pₑ', color: colors.P },
        { label: 'vₘ / vₒₚₜ', color: colors.v },
        { label: 'Qₑ', color: colors.Q }
    ];

    ctx.font = "11px 'Source Sans 3'";
    legendItems.forEach((item, i) => {
        const y = legendY + i * 18;
        ctx!.strokeStyle = item.color;
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.moveTo(legendX, y);
        ctx!.lineTo(legendX + 20, y);
        ctx!.stroke();

        ctx!.fillStyle = item.color;
        ctx!.textAlign = 'left';
        ctx!.fillText(item.label, legendX + 25, y + 4);
    });
}

// Draw crosshair
function drawCrosshair() {
    if (!ctx || mouseX === null || mouseY === null) return;

    const mx = mouseX;
    const my = mouseY;
    const dim = getPlotDimensions();
    const { A_min, A_max } = currentValues;

    if (mx < dim.margin.left || mx > dim.margin.left + dim.plotWidth ||
        my < dim.margin.top || my > dim.margin.top + dim.plotHeight) {
        return;
    }

    const logMin = Math.log10(A_min);
    const logMax = Math.log10(A_max);
    const logA = logMin + ((mx - dim.margin.left) / dim.plotWidth) * (logMax - logMin);
    const A = Math.pow(10, logA);

    const values = getValuesAtA(A);

    ctx.strokeStyle = colors.text;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(mx, dim.margin.top);
    ctx.lineTo(mx, dim.margin.top + dim.plotHeight);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    const yToPixel = (y: number) => dim.margin.top + dim.plotHeight - logScale(y, 1, 100, dim.plotHeight);

    const points = [
        { value: values.Fc, scale: scales.Fc, color: colors.Fc },
        { value: values.P_eff, scale: scales.P, color: colors.P },
        { value: values.v_eff, scale: scales.v, color: colors.v },
        { value: values.Q_eff, scale: scales.Q, color: colors.Q },
    ];

    points.forEach(pt => {
        const y = yToPixel(pt.value * pt.scale);
        if (y >= dim.margin.top && y <= dim.margin.top + dim.plotHeight) {
            ctx!.fillStyle = pt.color;
            ctx!.beginPath();
            ctx!.arc(mx, y, 5, 0, Math.PI * 2);
            ctx!.fill();
            ctx!.strokeStyle = colors.text;
            ctx!.lineWidth = 1;
            ctx!.stroke();
        }
    });

    // Tooltip
    const tooltipW = 145;
    const tooltipH = 115;
    const tooltipX = Math.max(5, mx - tooltipW - 15);
    const tooltipY = Math.max(dim.margin.top + 10, Math.min(my - 60, dim.margin.top + dim.plotHeight - 130));

    ctx.fillStyle = colors.text === '#f3f4f6' ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(tooltipX, tooltipY, tooltipW, tooltipH);
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 1;
    ctx.strokeRect(tooltipX, tooltipY, tooltipW, tooltipH);

    ctx.fillStyle = colors.text;
    ctx.font = "bold 14px 'Source Sans 3'";
    ctx.textAlign = 'left';
    ctx.fillText(`A`, tooltipX + 8, tooltipY + 18);
    ctx.fillText(`${A.toFixed(3)} mm²`, tooltipX + 35, tooltipY + 18);

    ctx.font = "14px 'Source Sans 3'";
    const lines = [
        { label: 'Fᴄ', value: values.Fc.toFixed(0), unit: 'N', color: colors.Fc },
        { label: 'vₑ', value: values.v_eff.toFixed(1), unit: 'm/min', color: colors.v },
        { label: 'Pₑ', value: values.P_eff.toFixed(2), unit: 'kW', color: colors.P },
        { label: 'Qₑ', value: values.Q_eff.toFixed(2), unit: 'cm³/min', color: colors.Q },
    ];

    lines.forEach((line, i) => {
        ctx!.fillStyle = line.color;
        ctx!.fillText(`${line.label}`, tooltipX + 8, tooltipY + 36 + i * 18);
        ctx!.fillStyle = colors.text;
        ctx!.fillText(`${line.value} ${line.unit}`, tooltipX + 35, tooltipY + 36 + i * 18);
    });
}

// Full redraw
function redraw() {
    draw();
    drawCrosshair();
}

// Resize handler
function resize() {
    const container = containerRef.value;
    const canvas = canvasRef.value;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.scale(dpr, dpr);
    }
    redraw();
}

// Mouse handlers
function handleMouseMove(e: MouseEvent) {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    redraw();
}

function handleMouseLeave() {
    mouseX = null;
    mouseY = null;
    redraw();
}

// Values update handler
function onValuesUpdate(values: typeof currentValues) {
    currentValues = { ...currentValues, ...values };
    redraw();
}

// Theme observer
let themeObserver: MutationObserver;

onMounted(() => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    canvas.style.cursor = 'crosshair';

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    resize();
    window.addEventListener('resize', resize);

    themeObserver = new MutationObserver(() => redraw());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});

onUnmounted(() => {
    const canvas = canvasRef.value;
    if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
    }
    window.removeEventListener('resize', resize);
    if (themeObserver) {
        themeObserver.disconnect();
    }
});
</script>

<style scoped>
.kronenberg-wrapper {
    @apply w-full;
}

.kronenberg-wrapper.kronenberg-expanded {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.kronenberg-wrapper.kronenberg-expanded .kronenberg-container {
    flex: 1;
    height: auto;
}

.kronenberg-container {
    @apply w-full overflow-hidden;
    height: 600px;
    background: transparent;
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
}

.kronenberg-container canvas {
    display: block;
    width: 100%;
    height: 100%;
}

.slider {
    -webkit-appearance: none;
    appearance: none;
    @apply bg-gray-200 dark:bg-gray-700 w-full;
    border-radius: 9999px;
    height: 8px;
    outline: none;
    transition: background 0.3s ease;
}

.slider:hover {
    @apply bg-gray-300 dark:bg-gray-600;
}

.slider::-webkit-slider-thumb {
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

.slider::-webkit-slider-thumb:hover {
    @apply bg-gray-100 dark:bg-gray-700;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    @apply bg-white dark:bg-gray-800 border-gray-700 dark:border-gray-300;
    border-width: 2px;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
}

.slider::-moz-range-thumb:hover {
    @apply bg-gray-100 dark:bg-gray-700;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
</style>
