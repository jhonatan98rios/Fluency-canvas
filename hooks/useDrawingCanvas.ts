"use client";

import { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { DrawingEngine } from "@/lib/drawing/DrawingEngine";
import type { DrawingCanvasRef, Point } from "@/lib/drawing/types";

interface UseDrawingCanvasOptions {
  color?: string;
  thickness?: number;
  /** Called after every stroke ends (pointer up). */
  onStrokeEnd?: () => void;
}

/**
 * Hook that owns canvas lifecycle: engine, pointer events, rAF batching,
 * ResizeObserver, and imperative API.
 *
 * Pass the forwarded ref from the component — the hook populates it.
 */
export function useDrawingCanvas(
  ref: React.Ref<DrawingCanvasRef>,
  options: UseDrawingCanvasOptions = {},
) {
  const { color = "#000000", thickness = 3, onStrokeEnd } = options;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DrawingEngine | null>(null);
  const rafId = useRef(0);
  const queue = useRef<PointerEvent[]>([]);
  const drawing = useRef(false);

  // ── rAF flush ─────────────────────────────────────────────────
  // ponytail: ref-backed rAF loop — self-referencing, always fresh.

  const flushRef = useRef<() => void>(() => {});

  useEffect(() => {
    flushRef.current = () => {
      const events = queue.current;
      queue.current = [];
      const engine = engineRef.current;
      const canvas = canvasRef.current;
      if (!engine || !canvas) return;
      for (const e of events) engine.addPoint(toPoint(e, canvas));
      rafId.current = requestAnimationFrame(flushRef.current);
    };
  });

  const flush = useCallback(() => flushRef.current(), []);

  // ── Event handlers ────────────────────────────────────────────

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      const canvas = canvasRef.current;
      const engine = engineRef.current;
      if (!canvas || !engine) return;
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
      engine.startStroke(toPoint(e, canvas));
      drawing.current = true;
      rafId.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const events = e.getCoalescedEvents?.() ?? [e];
    for (const ce of events) queue.current.push(ce);
  }, []);

  const onPointerUp = useCallback((e: PointerEvent) => {
    if (!drawing.current) return;
    drawing.current = false;
    cancelAnimationFrame(rafId.current);

    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (engine && canvas) {
      for (const ev of queue.current) engine.addPoint(toPoint(ev, canvas));
      queue.current = [];
      const events = e.getCoalescedEvents?.() ?? [e];
      for (const ce of events) engine.addPoint(toPoint(ce, canvas));
    }
    engine?.endStroke();
    onStrokeEnd?.();
  }, [onStrokeEnd]);

  // ── Imperative API ────────────────────────────────────────────

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;
    const rect = canvas.getBoundingClientRect();
    engine.resize(rect.width, rect.height);
  }, []);

  useImperativeHandle(ref, () => ({
    clear: () => engineRef.current?.clear(),
    undo: () => engineRef.current?.undo(),
    exportImage: () => engineRef.current?.exportImage() ?? Promise.resolve(null),
    exportImageData: () => engineRef.current?.exportImageData() ?? null,
    resize,
  }));

  // ── Initialise / teardown ─────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new DrawingEngine(canvas);
    engineRef.current = engine;

    const rect = canvas.getBoundingClientRect();
    engine.resize(rect.width, rect.height);

    const observer = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      engine.resize(r.width, r.height);
    });
    observer.observe(canvas);

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    return () => {
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      cancelAnimationFrame(rafId.current);
    };
  }, [onPointerDown, onPointerMove, onPointerUp]);

  // ── Sync brush ────────────────────────────────────────────────

  useEffect(() => {
    engineRef.current?.setBrush({ color, thickness });
  }, [color, thickness]);

  return canvasRef;
}

// ── Helpers ─────────────────────────────────────────────────────

function toPoint(e: PointerEvent, canvas: HTMLCanvasElement): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    pressure: e.pressure,
    timestamp: e.timeStamp,
  };
}
