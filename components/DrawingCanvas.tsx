"use client";

import { forwardRef } from "react";
import { useDrawingCanvas } from "@/hooks/useDrawingCanvas";
import type { DrawingCanvasRef } from "@/lib/drawing/types";

interface DrawingCanvasProps {
  /** Brush color (hex). Reactive. */
  color?: string;
  /** Brush thickness in logical pixels. Reactive. */
  thickness?: number;
  /** Called after every stroke ends (pointer up). */
  onStrokeEnd?: () => void;
  /** Toolbar / controls rendered above the canvas. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Reusable drawing surface. Renders an HTML Canvas with full pointer-event
 * support, high-DPI rendering, undo, export, and resize handling.
 *
 * Attach a ref to access the imperative API:
 * ```tsx
 * const ref = useRef<DrawingCanvasRef>(null);
 * ref.current?.clear(); ref.current?.undo(); ref.current?.exportImage();
 * ```
 */
const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
  function DrawingCanvas({ color, thickness, onStrokeEnd, children, className = "" }, ref) {
    const canvasRef = useDrawingCanvas(ref, { color, thickness, onStrokeEnd });

    return (
      <div className={`relative flex flex-col ${className}`}>
        {children}
        <canvas
          ref={canvasRef}
          className="block w-full flex-1 touch-none select-none"
          style={{ touchAction: "none", minHeight: 0 }}
        />
      </div>
    );
  },
);

export default DrawingCanvas;
