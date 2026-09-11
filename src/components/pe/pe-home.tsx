"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BODY_MC_QUESTIONS, minutesForCount, QUIZ_COUNTS, type QuizCount } from "@/data/pe-body-mc";

export function PeHome() {
  const router = useRouter();
  const [count, setCount] = useState<QuizCount>(20);
  const minutes = minutesForCount(count);
  const bank = BODY_MC_QUESTIONS.length;

  const cards = useMemo(
    () =>
      QUIZ_COUNTS.map((n) => ({
        n,
        minutes: minutesForCount(n),
      })),
    []
  );

  function start() {
    const seed = Math.floor(Math.random() * 1_000_000_000);
    router.push(`/pe/practice?n=${count}&seed=${seed}`);
  }

  return (
    <div>
      <h1 className="sr-only">體育選修科 MC Trainer</h1>
      <h2 className="text-2xl font-semibold text-violet-800">人體選擇題練習</h2>
      <div className="mt-2 h-1 w-16 rounded-full bg-violet-700" />
      <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
        題庫一次過包含歷屆人體單元選擇題，每次開始都會打亂次序。可揀 15、20 或 25
        題。交卷後即時睇分數同解釋。
      </p>
      <p className="mt-2 text-sm text-slate-500">題庫共 {bank} 題。</p>

      <div className="mt-8 overflow-hidden rounded-2xl bg-teal-500 text-white shadow-sm">
        <div className="px-6 py-7 sm:px-8">
          <p className="text-sm/6 text-teal-50">第二部分 · 全部課題混合</p>
          <h3 className="mt-1 text-2xl font-semibold">人體</h3>
          <p className="mt-2 max-w-lg text-sm text-teal-50">
            體型與結構、骨骼關節、神經、肌肉、心血管、呼吸、能量系統、成長發展
          </p>
          <p className="mt-4 text-sm text-teal-100">{bank} 題 · 隨機抽題</p>

          <p className="mt-6 text-sm font-medium text-teal-50">選擇題數</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {cards.map((card) => (
              <button
                key={card.n}
                type="button"
                onClick={() => setCount(card.n)}
                className={
                  count === card.n
                    ? "rounded-full bg-white px-4 py-2 text-sm font-semibold text-teal-700"
                    : "rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-400"
                }
              >
                {card.n} 題／{card.minutes} 分鐘
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={start}
            className="mt-6 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-teal-700 shadow-sm hover:bg-teal-50"
          >
            開始練習（{count} 題／{minutes} 分鐘）
          </button>
        </div>
      </div>

      <p className="mt-8 text-center">
        <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">
          返回出勤平台
        </Link>
      </p>
    </div>
  );
}
