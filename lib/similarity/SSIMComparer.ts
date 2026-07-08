import type { BitmapComparer, ComparisonResult } from "./types";

/**
 * Structural Similarity (SSIM) comparer.
 *
 * Computes SSIM on the grayscale luminance channel of both images.
 * Uses the standard constants C1 = (0.01 × 255)², C2 = (0.03 × 255)².
 *
 * Unlike IoU, SSIM is perceptually motivated — it compares luminance,
 * contrast, and structure rather than exact pixel overlap. This makes
 * it more forgiving of slight stroke-position drift while still
 * penalising wrong topology.
 *
 * threshold: 0–1. Default 0.30 (generous — SSIM scores are lower than
 * IoU on sparse binary images; treat this as a rough floor).
 *
 * ponytail: single global SSIM, no windowing. Windowed SSIM adds
 * complexity for marginal gain on ideogram-sized bitmaps. Add if
 * local structural differences need detection.
 */
export class SSIMComparer implements BitmapComparer {
  readonly name = "SSIM";

  private readonly c1: number;
  private readonly c2: number;

  constructor(private threshold: number = 0.30) {
    // Standard SSIM constants for 8-bit images.
    const L = 255;
    const k1 = 0.01;
    const k2 = 0.03;
    this.c1 = (k1 * L) ** 2;
    this.c2 = (k2 * L) ** 2;
  }

  compare(a: ImageData, b: ImageData): ComparisonResult {
    if (a.width !== b.width || a.height !== b.height) {
      throw new Error(
        `ImageData dimensions must match: ${a.width}x${a.height} vs ${b.width}x${b.height}`,
      );
    }

    const ag = this._toGrayscale(a);
    const bg = this._toGrayscale(b);

    const n = ag.length;
    if (n === 0) {
      return { score: 0, passed: false };
    }

    // Means
    let sumA = 0;
    let sumB = 0;
    for (let i = 0; i < n; i++) {
      sumA += ag[i];
      sumB += bg[i];
    }
    const muA = sumA / n;
    const muB = sumB / n;

    // Variances & covariance
    let varA = 0;
    let varB = 0;
    let cov = 0;
    for (let i = 0; i < n; i++) {
      const da = ag[i] - muA;
      const db = bg[i] - muB;
      varA += da * da;
      varB += db * db;
      cov += da * db;
    }
    varA /= n - 1;
    varB /= n - 1;
    cov /= n - 1;

    const score =
      ((2 * muA * muB + this.c1) * (2 * cov + this.c2)) /
      ((muA * muA + muB * muB + this.c1) * (varA + varB + this.c2));

    // Clamp small negative floats (possible with nearly-constant images).
    const clamped = Math.max(0, Math.min(1, score));

    return { score: clamped, passed: clamped >= this.threshold };
  }

  /** Extract luminance from RGBA ImageData (ITU-R BT.601 luma). */
  private _toGrayscale(data: ImageData): Float64Array {
    const n = data.width * data.height;
    const out = new Float64Array(n);
    const px = data.data;
    for (let i = 0; i < n; i++) {
      const base = i * 4;
      // Weighted by alpha so transparent regions don't distort the mean.
      const alpha = px[base + 3] / 255;
      out[i] = (0.299 * px[base] + 0.587 * px[base + 1] + 0.114 * px[base + 2]) * alpha;
    }
    return out;
  }
}
