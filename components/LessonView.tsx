"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DrawingCanvas from "@/components/DrawingCanvas";
import IdeogramOverlay from "@/components/IdeogramOverlay";
import { useLesson } from "@/hooks/useLesson";
import { LESSONS, languageLabel } from "@/lib/lessons/data";
import { TemplateRecognizer } from "@/lib/recognition";
import { SSIMComparer } from "@/lib/similarity";
import { renderTemplate } from "@/lib/utils/renderTemplate";
import type { DrawingCanvasRef } from "@/lib/drawing/types";
import type { HandwritingRecognizer, RecognitionResult } from "@/lib/recognition";
import type { BitmapComparer } from "@/lib/similarity";

// ── Helpers ─────────────────────────────────────────────────────

const LS_INDEX = "fluency-index";
const LS_COLOR = "fluency-color";
const LS_THICKNESS = "fluency-thickness";

const DIFFICULTY_DOTS: Record<number, string> = { 1: "●○○", 2: "●●○", 3: "●●●" };
const COLORS = ["#000000", "#e03131", "#1971c2", "#2f9e44", "#f08c00"];

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw != null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded, ignore */ }
}

// ── Audio ───────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function ensureAudio(): AudioContext | null {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new AudioContext();
    return audioCtx;
  } catch {
    return null;
  }
}

function beep(freq: number, duration: number, startTime?: number): void {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime ?? ctx.currentTime);
  osc.stop((startTime ?? ctx.currentTime) + duration);
}

function playSuccessSound(): void {
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  beep(523, 0.12, now);        // C5
  beep(659, 0.15, now + 0.10); // E5
}

function playFailureSound(): void {
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.linearRampToValueAtTime(160, now + 0.2);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

const SPEECH_LANG: Record<string, string> = { zh: "zh-CN", ja: "ja-JP", ko: "ko-KR" };

function speak(text: string, lang: string): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const bcp = SPEECH_LANG[lang] ?? lang;
  u.lang = bcp;
  u.rate = 0.8;

  // Pick a native voice for the language, fall back to default.
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find((v) => v.lang.startsWith(bcp)) ??
                voices.find((v) => v.lang.startsWith(lang));
  if (match) u.voice = match;

  window.speechSynthesis.speak(u);
}

// ── Component ───────────────────────────────────────────────────

type RecognitionState = "idle" | "recognizing" | "success" | "failure";

