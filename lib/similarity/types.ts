/**
 * Result of a single bitmap comparison.
 */
export interface ComparisonResult {
  /** Similarity score 0–1. 1 = identical, 0 = no overlap. */
  score: number;
  /** Whether the score meets or exceeds the configured threshold. */
  passed: boolean;
}

/**
 * Interface for pluggable bitmap comparison algorithms.
 *
 * Every comparer receives two ImageData objects of the same dimensions
 * and returns a score + pass/fail decision.
 *
 * Swap implementations to change the comparison strategy without
 * touching recognition or UI code:
 *
 * - IoUComparer   — fast, binary, rewards exact tracing
 * - SSIMComparer  — structural similarity, more forgiving of offsets
 */
export interface BitmapComparer {
  /** Human-readable label for logging / debugging. */
  readonly name: string;

  /**
   * Compare two bitmaps of identical dimensions.
   *
   * @param a - First image (e.g. user drawing).
   * @param b - Second image (e.g. rendered template).
   */
  compare(a: ImageData, b: ImageData): ComparisonResult;
}

// ── Threshold documentation ─────────────────────────────────────
//
// Threshold values control the similarity floor for a "pass."
//
// IoUComparer (intersection over union of binarised ink pixels):
//   threshold = 0.08  → default, loose (recommended for beginners)
//   threshold = 0.15  → moderate
//   threshold = 0.25  → strict, requires substantial overlap
//
//   IoU is sensitive to stroke width and alignment. A lower threshold
//   accounts for users who draw thinner or slightly offset strokes.
//   Values above 0.3 are rarely hit in practice because the template
//   font and handwriting glyph shapes differ in width distribution.
//
// SSIMComparer (structural similarity on grayscale):
//   threshold = 0.30  → default, generous
//   threshold = 0.50  → moderate
//   threshold = 0.70  → strict
//
//   SSIM is less sensitive to pixel-perfect alignment than IoU,
//   so thresholds can be set higher without frustrating users.
//   It rewards correct stroke topology even when position drifts.
//
// Tuning strategy:
//   1. Start with defaults.
//   2. Collect real user drawings and compute score distributions.
//   3. Set threshold at the 10th percentile of passing drawings.
//   4. Adjust per difficulty: lower for hard characters, higher for easy.
