"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { unitById } from "@/data/pe-mc";
import { pickSq, SQ_KIND_LABEL, type PeSqQuestion } from "@/data/pe-sq";

function formatTime(seconds: number) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SqQuiz({ unit, n, seed }: { unit: number; n: number; seed: number }) {
  const router = useRouter();
  const questions = useMemo(() => pickSq(unit, n, seed), [unit, n, seed]);
  const title = unit === 0 ? "短答題考核 · 混合九單元" : `短答題考核 · ${unitById(unit)?.short ?? ""}`;

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"answer" | "reveal" | "done">("answer");
  const [remaining, setRemaining] = useState(questions[0]?.seconds ?? 0);
  const [timeUp, setTimeUp] = useState(false);

  const current: PeSqQuestion | undefined = questions[index];

  useEffect(() => {
    if (phase !== "answer" || !current) return;
    const total = current.seconds;
    const started = Date.now();
    setRemaining(total);
    const tick = () => {
      const left = total - Math.floor((Date.now() - started) / 1000);
      if (left <= 0) {
        setRemaining(0);
        setTimeUp(true);
        setPhase("reveal");
        return;
      }
      setRemaining(left);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phase, index, current]);

  function reveal() {
    setTimeUp(false);
    setPhase("reveal");
  }

  function next() {
    if (index >= questions.length - 1) {
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setTimeUp(false);
    setPhase("answer");
  }

  function retry() {
    const nextSeed = Math.floor(Math.random() * 1_000_000_000);
    router.push(`/pe/sq?unit=${unit}&n=${n}&seed=${nextSeed}`);
  }

  if (!current) {
    return (
      <p className="text-sm text-slate-600">
        未能載入題目。
        <Link href="/pe" className="ml-2 text-violet-700 underline">
          返回
        </Link>
      </p>
    );
  }

  if (phase === "done") {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-violet-800">考核完成</h2>
        <div className="mt-2 h-1 w-16 rounded-full bg-violet-700" />
        <div className="mt-6 rounded-2xl bg-teal-500 px-6 py-6 text-white">
          <p className="text-sm text-teal-50">{title}</p>
          <p className="mt-1 text-4xl font-semibold">{questions.length} 題全部完成</p>
          <p className="mt-2 text-sm text-teal-50">
            記得將錯題嘅單元重溫一次，再嚟挑戰。
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={retry}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
          >
            再做一次（重新打亂）
          </button>
          <Link
            href="/pe"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            返回選題
          </Link>
        </div>
      </div>
    );
  }

  const lowTime = phase === "answer" && remaining <= 30;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-medium text-violet-800">
          {title} · 第 {index + 1} / {questions.length} 題
        </p>
        <p className="text-xs text-slate-400">
          {unitById(current.unit)?.short}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-100">
        <div
          className="h-full rounded-full bg-violet-600 transition-[width] duration-200"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="mt-5 flex items-center justify-center">
        <div
          className={`rounded-2xl px-8 py-4 text-center ${
            phase === "reveal" ? "bg-slate-100" : lowTime ? "bg-rose-50" : "bg-violet-50"
          }`}
        >
          <p className="text-xs font-medium text-slate-500">
            {phase === "reveal" ? "作答時間" : "剩餘時間"}
          </p>
          <p
            suppressHydrationWarning
            className={`mt-1 font-mono text-4xl font-semibold tabular-nums ${
              phase === "reveal" ? "text-slate-400" : lowTime ? "text-rose-600" : "text-violet-800"
            }`}
          >
            {formatTime(phase === "reveal" ? current.seconds : remaining)}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium tracking-wide text-violet-600">{current.source}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 font-semibold text-violet-700">
            {SQ_KIND_LABEL[current.kind]}
          </span>
          {current.marks ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600">
              {current.marks} 分
            </span>
          ) : null}
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600">
            限時 {formatTime(current.seconds)}
          </span>
        </div>
        {current.theme ? (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
            情境：{current.theme}
          </p>
        ) : null}
        <p className="mt-3 text-base leading-7 font-medium text-slate-900">{current.text}</p>
        {current.figure ? (
          <figure className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.figure.src}
              alt={current.figure.alt}
              className="mx-auto h-auto w-full max-w-lg bg-white object-contain"
            />
          </figure>
        ) : null}
      </div>

      {phase === "answer" ? (
        <div className="mt-6">
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950">
            請用紙筆作答。限時一到，參考答案會自動顯示；完成作答亦可以自己撳「睇答案」。
          </p>
          <button
            type="button"
            onClick={reveal}
            className="mt-4 w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700"
          >
            完成作答，睇答案
          </button>
        </div>
      ) : (
        <div className="mt-6">
          {timeUp ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              時間到！請停筆，對照以下參考答案覆檢你嘅作答。
            </p>
          ) : null}
          <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">
              參考答案{current.marks ? `（${current.marks} 分）` : ""}
            </p>
            <p className="mt-1 text-sm leading-6 whitespace-pre-line text-amber-950">{current.answer}</p>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            覆檢重點：有冇答中關鍵詞？內容同參考答案嘅要點係咪一致？「／」代表任何一個可接受答案。
          </p>
          <button
            type="button"
            onClick={next}
            className="mt-4 w-full rounded-lg bg-violet-700 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-800"
          >
            {index >= questions.length - 1 ? "完成考核" : "下一題"}
          </button>
        </div>
      )}
    </div>
  );
}
