/** Logical point — already scaled to canvas CSS coordinates (not bitmap). */
export interface Point {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  thickness: number;
}

export interface BrushSettings {
  color: string;
  thickness: number;
}

/** Imperative API exposed by DrawingCanvas via ref. */
export interface DrawingCanvasRef {
  clear: () => void;
  undo: () => void;
  exportImage: () => Promise<Blob | null>;
  exportImageData: () => ImageData | null;
  resize: () => void;
}
