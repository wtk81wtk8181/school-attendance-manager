import papersJson from "@/data/pe-mc-papers.json";
import { BODY_MC_QUESTIONS, type BodyMcQuestion, type McFigure, type McKey } from "@/data/pe-body-mc";

export type { McFigure, McKey };

export type PeMcQuestion = BodyMcQuestion & { unit: number };

export type PeUnit = {
  id: number;
  short: string;
  part: string;
  topics: string;
  accent: string;
};

export const PE_UNITS: PeUnit[] = [
  {
    id: 1,
    short: "體育的歷史和發展",
    part: "第一部分",
    topics: "定義與價值、學校體育課程、香港運動發展策略及相關機構",
    accent: "bg-violet-600",
  },
  {
    id: 2,
    short: "人體",
    part: "第二部分",
    topics: "體型與結構、骨骼關節、神經肌肉、心血管呼吸、能量系統",
    accent: "bg-teal-600",
  },
  {
    id: 3,
    short: "動作分析",
    part: "第三部分",
    topics: "牛頓運動定律、槓桿、矢量與標量、動作類別、平面與軸",
    accent: "bg-sky-600",
  },
  {
    id: 4,
    short: "體適能和營養",
    part: "第四部分",
    topics: "健康與體適能、營養素、體重控制、體能活動指引",
    accent: "bg-amber-600",
  },
  {
    id: 5,
    short: "訓練法",
    part: "第五部分",
    topics: "訓練原則、阻力／持續／間歇訓練、訓練週期、高原訓練",
    accent: "bg-orange-600",
  },
  {
    id: 6,
    short: "運動創傷",
    part: "第六部分",
    topics: "常見創傷、PRICE／急救、AED、預防與護具",
    accent: "bg-rose-600",
  },
  {
    id: 7,
    short: "運動心理技能",
    part: "第七部分",
    topics: "技能學習、回饋、目標設置、喚醒與焦慮、表象訓練",
    accent: "bg-fuchsia-600",
  },
  {
    id: 8,
    short: "體育對社會的影響",
    part: "第八部分",
    topics: "奧林匹克、大型賽事、運動與社會、參與因素、禁藥",
    accent: "bg-indigo-600",
  },
  {
    id: 9,
    short: "體育運動管理",
    part: "第九部分",
    topics: "管理架構、SWOT、籌辦活動、賽制、法律與器材安全",
    accent: "bg-emerald-700",
  },
];

export const EXAM_COUNT = 36;
export const EXAM_MINUTES = 45;
export const EXAM_PER_UNIT = 4;
export const QUIZ_COUNTS = [15, 20, 25] as const;

const PAPER_MC = papersJson as PeMcQuestion[];

export const ALL_MC_QUESTIONS: PeMcQuestion[] = [
  ...BODY_MC_QUESTIONS.map((q) => ({ ...q, unit: 2 })),
  ...PAPER_MC,
];

export function unitById(id: number) {
  return PE_UNITS.find((unit) => unit.id === id);
}

export function questionsForUnit(unit: number) {
  return ALL_MC_QUESTIONS.filter((q) => q.unit === unit);
}

export function bankSize(unit: number) {
  return questionsForUnit(unit).length;
}

export function quizCountsForBank(size: number) {
  if (size > 25) return [15, 20, 25];
  const options = [15, 20].filter((n) => n < size);
  if (size >= 10 && size < 15 && !options.includes(10)) options.unshift(10);
  if (size > 0 && !options.includes(size)) options.push(size);
  return options;
}

export function minutesForCount(count: number) {
  if (count >= 36) return EXAM_MINUTES;
  if (count >= 25) return 30;
  if (count >= 20) return 25;
  if (count >= 15) return 20;
  return 15;
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

export function pickPractice(unit: number, count: number, seed: number) {
  const pool = shuffle(questionsForUnit(unit), seed);
  return pool.slice(0, Math.min(count, pool.length));
}

export function pickExam(seed: number) {
  const picked: PeMcQuestion[] = [];
  for (const unit of PE_UNITS) {
    const pool = shuffle(questionsForUnit(unit.id), seed + unit.id * 9973);
    picked.push(...pool.slice(0, EXAM_PER_UNIT));
  }
  return shuffle(picked, seed);
}
