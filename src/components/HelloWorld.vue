<!-- App.vue -->
<script setup lang="ts">
import { ref, onMounted, reactive } from "vue";

// Configuration constants
const STROKE_WIDTH = 2;
const DOT_RADIUS = STROKE_WIDTH * 2;

type Point = {
  x: number;
  y: number;
  t: number;
};

type StrokeData = {
  x: number[];
  y: number[];
  t: number[];
};

type DrawingData = {
  char: string;
  positive: boolean;
  strokes: StrokeData[];
};

const canvas = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
const isDrawing = ref(false);
const currentStroke = ref<Point[]>([]);
const currentDrawingStrokes = ref<StrokeData[]>([]);
let startTime = 0;
let lastPoint = ref<Point | null>(null);

const selectedDigit = ref("0");
const isPositive = ref(true);
const allDrawings = ref<DrawingData[]>([]);

onMounted(() => {
  if (canvas.value) {
    ctx = canvas.value.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = "black";
      ctx.fillStyle = "black";
      ctx.lineWidth = STROKE_WIDTH;
      ctx.lineCap = "round";

      // Draw guide lines
      drawGuideLines();
    }
  }
});

const drawGuideLines = () => {
  if (!canvas.value || !ctx) return;

  const width = canvas.value.width;
  const height = canvas.value.height;

  // Save current context state
  ctx.save();

  // Set style for guide lines
  ctx.strokeStyle = "#aaaaaa";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]); // Dashed line

  // Draw three horizontal lines at 10%, 50%, and 90% from top
  [0.1, 0.5, 0.9].forEach((position) => {
    const y = height * position;
    ctx?.beginPath();
    ctx?.moveTo(0, y);
    ctx?.lineTo(width, y);
    ctx?.stroke();
  });

  // Restore context state
  ctx.restore();

  // Reset dash and return to drawing settings
  ctx.setLineDash([]);
  ctx.strokeStyle = "black";
  ctx.lineWidth = STROKE_WIDTH;
};

const handleStart = (e: MouseEvent | TouchEvent) => {
  isDrawing.value = true;
  startTime = performance.now();

  if (!canvas.value || !ctx) return;

  const rect = canvas.value.getBoundingClientRect();
  const point = getCoordinates(e, rect);

  lastPoint.value = {
    x: point.x,
    y: point.y,
    t: 0,
  };

  currentStroke.value = [lastPoint.value];

  ctx.beginPath();
  ctx.moveTo(point.x * canvas.value.width, point.y * canvas.value.height);
};

const handleMove = (e: MouseEvent | TouchEvent) => {
  if (!isDrawing.value || !canvas.value || !ctx) return;

  const rect = canvas.value.getBoundingClientRect();
  const point = getCoordinates(e, rect);
  const t = performance.now() - startTime;

  lastPoint.value = { x: point.x, y: point.y, t };
  currentStroke.value.push(lastPoint.value);

  ctx.lineTo(point.x * canvas.value.width, point.y * canvas.value.height);
  ctx.stroke();
};

const handleEnd = () => {
  if (!isDrawing.value || !canvas.value || !ctx) return;
  isDrawing.value = false;

  // If it's a single point (no movement), draw a circle
  if (currentStroke.value.length === 1 && lastPoint.value) {
    const x = lastPoint.value.x * canvas.value.width;
    const y = lastPoint.value.y * canvas.value.height;
    ctx.beginPath();
    ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  // Convert current stroke to StrokeData format
  const strokeData: StrokeData = {
    x: currentStroke.value.map((p) => p.x),
    y: currentStroke.value.map((p) => p.y),
    t: currentStroke.value.map((p) => p.t),
  };

  // Add to current drawing's strokes
  currentDrawingStrokes.value.push(strokeData);
  currentStroke.value = [];
  lastPoint.value = null;
};

const getCoordinates = (e: MouseEvent | TouchEvent, rect: DOMRect) => {
  let clientX, clientY;

  if ("touches" in e) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
  };
};

const clearCanvas = () => {
  if (!canvas.value || !ctx) return;

  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
  currentDrawingStrokes.value = [];

  // Redraw guide lines
  drawGuideLines();
};

const finishDrawing = () => {
  if (currentDrawingStrokes.value.length > 0) {
    allDrawings.value.push({
      char: selectedDigit.value,
      positive: isPositive.value,
      strokes: [...currentDrawingStrokes.value],
    });
  }

  clearCanvas();
};

const downloadResults = () => {
  const dataStr = JSON.stringify(allDrawings.value, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "drawing-data.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Prevent default scrolling behavior when touching the canvas
const preventDefault = (e: Event) => {
  e.preventDefault();
};
</script>

<template>
  <main class="container mx-auto p-4 max-w-2xl">
    <div class="space-y-4">
      <canvas
        ref="canvas"
        width="400"
        height="400"
        class="border-2 border-gray-300 rounded-lg w-full touch-none"
        @mousedown="handleStart"
        @mousemove="handleMove"
        @mouseup="handleEnd"
        @mouseleave="handleEnd"
        @touchstart.prevent="handleStart"
        @touchmove.prevent="handleMove"
        @touchend.prevent="handleEnd"
        @touchcancel.prevent="handleEnd"
      ></canvas>

      <div class="flex gap-4">
        <button class="btn btn-error" @click="clearCanvas">Clear</button>
        <button class="btn btn-primary" @click="finishDrawing">Finish</button>
      </div>

      <div class="flex gap-2 justify-center">
        <button
          v-for="i in 10"
          :key="i - 1"
          class="btn btn-circle"
          :class="
            selectedDigit === String(i - 1) ? 'btn-primary' : 'btn-outline'
          "
          @click="selectedDigit = String(i - 1)"
        >
          {{ i - 1 }}
        </button>
      </div>

      <div class="flex justify-center">
        <button
          class="btn"
          :class="isPositive ? 'btn-success' : 'btn-error'"
          @click="isPositive = !isPositive"
        >
          {{ isPositive ? "Positive example" : "Negative example" }}
        </button>
      </div>

      <div class="flex justify-center">
        <button
          class="btn btn-secondary"
          @click="downloadResults"
          :disabled="allDrawings.length === 0"
        >
          Download Results ({{ allDrawings.length }} drawings)
        </button>
      </div>
    </div>
  </main>
</template>
