import type { Language } from "@/lib/lessons/types";

/** Result of a single recognition attempt. */
export interface RecognitionResult {
  /** Whether the drawing matched the expected character. */
  matched: boolean;
  /** Confidence score 0–1. Only meaningful when matched. */
  confidence: number;
  /** Top candidate characters returned by the recogniser. */
  candidates: Candidate[];
}

export interface Candidate {
  character: string;
  score: number;
}

/** Options passed to every recognise() call. */
export interface RecognitionOptions {
  /** The character the user is expected to draw. */
  expected: string;
  /** Language hint (zh / ja / ko). */
  language: Language;
}

/**
 * Adapter interface for handwriting recognition.
 *
 * Implement this to plug in any backend — template matching,
 * ONNX model, cloud API, or HanziLookupJS.
 *
 * ponytail: one method, one job. Add streaming / partial results
 * later if UX calls for it.
 */
export interface HandwritingRecognizer {
  /**
   * Recognise handwriting from canvas pixel data.
   *
   * @param imageData - Raw RGBA pixels from the drawing canvas.
   * @param options   - Expected character + language hint.
   * @returns Match decision + candidates.
   */
  recognise(
    imageData: ImageData,
    options: RecognitionOptions,
  ): Promise<RecognitionResult>;
}
