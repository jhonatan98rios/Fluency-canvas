import type { Lesson } from "./types";

const LANGUAGE_LABEL: Record<string, string> = {
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
};

export function languageLabel(lang: string): string {
  return LANGUAGE_LABEL[lang] ?? lang;
}

export const LESSONS: Lesson[] = [
  // ── Chinese ──────────────────────────────────────────────────
  { id: "zh-001", language: "zh", character: "一", translation: "one", pronunciation: "yī", difficulty: 1 },
  { id: "zh-002", language: "zh", character: "人", translation: "person", pronunciation: "rén", difficulty: 1 },
  { id: "zh-003", language: "zh", character: "大", translation: "big", pronunciation: "dà", difficulty: 1 },
  { id: "zh-004", language: "zh", character: "山", translation: "mountain", pronunciation: "shān", difficulty: 1 },
  { id: "zh-005", language: "zh", character: "水", translation: "water", pronunciation: "shuǐ", difficulty: 2 },
  { id: "zh-006", language: "zh", character: "火", translation: "fire", pronunciation: "huǒ", difficulty: 2 },
  { id: "zh-007", language: "zh", character: "天", translation: "sky", pronunciation: "tiān", difficulty: 2 },
  { id: "zh-008", language: "zh", character: "花", translation: "flower", pronunciation: "huā", difficulty: 2 },
  { id: "zh-009", language: "zh", character: "龍", translation: "dragon", pronunciation: "lóng", difficulty: 3 },
  { id: "zh-010", language: "zh", character: "龜", translation: "turtle", pronunciation: "guī", difficulty: 3 },

  // ── Japanese ─────────────────────────────────────────────────
  { id: "ja-001", language: "ja", character: "日", translation: "sun", pronunciation: "nichi", difficulty: 1 },
  { id: "ja-002", language: "ja", character: "木", translation: "tree", pronunciation: "ki", difficulty: 1 },
  { id: "ja-003", language: "ja", character: "川", translation: "river", pronunciation: "kawa", difficulty: 1 },
  { id: "ja-004", language: "ja", character: "雨", translation: "rain", pronunciation: "ame", difficulty: 2 },
  { id: "ja-005", language: "ja", character: "愛", translation: "love", pronunciation: "ai", difficulty: 2 },
  { id: "ja-006", language: "ja", character: "夢", translation: "dream", pronunciation: "yume", difficulty: 2 },
  { id: "ja-007", language: "ja", character: "桜", translation: "cherry blossom", pronunciation: "sakura", difficulty: 3 },
  { id: "ja-008", language: "ja", character: "猫", translation: "cat", pronunciation: "neko", difficulty: 2 },
  { id: "ja-009", language: "ja", character: "心", translation: "heart", pronunciation: "kokoro", difficulty: 1 },
  { id: "ja-010", language: "ja", character: "風", translation: "wind", pronunciation: "kaze", difficulty: 2 },

  // ── Korean ───────────────────────────────────────────────────
  { id: "ko-001", language: "ko", character: "가", translation: "go", pronunciation: "ga", difficulty: 1 },
  { id: "ko-002", language: "ko", character: "나", translation: "I", pronunciation: "na", difficulty: 1 },
  { id: "ko-003", language: "ko", character: "한", translation: "one/Han", pronunciation: "han", difficulty: 1 },
  { id: "ko-004", language: "ko", character: "글", translation: "writing", pronunciation: "geul", difficulty: 2 },
  { id: "ko-005", language: "ko", character: "사", translation: "four", pronunciation: "sa", difficulty: 1 },
  { id: "ko-006", language: "ko", character: "람", translation: "person", pronunciation: "ram", difficulty: 2 },
  { id: "ko-007", language: "ko", character: "물", translation: "water", pronunciation: "mul", difficulty: 2 },
  { id: "ko-008", language: "ko", character: "불", translation: "fire", pronunciation: "bul", difficulty: 2 },
  { id: "ko-009", language: "ko", character: "음", translation: "sound", pronunciation: "eum", difficulty: 2 },
  { id: "ko-010", language: "ko", character: "악", translation: "music", pronunciation: "ak", difficulty: 2 },
];
