import type { BrushSettings, Point, Stroke } from "./types";

/**
 * Pure rendering engine. Owns the canvas context, stroke history,
 * and brush state. Zero React dependency — call methods directly.
 *
 * Coordinates are always logical (CSS) pixels. Engine handles DPR
 * scaling internally so callers never think about it.
 */
export class DrawingEngine {
  private ctx: CanvasRenderingContext2D;
  private strokes: Stroke[] = [];
  private brush: BrushSettings = { color: "#000000", thickness: 3 };
  private dpr: number;
  private width = 0;
  private height = 0;

  /** True while a stroke is in progress (pointer down, not yet up). */
  drawing = false;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not acquire 2D context");
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
  }

  // ─── Brush ────────────────────────────────────────────────────

  setBrush(s: Partial<BrushSettings>): void {
    this.brush = { ...this.brush, ...s };
  }

  getBrush(): BrushSettings {
    return { ...this.brush };
  }

  // ─── Stroke lifecycle ─────────────────────────────────────────

  /** Call on pointerdown. Starts a new live stroke. */
  startStroke(point: Point): void {
    this.drawing = true;
    this._applyBrush();
    this.ctx.beginPath();
    this.ctx.moveTo(point.x, point.y);
    this.ctx.lineTo(point.x + 0.5, point.y + 0.5); // dot for single-point taps
    this.ctx.stroke();

    // Only track the stroke for undo — we draw live onto the bitmap.
    this.strokes.push({
      points: [point],
      color: this.brush.color,
      thickness: this.brush.thickness,
    });
  }

  /** Call for each pointermove event (including coalesced). */
  addPoint(point: Point): void {
    if (!this.drawing) return;
    const stroke = this.strokes[this.strokes.length - 1];
    if (!stroke) return;

    stroke.points.push(point);

    this._applyBrush();
    this.ctx.lineTo(point.x, point.y);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(point.x, point.y);
  }

  /** Call on pointerup / pointerleave. Finalises the current stroke. */
  endStroke(): void {
    this.drawing = false;
    this.ctx.beginPath(); // reset path so next startStroke is clean
  }

  // ─── Canvas operations ────────────────────────────────────────

  clear(): void {
    this._discardCurrentStroke();
    this.strokes = [];
    this._clearBitmap();
  }

  undo(): void {
    this._discardCurrentStroke();
    this.strokes.pop();
    this._redrawAll();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    const w = Math.round(width * this.dpr);
    const h = Math.round(height * this.dpr);

    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._redrawAll();
  }

  // ─── Export ───────────────────────────────────────────────────

  exportImageData(): ImageData | null {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Returns a PNG Blob. Async because toBlob is callback-based. */
  exportImage(): Promise<Blob | null> {
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  // ─── Internal ─────────────────────────────────────────────────

  private _applyBrush(): void {
    this.ctx.strokeStyle = this.brush.color;
    this.ctx.lineWidth = this.brush.thickness;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }

  private _clearBitmap(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /** Redraw every committed stroke from scratch. Used after undo / resize. */
  private _redrawAll(): void {
    this._clearBitmap();
    for (const stroke of this.strokes) {
      if (stroke.points.length === 0) continue;
      this.ctx.strokeStyle = stroke.color;
      this.ctx.lineWidth = stroke.thickness;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";

      this.ctx.beginPath();
      this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      this.ctx.stroke();
    }
  }

  /** Drop an in-progress stroke so undo doesn't hit it mid-draw. */
  private _discardCurrentStroke(): void {
    if (this.drawing) {
      // The last stroke is the live one — remove and redraw without it.
      this.strokes.pop();
      this.drawing = false;
      this._redrawAll();
    }
  }
}
