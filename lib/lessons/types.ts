export type Language = "zh" | "ja" | "ko";

export type Difficulty = 1 | 2 | 3;

export interface Lesson {
  id: string;
  language: Language;
  character: string;
  translation: string;
  pronunciation: string;
  difficulty: Difficulty;
}
