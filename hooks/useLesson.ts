"use client";

import { useCallback, useMemo, useState } from "react";
import type { Lesson } from "@/lib/lessons/types";

interface UseLessonReturn {
  lessons: readonly Lesson[];
  currentIndex: number;
  current: Lesson;
  hasPrev: boolean;
  hasNext: boolean;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
}

export function useLesson(lessons: readonly Lesson[], initialIndex = 0): UseLessonReturn {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const safeIndex = useMemo(
    () => clamp(currentIndex, 0, lessons.length - 1),
    [currentIndex, lessons.length],
  );

  const hasPrev = safeIndex > 0;
  const hasNext = safeIndex < lessons.length - 1;

  const next = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, lessons.length - 1));
  }, [lessons.length]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(clamp(index, 0, lessons.length - 1));
  }, [lessons.length]);

  return {
    lessons,
    currentIndex: safeIndex,
    current: lessons[safeIndex],
    hasPrev,
    hasNext,
    next,
    prev,
    goTo,
  };
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
