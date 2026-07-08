import type { BitmapComparer, ComparisonResult } from "./types";

/**
 * Intersection-over-Union comparer.
 *
 * Binarises both images (ink pixel = alpha > 80) then computes
 * IoU = |A ∩ B| / |A ∪ B|.
 *
 * Fast, deterministic, zero allocations beyond the boolean arrays.
 * Best for tracing-oriented UX where the overlay anchors the user
 * and exact pixel overlap is expected.
 *
 * threshold: 0–1. Default 0.30 (tracing-oriented, ~30% overlap expected).
 */
export class IoUComparer implements BitmapComparer {
  readonly name = "IoU";

  constructor(private threshold: number = 0.30) {}

  compare(a: ImageData, b: ImageData): ComparisonResult {
    if (a.width !== b.width || a.height !== b.height) {
      throw new Error(
        `ImageData dimensions must match: ${a.width}x${a.height} vs ${b.width}x${b.height}`,
      );
    }

    const am = this._binarise(a);
    const bm = this._binarise(b);
    const score = this._iou(am, bm);

    return { score, passed: score >= this.threshold };
  }

  // ── Internal ─────────────────────────────────────────────────

  private _binarise(data: ImageData): boolean[] {
    const len = data.width * data.height;
    const out = new Array<boolean>(len);
    const px = data.data;
    for (let i = 0; i < len; i++) {
      out[i] = px[i * 4 + 3] > 80;
    }
    return out;
  }

  private _iou(a: boolean[], b: boolean[]): number {
    let intersection = 0;
    let union = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] && b[i]) intersection++;
      if (a[i] || b[i]) union++;
    }
    return union === 0 ? 0 : intersection / union;
  }
}
