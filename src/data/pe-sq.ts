import sqJson from "@/data/pe-sq-papers.json";

export type SqKind = "point" | "describe" | "discuss";

export type PeSqFigure = {
  kind: "image";
  src: string;
  alt: string;
};

export type PeSqQuestion = {
  id: string;
  year: number;
  unit: number;
  paper: string;
  source: string;
  theme?: string;
  text: string;
  marks: number | null;
  answer: string;
  kind: SqKind;
  seconds: number;
  figure?: PeSqFigure;
};

export const SQ_QUESTIONS = sqJson as PeSqQuestion[];

export const SQ_COUNTS = [2, 4] as const;

export const SQ_KIND_LABEL: Record<SqKind, string> = {
  point: "指出",
  describe: "描述／解釋",
  discuss: "討論",
};

export function sqQuestionsForUnit(unit: number) {
  if (unit === 0) return SQ_QUESTIONS;
  return SQ_QUESTIONS.filter((q) => q.unit === unit);
}

export function sqBankSize(unit: number) {
  return sqQuestionsForUnit(unit).length;
}

function shuffle<T>(items: T[], seed: number) {
  const copy = [...items];
  let s = seed >>> 0;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickSq(unit: number, count: number, seed: number) {
  const pool = shuffle(sqQuestionsForUnit(unit), seed);
  return pool.slice(0, Math.min(count, pool.length));
}