export default function LessonView() {
  const canvasRef = useRef<DrawingCanvasRef>(null);

  // Persisted settings
  const [color, setColor] = useState(() => loadJson(LS_COLOR, "#000000"));
  const [thickness, setThickness] = useState(() => loadJson(LS_THICKNESS, 4));

  const [recState, setRecState] = useState<RecognitionState>("idle");
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout>>(0 as unknown as ReturnType<typeof setTimeout>);

  const savedIndex = loadJson<number>(LS_INDEX, 0);
  const { current, currentIndex, hasPrev, hasNext, next, prev, goTo } =
    useLesson(LESSONS, savedIndex);

  const recognizerRef = useRef<HandwritingRecognizer>(new TemplateRecognizer(0.70));
  const comparerRef = useRef<BitmapComparer>(new SSIMComparer(0.70));

  // Persist settings on change
  useEffect(() => { saveJson(LS_COLOR, color); }, [color]);
  useEffect(() => { saveJson(LS_THICKNESS, thickness); }, [thickness]);
  useEffect(() => { saveJson(LS_INDEX, currentIndex); }, [currentIndex]);

  // Cleanup auto-advance on unmount
  useEffect(() => () => clearTimeout(autoAdvanceRef.current), []);

  // ── Actions ──────────────────────────────────────────────────

  const goNext = useCallback(() => {
    clearTimeout(autoAdvanceRef.current);
    next();
    canvasRef.current?.clear();
    setRecState("idle");
  }, [next]);

  const goPrev = useCallback(() => {
    clearTimeout(autoAdvanceRef.current);
    prev();
    canvasRef.current?.clear();
    setRecState("idle");
  }, [prev]);

  const handleClear = useCallback(() => {
    clearTimeout(autoAdvanceRef.current);
    canvasRef.current?.clear();
    setRecState("idle");
  }, []);

  const handleUndo = useCallback(() => {
    clearTimeout(autoAdvanceRef.current);
    canvasRef.current?.undo();
    setRecState("idle");
  }, []);

  const handleRetry = useCallback(() => {
    clearTimeout(autoAdvanceRef.current);
    canvasRef.current?.clear();
    setRecState("idle");
  }, []);

  // ── Stroke end → dual-path verification ──────────────────────

  const handleStrokeEnd = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    clearTimeout(autoAdvanceRef.current);
    setRecState("recognizing");

    const imageData = canvas.exportImageData();
    if (!imageData) { setRecState("idle"); return; }

    const options = { expected: current.character, language: current.language };

    const recPromise = recognizerRef.current.recognise(imageData, options);
    const template = renderTemplate(current.character, imageData.width, imageData.height);
    const simResult = comparerRef.current.compare(imageData, template);

    recPromise
      .then((recResult: RecognitionResult) => {
        const victory = recResult.matched || simResult.passed;
        if (victory) {
          playSuccessSound();
          speak(current.pronunciation, current.language);
          setRecState("success");
          autoAdvanceRef.current = setTimeout(goNext, 1800);
        } else {
          playFailureSound();
          setRecState("failure");
        }
      })
      .catch(() => {
        if (simResult.passed) {
          playSuccessSound();
          speak(current.pronunciation, current.language);
          setRecState("success");
          autoAdvanceRef.current = setTimeout(goNext, 1800);
        } else {
          playFailureSound();
          setRecState("failure");
        }
      });
  }, [current.character, current.language, goNext]);

  // ── Keyboard shortcuts ───────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowLeft" && hasPrev) { e.preventDefault(); goPrev(); }
      if (e.key === "ArrowRight" && hasNext) { e.preventDefault(); goNext(); }
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (e.key === "Delete" || (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); handleClear(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasPrev, hasNext, goPrev, goNext, handleUndo, handleClear]);

  // ── Render ───────────────────────────────────────────────────

  const progressPct = LESSONS.length > 0 ? ((currentIndex + 1) / LESSONS.length) * 100 : 0;

  return (
    <div className="flex flex-col h-dvh bg-white select-none" role="application" aria-label="Handwriting practice">
      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-200 shrink-0 text-sm text-zinc-500">
        <span className="font-medium text-zinc-700">{languageLabel(current.language)}</span>
        <span className="text-zinc-300">·</span>
        <span aria-label={`Difficulty: ${current.difficulty} out of 3`}>
          {DIFFICULTY_DOTS[current.difficulty]}
        </span>
        <span className="text-zinc-300">·</span>
        <span className="tabular-nums">{currentIndex + 1}/{LESSONS.length}</span>
        <span className="flex-1" />
        <span className="italic text-zinc-400" aria-label={`Pronunciation: ${current.pronunciation}`}>
          {current.pronunciation}
        </span>
      </div>

      {/* ── Progress bar ─────────────────────────────────────── */}
      <div className="h-0.5 bg-zinc-100 shrink-0" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={0} aria-valuemax={LESSONS.length}>
        <div
          className="h-full bg-emerald-400 transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* ── Canvas + overlay ─────────────────────────────────── */}
      <div className="relative flex flex-col flex-1 min-h-0">
        <DrawingCanvas
          ref={canvasRef}
          color={color}
          thickness={thickness}
          onStrokeEnd={handleStrokeEnd}
          className="flex-1"
        />
        <IdeogramOverlay character={current.character} />

        {/* Recognising overlay */}
        {recState === "recognizing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 pointer-events-none animate-fade-in">
            <span className="text-sm text-zinc-400 animate-pulse">Recognising…</span>
          </div>
        )}

        {/* Success */}
        {recState === "success" && (
          <div className="absolute inset-x-0 bottom-0 mx-auto mb-4 max-w-xs rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center shadow-lg animate-pop-in">
            <p className="text-2xl font-bold text-emerald-700">{current.character}</p>
            <p className="text-sm text-emerald-600 mt-0.5">{current.translation}</p>
            <p className="text-xs text-emerald-500">{current.pronunciation}</p>
          </div>
        )}

        {/* Failure */}
        {recState === "failure" && (
          <div className="absolute inset-x-0 bottom-0 mx-auto mb-4 max-w-xs rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center shadow-lg animate-shake-x">
            <p className="text-sm font-medium text-red-600">Not quite — try again</p>
            <button
              onClick={handleRetry}
              className="mt-2 px-4 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 hover:bg-red-200 active:bg-red-300 transition-colors"
              aria-label="Clear canvas and retry"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom bar ───────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-zinc-200 shrink-0 overflow-x-auto" role="toolbar" aria-label="Drawing tools">
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Brush color">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 shrink-0 transition-transform active:scale-95 ${
                color === c ? "border-zinc-700 scale-110" : "border-zinc-200 hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
              role="radio"
              aria-checked={color === c}
              aria-label={`${c} brush`}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-zinc-200 shrink-0" aria-hidden />

        <label className="flex items-center gap-1 text-xs text-zinc-500 shrink-0">
          <input
            type="range"
            min={1}
            max={16}
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
            className="w-20 accent-zinc-700"
            aria-label="Brush thickness"
          />
          <span className="w-4 tabular-nums">{thickness}</span>
        </label>

        <div className="w-px h-5 bg-zinc-200 shrink-0" aria-hidden />

        <button
          onClick={handleUndo}
          className="px-2 py-1 text-xs rounded border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100 shrink-0 transition-colors"
          aria-label="Undo last stroke"
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          onClick={handleClear}
          className="px-2 py-1 text-xs rounded border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100 text-red-500 shrink-0 transition-colors"
          aria-label="Clear canvas"
          title="Clear (Delete)"
        >
          Clear
        </button>

        <div className="flex-1" />

        <button
          onClick={goPrev}
          disabled={!hasPrev}
          className="px-3 py-1 text-xs rounded border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-30 disabled:cursor-default shrink-0 transition-colors"
          aria-label="Previous lesson"
          aria-disabled={!hasPrev}
        >
          ← Prev
        </button>
        <button
          onClick={goNext}
          disabled={!hasNext}
          className="px-3 py-1 text-xs rounded border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-30 disabled:cursor-default shrink-0 transition-colors"
          aria-label="Next lesson"
          aria-disabled={!hasNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
