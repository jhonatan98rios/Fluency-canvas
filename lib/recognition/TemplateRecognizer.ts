import type {
  HandwritingRecognizer,
  RecognitionOptions,
  RecognitionResult,
} from "./types";
import { IoUComparer } from "@/lib/similarity";
import { renderTemplate } from "@/lib/utils/renderTemplate";

/**
 * Recogniser that compares the user's drawing against a rendered
 * template of the expected character.
 *
 * Delegates bitmap comparison to a pluggable BitmapComparer
 * (default: IoUComparer). Swap the comparer to change the matching
 * algorithm without touching recognition logic.
 *
 * @param threshold - IoU threshold 0–1. Default 0.08.
 *   See lib/similarity/types.ts for tuning guidance.
 */
export class TemplateRecognizer implements HandwritingRecognizer {
  private comparer: IoUComparer;

  constructor(threshold: number = 0.08) {
    this.comparer = new IoUComparer(threshold);
  }

  async recognise(
    imageData: ImageData,
    options: RecognitionOptions,
  ): Promise<RecognitionResult> {
    const { width, height } = imageData;

    const template = this._renderTemplate(options.expected, width, height);
    const result = this.comparer.compare(imageData, template);

    return {
      matched: result.passed,
      confidence: result.passed ? result.score : 0,
      candidates: result.passed
        ? [{ character: options.expected, score: result.score }]
        : [],
    };
  }

  // ── Internal ─────────────────────────────────────────────────

  private _renderTemplate(
    char: string,
    width: number,
    height: number,
  ): ImageData {
    return renderTemplate(char, width, height);
  }
}
