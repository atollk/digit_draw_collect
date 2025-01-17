<script lang="ts">
  // Configuration constants
  const STROKE_WIDTH = 3;
  const DOT_RADIUS = STROKE_WIDTH;
  
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

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let isDrawing = false;
  let currentStroke: Point[] = [];
  let currentDrawingStrokes: StrokeData[] = [];
  let startTime: number;
  let lastPoint: Point | null = null;
  
  let selectedDigit = $state("0");
  let isPositive = $state(true);
  let allDrawings: DrawingData[] = $state([]);

  $effect(() => {
    if (canvas) {
      ctx = canvas.getContext('2d')!;
      ctx.strokeStyle = 'gray';
      ctx.fillStyle = 'gray';
      ctx.lineWidth = STROKE_WIDTH;
      ctx.lineCap = 'round';
    }
  });

  function handleStart(e: MouseEvent | TouchEvent) {
		e.preventDefault();
    isDrawing = true;
    startTime = performance.now();
    const rect = canvas.getBoundingClientRect();
    const point = getCoordinates(e, rect);
    
    lastPoint = {
      x: point.x,
      y: point.y,
      t: 0
    };
    
    currentStroke = [lastPoint];
    
    ctx.beginPath();
    ctx.moveTo(point.x * canvas.width, point.y * canvas.height);
  }

  function handleMove(e: MouseEvent | TouchEvent) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const point = getCoordinates(e, rect);
    const t = performance.now() - startTime;
    
    lastPoint = { x: point.x, y: point.y, t };
    currentStroke.push(lastPoint);
    
    ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
    ctx.stroke();
  }

  function handleEnd() {
    if (!isDrawing) return;
    isDrawing = false;
    
    // If it's a single point (no movement), draw a circle
    if (currentStroke.length === 1 && lastPoint) {
      const x = lastPoint.x * canvas.width;
      const y = lastPoint.y * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Convert current stroke to StrokeData format
    const strokeData: StrokeData = {
      x: currentStroke.map(p => p.x),
      y: currentStroke.map(p => p.y),
      t: currentStroke.map(p => p.t)
    };
    
    // Add to current drawing's strokes
    currentDrawingStrokes = [...currentDrawingStrokes, strokeData];
    currentStroke = [];
    lastPoint = null;
  }

  function getCoordinates(e: MouseEvent | TouchEvent, rect: DOMRect) {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    };
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    currentDrawingStrokes = [];
  }

  function finishDrawing() {
    if (currentDrawingStrokes.length > 0) {
      allDrawings = [...allDrawings, {
        char: selectedDigit,
        positive: isPositive,
        strokes: currentDrawingStrokes
      }];
    }
    
    clearCanvas();
  }

  function downloadResults() {
    const dataStr = JSON.stringify(allDrawings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'drawing-data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
</script>

<main class="container mx-auto p-4 max-w-2xl">
  <div class="mt-4 space-y-4 flex gap-8 flex-col items-center">
    <canvas
      bind:this={canvas}
      width="400"
      height="400"
      class="border-2 border-gray-300 rounded-lg w-full touch-none"
      onmousedown={handleStart}
      onmousemove={handleMove}
      onmouseup={handleEnd}
      onmouseleave={handleEnd}
      ontouchstart={handleStart}
      ontouchmove={handleMove}
      ontouchend={handleEnd}
      ontouchcancel={handleEnd}
    ></canvas>

    <div class="flex gap-4">
      <button class="btn btn-error" onclick={clearCanvas}>Clear</button>
      <button class="btn btn-primary" onclick={finishDrawing}>Finish</button>
    </div>

    <div class="flex gap-2 justify-center">
      {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as _, i}
        <button
          class="btn btn-square {selectedDigit === i.toString() ? 'btn-primary' : 'btn-outline'}"
          onclick={() => selectedDigit = i.toString()}
        >
          {i}
        </button>
      {/each}
    </div>

    <div class="flex justify-center gap-4">
      <span class={["label-text text-lg", isPositive && "opacity-50"]}>Negative example</span>
      <input
        class="toggle toggle-lg bg-primary"
        type="checkbox"
        bind:checked={isPositive}
      />
      <span class={["label-text text-lg", !isPositive && "opacity-50"]}>Positive example</span>
    </div>

    <div class="flex justify-center">
      <button
        class="btn btn-secondary"
        onclick={downloadResults}
        disabled={allDrawings.length === 0}
      >
        Download Results ({allDrawings.length} drawings)
      </button>
    </div>
  </div>
</main>