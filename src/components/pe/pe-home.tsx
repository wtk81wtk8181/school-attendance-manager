"use client";

import Link from "next/link";
import { useState } from "react";
import {
  EXAM_COUNT,
  EXAM_MINUTES,
  PE_UNITS,
  bankSize,
  minutesForCount,
  quizCountsForBank,
  type PeUnit,
} from "@/data/pe-mc";
import { SQ_COUNTS, sqBankSize } from "@/data/pe-sq";

export function PeHome() {
  const [counts, setCounts] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    for (const unit of PE_UNITS) {
      const options = quizCountsForBank(bankSize(unit.id));
      initial[unit.id] = options.includes(20) ? 20 : options[options.length - 1] ?? 0;
    }
    return initial;
  });
  const [sqUnit, setSqUnit] = useState(0);
  const [sqCount, setSqCount] = useState<number>(SQ_COUNTS[0]);

  return (
    <div>
      <h1 className="sr-only">體育選修科 MC Trainer</h1>
      <h2 className="text-2xl font-semibold text-violet-800">選擇題練習</h2>
      <div className="mt-2 h-1 w-16 rounded-full bg-violet-700" />
      <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
        九個單元可分開練習；考試模式則按文憑試試卷一甲，混合九單元共 36 題。每次開始都會打亂次序，交卷後即時睇分數同解釋。
      </p>

      <section className="mt-8 overflow-hidden rounded-2xl bg-slate-800 text-white shadow-sm">
        <div className="px-6 py-7 sm:px-8">
          <p className="text-sm/6 text-slate-300">試卷一甲 · 混合九單元</p>
          <h3 className="mt-1 text-2xl font-semibold">考試模式</h3>
          <p className="mt-2 max-w-lg text-sm text-slate-300">
            每單元抽 4 題，合共 36 題，時限 45 分鐘，對齊香港中學文憑考試體育選修科選擇題數量。
          </p>
          <Link
            href="/pe/practice?mode=exam"
            className="mt-6 inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
          >
            開始考試（{EXAM_COUNT} 題／{EXAM_MINUTES} 分鐘）
          </Link>
        </div>
      </section>

      <h3 className="mt-10 text-lg font-semibold text-violet-800">分單元練習</h3>
      <p className="mt-1 text-sm text-slate-500">揀一個單元，再揀題數。題庫較少的單元會改為全部題目。</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {PE_UNITS.map((unit) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            count={counts[unit.id]}
            size={bankSize(unit.id)}
            onCount={(n) => setCounts((prev) => ({ ...prev, [unit.id]: n }))}
          />
        ))}
      </div>

      <h3 className="mt-10 text-lg font-semibold text-violet-800">短答題考核</h3>
      <p className="mt-1 text-sm text-slate-500">
        2021–2025 文憑試短答題，每題按指令詞限時：指出 2:00、描述／解釋 3:00、討論 3:30。
        用紙筆作答，限時後顯示參考答案覆檢。
      </p>

      <section className="mt-4 overflow-hidden rounded-2xl bg-teal-700 text-white shadow-sm">
        <div className="px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <p className="text-sm font-medium text-white/90">選擇單元</p>
              <select
                value={sqUnit}
                onChange={(e) => setSqUnit(Number(e.target.value))}
                className="mt-2 rounded-lg border-0 bg-white px-3 py-2 text-sm font-medium text-slate-800"
              >
                <option value={0}>混合全部單元（{sqBankSize(0)} 題）</option>
                {PE_UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.part}　{u.short}（{sqBankSize(u.id)} 題）
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">題數</p>
              <div className="mt-2 flex gap-2">
                {SQ_COUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSqCount(n)}
                    className={
                      sqCount === n
                        ? "rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-slate-800"
                        : "rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium text-white hover:bg-white/25"
                    }
                  >
                    {n} 題
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Link
            href={`/pe/sq?unit=${sqUnit}&n=${sqCount}`}
            className="mt-5 inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
          >
            開始短答考核（{sqCount} 題）
          </Link>
        </div>
      </section>

      <p className="mt-8 text-center">
        <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">
          返回出勤平台
        </Link>
      </p>
    </div>
  );
}

function UnitCard({
  unit,
  count,
  size,
  onCount,
}: {
  unit: PeUnit;
  count: number;
  size: number;
  onCount: (n: number) => void;
}) {
  const options = quizCountsForBank(size);
  const minutes = minutesForCount(count);

  return (
    <article className={`overflow-hidden rounded-2xl ${unit.accent} text-white shadow-sm`}>
      <div className="px-5 py-5 sm:px-6">
        <p className="text-xs/5 text-white/75">{unit.part}</p>
        <h4 className="mt-1 text-lg font-semibold">{unit.short}</h4>
        <p className="mt-1 text-sm text-white/85">{unit.topics}</p>
        <p className="mt-3 text-sm text-white/80">
          {size} 題 · {count === size ? "全部題目" : "隨機抽題"}
        </p>
        <p className="mt-4 text-sm font-medium text-white/90">選擇題數</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onCount(n)}
              className={
                count === n
                  ? "rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
                  : "rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25"
              }
            >
              {n === size && !QUIZ_LIKE.has(n) ? `全部 ${n} 題` : `${n} 題／${minutesForCount(n)} 分鐘`}
            </button>
          ))}
        </div>
        <Link
          href={`/pe/practice?unit=${unit.id}&n=${count}`}
          className="mt-5 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-white/90"
        >
          開始練習（{count} 題／{minutes} 分鐘）
        </Link>
      </div>
    </article>
  );
}

const QUIZ_LIKE = new Set([10, 15, 20, 25]);
